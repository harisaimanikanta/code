#!/usr/bin/env python3
"""Validate a rendered video against the production config, the original voiceover and the subtitles.

  python3 validate-video.py PROJECT VIDEO.mp4 [--preview] [--json-out analysis/qc-video.json]

Checks: resolution / aspect ratio / frame rate / codec / pixel format / duration (full renders);
audio stream present, full voiceover length, no clipping, ending intact; unintended black frames
(blackdetect); frozen / static frames (freezedetect — would betray a stationary camera); hard cuts
(scene-change score); subtitle cue sanity. --preview relaxes duration checks for partial renders.
"""
from __future__ import annotations

import argparse
import re
import sys
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import Report, ffprobe, load_json, run  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project")
    ap.add_argument("video")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--json-out")
    ap.add_argument("--cut-threshold", type=float, default=0.45)
    a = ap.parse_args()
    P = Path(a.project)
    V = Path(a.video)
    cfg = load_json(P / "data/production-config.json")
    R = Report(f"video validation: {V.name}")
    info = ffprobe(V)
    vs = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    au = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    if not vs:
        R.fail("no video stream")
        R.finish()
    fps = float(Fraction(vs["avg_frame_rate"])) if vs.get("avg_frame_rate", "0/0") != "0/0" else 0
    W, H = vs["width"], vs["height"]
    exp_ratio = cfg["width"] / cfg["height"]
    (R.ok if abs(W / H - exp_ratio) < 0.01 else R.fail)(f"aspect ratio {W}x{H} ({W / H:.3f}) vs expected {exp_ratio:.3f}")
    if a.preview:
        R.ok(f"preview resolution {W}x{H}") if (W, H) != (cfg["width"], cfg["height"]) else R.ok("full resolution")
    else:
        (R.ok if (W, H) == (cfg["width"], cfg["height"]) else R.fail)(f"resolution {W}x{H} (expected {cfg['width']}x{cfg['height']})")
    (R.ok if abs(fps - cfg["fps"]) < 0.01 else R.fail)(f"frame rate {fps:.3f} (expected {cfg['fps']})")
    (R.ok if vs["codec_name"] == "h264" else R.warn)(f"video codec {vs['codec_name']}")
    (R.ok if vs.get("pix_fmt") == "yuv420p" else R.warn)(f"pixel format {vs.get('pix_fmt')} (yuv420p for broad compatibility)")
    vdur = float(vs.get("duration") or info["format"]["duration"])
    expected = cfg["durationFrames"] / cfg["fps"]
    if not a.preview:
        (R.ok if abs(vdur - expected) <= 1.5 / cfg["fps"] else R.fail)(f"video duration {vdur:.3f}s (expected {expected:.3f}s)")

    # audio
    vo = cfg["audio"].get("voiceover")
    if vo:
        if not au:
            R.fail("no audio stream (voiceover missing)")
        else:
            adur = float(au.get("duration") or info["format"]["duration"])
            vodur = cfg["audio"].get("voiceoverDurationSec") or 0
            if not a.preview:
                (R.ok if adur + 1 / cfg["fps"] >= vodur else R.fail)(f"audio {adur:.3f}s covers the full voiceover ({vodur:.3f}s) — ending intact")
            err = run(["ffmpeg", "-v", "info", "-nostats", "-i", str(V), "-map", "0:a:0", "-af", "astats=metadata=0,ebur128=peak=true", "-f", "null", "-"]).stderr
            peaks = [float(x) for x in re.findall(r"Peak level dB:\s*(-?[\d.]+|-inf)", err) if x != "-inf"]
            tp = re.search(r"Peak:\s+(-?[\d.]+) dBFS", err.split("Summary:")[-1])
            lufs = re.search(r"I:\s+(-?[\d.]+) LUFS", err.split("Summary:")[-1])
            peak = max(peaks) if peaks else None
            (R.ok if peak is not None and peak < -0.1 else R.fail)(f"no clipping (sample peak {peak} dBFS, true peak {tp.group(1) if tp else '?'} dBFS)")
            if lufs:
                L = float(lufs.group(1))
                (R.ok if -20 <= L <= -12 else R.warn)(f"integrated loudness {L} LUFS (web delivery target ≈ -16 to -14)")
            # silence at the end of the voice region would indicate truncation
            if not a.preview and vodur > 2:
                tail = run(["ffmpeg", "-v", "info", "-nostats", "-ss", f"{max(0, vodur - 3):.3f}", "-t", "3", "-i", str(V), "-map", "0:a:0", "-af", "volumedetect", "-f", "null", "-"]).stderr
                mv = re.search(r"max_volume:\s*(-?[\d.]+) dB", tail)
                R.ok(f"final 3 s of narration present (max {mv.group(1)} dB)") if mv and float(mv.group(1)) > -60 else R.warn("final 3 s of the voice region is near-silent — confirm the ending is complete")
    else:
        R.warn("no voiceover configured")

    # black / frozen frames / hard cuts
    err = run(["ffmpeg", "-v", "info", "-nostats", "-i", str(V), "-map", "0:v:0", "-vf",
               f"blackdetect=d=0.15:pix_th=0.06,freezedetect=n=0.0015:d=0.6,select='gt(scene,{a.cut_threshold})',metadata=print:file=-", "-f", "null", "-"]).stderr
    blacks = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", err)
    occl = [(o.get("frames")) for o in load_json(P / "data/world-layout.json").get("occluders", []) if o.get("frames")]
    unexplained = []
    for s, e in blacks:
        s, e = float(s), float(e)
        if not any(fr and fr[0] / cfg["fps"] - 0.5 <= s and e <= fr[1] / cfg["fps"] + 0.5 for fr in occl):
            unexplained.append((round(s, 2), round(e, 2)))
    R.fail(f"unintended black segments: {unexplained[:6]}") if unexplained else R.ok(f"no unintended black frames ({len(blacks)} intentional occlusion fills)")
    freezes = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", err)]
    # a full-frame occluder fill (declared camera-through-object window) is intentionally uniform for a few frames
    unexplained_f = [round(x, 2) for x in freezes if not any(fr and fr[0] / cfg["fps"] - 0.5 <= x <= fr[1] / cfg["fps"] + 0.5 for fr in occl)]
    R.fail(f"frozen/static picture at {unexplained_f[:6]} s — camera or animation stopped") if unexplained_f else R.ok(f"no frozen/static picture segments ({len(freezes) - len(unexplained_f)} inside declared occluder windows)")
    cuts = re.findall(r"pts_time:([\d.]+)", err)
    (R.ok if not cuts else R.warn)(f"{len(cuts)} high scene-change frames (possible hard cuts) at {cuts[:8]} s" if cuts else "no hard-cut signatures (scene-change score below threshold)")

    # subtitles
    subs = load_json(P / "data/subtitles.json").get("cues", [])
    bad = [c for c in subs if c["end"] <= c["start"] or c["end"] - c["start"] < 0.5 or c["end"] > expected + 0.05]
    overl = [i for i in range(1, len(subs)) if subs[i]["start"] < subs[i - 1]["end"] - 1e-3]
    if subs:
        (R.ok if not bad and not overl else R.fail)(f"{len(subs)} subtitle cues; invalid {len(bad)}, overlapping {len(overl)}")
        long = [c["text"] for c in subs if len(c["text"]) > 84]
        if long:
            R.warn(f"{len(long)} subtitle cues longer than 2 lines")
    R.finish(Path(a.json_out) if a.json_out else None)


if __name__ == "__main__":
    main()
