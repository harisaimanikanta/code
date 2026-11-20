#!/usr/bin/env python3
"""Inspect a voiceover: format, exact duration, loudness, peaks/clipping, silences and speech intervals.

  python3 inspect-audio.py VOICEOVER [--out analysis/audio-inspection.json] [--noise-db -35] [--min-silence 0.25]

The voiceover is the master timeline. This script never modifies it.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import decode_mono_f32, exact_duration, ffprobe, need, run, silences, speech_intervals, write_json  # noqa: E402


def loudness(path: Path) -> dict:
    err = run(["ffmpeg", "-v", "info", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    summary = err.split("Summary:")[-1]
    grab = lambda pat: (float(m.group(1)) if (m := re.search(pat, summary)) else None)  # noqa: E731
    return {"integratedLUFS": grab(r"I:\s+(-?[\d.]+) LUFS"), "loudnessRangeLU": grab(r"LRA:\s+(-?[\d.]+) LU"), "truePeakDBFS": grab(r"Peak:\s+(-?[\d.]+) dBFS")}


def peaks(path: Path) -> dict:
    samples, rate = decode_mono_f32(path, rate=48000)
    n = len(samples)
    if n == 0:
        return {"peak": 0.0, "clippedSamples": 0, "rms": 0.0}
    try:
        import numpy as np
        a = np.abs(samples)
        peak = float(a.max())
        clipped = int((a >= 0.999).sum())
        rms = float(np.sqrt(np.mean(samples.astype("f8") ** 2)))
    except ImportError:
        peak = max(abs(x) for x in samples)
        clipped = sum(1 for x in samples if abs(x) >= 0.999)
        rms = (sum(x * x for x in samples) / n) ** 0.5
    import math
    return {"peak": round(peak, 5), "peakDBFS": round(20 * math.log10(peak), 2) if peak > 0 else None, "clippedSamples": clipped, "rmsDBFS": round(20 * math.log10(rms), 2) if rms > 0 else None}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("--out")
    ap.add_argument("--noise-db", type=float, default=-35.0)
    ap.add_argument("--min-silence", type=float, default=0.25)
    a = ap.parse_args()
    need("ffmpeg")
    path = Path(a.audio).resolve()
    if not path.exists():
        sys.exit(f"error: {path} not found")
    info = ffprobe(path)
    st = next((s for s in info["streams"] if s.get("codec_type") == "audio"), None)
    if not st:
        sys.exit("error: no audio stream")
    dur = exact_duration(path)
    sil = silences(path, a.noise_db, a.min_silence)
    speech = speech_intervals(sil, dur)
    sil_clean = [(round(s, 3), round(dur if e != e else e, 3)) for s, e in sil]
    speech_time = sum(e - s for s, e in speech)
    result = {
        "file": str(path),
        "format": info["format"].get("format_name"),
        "codec": st.get("codec_name"),
        "sampleRate": int(st["sample_rate"]),
        "channels": st.get("channels"),
        "channelLayout": st.get("channel_layout"),
        "bitRate": int(info["format"]["bit_rate"]) if info["format"].get("bit_rate") else None,
        "containerDuration": float(info["format"].get("duration", 0)),
        "duration": round(dur, 4),
        "loudness": loudness(path),
        "levels": peaks(path),
        "silenceThresholdDB": a.noise_db,
        "silences": sil_clean,
        "speechIntervals": speech,
        "speechSeconds": round(speech_time, 3),
        "leadingSilence": round(speech[0][0], 3) if speech else None,
        "trailingSilence": round(dur - speech[-1][1], 3) if speech else None,
    }
    warnings = []
    if result["levels"]["clippedSamples"] > 0:
        warnings.append(f"{result['levels']['clippedSamples']} clipped samples in the SOURCE voiceover (preserved as-is; inform the user)")
    if not speech:
        warnings.append("no speech detected above threshold — check --noise-db")
    if abs(result["containerDuration"] - dur) > 0.05:
        warnings.append(f"container duration {result['containerDuration']:.3f}s differs from decoded {dur:.3f}s; using decoded")
    result["warnings"] = warnings
    out = Path(a.out) if a.out else None
    if out:
        write_json(out, result)
    print(f"{path.name}: {result['codec']} {result['sampleRate']} Hz {result['channels']}ch, duration {dur:.3f}s")
    print(f"  loudness {result['loudness']['integratedLUFS']} LUFS, true peak {result['loudness']['truePeakDBFS']} dBFS, clipped samples {result['levels']['clippedSamples']}")
    print(f"  {len(speech)} speech intervals ({speech_time:.1f}s speech), {len(sil_clean)} silences; lead {result['leadingSilence']}s, tail {result['trailingSilence']}s")
    for w in warnings:
        print(f"  ! {w}")
    if out:
        print(f"  wrote {out}")


if __name__ == "__main__":
    main()
