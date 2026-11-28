#!/bin/bash
# Storyboard stills of every shot (one set per process, lesson L043) -> stills/ ; then a contact sheet.
cd "$(dirname "$0")"; export CINEMA_KIT=${CINEMA_KIT:-../../.claude/skills/voiceover-to-video/blender/cinema}
OUT=${1:-stills}; RES=${RES:-360x640}; SAMPLES=${SAMPLES:-16}
python3 - <<'PY' > /tmp/sets.txt
import json; sb = json.load(open('storyboard.json')); d = {}
for s in sb['shots']: d.setdefault(s['set'], []).append(s['id'])
for k, v in d.items(): print(k, ','.join(v))
PY
while read s ids; do
  [ -n "$ONLY" ] && [[ ",$ONLY," != *",$s,"* ]] && continue
  echo "== $s $(date +%T)"; python3 film.py --set $s --stills $ids --res $RES --samples $SAMPLES --out $OUT > logs/stills_$s.log 2>&1 || echo "FAILED $s"
done < /tmp/sets.txt
echo "STILLS DONE $(date +%T)"
