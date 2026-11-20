#!/usr/bin/env python3
"""Persistent, versioned 3D asset library manager for brutalist-3d-documentary-director.

The skill ships a SEED library (<skill>/assets). Productions use a PERSISTENT library whose location
is configurable (never assumed to be the working directory):

    --library PATH  >  $BRUTALIST_ASSET_LIBRARY  >  ~/.brutalist-3d-studio/library

Commands
  path                         print the resolved library path (and whether it exists)
  init                         create the persistent library from the seed (or merge new seed assets)
  reindex                      rebuild derived manifest data: import dependencies, hashes, preset entries
  list [--category C]          list assets
  search QUERY [--limit N]     ranked search over id/name/tags/description  (ALWAYS search before building)
  show ID                      full manifest entry
  add FILE --id --category --name --description [--exports A,B] [--tags ..] [--reuse ..] [--scale ..]
  update ID FILE [--bump patch|minor|major] [--note ..]   new version; old file archived in .versions/
  use PROJECT [IDS...] [--all] [--mode vendor|link]       put assets (+deps) into PROJECT/src/library, write asset-lock.json
  promote PROJECT FILE --id ... (same flags as add)        move a project asset into the shared library
  verify-lock PROJECT          report drift between a project's asset-lock.json and the library
  export --out FILE.tar.gz     portable package of the whole library (for ephemeral environments)
  import FILE.tar.gz           merge a package into the library (never overwrites; conflicting files are versioned)

Exit code 0 on success, 1 on error. Standard library only.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
SEED = SKILL_DIR / "assets"
MANIFEST = "asset-manifest.json"
REQUIRED_FIELDS = ["id", "name", "category", "description", "source", "exports", "format", "scale",
                   "materials", "dependencies", "reuse", "version", "tags"]
CATEGORIES = ["core", "rendering", "characters", "environments", "architecture", "objects", "materials", "textures",
              "lighting", "particles", "biological", "props", "camera-rigs", "transitions"]
IMPORT_RE = re.compile(r"""(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"](\.{1,2}/[^'"]+)['"]""")


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def library_path(arg: str | None) -> Path:
    if arg:
        return Path(arg).expanduser().resolve()
    env = os.environ.get("BRUTALIST_ASSET_LIBRARY")
    if env:
        return Path(env).expanduser().resolve()
    return (Path.home() / ".brutalist-3d-studio" / "library").resolve()


def readable_root(arg: str | None) -> Path:
    """Library if it exists, otherwise the read-only seed."""
    lib = library_path(arg)
    if (lib / MANIFEST).exists():
        return lib
    print(f"note: persistent library not initialised at {lib}; reading the skill seed (run `init`).", file=sys.stderr)
    return SEED


def load(root: Path) -> dict:
    p = root / MANIFEST
    if not p.exists():
        die(f"no {MANIFEST} in {root}")
    return json.loads(p.read_text())


def save(root: Path, data: dict) -> None:
    (root / MANIFEST).write_text(json.dumps(data, indent=1) + "\n")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def resolve_import(src: Path, spec: str) -> Path | None:
    base = (src.parent / spec).resolve()
    for cand in [base, *(base.with_name(base.name + ext) for ext in (".ts", ".tsx", ".json")), base / "index.ts"]:
        if cand.is_file():
            return cand
    return None


def file_imports(root: Path, rel: str) -> list[str]:
    src = root / rel
    if src.suffix not in (".ts", ".tsx"):
        return []
    out = []
    for spec in IMPORT_RE.findall(src.read_text()):
        target = resolve_import(src, spec)
        if target is None:
            raise FileNotFoundError(f"{rel}: unresolved import {spec}")
        out.append(target.relative_to(root.resolve()).as_posix())
    return sorted(set(out))


def bump(version: str, part: str) -> str:
    major, minor, patch = (int(x) for x in version.split("."))
    if part == "major":
        return f"{major + 1}.0.0"
    if part == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


# ------------------------------------------------------------------------------------------------
# reindex: derived data (dependencies from real imports, file hashes, preset entries)

def preset_entries(root: Path) -> list[dict]:
    out: list[dict] = []
    mats = (root / "materials/materials.ts")
    if mats.exists():
        block = mats.read_text().split("export const MATERIAL_PRESETS", 1)[-1].split("\n};", 1)[0]
        for mid in re.findall(r"^\s+'?([a-z][a-z0-9-]*)'?:\s*\{\s*kind:", block, re.M):
            out.append(dict(id=f"mat.{mid}", name=f"Material: {mid}", category="materials", description=f"Material preset '{mid}' — getMaterial('{mid}').",
                            source="materials/materials.ts", exports=["getMaterial"], format="preset", scale="n/a", materials=[mid],
                            reuse=f"getMaterial('{mid}', overrides?)", tags=["material", *mid.split("-")], version="1.0.0", preset=mid))
    lp = root / "lighting/lighting-presets.json"
    if lp.exists():
        for k, v in json.loads(lp.read_text())["presets"].items():
            out.append(dict(id=f"light.{k}", name=f"Lighting: {k}", category="lighting", description=v.get("description", ""),
                            source="lighting/lighting-presets.json", exports=[], format="preset", scale="three.js physical units", materials=[],
                            reuse=f'shot.lighting = "{k}"', tags=["lighting", "mood", *k.split("-")], version="1.0.0", preset=k))
    mp = root / "camera-rigs/move-presets.json"
    if mp.exists():
        for k, v in json.loads(mp.read_text())["presets"].items():
            out.append(dict(id=f"cam.preset.{k}", name=f"Camera move: {k}", category="camera-rigs", description=v.get("purpose", ""),
                            source="camera-rigs/move-presets.json", exports=[], format="preset", scale="meters/degrees", materials=[],
                            reuse=f'camera: {{"preset": "{k}", ...}}', tags=["camera", v.get("move", ""), *k.split("-")], version="1.0.0", preset=k))
    cp = root / "characters/presets.ts"
    if cp.exists():
        for cid, label in re.findall(r"def\('([a-z0-9-]+)',\s*'([^']+)'", cp.read_text()):
            out.append(dict(id=f"char.preset.{cid}", name=f"Character: {label}", category="characters", description=f"Character identity preset '{cid}' ({label}).",
                            source="characters/presets.ts", exports=["CHARACTER_PRESETS"], format="preset", scale="meters", materials=[],
                            reuse=f'actor props.character = "{cid}" (age variant: "{cid}@older")', tags=["character", *cid.split("-"), *label.lower().split()], version="1.0.0", preset=cid))
    return out


def reindex(root: Path, quiet: bool = False) -> dict:
    data = load(root)
    curated = [a for a in data["assets"] if a.get("format") != "preset"]
    old_presets = {a["id"]: a for a in data["assets"] if a.get("format") == "preset"}
    by_source: dict[str, list[str]] = {}
    for a in curated:
        by_source.setdefault(a["source"], []).append(a["id"])
    problems = []
    for a in curated:
        try:
            deps_files = file_imports(root, a["source"])
        except FileNotFoundError as e:
            problems.append(str(e))
            deps_files = []
        dep_ids = []
        for f in deps_files:
            ids = by_source.get(f)
            if not ids:
                problems.append(f"{a['id']}: imports {f} which no manifest asset declares as source")
                continue
            dep_ids.append(ids[0])
        a["dependencies"] = sorted(set(dep_ids) - {a["id"]})
        a["files"] = sorted({a["source"], *deps_files})
        src = root / a["source"]
        a["sha256"] = sha(src) if src.exists() else None
    presets = []
    for p in preset_entries(root):
        prev = old_presets.get(p["id"])
        if prev:
            p["version"] = prev.get("version", p["version"])
            p["history"] = prev.get("history", [])
        src_id = by_source.get(p["source"], [None])[0]
        p["dependencies"] = [src_id] if src_id else []
        presets.append(p)
    data["assets"] = curated + presets
    data["indexedAt"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    save(root, data)
    if not quiet:
        print(f"reindexed {len(curated)} components/modules + {len(presets)} presets in {root}")
    for p in problems:
        print(f"warning: {p}", file=sys.stderr)
    return data


# ------------------------------------------------------------------------------------------------

def cmd_path(a):
    lib = library_path(a.library)
    print(lib)
    print(f"exists: {(lib / MANIFEST).exists()}  seed: {SEED}")


def cmd_init(a):
    lib = library_path(a.library)
    if not (lib / MANIFEST).exists():
        lib.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(SEED, lib, dirs_exist_ok=True)
        reindex(lib, quiet=True)
        print(f"initialised persistent library at {lib}")
        return
    # merge: add seed assets missing from library; never overwrite modified library files
    seed = load(SEED)
    data = load(lib)
    have = {x["id"] for x in data["assets"]}
    added, kept = [], []
    for asset in seed["assets"]:
        for rel in {asset["source"], *asset.get("files", [])}:
            s, d = SEED / rel, lib / rel
            if not d.exists():
                d.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(s, d)
            elif sha(s) != sha(d):
                kept.append(rel)
        if asset["id"] not in have:
            data["assets"].append(asset)
            added.append(asset["id"])
    save(lib, data)
    reindex(lib, quiet=True)
    print(f"library exists at {lib}: added {len(added)} new seed assets; {len(set(kept))} library files differ from seed and were kept (use `update` to adopt seed versions).")


def cmd_reindex(a):
    root = library_path(a.library) if not a.seed else SEED
    reindex(root)


def fmt_row(x):
    return f"{x['id']:<34} {x['category']:<13} v{x.get('version', '?'):<7} {x['name']}"


def cmd_list(a):
    data = load(readable_root(a.library))
    for x in sorted(data["assets"], key=lambda x: (x["category"], x["id"])):
        if a.category and x["category"] != a.category:
            continue
        if not a.presets and x.get("format") == "preset":
            continue
        print(fmt_row(x))


def score(asset: dict, terms: list[str]) -> float:
    hay = {
        "id": asset["id"].lower(), "name": asset["name"].lower(),
        "tags": " ".join(asset.get("tags", [])).lower(), "desc": asset.get("description", "").lower(),
        "exports": " ".join(asset.get("exports", [])).lower(),
    }
    s = 0.0
    for t in terms:
        if t in hay["tags"].split() or t == hay["id"].split(".")[-1]:
            s += 5
        if t in hay["id"] or t in hay["exports"]:
            s += 3
        if t in hay["name"]:
            s += 3
        if t in hay["tags"]:
            s += 2
        if t in hay["desc"]:
            s += 1
    return s


def cmd_search(a):
    data = load(readable_root(a.library))
    terms = [t for t in re.split(r"[\s,]+", a.query.lower()) if t]
    ranked = sorted(((score(x, terms), x) for x in data["assets"]), key=lambda p: -p[0])
    hits = [(s, x) for s, x in ranked if s > 0][: a.limit]
    if a.json:
        print(json.dumps([dict(score=s, **{k: x[k] for k in ("id", "name", "category", "source", "exports", "reuse")}) for s, x in hits], indent=1))
        return
    if not hits:
        print("no match — create a new asset only after checking partial matches (try broader terms)")
    for s, x in hits:
        print(f"{s:5.1f}  {fmt_row(x)}\n       {x['description']}\n       reuse: {x['reuse']}")


def cmd_show(a):
    data = load(readable_root(a.library))
    for x in data["assets"]:
        if x["id"] == a.id:
            print(json.dumps(x, indent=1))
            return
    die(f"no asset {a.id}")


def _add(lib: Path, file: Path, a) -> None:
    data = load(lib)
    if any(x["id"] == a.id for x in data["assets"]):
        die(f"asset id {a.id} exists — use `update` to version it")
    if a.category not in CATEGORIES:
        die(f"category must be one of {CATEGORIES}")
    dest_rel = f"{a.category}/{file.name}"
    dest = lib / dest_rel
    if dest.exists():
        die(f"{dest_rel} already exists in library; rename the file or use update")
    dest.parent.mkdir(parents=True, exist_ok=True)
    text = file.read_text() if file.suffix in (".ts", ".tsx") else None
    if text is not None and re.search(r"['\"](\.\./)+library/", text):
        # promoted from a project: '../library/<cat>/<file>' becomes library-relative '../<cat>/<file>'
        text = re.sub(r"(['\"])(?:\.\./)+library/", r"\1../", text)
        dest.write_text(text)
    else:
        shutil.copy2(file, dest)
    exports = [e for e in (a.exports or "").split(",") if e] or re.findall(r"export\s+(?:function|const|class)\s+([A-Za-z0-9_]+)", file.read_text())
    entry = dict(id=a.id, name=a.name, category=a.category, description=a.description, source=dest_rel, exports=exports,
                 format="tsx-r3f-component" if file.suffix == ".tsx" else ("json" if file.suffix == ".json" else "ts-module"),
                 scale=a.scale or "meters", materials=[m for m in (a.materials or "").split(",") if m], dependencies=[],
                 reuse=a.reuse or "", tags=[t for t in (a.tags or "").split(",") if t], version="1.0.0",
                 history=[dict(version="1.0.0", date=dt.date.today().isoformat(), note=a.note or "created")])
    data["assets"].append(entry)
    save(lib, data)
    reindex(lib, quiet=True)
    print(f"added {a.id} -> {dest_rel}")


def require_lib(a) -> Path:
    lib = library_path(a.library)
    if not (lib / MANIFEST).exists():
        die(f"persistent library not initialised at {lib}; run `init` first")
    return lib


def cmd_add(a):
    _add(require_lib(a), Path(a.file).resolve(), a)


def cmd_update(a):
    lib = require_lib(a)
    data = load(lib)
    entry = next((x for x in data["assets"] if x["id"] == a.id), None)
    if not entry:
        die(f"no asset {a.id}")
    if entry.get("format") == "preset":
        die("presets are versioned through their source file; update the source module instead")
    src = lib / entry["source"]
    new = Path(a.file).resolve()
    if src.exists() and sha(src) == sha(new):
        print("identical content; nothing to do")
        return
    old_version = entry["version"]
    archive = lib / ".versions" / entry["id"] / old_version / Path(entry["source"]).name
    archive.parent.mkdir(parents=True, exist_ok=True)
    if src.exists():
        shutil.copy2(src, archive)
    shutil.copy2(new, src)
    entry["version"] = bump(old_version, a.bump)
    entry.setdefault("history", []).append(dict(version=entry["version"], date=dt.date.today().isoformat(), note=a.note or "", previous=archive.relative_to(lib).as_posix()))
    # other assets sharing this source file move with it
    for x in data["assets"]:
        if x is not entry and x["source"] == entry["source"] and x.get("format") != "preset":
            x["version"] = bump(x["version"], "patch")
            x.setdefault("history", []).append(dict(version=x["version"], date=dt.date.today().isoformat(), note=f"shared source updated via {a.id}"))
    save(lib, data)
    reindex(lib, quiet=True)
    print(f"{a.id}: {old_version} -> {entry['version']} (previous archived at {archive.relative_to(lib)})")


def closure(assets: dict[str, dict], ids: list[str]) -> list[str]:
    seen: list[str] = []
    stack = list(ids)
    while stack:
        i = stack.pop()
        if i in seen:
            continue
        if i not in assets:
            die(f"unknown asset id {i}")
        seen.append(i)
        stack.extend(assets[i].get("dependencies", []))
    return seen


def cmd_use(a):
    root = readable_root(a.library)
    data = load(root)
    assets = {x["id"]: x for x in data["assets"]}
    project = Path(a.project).resolve()
    if not (project / "package.json").exists():
        die(f"{project} is not a project (no package.json)")
    lock_path = project / "asset-lock.json"
    lock = json.loads(lock_path.read_text()) if lock_path.exists() else {"assets": {}}
    wanted = list(assets) if a.all else list(dict.fromkeys([*lock.get("assets", {}).keys(), *a.ids]))
    wanted += [x["id"] for x in data["assets"] if x.get("required")]
    ids = closure(assets, wanted)
    files = sorted({f for i in ids for f in (assets[i].get("files") or [assets[i]["source"]])})
    libdir = project / "src" / "library"
    if a.mode == "link":
        if libdir.is_symlink() or libdir.exists():
            if libdir.is_symlink():
                libdir.unlink()
            else:
                shutil.rmtree(libdir)
        libdir.symlink_to(root, target_is_directory=True)
        print(f"linked {libdir} -> {root} (no duplication; renders follow library updates — check verify-lock)")
    else:
        if libdir.is_symlink():
            libdir.unlink()
        for rel in files:
            d = libdir / rel
            d.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(root / rel, d)
    # src/library-index.ts (outside the library dir, so link mode never writes into the shared library)
    index_lines = ["// GENERATED by asset-library.py use — do not edit. Re-run `use` to change.\n"]
    exports_by_file: dict[str, set[str]] = {}
    for i in ids:
        x = assets[i]
        if x.get("format") == "tsx-r3f-component" and x["source"].endswith(".tsx"):
            exports_by_file.setdefault(x["source"], set()).update(x.get("exports", []))
    for src, exps in sorted(exports_by_file.items()):
        mod = "./library/" + src[: -len(Path(src).suffix)]
        index_lines.append(f"export {{ {', '.join(sorted(exps))} }} from '{mod}';\n")
    (project / "src" / "library-index.ts").write_text("".join(index_lines))
    lock = {
        "library": str(root), "mode": a.mode, "libraryVersion": data.get("libraryVersion"),
        "updated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "assets": {i: {"version": assets[i].get("version"), "source": assets[i]["source"], "sha256": sha(root / assets[i]["source"])} for i in sorted(ids)},
    }
    lock_path.write_text(json.dumps(lock, indent=1) + "\n")
    print(f"{'linked' if a.mode == 'link' else 'vendored'} {len(ids)} assets ({len(files)} files) into {project}; lock: {lock_path.name}")


def cmd_promote(a):
    lib = require_lib(a)
    f = Path(a.project).resolve() / a.file
    if not f.exists():
        die(f"{f} not found")
    _add(lib, f, a)
    print("now replace the project copy with a library import (asset-library.py use PROJECT " + a.id + ")")


def cmd_verify_lock(a):
    project = Path(a.project).resolve()
    lock = json.loads((project / "asset-lock.json").read_text())
    root = Path(lock["library"]) if Path(lock["library"]).exists() else readable_root(a.library)
    assets = {x["id"]: x for x in load(root)["assets"]}
    drift = 0
    for i, info in lock["assets"].items():
        cur = assets.get(i)
        if not cur:
            print(f"MISSING  {i} (not in library {root})")
            drift += 1
        elif (sha(root / cur["source"]) if (root / cur["source"]).exists() else None) != info.get("sha256") or cur.get("version") != info.get("version"):
            print(f"CHANGED  {i}: locked v{info.get('version')} -> library v{cur.get('version')}")
            drift += 1
        if lock.get("mode") == "vendor" and info.get("sha256"):
            local = project / "src" / "library" / info["source"]
            if local.exists() and sha(local) != info["sha256"]:
                print(f"EDITED   {i}: vendored copy modified inside the project (promote or revert it)")
                drift += 1
    print(f"{len(lock['assets'])} locked assets, {drift} drift findings")
    sys.exit(1 if drift and a.strict else 0)


def cmd_export(a):
    root = readable_root(a.library)
    out = Path(a.out).resolve()
    with tarfile.open(out, "w:gz") as tar:
        tar.add(root, arcname="library", filter=lambda ti: None if "/node_modules" in ti.name else ti)
    print(f"exported {root} -> {out} ({out.stat().st_size // 1024} KiB)")


def cmd_import(a):
    lib = library_path(a.library)
    with tempfile.TemporaryDirectory() as tmp:
        with tarfile.open(a.file) as tar:
            tar.extractall(tmp, filter="data")
        src = Path(tmp) / "library"
        if not (src / MANIFEST).exists():
            die("package has no library/asset-manifest.json")
        if not (lib / MANIFEST).exists():
            shutil.copytree(src, lib, dirs_exist_ok=True)
            reindex(lib, quiet=True)
            print(f"imported package as new library at {lib}")
            return
        data = load(lib)
        have = {x["id"]: x for x in data["assets"]}
        incoming = load(src)
        added = conflicts = 0
        for x in incoming["assets"]:
            if x.get("format") == "preset":
                continue
            for rel in {x["source"], *x.get("files", [])}:
                s, d = src / rel, lib / rel
                if not d.exists():
                    d.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(s, d)
                elif sha(s) != sha(d):
                    alt = lib / ".versions" / "imported" / rel
                    alt.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(s, alt)
                    conflicts += 1
            if x["id"] not in have:
                data["assets"].append(x)
                added += 1
        save(lib, data)
        reindex(lib, quiet=True)
        print(f"merged: {added} new assets; {conflicts} conflicting files kept as library versions (incoming copies in .versions/imported/)")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--library", help="persistent library path (default $BRUTALIST_ASSET_LIBRARY or ~/.brutalist-3d-studio/library)")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("path").set_defaults(fn=cmd_path)
    sub.add_parser("init").set_defaults(fn=cmd_init)
    r = sub.add_parser("reindex"); r.add_argument("--seed", action="store_true", help="reindex the skill seed instead"); r.set_defaults(fn=cmd_reindex)
    l = sub.add_parser("list"); l.add_argument("--category"); l.add_argument("--presets", action="store_true"); l.set_defaults(fn=cmd_list)
    s = sub.add_parser("search"); s.add_argument("query"); s.add_argument("--limit", type=int, default=8); s.add_argument("--json", action="store_true"); s.set_defaults(fn=cmd_search)
    sh = sub.add_parser("show"); sh.add_argument("id"); sh.set_defaults(fn=cmd_show)

    def add_flags(sp):
        sp.add_argument("--id", required=True); sp.add_argument("--category", required=True); sp.add_argument("--name", required=True)
        sp.add_argument("--description", required=True); sp.add_argument("--exports"); sp.add_argument("--tags"); sp.add_argument("--reuse")
        sp.add_argument("--scale"); sp.add_argument("--materials"); sp.add_argument("--note")
    ad = sub.add_parser("add"); ad.add_argument("file"); add_flags(ad); ad.set_defaults(fn=cmd_add)
    up = sub.add_parser("update"); up.add_argument("id"); up.add_argument("file"); up.add_argument("--bump", default="minor", choices=["patch", "minor", "major"]); up.add_argument("--note"); up.set_defaults(fn=cmd_update)
    u = sub.add_parser("use"); u.add_argument("project"); u.add_argument("ids", nargs="*"); u.add_argument("--all", action="store_true"); u.add_argument("--mode", default="vendor", choices=["vendor", "link"]); u.set_defaults(fn=cmd_use)
    pr = sub.add_parser("promote"); pr.add_argument("project"); pr.add_argument("file"); add_flags(pr); pr.set_defaults(fn=cmd_promote)
    v = sub.add_parser("verify-lock"); v.add_argument("project"); v.add_argument("--strict", action="store_true"); v.set_defaults(fn=cmd_verify_lock)
    e = sub.add_parser("export"); e.add_argument("--out", required=True); e.set_defaults(fn=cmd_export)
    i = sub.add_parser("import"); i.add_argument("file"); i.set_defaults(fn=cmd_import)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
