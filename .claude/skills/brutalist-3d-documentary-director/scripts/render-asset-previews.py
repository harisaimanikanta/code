#!/usr/bin/env python3
"""Render a preview image for every visual component in the asset library (its "visual reference").

  python3 render-asset-previews.py --workdir DIR [--library PATH] [--ids ID ...] [--node-modules DIR] [--sheet]

Creates (or reuses) a scratch project in --workdir linked to the library, bundles it once, renders the
AssetPreview composition for each component, stores PNGs in <library>/previews/<id>.png and records
`visualReference` in the manifest. --sheet also writes <library>/previews/_contact-sheet.png.
Previews of the seed are rendered by pointing --library at SKILL/assets.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import SKILL_DIR, load_json, write_json  # noqa: E402

# components that need props to look meaningful, or that are not standalone visuals
PREVIEW_PROPS: dict[str, dict] = {
    "Figure": {"character": "doctor", "actions": [{"type": "pose", "pose": "gesture", "start": 0, "end": 1000}]},
    "AssembleBlocks": {"start": 0, "end": 30, "blocks": [{"position": [x, 0, z], "size": [1.2, 2 + (x + z) % 3, 1.2]} for x in (-2, 0, 2) for z in (-2, 0)]},
    "MaterialMorphSlab": {"start": 0, "end": 60},
    "ScaleTransform": None,  # needs children
    "LightingDirector": None,
    "CameraRig": None,
    "AwardPlinth": {"revealStart": 0, "revealEnd": 1000},
    "Door": {"openStart": 0, "openEnd": 40},
    "FloatingPages": {"appearAt": 0},
    "Embers": {"start": 0},
    "MicrobeSwarm": {"count": 80, "bounds": [6, 3, 6]},
    "DustMotes": {"bounds": [3, 2, 3], "count": 300, "size": 0.03},
    "ParticleVeil": {"width": 4, "height": 3, "depth": 1, "count": 600},
    "HazeVolume": {"size": [4, 4], "opacity": 0.2},
    "SpotPool": {"position": [0, 3, 1], "target": [0, 0, 0]},
}
PRESET_FOR = {"biological": "microscopic-green", "objects": "low-key-lab", "props": "low-key-lab", "environments": "industrial-red", "architecture": "industrial-red", "transitions": "discovery", "particles": "mystery", "lighting": "industrial-red", "characters": "high-contrast-character"}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--library")
    ap.add_argument("--ids", nargs="*")
    ap.add_argument("--node-modules", help="existing node_modules to copy instead of npm install")
    ap.add_argument("--sheet", action="store_true")
    ap.add_argument("--frame", type=int, default=45)
    a = ap.parse_args()
    lib = Path(a.library).resolve() if a.library else Path(os.environ.get("BRUTALIST_ASSET_LIBRARY", Path.home() / ".brutalist-3d-studio/library")).resolve()
    if not (lib / "asset-manifest.json").exists():
        sys.exit(f"error: no library at {lib}")
    work = Path(a.workdir).resolve()
    proj = work / "preview-project"
    if not (proj / "package.json").exists():
        subprocess.run([sys.executable, str(SKILL_DIR / "scripts/new-project.py"), str(proj), "--title", "Asset previews", "--library", str(lib), "--mode", "link", "--all-assets", "--force"], check=True)
    if not (proj / "node_modules").exists():
        if a.node_modules:
            shutil.copytree(a.node_modules, proj / "node_modules", symlinks=True)
        else:
            subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=proj, check=True)
    subprocess.run(["node", "scripts/bake-camera.ts"], cwd=proj, check=True, capture_output=True)
    subprocess.run(["npx", "remotion", "bundle", "src/index.ts", "--out-dir", "build", "--log=error"], cwd=proj, check=True)
    hs = sorted(glob.glob("/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell")) or sorted(glob.glob(str(Path.home() / ".cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell")))
    browser = os.environ.get("REMOTION_BROWSER") or (hs[0] if hs else None)
    data = load_json(lib / "asset-manifest.json")
    out_dir = lib / "previews"
    out_dir.mkdir(exist_ok=True)
    done, skipped = [], []
    for asset in data["assets"]:
        if asset.get("format") != "tsx-r3f-component" or (a.ids and asset["id"] not in a.ids):
            continue
        comp = asset["exports"][0] if asset.get("exports") else None
        # pick the export matching the asset name when a file exports several components
        for e in asset.get("exports", []):
            if e.lower() in asset["name"].lower().replace(" ", ""):
                comp = e
        if not comp or (comp in PREVIEW_PROPS and PREVIEW_PROPS[comp] is None):
            skipped.append(asset["id"])
            continue
        props = {"component": comp, "props": PREVIEW_PROPS.get(comp, {}), "preset": PRESET_FOR.get(asset["category"], "industrial-red"), "label": asset["name"]}
        dest = out_dir / f"{asset['id']}.png"
        cmd = ["npx", "remotion", "still", "build", "AssetPreview", str(dest), f"--frame={a.frame}", f"--props={json.dumps(props)}", "--gl=angle", "--log=error"]
        if browser:
            cmd.append(f"--browser-executable={browser}")
        r = subprocess.run(cmd, cwd=proj, capture_output=True, text=True)
        if r.returncode == 0 and dest.exists():
            asset["visualReference"] = f"previews/{dest.name}"
            done.append(asset["id"])
            print(f"  ✔ {asset['id']}")
        else:
            skipped.append(asset["id"])
            print(f"  ✘ {asset['id']}: {(r.stderr or r.stdout).strip().splitlines()[-1:] }")
    write_json(lib / "asset-manifest.json", data)
    if a.sheet and done:
        files = [str(out_dir / f"{i}.png") for i in done]
        cols = 6
        rows = (len(files) + cols - 1) // cols
        inputs = sum((["-i", f] for f in files), [])
        pad = cols * rows - len(files)
        filt = "".join(f"[{i}]scale=240:240[s{i}];" for i in range(len(files)))
        filt += "".join(f"[s{i}]" for i in range(len(files)))
        if pad:
            filt += "".join(f"[p{i}]" for i in range(pad))
            filt = "".join(f"color=c=black:s=240x240:d=1[p{i}];" for i in range(pad)) + filt
        filt += f"xstack=inputs={cols * rows}:layout=" + "|".join(f"{(k % cols) * 240}_{(k // cols) * 240}" for k in range(cols * rows))
        subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", filt, "-frames:v", "1", str(out_dir / "_contact-sheet.png")], check=True)
        print(f"contact sheet: {out_dir / '_contact-sheet.png'}")
    print(f"{len(done)} previews rendered, {len(skipped)} skipped (non-visual or need children): {skipped}")


if __name__ == "__main__":
    main()
