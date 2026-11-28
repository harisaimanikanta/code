#!/usr/bin/env python3
"""Cinematic storyboard gate (v5 cinematic mode). Validates a storyboard.json BEFORE any scene is built.

Usage: shotlist_check.py storyboard.json [words.json]

Checks (all must pass, else exit 1):
  coverage     shots tile the whole voiceover with no gaps/overlaps (0 .. duration)
  fields       every shot answers the 10 storyboard questions (vo, purpose, visible, action, environment,
               camera, lighting, transition_out, duration, connects)
  cuts         every cut lands inside a narration pause or on a word boundary (never mid-word) when words.json is given
  hold         every shot holds >= 1.2 s (readability) and <= 6 s (no dead air) unless marked "hold_ok"
  camera       no two consecutive shots share the same camera type; >= 8 distinct camera types per film;
               no camera type used for more than 25 % of shots; "static" is not a type
  lighting     every shot names a lighting setup; >= 1 setup per set; no setup covers > 30 % of the runtime
  sets         no set covers > 40 % of the runtime (avoid one generic template)
  sequences    every sequence has a takeaway (mute test) and at least one shot
Prints a variety report you can paste into TREATMENT.md."""
import json, sys
from collections import Counter

REQ = ['vo', 'purpose', 'visible', 'action', 'environment', 'camera', 'lighting', 'transition_out', 'connects']
sb = json.load(open(sys.argv[1])); words = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else None
shots = sorted(sb['shots'], key=lambda s: s['t0']); D = sb['duration']; err = []; warn = []
# coverage
if abs(shots[0]['t0']) > 1e-3: err.append(f"first shot starts at {shots[0]['t0']} (must be 0)")
if abs(shots[-1]['t1'] - D) > 0.05: err.append(f"last shot ends at {shots[-1]['t1']} (duration {D})")
for a, b in zip(shots, shots[1:]):
    if abs(a['t1'] - b['t0']) > 1e-3: err.append(f"gap/overlap between {a['id']} ({a['t1']}) and {b['id']} ({b['t0']})")
# fields
for s in shots:
    miss = [k for k in REQ if not s.get(k)]
    if miss: err.append(f"{s['id']}: missing {miss}")
    if not s.get('camera', {}).get('type'): err.append(f"{s['id']}: camera.type missing")
    if s.get('camera', {}).get('type') == 'static': err.append(f"{s['id']}: 'static' is not a camera move - motivate a move")
    if not s.get('lighting', {}).get('setup'): err.append(f"{s['id']}: lighting.setup missing")
    d = s['t1'] - s['t0']
    if not s.get('hold_ok') and (d < 1.2 or d > 6.0): err.append(f"{s['id']}: holds {d:.2f} s (keep 1.2-6 s or mark hold_ok)")
# cuts vs words
if words:
    for s in shots[1:]:
        t = s['t0']; inside = [w for w in words if w[1] + 0.04 < t < w[2] - 0.04]
        if inside: err.append(f"cut at {t:.2f} ({s['id']}) falls inside the word '{inside[0][0]}' ({inside[0][1]:.2f}-{inside[0][2]:.2f})")
# camera variety
types = [s['camera']['type'] for s in shots]
for a, b, x in zip(types, types[1:], shots[1:]):
    if a == b: err.append(f"{x['id']}: same camera type as the previous shot ({a}) - vary the visual purpose")
ct = Counter(types)
if len(ct) < 8: err.append(f"only {len(ct)} distinct camera types (need >= 8)")
for k, v in ct.items():
    if v > 0.25 * len(shots): err.append(f"camera type '{k}' used for {v}/{len(shots)} shots (> 25 %)")
# lighting / sets runtime share
def share(key):
    c = Counter()
    for s in shots: c[s[key] if isinstance(s[key], str) else s[key]['setup']] += s['t1'] - s['t0']
    return c
for k, v in share('lighting').items():
    if v > 0.30 * D: err.append(f"lighting setup '{k}' covers {v:.1f} s (> 30 % of the film)")
for k, v in share('set').items():
    if v > 0.40 * D: err.append(f"set '{k}' covers {v:.1f} s (> 40 % of the film)")
# sequences
for q in sb.get('sequences', []):
    if not q.get('takeaway'): err.append(f"sequence {q['id']} has no takeaway (mute test)")
    if not [s for s in shots if s['seq'] == q['id']]: err.append(f"sequence {q['id']} has no shots")
print(f"{len(shots)} shots, {len(sb.get('sequences', []))} sequences, {D:.1f} s")
print('camera types:', ', '.join(f'{k}x{v}' for k, v in ct.most_common()))
print('lighting setups:', ', '.join(f'{k} {v:.1f}s' for k, v in share('lighting').most_common()))
print('sets:', ', '.join(f'{k} {v:.1f}s' for k, v in share('set').most_common()))
for w in warn: print('WARN', w)
if err:
    for e in err: print('FAIL', e)
    sys.exit(1)
print('STORYBOARD OK')
