#!/usr/bin/env python3
"""Scaffold a new, independent documentary production project.

  python3 new-project.py DEST [--title T] [--voiceover FILE] [--script FILE] [--storyboard IMG ...]
                              [--references FILE ...] [--fps 30] [--aspect 16:9|9:16|1:1|4:5] [--height 1080]
                              [--library PATH] [--mode vendor|link] [--assets ID ...] [--all-assets] [--install]

What it does
  1. copies templates/project-template → DEST (refuses to overwrite a non-empty DEST unless --force)
  2. copies every supplied input untouched into DEST/inputs/ (the originals are never modified)
  3. if a voiceover is given: decodes it losslessly to public/voiceover.wav (48 kHz PCM, original channel count),
     measures exact duration with ffprobe and sets durationFrames = ceil(duration * fps)
  4. writes a placeholder one-move shot plan covering the full duration (replace via generate-timeline.py)
  5. vendors (or links) the requested assets + required core assets from the persistent library, writes asset-lock.json
  6. optionally runs `npm install`
"""
from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SKILL / "scripts"))
from _common import exact_duration  # noqa: E402
TEMPLATE = SKILL / "templates" / "project-template"
ASPECTS = {"16:9": (16, 9), "9:16": (9, 16), "1:1": (1, 1), "4:5": (4, 5)}


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, text=True, capture_output=True, **kw)


def probe_duration(path: Path) -> float:
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)]).stdout
    return float(json.loads(out)["format"]["duration"])


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dest")
    ap.add_argument("--title", default="Untitled Brutalist Documentary")
    ap.add_argument("--voiceover")
    ap.add_argument("--script")
    ap.add_argument("--storyboard", nargs="*", default=[])
    ap.add_argument("--references", nargs="*", default=[])
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--aspect", default="16:9", choices=list(ASPECTS))
    ap.add_argument("--height", type=int, default=1080, help="short side for portrait/landscape, e.g. 1080")
    ap.add_argument("--library")
    ap.add_argument("--mode", default="vendor", choices=["vendor", "link"])
    ap.add_argument("--assets", nargs="*", default=[])
    ap.add_argument("--all-assets", action="store_true")
    ap.add_argument("--install", action="store_true")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    dest = Path(a.dest).resolve()
    if dest.exists() and any(dest.iterdir()) and not a.force:
        sys.exit(f"error: {dest} exists and is not empty (use --force to scaffold into it)")
    shutil.copytree(TEMPLATE, dest, dirs_exist_ok=True, ignore=shutil.ignore_patterns("node_modules", "out", "camera-track.json"))
    (dest / "inputs").mkdir(exist_ok=True)
    (dest / "docs").mkdir(exist_ok=True)
    (dest / "analysis").mkdir(exist_ok=True)

    inputs = {"voiceover": None, "script": None, "storyboard": [], "references": []}
    for kind, files in (("script", [a.script] if a.script else []), ("storyboard", a.storyboard), ("references", a.references), ("voiceover", [a.voiceover] if a.voiceover else [])):
        for f in files:
            src = Path(f).resolve()
            if not src.exists():
                sys.exit(f"error: input not found: {src}")
            dst = dest / "inputs" / src.name
            shutil.copy2(src, dst)
            rel = dst.relative_to(dest).as_posix()
            if isinstance(inputs[kind], list):
                inputs[kind].append(rel)
            else:
                inputs[kind] = rel

    w_ratio, h_ratio = ASPECTS[a.aspect]
    short = a.height
    if w_ratio >= h_ratio:
        height, width = short, int(round(short * w_ratio / h_ratio / 2) * 2)
    else:
        width, height = short, int(round(short * h_ratio / w_ratio / 2) * 2)

    cfg_path = dest / "data" / "production-config.json"
    cfg = json.loads(cfg_path.read_text())
    cfg.update(title=a.title, fps=a.fps, width=width, height=height)
    cfg["library"]["linkMode"] = a.mode
    cfg["inputs"] = inputs

    if a.voiceover:
        src = Path(a.voiceover).resolve()
        out = dest / "public" / "voiceover.wav"
        # decode to 48 kHz PCM for the renderer (the untouched original stays in inputs/)
        run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-vn", "-ar", "48000", "-c:a", "pcm_s24le", str(out)])
        # exact decoded duration (container metadata of MP3/M4A includes encoder padding)
        dur = exact_duration(out)
        frames = math.ceil(dur * a.fps)
        cfg["durationFrames"] = frames
        cfg["audio"].update(voiceover="voiceover.wav", voiceoverDurationSec=round(dur, 4))
        plan = {
            "version": 1, "fps": a.fps, "durationFrames": frames,
            "$comment": "PLACEHOLDER — replace with generate-timeline.py output, then direct every shot.",
            "shots": [{"id": "S001", "audioStart": 0, "audioEnd": round(dur, 3), "startFrame": 0, "endFrame": frames, "narration": "",
                       "visualPurpose": "placeholder", "environment": "lab", "characters": [], "objects": [], "lighting": "industrial-red",
                       "camera": {"move": "orbit", "target": [0, 1.2, 0], "radius": 6, "sweepDeg": 90, "height": 1.0},
                       "animation": "", "transitionIn": "none", "transitionOut": "none", "sound": [], "subtitle": None}],
        }
        (dest / "data" / "shot-plan.json").write_text(json.dumps(plan, indent=1) + "\n")
        (dest / "data" / "world-layout.json").write_text(json.dumps({"version": 1, "units": "meters", "anchors": {}, "zones": [{"id": "lab", "component": "Laboratory", "position": [0, 0, 0]}], "objects": [], "actors": [], "occluders": []}, indent=1) + "\n")
        print(f"voiceover: {dur:.3f}s -> {frames} frames @ {a.fps}fps")
    cfg_path.write_text(json.dumps(cfg, indent=1) + "\n")

    lib_cmd = [sys.executable, str(SKILL / "scripts" / "asset-library.py")]
    if a.library:
        lib_cmd += ["--library", a.library]
    use = lib_cmd + ["use", str(dest), "--mode", a.mode] + (["--all"] if a.all_assets or not a.assets else a.assets)
    r = subprocess.run(use, text=True, capture_output=True)
    sys.stdout.write(r.stdout)
    sys.stderr.write(r.stderr)
    if r.returncode:
        sys.exit("error: asset vendoring failed")

    if a.install:
        print("npm install …")
        subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=dest, check=True)
    print(f"project ready: {dest}\n  {width}x{height} @ {a.fps}fps, {cfg['durationFrames']} frames\n  next: analyse audio → plan → bake (npm run bake) → validate → preview")


if __name__ == "__main__":
    main()
