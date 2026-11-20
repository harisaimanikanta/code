#!/usr/bin/env python3
"""Procedural sound design: score drones, ambiences and synced SFX, ducked under the voiceover.

  python3 make-sound-bed.py PROJECT [--seed 7] [--duck-db 9] [--music-db -24] [--no-auto]

Reads data/shot-plan.json + data/production-config.json, writes public/sound-bed.wav (48 kHz stereo) and
analysis/sound-design.json (cue sheet + loudness report), and sets audio.soundBed in the config.
The voiceover is NEVER modified: it is only analysed to drive the ducking envelope.

Per-shot `sound` entries (strings or {"type", "at" (seconds from shot start), "gain" (dB)}):
  amb:lab | amb:corridor | amb:hall | amb:micro | amb:void | amb:office   ambience bed for the shot (crossfaded)
  impact | boom | riser | whoosh | heartbeat | glass | paper | stamp | click | shimmer   one-shot events
  silence                                                                  controlled silence: bed fades out for the shot
Score: a drone whose chord follows each shot's lighting mood (mystery, discovery, rejection, experiment,
explanation, triumph, punchline …), crossfaded across shot boundaries.
Auto events (disable with --no-auto): whoosh on spatial transitions; riser before microscope-lens /
anatomical-tunnel / liquid / scale transitions; boom on the first 'triumph' and 'punchline' shots.
Requires numpy (pip install numpy) and ffmpeg.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import load_json, run, write_json  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover
    sys.exit("error: make-sound-bed.py needs numpy (pip install numpy)")

SR = 48000
CHORDS = {  # Hz, all rooted around A1/E1 for a dark industrial register
    "mystery": [55.0, 82.41, 130.81], "discovery": [55.0, 82.41, 123.47, 246.94], "rejection": [55.0, 58.27, 82.41, 87.31],
    "experiment": [55.0, 82.41, 110.0], "explanation": [55.0, 82.41, 110.0, 164.81], "triumph": [55.0, 69.3, 82.41, 110.0, 138.59],
    "punchline": [41.2, 61.74, 82.41], "industrial-red": [55.0, 82.41, 103.83], "crimson-rim": [55.0, 82.41, 130.81],
    "low-key-lab": [55.0, 82.41, 110.0], "microscopic-green": [55.0, 82.41, 123.47, 185.0], "volumetric-corridor": [55.0, 77.78, 82.41],
    "golden-award": [55.0, 69.3, 82.41, 110.0, 138.59], "high-contrast-character": [55.0, 82.41, 130.81],
}
PULSE = {"experiment": 2.0, "rejection": 0.5, "punchline": 1.0}


def db(x: float) -> float:
    return 10 ** (x / 20)


def lowpass_fft(x: np.ndarray, cutoff: float, slope: float = 2.0) -> np.ndarray:
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / max(cutoff, 1)) ** (2 * slope))
    return np.fft.irfft(X, n=len(x))


def bandpass_fft(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)) * (1 / np.sqrt(1 + (f / hi) ** 4))
    return np.fft.irfft(X, n=len(x))


def norm(x: np.ndarray, peak: float = 1.0) -> np.ndarray:
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def env_adsr(n: int, a: float, r: float) -> np.ndarray:
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4))
    return e


class Bed:
    def __init__(self, seconds: float, rng: np.random.Generator):
        self.n = int(round(seconds * SR))
        self.music = np.zeros((2, self.n))
        self.amb = np.zeros((2, self.n))
        self.sfx = np.zeros((2, self.n))
        self.rng = rng

    def add(self, bus: np.ndarray, sig: np.ndarray, at: float, gain_db: float = 0, pan: float = 0.0):
        i0 = int(at * SR)
        if i0 >= self.n or len(sig) == 0:
            return
        i0 = max(0, i0)
        s = sig[: self.n - i0] * db(gain_db)
        bus[0, i0:i0 + len(s)] += s * np.sqrt(0.5 * (1 - pan))
        bus[1, i0:i0 + len(s)] += s * np.sqrt(0.5 * (1 + pan))


# ---------------------------------------------------------------------------------------------- one-shots

def sfx(kind: str, rng: np.random.Generator) -> tuple[np.ndarray, float]:
    """Returns (mono signal, offset seconds relative to cue time — negative for pre-rolled sounds)."""
    if kind in ("impact", "boom", "stamp"):
        dur = {"impact": 1.2, "boom": 2.8, "stamp": 0.5}[kind]
        n = int(dur * SR)
        t = np.arange(n) / SR
        f = 30 + 70 * np.exp(-t * (6 if kind != "boom" else 2.5))
        sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (3.5 if kind != "boom" else 1.4))
        noise = lowpass_fft(rng.standard_normal(n), 900 if kind != "stamp" else 3000) * np.exp(-t * (14 if kind != "boom" else 5))
        return norm(sub + 0.6 * norm(noise)), 0.0
    if kind == "riser":
        n = int(2.4 * SR)
        t = np.arange(n) / SR
        k = t / t[-1]
        noise = bandpass_fft(rng.standard_normal(n), 400, 7000) * k ** 2.2
        tone = np.sin(2 * np.pi * np.cumsum(180 + 620 * k ** 2) / SR) * k ** 3 * 0.5
        return norm(noise + tone) * np.minimum(1, (1 - k) * 40), -2.4
    if kind == "whoosh":
        n = int(1.1 * SR)
        t = np.arange(n) / SR
        bell = np.exp(-((t - 0.55) ** 2) / (2 * 0.16 ** 2))
        lo = bandpass_fft(rng.standard_normal(n), 150, 1500)
        hi = bandpass_fft(rng.standard_normal(n), 1500, 6000)
        mix = (lo * (1 - t / t[-1]) + hi * (t / t[-1]))
        return norm(mix * bell), -0.55
    if kind == "heartbeat":
        n = int(1.0 * SR)
        t = np.arange(n) / SR
        thump = lambda t0: np.sin(2 * np.pi * 48 * (t - t0)) * np.exp(-np.maximum(0, t - t0) * 18) * (t >= t0)  # noqa: E731
        return norm(thump(0.0) + 0.7 * thump(0.28)), 0.0
    if kind == "glass":
        n = int(1.6 * SR)
        t = np.arange(n) / SR
        s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((2637, 3), (3951, 4.5), (5274, 7)))
        return norm(s) * 0.6, 0.0
    if kind == "paper":
        n = int(0.35 * SR)
        return norm(bandpass_fft(rng.standard_normal(n), 1500, 9000) * env_adsr(n, 0.01, 0.08)) * 0.7, 0.0
    if kind == "click":
        n = int(0.05 * SR)
        return norm(bandpass_fft(rng.standard_normal(n), 2000, 9000) * env_adsr(n, 0.0005, 0.006)), 0.0
    if kind == "shimmer":
        n = int(3.0 * SR)
        t = np.arange(n) / SR
        s = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate((880, 1318.5, 1760, 2637)))
        return norm(s * np.sin(np.pi * t / t[-1]) ** 2) * 0.5, -0.5
    raise ValueError(kind)


def ambience(kind: str, n: int, rng: np.random.Generator) -> np.ndarray:
    t = np.arange(n) / SR
    if kind == "lab":
        s = 0.5 * np.sin(2 * np.pi * 50 * t) + 0.3 * np.sin(2 * np.pi * 100 * t) + 0.15 * np.sin(2 * np.pi * 150 * t)
        return norm(s * (0.8 + 0.2 * np.sin(2 * np.pi * 0.1 * t)) + 0.4 * norm(bandpass_fft(rng.standard_normal(n), 200, 3000)))
    if kind == "corridor":
        air = bandpass_fft(rng.standard_normal(n), 80, 900)
        return norm(air * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t + 1)))
    if kind == "hall":
        return norm(lowpass_fft(rng.standard_normal(n), 300) + 0.2 * np.sin(2 * np.pi * 38 * t))
    if kind == "micro":
        rumble = lowpass_fft(rng.standard_normal(n), 120)
        blips = np.zeros(n)
        for _ in range(int(n / SR * 3)):
            i = int(rng.integers(0, max(1, n - SR // 4)))
            m = SR // 8
            tt = np.arange(m) / SR
            f = rng.uniform(250, 700)
            blips[i:i + m] += np.sin(2 * np.pi * (f + 900 * tt) * tt) * np.exp(-tt * 40)
        return norm(norm(rumble) + 0.35 * norm(blips))
    if kind == "office":
        return norm(bandpass_fft(rng.standard_normal(n), 100, 2500) * 0.5 + 0.2 * np.sin(2 * np.pi * 60 * t))
    return norm(lowpass_fft(rng.standard_normal(n), 90))  # void


def drone(chord: list[float], n: int, mood: str, phase: float) -> np.ndarray:
    t = np.arange(n) / SR + phase
    out = np.zeros((2, n))
    for i, f in enumerate(chord):
        amp = 1 / (1 + i * 0.8)
        for ch, det in ((0, -0.18), (1, 0.21)):
            lfo = 0.75 + 0.25 * np.sin(2 * np.pi * (0.05 + 0.013 * i) * t + i + ch)
            out[ch] += amp * lfo * np.sin(2 * np.pi * (f + det) * t + 0.3 * np.sin(2 * np.pi * 0.2 * t))
    if mood in PULSE:
        out *= 0.65 + 0.35 * (0.5 + 0.5 * np.sin(2 * np.pi * PULSE[mood] * t)) ** 2
    return out


def read_voice(path: Path, n: int) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, dtype="<f4").astype(np.float64)
    out = np.zeros(n)
    out[: min(n, len(v))] = v[:n]
    return out


def duck_envelope(voice: np.ndarray, attack: float = 0.03, release: float = 0.45) -> np.ndarray:
    win = int(0.03 * SR)
    pad = np.pad(voice ** 2, (win // 2, win - win // 2 - 1), mode="edge")
    rms = np.sqrt(np.convolve(pad, np.ones(win) / win, mode="valid"))
    ref = np.percentile(rms[rms > 1e-4], 75) if np.any(rms > 1e-4) else 1.0
    level = np.clip(rms / (ref or 1.0), 0, 1)
    # attack/release smoothing on a decimated envelope for speed
    hop = 240
    lv = level[::hop]
    out = np.zeros_like(lv)
    a = np.exp(-hop / (attack * SR))
    r = np.exp(-hop / (release * SR))
    cur = 0.0
    for i, x in enumerate(lv):
        cur = a * cur + (1 - a) * x if x > cur else r * cur + (1 - r) * x
        out[i] = cur
    return np.interp(np.arange(len(voice)), np.arange(len(out)) * hop, out)


def loudness(path: Path) -> float | None:
    import re
    err = run(["ffmpeg", "-v", "info", "-nostats", "-i", str(path), "-af", "ebur128", "-f", "null", "-"]).stderr
    m = re.search(r"I:\s+(-?[\d.]+) LUFS", err.split("Summary:")[-1])
    return float(m.group(1)) if m else None


def write_wav(path: Path, stereo: np.ndarray) -> None:
    pcm = (np.clip(stereo.T, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--duck-db", type=float, default=9.0, help="music/ambience reduction under speech")
    ap.add_argument("--music-db", type=float, default=-24.0)
    ap.add_argument("--amb-db", type=float, default=-30.0)
    ap.add_argument("--sfx-db", type=float, default=-14.0)
    ap.add_argument("--no-auto", action="store_true")
    ap.add_argument("--under-voice-lu", type=float, default=12.0, help="target: bed integrated loudness this many LU below the voice")
    a = ap.parse_args()
    P = Path(a.project)
    cfg = load_json(P / "data/production-config.json")
    plan = load_json(P / "data/shot-plan.json")
    fps, N = cfg["fps"], cfg["durationFrames"]
    seconds = N / fps
    rng = np.random.default_rng(a.seed)
    bed = Bed(seconds, rng)
    shots = sorted(plan["shots"], key=lambda s: s["startFrame"])
    xf = 0.8  # crossfade seconds
    cues = []

    # score + ambience, per shot with crossfades
    for i, s in enumerate(shots):
        t0, t1 = s["startFrame"] / fps, s["endFrame"] / fps
        a0, a1 = max(0, t0 - xf / 2), min(seconds, t1 + xf / 2)
        n = int((a1 - a0) * SR)
        if n <= 0:
            continue
        tt = np.arange(n) / SR
        fade = np.minimum(1, np.minimum(tt / (xf if i else 0.01), (tt[-1] - tt) / (xf if i < len(shots) - 1 else 0.01)))
        mood = s.get("lighting") if s.get("lighting") in CHORDS else "mystery"
        silent = any((c == "silence") or (isinstance(c, dict) and c.get("type") == "silence") for c in s.get("sound", []))
        g = 0.0 if silent else 1.0
        d = drone(CHORDS[mood], n, mood, a0) * fade * g
        bed.music[:, int(a0 * SR):int(a0 * SR) + n] += d[:, : bed.n - int(a0 * SR)]
        amb = next((c.split(":", 1)[1] for c in s.get("sound", []) if isinstance(c, str) and c.startswith("amb:")), None)
        if amb:
            sig = ambience(amb, n, rng) * fade * g
            bed.add(bed.amb, sig, a0)
            cues.append({"t": round(a0, 3), "shot": s["id"], "type": f"amb:{amb}"})
        cues.append({"t": round(t0, 3), "shot": s["id"], "type": f"score:{mood}" + (" (silence)" if silent else "")})

    # events
    seen = set()
    for s in shots:
        t0 = s["startFrame"] / fps
        events = []
        for c in s.get("sound", []):
            if isinstance(c, str) and not c.startswith("amb:") and c != "silence":
                events.append({"type": c, "at": 0.0, "gain": 0.0})
            elif isinstance(c, dict) and c.get("type") not in (None, "silence"):
                events.append({"type": c["type"], "at": float(c.get("at", 0)), "gain": float(c.get("gain", 0))})
        if not a.no_auto:
            tr = s.get("transitionIn")
            tr = tr.get("type") if isinstance(tr, dict) else tr
            if tr and tr not in ("none", "TODO") and not any(e["type"] == "whoosh" for e in events):
                events.append({"type": "whoosh", "at": 0.0, "gain": -3.0, "auto": True})
            if tr in ("microscope-lens", "anatomical-tunnel", "liquid", "scale-transformation") and not any(e["type"] == "riser" for e in events):
                events.append({"type": "riser", "at": 0.0, "gain": -2.0, "auto": True})
            mood = s.get("lighting")
            if mood in ("triumph", "golden-award", "punchline") and mood not in seen:
                events.append({"type": "boom", "at": 0.0, "gain": -1.0, "auto": True})
            seen.add(mood)
        for e in events:
            try:
                sig, off = sfx(e["type"], rng)
            except ValueError:
                print(f"warning: {s['id']}: unknown sound '{e['type']}' ignored", file=sys.stderr)
                continue
            when = t0 + e["at"] + off
            bed.add(bed.sfx, sig, when, e["gain"], pan=float(rng.uniform(-0.25, 0.25)))
            cues.append({"t": round(t0 + e["at"], 3), "shot": s["id"], "type": e["type"], "auto": e.get("auto", False)})

    # levels (pre-duck): normalise buses to their target peak levels
    mix = norm(bed.music, db(a.music_db + 12)) + norm(bed.amb, db(a.amb_db + 12)) if np.any(bed.amb) else norm(bed.music, db(a.music_db + 12))
    sfx_bus = norm(bed.sfx, db(a.sfx_db + 8)) if np.any(bed.sfx) else bed.sfx
    # gentle fade in/out of the whole bed
    fade_n = int(1.5 * SR)
    ramp = np.ones(bed.n)
    ramp[:fade_n] = np.linspace(0, 1, fade_n)
    ramp[-fade_n:] = np.linspace(1, 0, fade_n)

    voice_path = P / "public" / (cfg["audio"].get("voiceover") or "voiceover.wav")
    duck_report = None
    if voice_path.exists():
        v = read_voice(voice_path, bed.n)
        env = duck_envelope(v)
        g_music = 1 - (1 - db(-a.duck_db)) * env
        g_sfx = 1 - (1 - db(-a.duck_db / 3)) * env
        out = mix * g_music * ramp + sfx_bus * g_sfx
        duck_report = {"duckDb": a.duck_db, "meanMusicGainUnderSpeechDb": round(float(20 * np.log10(np.mean(g_music[env > 0.5]) if np.any(env > 0.5) else 1)), 2)}
    else:
        print("warning: no voiceover found — bed not ducked", file=sys.stderr)
        out = mix * ramp + sfx_bus
    peak = float(np.max(np.abs(out)))
    if peak > db(-3):
        out *= db(-3) / peak
    dest = P / "public" / "sound-bed.wav"
    write_wav(dest, out)
    # self-levelling: place the bed a fixed number of LU under the measured voice (narration always wins)
    if voice_path.exists():
        v_lufs, b_lufs = loudness(voice_path), loudness(dest)
        if v_lufs is not None and b_lufs is not None:
            gain_db = (v_lufs - a.under_voice_lu) - b_lufs
            out = out * db(min(gain_db, 6.0))
            peak = float(np.max(np.abs(out)))
            if peak > db(-3):
                out *= db(-3) / peak
            write_wav(dest, out)
    cfg["audio"]["soundBed"] = "sound-bed.wav"
    write_json(P / "data/production-config.json", cfg)

    report = {"file": "public/sound-bed.wav", "seconds": seconds, "cues": cues, "ducking": duck_report, "bedLUFS": loudness(dest)}
    if voice_path.exists():
        tmp = P / "analysis" / "_mix-check.wav"
        tmp.parent.mkdir(exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(voice_path), "-i", str(dest), "-filter_complex", "[0:a]aformat=channel_layouts=stereo[v];[v][1:a]amix=inputs=2:normalize=0[m]", "-map", "[m]", str(tmp)], check=True)
        report["voiceLUFS"] = loudness(voice_path)
        report["mixLUFS"] = loudness(tmp)
        tmp.unlink(missing_ok=True)
        if report["voiceLUFS"] is not None and report["bedLUFS"] is not None:
            report["voiceOverBedLU"] = round(report["voiceLUFS"] - report["bedLUFS"], 1)
            if report["voiceOverBedLU"] < 10:
                print(f"warning: bed only {report['voiceOverBedLU']} LU under the voice — lower --music-db/--sfx-db", file=sys.stderr)
    write_json(P / "analysis/sound-design.json", report)
    print(f"sound bed: {seconds:.2f}s, {len(cues)} cues → {dest}")
    print(f"  bed {report.get('bedLUFS')} LUFS, voice {report.get('voiceLUFS')} LUFS, mix {report.get('mixLUFS')} LUFS, voice-over-bed {report.get('voiceOverBedLU')} LU")


if __name__ == "__main__":
    main()
