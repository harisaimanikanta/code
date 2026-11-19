#!/usr/bin/env python3
"""Transcribe a voiceover and/or align a written script to it, producing word-level timing.

  python3 transcribe.py VOICEOVER [--script narration.txt] [--out analysis/transcript.json]
                        [--backend auto|faster-whisper|whisper|whisper-cpp|vosk|script-estimate]
                        [--model small.en] [--model-dir DIR] [--language en] [--inspection audio-inspection.json]

Backends are detected, never assumed (first available wins with --backend auto):
  faster-whisper   pip install faster-whisper   (model downloaded from Hugging Face, or --model-dir)
  whisper          pip install openai-whisper    (model downloaded on first use)
  whisper-cpp      `whisper-cli`/`whisper-cpp` binary + ggml model via --model-dir/--model
  vosk             pip install vosk + model directory via --model-dir
  script-estimate  NO speech recognition: distributes the supplied script over detected speech intervals,
                   snapping sentence ends to real pauses. Timing is approximate (flagged in output).

Rules implemented here (from the skill):
  * Audio is the timing master. Script (if given) is the semantic master: output text = script words.
  * When ASR and script disagree, the discrepancy is REPORTED, never silently rewritten.
"""
from __future__ import annotations

import argparse
import difflib
import importlib.util
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import exact_duration, load_json, norm_word, silences, speech_intervals, syllables, tokenize, write_json  # noqa: E402


# ------------------------------------------------------------------------------------------------ backends

def available_backends(model_dir: str | None) -> list[str]:
    out = []
    if importlib.util.find_spec("faster_whisper"):
        out.append("faster-whisper")
    if importlib.util.find_spec("whisper"):
        out.append("whisper")
    if (shutil.which("whisper-cli") or shutil.which("whisper-cpp")) and model_dir:
        out.append("whisper-cpp")
    if importlib.util.find_spec("vosk") and model_dir:
        out.append("vosk")
    return out


def asr_faster_whisper(audio: Path, model: str, model_dir: str | None, language: str | None) -> list[dict]:
    from faster_whisper import WhisperModel
    m = WhisperModel(model_dir or model, device="auto", compute_type="auto")
    segs, _ = m.transcribe(str(audio), language=language, word_timestamps=True, vad_filter=False)
    return [{"text": w.word.strip(), "start": float(w.start), "end": float(w.end), "conf": float(w.probability)} for s in segs for w in (s.words or [])]


def asr_whisper(audio: Path, model: str, language: str | None) -> list[dict]:
    import whisper
    m = whisper.load_model(model)
    r = m.transcribe(str(audio), language=language, word_timestamps=True)
    return [{"text": w["word"].strip(), "start": float(w["start"]), "end": float(w["end"]), "conf": float(w.get("probability", 1))} for s in r["segments"] for w in s.get("words", [])]


def asr_whisper_cpp(audio: Path, model_path: str, language: str | None) -> list[dict]:
    exe = shutil.which("whisper-cli") or shutil.which("whisper-cpp")
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "a.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-ac", "1", "-ar", "16000", str(wav)], check=True)
        base = Path(tmp) / "out"
        subprocess.run([exe, "-m", model_path, "-f", str(wav), "-ml", "1", "-oj", "-of", str(base)] + (["-l", language] if language else []), check=True, capture_output=True)
        data = json.loads((base.with_suffix(".json")).read_text())
    words = []
    for t in data.get("transcription", []):
        txt = t["text"].strip()
        if txt:
            words.append({"text": txt, "start": t["offsets"]["from"] / 1000, "end": t["offsets"]["to"] / 1000, "conf": 1.0})
    return words


def asr_vosk(audio: Path, model_dir: str) -> list[dict]:
    import wave
    from vosk import KaldiRecognizer, Model
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "a.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-ac", "1", "-ar", "16000", "-sample_fmt", "s16", str(wav)], check=True)
        wf = wave.open(str(wav))
        rec = KaldiRecognizer(Model(model_dir), wf.getframerate())
        rec.SetWords(True)
        words = []
        while True:
            data = wf.readframes(4000)
            if not data:
                break
            if rec.AcceptWaveform(data):
                words += json.loads(rec.Result()).get("result", [])
        words += json.loads(rec.FinalResult()).get("result", [])
    return [{"text": w["word"], "start": w["start"], "end": w["end"], "conf": w.get("conf", 1)} for w in words]


# ------------------------------------------------------------------------------------------------ script handling

def script_tokens(text: str) -> list[dict]:
    """Script words with attached trailing punctuation (kept for sentence detection and subtitles).
    Paragraph breaks (blank lines) are recorded as `para: True` on the last word — narrators pause longest there."""
    words: list[dict] = []
    for para in re.split(r"\n\s*\n", text.strip()):
        for t in tokenize(para):
            if re.fullmatch(r"[.,!?;:—–]", t):
                if words:
                    words[-1]["punct"] = words[-1].get("punct", "") + t
                continue
            words.append({"text": t})
        if words:
            words[-1]["para"] = True
    return words


def pause_weight(punct: str, para: bool = False) -> float:
    if para:
        return 2.6
    if not punct:
        return 0.0
    if any(c in punct for c in ".!?"):
        return 1.6
    if any(c in punct for c in ";:—–"):
        return 1.0
    return 0.6


def _level(w: dict) -> int:
    """Boundary strength: 3 paragraph, 2 sentence, 1 clause, 0 none."""
    if w.get("para"):
        return 3
    p = w.get("punct", "")
    if any(c in p for c in ".!?"):
        return 2
    if any(c in p for c in ",;:—–"):
        return 1
    return 0


def _proportional(words: list[dict], weights: list[float], speech: list[tuple[float, float]], t0: float, t1: float) -> list[tuple[float, float]]:
    sub = [(max(s, t0), min(e, t1)) for s, e in speech if e > t0 and s < t1] or [(t0, t1)]
    total = sum(e - s for s, e in sub) or (t1 - t0)
    tot_w = sum(weights) or 1

    def to_abs(x: float) -> float:
        acc = 0.0
        for s, e in sub:
            if x <= acc + (e - s) + 1e-9:
                return s + (x - acc)
            acc += e - s
        return t1

    out, c = [], 0.0
    for w in weights:
        a = to_abs(c / tot_w * total)
        c += w
        out.append((a, to_abs(c / tot_w * total)))
    return out


def _dp_match(cands: list[tuple[int, float]], pauses: list[tuple[float, float]], strength: float) -> list[tuple[int, float, float]]:
    """Monotonic matching of boundary candidates (word idx, estimated end) to pauses maximising
    strength × pause length − distance penalty. Returns [(word idx, pause start, pause end)]."""
    nb, nq = len(cands), len(pauses)
    if not nb or not nq:
        return []
    val = lambda b, q: strength * (0.5 + min(pauses[q][1] - pauses[q][0], 1.2)) - 0.5 * abs(cands[b][1] - pauses[q][0])  # noqa: E731
    S = [[0.0] * (nq + 1) for _ in range(nb + 1)]
    for b in range(1, nb + 1):
        for q in range(1, nq + 1):
            v = val(b - 1, q - 1)
            S[b][q] = max(S[b - 1][q], S[b][q - 1], S[b - 1][q - 1] + v if v > 0 else -1e9)
    out, b, q = [], nb, nq
    while b > 0 and q > 0:
        v = val(b - 1, q - 1)
        if v > 0 and abs(S[b][q] - (S[b - 1][q - 1] + v)) < 1e-9:
            out.append((cands[b - 1][0], pauses[q - 1][0], pauses[q - 1][1])); b -= 1; q -= 1
        elif S[b][q] == S[b - 1][q]:
            b -= 1
        else:
            q -= 1
    return out[::-1]


def estimate_from_script(words: list[dict], speech: list[tuple[float, float]], pauses: list[tuple[float, float]]) -> list[dict]:
    """No-ASR alignment, hierarchical: paragraphs → sentences → clauses. At each level the span's words are
    placed proportionally (syllable weights) over its real speech, then that level's boundaries are snapped to
    the span's pauses with a monotonic DP (longest pauses favoured). Unmatched boundaries keep proportional timing."""
    if not words or not speech:
        return []
    weights = [syllables(w["text"]) + 0.3 for w in words]
    times: list[tuple[float, float] | None] = [None] * len(words)

    def solve(i0: int, i1: int, t0: float, t1: float, level: int) -> None:
        est = _proportional(words[i0:i1 + 1], weights[i0:i1 + 1], speech, t0, t1)
        if level == 0:
            for k, (a, b) in enumerate(est):
                times[i0 + k] = (a, max(b, a + 0.05))
            return
        inner = [(s, e) for s, e in pauses if s > t0 + 0.05 and e < t1 - 0.05]
        cands = [(i0 + k, est[k][1]) for k in range(i1 - i0) if _level(words[i0 + k]) >= level]
        anchors = _dp_match(cands, inner, {3: 2.6, 2: 1.6, 1: 0.8}[level])
        prev_i, prev_t = i0, t0
        for wi, ps, pe in anchors:
            solve(prev_i, wi, prev_t, ps, level - 1)
            prev_i, prev_t = wi + 1, pe
        solve(prev_i, i1, prev_t, t1, level - 1)

    solve(0, len(words) - 1, speech[0][0], speech[-1][1], 3)
    return [{**{k: v for k, v in w.items() if k != "para"}, "start": round(t[0], 3), "end": round(t[1], 3), "conf": None, "timing": "estimated"} for w, t in zip(words, times)]


def align_script_to_asr(script_words: list[dict], asr: list[dict]) -> tuple[list[dict], dict]:
    """Script text with ASR timing. Returns (aligned words, discrepancy report)."""
    a = [norm_word(w["text"]) for w in script_words]
    b = [norm_word(w["text"]) for w in asr]
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    timed: list[dict | None] = [None] * len(script_words)
    script_only, asr_only, substitutions = [], [], []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                w = asr[j1 + k]
                timed[i1 + k] = {**script_words[i1 + k], "start": w["start"], "end": w["end"], "conf": w.get("conf"), "timing": "asr"}
        elif tag == "replace":
            substitutions.append({"script": " ".join(x["text"] for x in script_words[i1:i2]), "audio": " ".join(x["text"] for x in asr[j1:j2]), "at": asr[j1]["start"]})
            # spread the replaced audio span over the script words
            t0, t1 = asr[j1]["start"], asr[j2 - 1]["end"]
            n = i2 - i1
            for k in range(n):
                timed[i1 + k] = {**script_words[i1 + k], "start": round(t0 + (t1 - t0) * k / n, 3), "end": round(t0 + (t1 - t0) * (k + 1) / n, 3), "conf": None, "timing": "interpolated"}
        elif tag == "delete":
            script_only.append({"script": " ".join(x["text"] for x in script_words[i1:i2]), "afterAudioTime": asr[j1 - 1]["end"] if j1 > 0 else 0})
        elif tag == "insert":
            asr_only.append({"audio": " ".join(x["text"] for x in asr[j1:j2]), "at": asr[j1]["start"]})
    # interpolate script-only words between neighbours (they may simply be unspoken)
    for i, w in enumerate(timed):
        if w is None:
            prev = next((timed[k]["end"] for k in range(i - 1, -1, -1) if timed[k]), asr[0]["start"] if asr else 0)
            nxt = next((timed[k]["start"] for k in range(i + 1, len(timed)) if timed[k]), prev + 0.3)
            timed[i] = {**script_words[i], "start": round(prev, 3), "end": round(max(prev + 0.05, min(nxt, prev + 0.4)), 3), "conf": None, "timing": "unspoken?"}
    match_ratio = sm.ratio()
    report = {"matchRatio": round(match_ratio, 4), "scriptOnly": script_only, "audioOnly": asr_only, "substitutions": substitutions,
              "policy": "Audio timing preserved. Script wording used for semantics/subtitles. Discrepancies listed for the user — narration was NOT rewritten."}
    return timed, report  # type: ignore[return-value]


def segments_from_words(words: list[dict]) -> list[dict]:
    segs, cur = [], []
    for w in words:
        cur.append(w)
        if any(c in w.get("punct", "") for c in ".!?"):
            segs.append(cur)
            cur = []
    if cur:
        segs.append(cur)
    return [{"text": " ".join(x["text"] + x.get("punct", "") for x in s), "start": s[0]["start"], "end": s[-1]["end"]} for s in segs]


def attach_asr_punct(asr: list[dict]) -> list[dict]:
    out = []
    for w in asr:
        m = re.match(r"^(.*?)([.,!?;:]*)$", w["text"])
        out.append({**w, "text": m.group(1) or w["text"], "punct": m.group(2)})
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("--script")
    ap.add_argument("--out", default="analysis/transcript.json")
    ap.add_argument("--backend", default="auto")
    ap.add_argument("--model", default="small.en")
    ap.add_argument("--model-dir")
    ap.add_argument("--language", default=None)
    ap.add_argument("--inspection")
    a = ap.parse_args()
    audio = Path(a.audio).resolve()

    if a.inspection and Path(a.inspection).exists():
        ins = load_json(Path(a.inspection))
        dur = ins["duration"]
        sil = [tuple(x) for x in ins["silences"]]
        speech = [tuple(x) for x in ins["speechIntervals"]]
    else:
        dur = exact_duration(audio)
        raw = silences(audio)
        sil = [(s, dur if e != e else e) for s, e in raw]
        speech = speech_intervals(raw, dur)
    inner_pauses = [(s, e) for s, e in sil if s > 0.01 and e < dur - 0.01]

    script_text = Path(a.script).read_text() if a.script else None
    backends = available_backends(a.model_dir)
    backend = a.backend
    if backend == "auto":
        backend = backends[0] if backends else ("script-estimate" if script_text else None)
    if backend is None:
        msg = ("No speech-recognition backend is installed and no script was supplied, so the narration text cannot be recovered.\n"
               "Fix one of:\n  pip install faster-whisper   (needs Hugging Face access for the model, or --model-dir with a local CTranslate2 model)\n"
               "  pip install openai-whisper   (downloads model on first run)\n  install whisper.cpp and pass --model-dir/--model to a ggml model\n"
               "  or supply the narration text with --script (timing will be estimated from speech intervals).")
        write_json(Path(a.out), {"text": None, "words": [], "segments": [], "source": None, "duration": dur, "speechIntervals": speech, "error": msg})
        sys.exit("error: " + msg)

    discrepancies = None
    asr = None
    try:
        if backend == "faster-whisper":
            asr = asr_faster_whisper(audio, a.model, a.model_dir, a.language)
        elif backend == "whisper":
            asr = asr_whisper(audio, a.model, a.language)
        elif backend == "whisper-cpp":
            asr = asr_whisper_cpp(audio, str(Path(a.model_dir) / a.model) if a.model_dir and not a.model.endswith(".bin") else a.model, a.language)
        elif backend == "vosk":
            asr = asr_vosk(audio, a.model_dir)
    except Exception as e:  # model download blocked, etc.
        if not script_text:
            sys.exit(f"error: backend {backend} failed: {e}")
        print(f"warning: backend {backend} failed ({e}); falling back to script-estimate", file=sys.stderr)
        backend, asr = "script-estimate", None

    if asr is not None:
        asr = attach_asr_punct(asr)
        if script_text:
            words, discrepancies = align_script_to_asr(script_tokens(script_text), asr)
            source = f"{backend}+script"
        else:
            words, source = asr, backend
    else:
        if not script_text:
            sys.exit("error: script-estimate requires --script")
        words = estimate_from_script(script_tokens(script_text), speech, inner_pauses)
        source = "script-estimate"

    for w in words:
        w["start"] = round(float(w["start"]), 3)
        w["end"] = round(float(w["end"]), 3)
    text = " ".join(w["text"] + w.get("punct", "") for w in words)
    result = {
        "source": source,
        "timingQuality": "word-level (ASR)" if asr is not None else "estimated (no ASR) — verify against audio; refine with an ASR backend when available",
        "duration": dur,
        "text": text,
        "words": words,
        "segments": segments_from_words(words),
        "speechIntervals": speech,
        "discrepancies": discrepancies,
        "availableBackends": backends,
    }
    write_json(Path(a.out), result)
    print(f"transcript via {source}: {len(words)} words, {len(result['segments'])} sentences → {a.out}")
    if discrepancies:
        print(f"  script/audio match ratio {discrepancies['matchRatio']}; {len(discrepancies['substitutions'])} substitutions, {len(discrepancies['scriptOnly'])} script-only, {len(discrepancies['audioOnly'])} audio-only spans (see report — narration NOT rewritten)")
    if asr is None:
        print("  ! timing is ESTIMATED from speech intervals; subtitles/beats may drift by a few hundred ms")


if __name__ == "__main__":
    main()
