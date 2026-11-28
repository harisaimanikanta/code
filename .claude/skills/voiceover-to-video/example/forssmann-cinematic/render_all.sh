#!/bin/bash
# Resumable full render: every set in its own Blender process (lesson L043), on twos, 540x960, 8 spp + OIDN.
cd "$(dirname "$0")"
for s in anatomy or ward office corridor xray berlin amphi town nobel cathlab; do
  echo "== $s $(date +%T)"
  ${BLENDER_PY:-python3} film.py --set $s --render --res 540x960 --samples 8 --step 2 --out frames >> logs/$s.log 2>&1
done
echo "ALL DONE $(date +%T)"
