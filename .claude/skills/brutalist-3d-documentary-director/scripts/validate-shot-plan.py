#!/usr/bin/env python3
"""Validate a project's shot plan against the timeline, world layout and asset library.

  python3 validate-shot-plan.py PROJECT [--allow-todo] [--json-out analysis/qc-shot-plan.json]

Checks: required fields; shots tile [0, durationFrames) with no gaps/overlaps (one continuous take);
narration coverage vs transcript; known camera moves/presets, lighting presets, transition types;
camera anchors resolve to world-layout entities / component anchors; planned orbital share ≥ 30 %;
camera-move variety; shot lengths; transitions have minimum durations; world components exist.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import Report, load_json, norm_word  # noqa: E402

REQUIRED = ["id", "audioStart", "audioEnd", "startFrame", "endFrame", "narration", "visualPurpose", "environment", "characters", "objects",
            "lighting", "camera", "animation", "transitionIn", "transitionOut", "sound", "subtitle"]
MOVES = {"orbit", "revolve", "spiral", "dolly", "push", "pull", "track", "crane", "pan", "tilt", "travel", "flythrough", "through", "goto", "focus-pull", "roll", "drift"}
ORBITAL = {"orbit", "revolve", "spiral"}


def anchor_refs(cam: dict) -> list[str]:
    refs = []
    for k in ("target", "center", "to"):
        v = cam.get(k)
        if isinstance(v, str):
            refs.append(v)
        elif isinstance(v, dict) and "anchor" in v:
            refs.append(v["anchor"])
    for v in cam.get("via", []) or []:
        if isinstance(v, str):
            refs.append(v)
        elif isinstance(v, dict) and "anchor" in v:
            refs.append(v["anchor"])
    return refs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project")
    ap.add_argument("--allow-todo", action="store_true")
    ap.add_argument("--json-out")
    a = ap.parse_args()
    P = Path(a.project)
    R = Report("shot plan validation")
    cfg = load_json(P / "data/production-config.json")
    plan = load_json(P / "data/shot-plan.json")
    layout = load_json(P / "data/world-layout.json")
    lib = P / "src/library"
    lighting = set(load_json(lib / "lighting/lighting-presets.json")["presets"]) if (lib / "lighting/lighting-presets.json").exists() else set()
    transitions = set(load_json(lib / "transitions/transition-types.json")["types"]) if (lib / "transitions/transition-types.json").exists() else set()
    move_presets = load_json(lib / "camera-rigs/move-presets.json")["presets"] if (lib / "camera-rigs/move-presets.json").exists() else {}
    comp_anchors = load_json(lib / "environments/anchors.json")["components"] if (lib / "environments/anchors.json").exists() else {}
    fps, N = cfg["fps"], cfg["durationFrames"]
    shots = sorted(plan.get("shots", []), key=lambda s: s.get("startFrame", 0))
    if not shots:
        R.fail("no shots")
        R.finish()

    # required fields + TODO
    todo = 0
    for s in shots:
        miss = [k for k in REQUIRED if k not in s]
        if miss:
            R.fail(f"{s.get('id')}: missing fields {miss}")
        for k, v in s.items():
            if v == "TODO" or v is None and k == "camera":
                todo += 1
    (R.warn if a.allow_todo else R.fail)(f"{todo} unfilled TODO/null creative fields") if todo else R.ok("all creative fields filled")

    # tiling
    gaps = []
    if shots[0]["startFrame"] != 0:
        gaps.append(f"starts at frame {shots[0]['startFrame']}")
    for x, y in zip(shots, shots[1:]):
        if y["startFrame"] != x["endFrame"]:
            gaps.append(f"{x['id']}→{y['id']}: {x['endFrame']} vs {y['startFrame']}")
    if shots[-1]["endFrame"] != N:
        gaps.append(f"ends at {shots[-1]['endFrame']} ≠ durationFrames {N}")
    R.fail("timeline not tiled: " + "; ".join(gaps[:8])) if gaps else R.ok(f"{len(shots)} camera moves tile frames 0–{N} continuously")
    short = [s["id"] for s in shots if s["endFrame"] - s["startFrame"] < fps * 0.8]
    if short:
        R.warn(f"very short moves (<0.8 s) read as jitter: {short[:10]}")
    long = [s["id"] for s in shots if s["endFrame"] - s["startFrame"] > fps * 14]
    if long:
        R.warn(f"long moves (>14 s) — consider breaking for visual progression: {long[:10]}")

    # narration coverage
    tl = P / "analysis/timeline.json"
    if tl.exists():
        words = [norm_word(w["text"]) for w in load_json(tl)["words"]]
        plan_words = [norm_word(w) for s in shots for w in re.findall(r"[A-Za-z0-9'’\-]+", s.get("narration", ""))]
        plan_words = [w for w in plan_words if w]
        words = [w for w in words if w]
        if words == plan_words:
            R.ok(f"narration covers the full transcript ({len(words)} words, in order)")
        else:
            import difflib
            ratio = difflib.SequenceMatcher(a=words, b=plan_words, autojunk=False).ratio()
            (R.ok if ratio > 0.98 else R.fail)(f"narration vs transcript similarity {ratio:.3f} (shots must carry the complete narration verbatim)")
    else:
        R.warn("analysis/timeline.json missing — cannot verify narration coverage")

    # entities & anchors
    entities = {}
    for kind in ("zones", "objects", "actors"):
        for e in layout.get(kind, []):
            entities[e["id"]] = e
    known_components = set()
    idx = P / "src/library-index.ts"
    if idx.exists():
        known_components |= set(re.findall(r"\b([A-Z][A-Za-z0-9]+)\b", idx.read_text()))
    pa = P / "src/project-assets"
    if pa.exists():
        for f in pa.rglob("*.ts*"):
            known_components |= set(re.findall(r"export\s+(?:function|const)\s+([A-Z][A-Za-z0-9]+)", f.read_text()))
    for e in entities.values():
        if known_components and e["component"] not in known_components:
            R.fail(f"world entity {e['id']}: component {e['component']} not in library-index or project-assets")
    bad_anchor = []
    orbital = 0
    moves = []
    for s in shots:
        cam = s.get("camera")
        if not isinstance(cam, dict):
            continue
        spec = {**move_presets.get(cam.get("preset"), {}), **cam}
        if cam.get("preset") and cam["preset"] not in move_presets:
            R.fail(f"{s['id']}: unknown camera preset {cam['preset']}")
        mv = spec.get("move")
        if mv not in MOVES:
            R.fail(f"{s['id']}: unknown camera move {mv}")
            continue
        moves.append(mv)
        if mv in ORBITAL:
            orbital += s["endFrame"] - s["startFrame"]
        for ref in anchor_refs(spec):
            if ref in layout.get("anchors", {}):
                continue
            eid, _, name = ref.partition(".")
            ent = entities.get(eid)
            if not ent:
                bad_anchor.append(f"{s['id']}:{ref} (no entity)")
            elif name and name not in {**comp_anchors.get(ent["component"], {}), **ent.get("anchors", {})}:
                bad_anchor.append(f"{s['id']}:{ref} (no anchor '{name}' on {ent['component']})")
        lt = s.get("lighting")
        if lighting and lt not in lighting and lt != "TODO":
            R.fail(f"{s['id']}: unknown lighting preset {lt}")
        for k in ("transitionIn", "transitionOut"):
            t = s.get(k)
            t = t.get("type") if isinstance(t, dict) else t
            if transitions and t not in transitions and t != "TODO":
                R.fail(f"{s['id']}: unknown {k} type {t}")
    R.fail(f"unresolvable camera anchors: {bad_anchor[:10]}") if bad_anchor else R.ok("all camera anchors resolve")
    share = orbital / N if N else 0
    target = cfg.get("camera", {}).get("orbitTargetRatio", 0.3)
    (R.ok if share >= target else R.fail)(f"planned orbital/revolving share {share * 100:.1f}% (target ≥ {target * 100:.0f}%)")
    if moves:
        repeats = max((len(list(g)) for _, g in __import__("itertools").groupby(moves)), default=0)
        if repeats >= 4:
            R.warn(f"{repeats} identical consecutive camera moves — vary choreography")
        R.ok(f"camera vocabulary: {sorted(set(moves))}")
    # transition durations
    if transitions:
        tt = load_json(lib / "transitions/transition-types.json")["types"]
        for s in shots:
            t = s.get("transitionIn")
            t = t.get("type") if isinstance(t, dict) else t
            if t in tt and (s["endFrame"] - s["startFrame"]) / fps < tt[t]["minSeconds"]:
                R.warn(f"{s['id']}: transition '{t}' shorter than its {tt[t]['minSeconds']}s minimum")
    # factual claims bookkeeping
    claims = P / "docs/fact-check.md"
    (R.ok if claims.exists() else R.warn)("docs/fact-check.md present" if claims.exists() else "docs/fact-check.md missing — required when narration contains factual claims")
    R.finish(Path(a.json_out) if a.json_out else None, {"orbitalShare": share, "shots": len(shots)})


if __name__ == "__main__":
    main()
