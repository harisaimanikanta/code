#!/usr/bin/env python3
"""Timing analysis: exact frame count, pause classification, speaking rate, recommended beat/shot counts.

  python3 analyze-duration.py VOICEOVER --fps 30 [--inspection analysis/audio-inspection.json]
                              [--transcript analysis/transcript.json] [--out analysis/duration.json]

Pause classes (seconds): micro < 0.35 ≤ breath < 0.8 ≤ sentence < 1.5 ≤ dramatic.
Beat guidance: one meaningful visual beat per ~1.6–2.6 s of narration (≈100–150 for a 4–5 min film);
camera moves (shots) last ~3–8 s and may span several beats and sentences.
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import exact_duration, load_json, silences, speech_intervals, write_json  # noqa: E402


def classify(d: float) -> str:
    return "micro" if d < 0.35 else "breath" if d < 0.8 else "sentence" if d < 1.5 else "dramatic"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--inspection")
    ap.add_argument("--transcript")
    ap.add_argument("--out")
    a = ap.parse_args()
    path = Path(a.audio)
    if a.inspection and Path(a.inspection).exists():
        ins = load_json(Path(a.inspection))
        dur, sil, speech = ins["duration"], [tuple(x) for x in ins["silences"]], [tuple(x) for x in ins["speechIntervals"]]
    else:
        dur = exact_duration(path)
        sil = [(s, dur if e != e else e) for s, e in silences(path)]
        speech = speech_intervals(silences(path), dur)
    frames = math.ceil(dur * a.fps - 1e-9)
    pauses = []
    for s, e in sil:
        if s <= 0.01 or e >= dur - 0.01:
            continue  # leading / trailing silence are not pauses
        d = e - s
        pauses.append({"start": round(s, 3), "end": round(e, 3), "duration": round(d, 3), "class": classify(d), "startFrame": round(s * a.fps), "endFrame": round(e * a.fps)})
    speech_s = sum(e - s for s, e in speech)
    words = None
    if a.transcript and Path(a.transcript).exists():
        tr = load_json(Path(a.transcript))
        words = len([w for w in tr.get("words", []) if any(c.isalnum() for c in w.get("text", ""))])
    wpm = round(words / (speech_s / 60), 1) if words and speech_s > 0 else None
    beats_lo, beats_hi = max(1, round(dur / 2.6)), max(1, round(dur / 1.6))
    shots_lo, shots_hi = max(1, round(dur / 8)), max(1, round(dur / 3))
    result = {
        "duration": round(dur, 4), "fps": a.fps, "durationFrames": frames,
        "frameDuration": round(1 / a.fps, 6), "lastFrameEndsAt": round(frames / a.fps, 4),
        "speechSeconds": round(speech_s, 3), "speechRatio": round(speech_s / dur, 3) if dur else 0,
        "words": words, "wordsPerMinute": wpm,
        "pauses": pauses,
        "pauseCounts": {k: sum(1 for p in pauses if p["class"] == k) for k in ("micro", "breath", "sentence", "dramatic")},
        "dramaticPauses": [p for p in pauses if p["class"] == "dramatic"],
        "recommendedBeats": [beats_lo, beats_hi],
        "recommendedCameraMoves": [shots_lo, shots_hi],
        "minimumOrbitalFrames": math.ceil(frames * 0.30),
    }
    if a.out:
        write_json(Path(a.out), result)
    print(f"duration {dur:.4f}s → {frames} frames @ {a.fps}fps (last frame ends {frames / a.fps:.4f}s)")
    print(f"speech {speech_s:.1f}s ({result['speechRatio'] * 100:.0f}%), wpm {wpm}")
    print(f"pauses: {result['pauseCounts']}; dramatic at {[p['start'] for p in result['dramaticPauses']]}")
    print(f"recommended: {beats_lo}–{beats_hi} visual beats, {shots_lo}–{shots_hi} camera moves, ≥{result['minimumOrbitalFrames']} orbital frames")


if __name__ == "__main__":
    main()
