#!/usr/bin/env python3
"""Build the master timeline, subtitle cues and a shot-plan skeleton from a transcript.

  python3 generate-timeline.py --transcript analysis/transcript.json --fps 30 --duration-frames N
                               [--project DIR]  (writes DIR/analysis/timeline.json, DIR/data/subtitles.json,
                                                 DIR/data/shot-plan.json unless it is already directed)
                               [--target-shot-seconds 5] [--max-subtitle-chars 42] [--force-plan]

Beats   = phrases (clause-level units, ~1–3 s) → the visual beat list (100–150 for a typical short film).
Shots   = continuous camera moves grouping consecutive beats (3–8 s), broken preferably at sentence ends and
          real pauses. Shots tile the WHOLE timeline (frame 0 → durationFrames) with no gaps: there are no cuts,
          only successive moves of one camera.
Creative fields (visualPurpose, environment, camera, lighting, transitions, sound) are left as TODO for the
director to fill; validate-shot-plan.py fails until they are filled.
"""
from __future__ import annotations

import argparse
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import load_json, norm_word, write_json  # noqa: E402

STOP = set("a an the and or but of to in on at by for with from as is are was were be been it its this that these those he she they we you i his her their our your my me him them us not no so than then there here into onto over under about after before while when what which who whom whose why how all any some such can could would should will may might must do does did done have has had".split())
CONJ = {"and", "but", "so", "because", "which", "while", "when", "until", "although", "yet", "then"}


def phrases_from_words(words: list[dict], max_words: int = 9, max_sec: float = 3.2) -> list[list[dict]]:
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        punct = w.get("punct", "")
        nxt = words[i + 1] if i + 1 < len(words) else None
        gap = (nxt["start"] - w["end"]) if nxt else 0
        dur = w["end"] - cur[0]["start"]
        brk = bool(re.search(r"[.!?;:,—–]", punct)) or gap > 0.3 or len(cur) >= max_words or dur >= max_sec
        if not brk and nxt and norm_word(nxt["text"]) in CONJ and len(cur) >= 4:
            brk = True
        if brk:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    # merge tiny fragments into neighbours
    merged: list[list[dict]] = []
    for p in out:
        if merged and (len(p) <= 1 or p[-1]["end"] - p[0]["start"] < 0.45) and not re.search(r"[.!?]", merged[-1][-1].get("punct", "")):
            merged[-1].extend(p)
        else:
            merged.append(p)
    return merged


def text_of(ws: list[dict]) -> str:
    return " ".join(w["text"] + w.get("punct", "") for w in ws)


def emphasis_candidates(ws: list[dict], k: int = 1) -> list[str]:
    scored = []
    for w in ws:
        n = norm_word(w["text"])
        if not n or n in STOP:
            continue
        s = len(n) + (6 if any(c.isdigit() for c in n) else 0) + (3 if w["text"][:1].isupper() and w is not ws[0] else 0)
        scored.append((s, w["text"].strip(".,!?;:")))
    return [t for _, t in sorted(scored, key=lambda x: -x[0])[:k]]


def subtitle_cues(phrases: list[list[dict]], max_chars: int, duration: float) -> list[dict]:
    cues = []
    for p in phrases:
        # split long phrases into ≤ max_chars chunks
        chunk: list[dict] = []
        for w in p:
            if chunk and len(text_of(chunk + [w])) > max_chars:
                cues.append(chunk)
                chunk = []
            chunk.append(w)
        if chunk:
            cues.append(chunk)
    # merge cues that would flash by (< 0.9 s spoken) into a neighbour when the result still fits two lines
    merged: list[list[dict]] = []
    for c in cues:
        if merged and (c[-1]["end"] - c[0]["start"] < 0.9 or merged[-1][-1]["end"] - merged[-1][0]["start"] < 0.9) and len(text_of(merged[-1] + c)) <= max_chars * 2:
            merged[-1] = merged[-1] + c
        else:
            merged.append(c)
    cues = merged
    out = []
    for i, c in enumerate(cues):
        start = c[0]["start"]
        end = c[-1]["end"]
        nxt = cues[i + 1][0]["start"] if i + 1 < len(cues) else duration
        end = min(max(end + 0.15, start + 0.8), nxt - 0.02 if nxt - 0.02 > start + 0.3 else nxt)
        out.append({"start": round(start, 3), "end": round(end, 3), "text": text_of(c).rstrip(","),
                    "words": [{"text": w["text"] + w.get("punct", ""), "start": w["start"], "end": w["end"]} for w in c],
                    "emphasis": emphasis_candidates(c), "position": "bottom"})
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--duration-frames", type=int, required=True)
    ap.add_argument("--project")
    ap.add_argument("--out-dir")
    ap.add_argument("--target-shot-seconds", type=float, default=5.0)
    ap.add_argument("--max-shot-seconds", type=float, default=9.0)
    ap.add_argument("--max-subtitle-chars", type=int, default=42)
    ap.add_argument("--force-plan", action="store_true")
    a = ap.parse_args()

    tr = load_json(Path(a.transcript))
    words = [w for w in tr["words"] if w.get("text")]
    if not words:
        sys.exit("error: transcript has no words")
    fps, N = a.fps, a.duration_frames
    duration = N / fps
    f = lambda t: max(0, min(N, round(t * fps)))  # noqa: E731

    phrases = phrases_from_words(words)
    beats = [{"id": f"B{i + 1:03d}", "text": text_of(p), "start": p[0]["start"], "end": p[-1]["end"], "startFrame": f(p[0]["start"]), "endFrame": f(p[-1]["end"]),
              "sentenceEnd": bool(re.search(r"[.!?]", p[-1].get("punct", ""))), "gapAfter": 0.0} for i, p in enumerate(phrases)]
    for i in range(len(beats) - 1):
        beats[i]["gapAfter"] = round(beats[i + 1]["start"] - beats[i]["end"], 3)

    # group beats into camera moves (shots)
    groups: list[list[dict]] = []
    cur: list[dict] = []
    for i, b in enumerate(beats):
        cur.append(b)
        span = b["end"] - cur[0]["start"]
        natural = b["sentenceEnd"] or b["gapAfter"] >= 0.45
        if (span >= 0.6 * a.target_shot_seconds and natural) or span >= a.max_shot_seconds or (b["gapAfter"] >= 1.2 and span >= 1.5):
            groups.append(cur)
            cur = []
    if cur:
        if groups and cur[-1]["end"] - cur[0]["start"] < 1.5:
            groups[-1].extend(cur)
        else:
            groups.append(cur)

    shots = []
    for i, g in enumerate(groups):
        start_t = 0.0 if i == 0 else round((groups[i - 1][-1]["end"] + g[0]["start"]) / 2, 3)  # boundary in the pause
        end_t = duration if i == len(groups) - 1 else round((g[-1]["end"] + groups[i + 1][0]["start"]) / 2, 3)
        shots.append({
            "id": f"S{i + 1:03d}", "audioStart": start_t, "audioEnd": round(end_t, 3), "startFrame": f(start_t), "endFrame": f(end_t),
            "narration": " ".join(b["text"] for b in g), "beats": [b["id"] for b in g],
            "visualPurpose": "TODO", "emotion": "TODO", "environment": "TODO", "characters": [], "objects": [], "lighting": "TODO",
            "camera": None, "cameraTarget": "TODO", "animation": "TODO", "transitionIn": "TODO", "transitionOut": "TODO",
            "sound": [], "subtitle": "auto", "notes": "",
        })
    for i in range(1, len(shots)):
        shots[i]["startFrame"] = shots[i - 1]["endFrame"]
    shots[-1]["endFrame"] = N

    sentences = tr.get("segments") or []
    cues = subtitle_cues(phrases, a.max_subtitle_chars, duration)
    timeline = {"fps": fps, "durationFrames": N, "duration": duration, "source": tr.get("source"), "timingQuality": tr.get("timingQuality"),
                "words": [{**w, "startFrame": f(w["start"]), "endFrame": f(w["end"])} for w in words],
                "sentences": [{**s, "startFrame": f(s["start"]), "endFrame": f(s["end"])} for s in sentences],
                "beats": beats}

    if a.project:
        proj = Path(a.project)
        out_dir = proj / "analysis"
        write_json(out_dir / "timeline.json", timeline)
        write_json(proj / "data" / "subtitles.json", {"cues": cues})
        plan_path = proj / "data" / "shot-plan.json"
        existing = load_json(plan_path) if plan_path.exists() else {}
        directed = existing and "PLACEHOLDER" not in str(existing.get("$comment", "")) and any(s.get("visualPurpose") not in (None, "", "TODO", "placeholder") for s in existing.get("shots", []))
        skeleton = {"version": 1, "fps": fps, "durationFrames": N, "$comment": "SKELETON from generate-timeline.py — fill every TODO (see references/storytelling-framework.md, camera-system.md).", "shots": shots}
        if directed and not a.force_plan:
            write_json(out_dir / "shot-plan.skeleton.json", skeleton)
            print("existing shot plan looks directed; skeleton written to analysis/shot-plan.skeleton.json (use --force-plan to overwrite)")
        else:
            write_json(plan_path, skeleton)
    else:
        out_dir = Path(a.out_dir or ".")
        write_json(out_dir / "timeline.json", timeline)
        write_json(out_dir / "subtitles.json", {"cues": cues})
        write_json(out_dir / "shot-plan.skeleton.json", {"version": 1, "fps": fps, "durationFrames": N, "shots": shots})
    print(f"{len(words)} words → {len(beats)} beats, {len(shots)} camera moves (avg {duration / max(1, len(shots)):.1f}s), {len(cues)} subtitle cues")


if __name__ == "__main__":
    main()
