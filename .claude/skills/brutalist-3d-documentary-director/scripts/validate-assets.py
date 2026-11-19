#!/usr/bin/env python3
"""Validate an asset library manifest, or a project's use of the library.

  python3 validate-assets.py --library [PATH]      validate a library (default: persistent library, else the skill seed)
  python3 validate-assets.py --seed                 validate the skill seed library
  python3 validate-assets.py --project DIR          validate a project: lock ↔ vendored files, world-layout components,
                                                    character / lighting / material presets referenced by the project

Library checks: required metadata fields on every asset, unique ids, valid categories, source files exist,
declared exports exist in source, dependencies exist and match real imports, preset entries exist in their
data files, no orphan source files, every .ts/.tsx asset parses imports that resolve.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import Report, SKILL_DIR, load_json  # noqa: E402

REQUIRED = ["id", "name", "category", "description", "source", "exports", "format", "scale", "materials", "dependencies", "reuse", "version", "tags"]
CATEGORIES = {"core", "rendering", "characters", "environments", "architecture", "objects", "materials", "textures", "lighting", "particles", "biological", "props", "camera-rigs", "transitions"}
IMPORT_RE = re.compile(r"""(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"](\.{1,2}/[^'"]+)['"]""")
EXPORT_RE = re.compile(r"export\s+(?:async\s+)?(?:function|const|class|let)\s+([A-Za-z0-9_]+)")
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")


def resolve(src: Path, spec: str) -> Path | None:
    base = (src.parent / spec).resolve()
    for c in [base, base.with_name(base.name + ".ts"), base.with_name(base.name + ".tsx"), base.with_name(base.name + ".json")]:
        if c.is_file():
            return c
    return None


def validate_library(root: Path, R: Report) -> dict:
    mpath = root / "asset-manifest.json"
    if not mpath.exists():
        R.fail(f"no asset-manifest.json in {root}")
        return {}
    data = load_json(mpath)
    assets = data.get("assets", [])
    ids = [a.get("id") for a in assets]
    dup = {i for i in ids if ids.count(i) > 1}
    R.fail(f"duplicate asset ids: {sorted(dup)}") if dup else R.ok(f"{len(ids)} unique asset ids")
    byid = {a["id"]: a for a in assets if "id" in a}
    sources = {}
    missing_fields, bad_cat, bad_ver = [], [], []
    for a in assets:
        m = [k for k in REQUIRED if k not in a]
        if m:
            missing_fields.append(f"{a.get('id')}: {m}")
        if a.get("category") not in CATEGORIES:
            bad_cat.append(a.get("id"))
        if not SEMVER.match(str(a.get("version", ""))):
            bad_ver.append(a.get("id"))
        sources.setdefault(a.get("source"), []).append(a)
    R.fail(f"assets missing metadata: {missing_fields[:6]}") if missing_fields else R.ok("every asset has id, name, category, description, source, format, scale, materials, dependencies, reuse, version, tags")
    R.fail(f"invalid categories: {bad_cat}") if bad_cat else R.ok("categories valid")
    R.fail(f"invalid versions: {bad_ver}") if bad_ver else R.ok("semantic versions valid")

    missing_src, missing_exp, bad_deps, unresolved, undeclared = [], [], [], [], []
    for src, group in sources.items():
        f = root / src
        if not f.exists():
            missing_src.append(src)
            continue
        if f.suffix in ('.woff', '.woff2', '.ttf', '.otf', '.png', '.jpg', '.glb', '.ktx2', '.hdr', '.bin'):
            continue  # binary asset: existence checked above
        text = f.read_text()
        exported = set(EXPORT_RE.findall(text))
        if f.suffix == ".json":
            try:
                json.loads(text)
            except json.JSONDecodeError as e:
                unresolved.append(f"{src}: invalid JSON ({e})")
        for a in group:
            if a.get("format") == "preset":
                pid = a.get("preset")
                if f.suffix == ".json":
                    key = "presets"
                    if pid not in load_json(f).get(key, {}):
                        missing_exp.append(f"{a['id']}: preset {pid} not in {src}")
                elif pid and pid not in text:
                    missing_exp.append(f"{a['id']}: preset {pid} not in {src}")
                continue
            for e in a.get("exports", []):
                if e not in exported:
                    missing_exp.append(f"{a['id']}: export {e} not found in {src}")
            for d in a.get("dependencies", []):
                if d not in byid:
                    bad_deps.append(f"{a['id']} → {d}")
        if f.suffix in (".ts", ".tsx"):
            dep_files = {x["source"] for a in group for d in a.get("dependencies", []) if (x := byid.get(d))}
            for spec in IMPORT_RE.findall(text):
                t = resolve(f, spec)
                if t is None:
                    unresolved.append(f"{src}: {spec}")
                    continue
                rel = t.relative_to(root.resolve()).as_posix()
                if rel != src and rel not in dep_files:
                    undeclared.append(f"{src} imports {rel} (not a declared dependency — run asset-library.py reindex)")
    import hashlib
    stale = sorted({a["id"] for a in assets if a.get("sha256") and (root / a["source"]).exists() and hashlib.sha256((root / a["source"]).read_bytes()).hexdigest() != a["sha256"] and a.get("format") != "preset"})
    R.fail(f"manifest hashes stale for {stale[:6]} — run asset-library.py reindex") if stale else R.ok("manifest hashes match source files")
    R.fail(f"missing source files: {missing_src}") if missing_src else R.ok("all source files exist")
    R.fail(f"declared exports/presets missing: {missing_exp[:8]}") if missing_exp else R.ok("all declared exports and presets exist in their sources")
    R.fail(f"unknown dependencies: {bad_deps[:8]}") if bad_deps else R.ok("all dependencies resolve to manifest assets")
    R.fail(f"unresolved imports: {unresolved[:8]}") if unresolved else R.ok("all relative imports resolve")
    R.fail(f"undeclared dependencies: {undeclared[:6]}") if undeclared else R.ok("dependency graph matches real imports")
    # orphans
    declared = set(sources) | {f for a in assets for f in a.get("files", [])}
    orphans = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".") and d != "node_modules"]
        for fn in filenames:
            rel = (Path(dirpath) / fn).relative_to(root).as_posix()
            if rel == "asset-manifest.json" or fn.endswith((".md", ".png", ".jpg", ".txt")):
                continue
            if rel not in declared:
                orphans.append(rel)
    R.warn(f"files not registered in manifest: {orphans[:8]}") if orphans else R.ok("no unregistered asset files")
    # placeholders: refuse empty/near-empty modules
    tiny = [s for s in sources if (root / s).exists() and (root / s).stat().st_size < 200]
    R.fail(f"placeholder-sized asset files: {tiny}") if tiny else R.ok("no placeholder asset files")
    return byid


def validate_project(P: Path, R: Report) -> None:
    import hashlib
    lock_p = P / "asset-lock.json"
    if not lock_p.exists():
        R.fail("asset-lock.json missing — run asset-library.py use PROJECT")
        return
    lock = load_json(lock_p)
    lib = P / "src/library"
    mode = lock.get("mode", "vendor")
    bad = []
    for aid, info in lock["assets"].items():
        f = lib / info["source"]
        if not f.exists():
            bad.append(f"{aid}: {info['source']} missing")
        elif mode == "vendor" and info.get("sha256") and hashlib.sha256(f.read_bytes()).hexdigest() != info["sha256"]:
            bad.append(f"{aid}: vendored file differs from locked version (edited in project? promote or re-run use)")
    R.fail(f"lock problems: {bad[:6]}") if bad else R.ok(f"{len(lock['assets'])} locked assets present ({mode} mode) and match their hashes")
    idx = P / "src/library-index.ts"
    comps = set(re.findall(r"\b([A-Z][A-Za-z0-9]+)\b", idx.read_text())) if idx.exists() else set()
    pa = P / "src/project-assets"
    proj_comps = set()
    if pa.exists():
        for f in pa.rglob("*.ts*"):
            proj_comps |= set(EXPORT_RE.findall(f.read_text()))
    layout = load_json(P / "data/world-layout.json")
    ents = [e for k in ("zones", "objects", "actors") for e in layout.get(k, [])]

    def walk(es):
        for e in es:
            yield e
            yield from walk(e.get("children", []))
    unknown = sorted({e["component"] for e in walk(ents) if e["component"] not in comps | proj_comps})
    R.fail(f"world-layout components not available: {unknown}") if unknown else R.ok(f"all {len(list(walk(ents)))} world entities use available components")
    dup_proj = sorted(proj_comps & comps)
    if dup_proj:
        R.warn(f"project assets shadow library components (duplication): {dup_proj}")
    # character presets
    presets_ts = (lib / "characters/presets.ts").read_text() if (lib / "characters/presets.ts").exists() else ""
    known_chars = set(re.findall(r"def\('([a-z0-9-]+)'", presets_ts))
    bad_chars = []
    for e in walk(ents):
        ch = (e.get("props") or {}).get("character")
        if isinstance(ch, str) and ch.split("+")[0].split("@")[0] not in known_chars:
            bad_chars.append(f"{e['id']}: {ch}")
    R.fail(f"unknown character presets: {bad_chars}") if bad_chars else R.ok("character presets resolve")
    # material presets referenced in layout props
    mats_ts = (lib / "materials/materials.ts").read_text() if (lib / "materials/materials.ts").exists() else ""
    bad_m = [f"{e['id']}: {v}" for e in walk(ents) for k, v in (e.get("props") or {}).items() if k in ("material", "color") and isinstance(v, str) and not v.startswith("#") and f"'{v}'" not in mats_ts and f" {v}:" not in mats_ts]
    R.fail(f"unknown material presets: {bad_m}") if bad_m else R.ok("material presets resolve")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--library", nargs="?", const="")
    g.add_argument("--seed", action="store_true")
    g.add_argument("--project")
    ap.add_argument("--json-out")
    a = ap.parse_args()
    R = Report("asset validation")
    if a.project:
        validate_project(Path(a.project), R)
    else:
        if a.seed:
            root = SKILL_DIR / "assets"
        elif a.library:
            root = Path(a.library).expanduser()
        else:
            env = os.environ.get("BRUTALIST_ASSET_LIBRARY")
            root = Path(env).expanduser() if env else Path.home() / ".brutalist-3d-studio/library"
            if not (root / "asset-manifest.json").exists():
                print(f"note: no persistent library at {root}; validating the seed", file=sys.stderr)
                root = SKILL_DIR / "assets"
        validate_library(root, R)
    R.finish(Path(a.json_out) if a.json_out else None)


if __name__ == "__main__":
    main()
