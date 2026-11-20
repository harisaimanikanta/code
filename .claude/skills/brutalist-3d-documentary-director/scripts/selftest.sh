#!/usr/bin/env bash
# Self-test for the skill's scripts. Runs fully offline on a synthetic voiceover.
#   bash selftest.sh            scripts + library + project scaffold + bake + validators (no rendering)
#   bash selftest.sh --render   also renders 2 stills (needs node_modules: runs npm install in the temp project)
# Exit code 0 = all checks passed.
set -uo pipefail
SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
S="$SKILL/scripts"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/b3d-selftest.XXXXXX")"
export BRUTALIST_ASSET_LIBRARY="$TMP/library"
PASS=0; FAIL=0
check() { local name="$1"; shift; if "$@" >"$TMP/log.txt" 2>&1; then echo "  ✔ $name"; PASS=$((PASS+1)); else echo "  ✘ $name"; sed 's/^/      /' "$TMP/log.txt" | tail -15; FAIL=$((FAIL+1)); fi; }
expect_fail() { local name="$1"; shift; if "$@" >"$TMP/log.txt" 2>&1; then echo "  ✘ $name (expected failure)"; FAIL=$((FAIL+1)); else echo "  ✔ $name"; PASS=$((PASS+1)); fi; }

echo "self-test in $TMP"
cat > "$TMP/script.txt" <<'EOF'
The stomach was thought to be sterile. Nothing could live there.
Then a pathologist looked closer, and saw spiral bacteria everywhere.
Nobody believed him.
EOF
# synthetic voiceover: real speech if espeak-ng exists, else tone bursts shaped like phrases with pauses
if command -v espeak-ng >/dev/null; then
  espeak-ng -v en-us -s 150 -f "$TMP/script.txt" -w "$TMP/vo.wav"
else
  ffmpeg -v error -y -f lavfi -i "sine=f=180:d=2.2" -f lavfi -i "anullsrc=r=44100:cl=mono:d=0.7" -f lavfi -i "sine=f=200:d=3.0" \
    -f lavfi -i "anullsrc=r=44100:cl=mono:d=0.9" -f lavfi -i "sine=f=170:d=1.4" \
    -filter_complex "[0][1][2][3][4]concat=n=5:v=0:a=1,volume=0.4" -ar 44100 "$TMP/vo.wav"
fi
ffmpeg -v error -y -i "$TMP/vo.wav" -b:a 160k "$TMP/vo.mp3"

echo "── library"
check "seed manifest valid"            python3 "$S/validate-assets.py" --seed
check "library init"                   python3 "$S/asset-library.py" init
check "library search"                 bash -c "python3 '$S/asset-library.py' search 'microscope' | grep -q obj.microscope"
check "library re-init keeps edits"    python3 "$S/asset-library.py" init
check "library validates"              python3 "$S/validate-assets.py" --library "$BRUTALIST_ASSET_LIBRARY"
cp "$BRUTALIST_ASSET_LIBRARY/objects/Award.tsx" "$TMP/Award2.tsx" && echo "// v2 tweak" >> "$TMP/Award2.tsx"
check "versioned update"               python3 "$S/asset-library.py" update obj.trophy "$TMP/Award2.tsx" --note selftest
check "previous version archived"      test -f "$BRUTALIST_ASSET_LIBRARY/.versions/obj.trophy/1.0.0/Award.tsx"
check "export package"                 python3 "$S/asset-library.py" export --out "$TMP/lib.tar.gz"
check "import into fresh library"      python3 "$S/asset-library.py" --library "$TMP/lib2" import "$TMP/lib.tar.gz"

echo "── audio"
check "inspect-audio"                  python3 "$S/inspect-audio.py" "$TMP/vo.mp3" --out "$TMP/ins.json"
check "analyze-duration"               python3 "$S/analyze-duration.py" "$TMP/vo.mp3" --fps 30 --inspection "$TMP/ins.json" --out "$TMP/dur.json"
check "transcribe (script alignment)"  python3 "$S/transcribe.py" "$TMP/vo.mp3" --script "$TMP/script.txt" --inspection "$TMP/ins.json" --out "$TMP/tr.json"
check "transcript has all words"       python3 -c "import json;t=json.load(open('$TMP/tr.json'));assert len(t['words'])==24,len(t['words']);assert all(a['end']<=b['start']+1e-3 for a,b in zip(t['words'],t['words'][1:]))"
if python3 -c "import faster_whisper" 2>/dev/null || python3 -c "import whisper" 2>/dev/null; then echo "  (ASR backend present — not exercised offline)"; else
expect_fail "transcribe w/o ASR or script blocks clearly" python3 "$S/transcribe.py" "$TMP/vo.mp3" --backend auto --out "$TMP/tr-none.json"; fi

echo "── project"
check "new-project"                    python3 "$S/new-project.py" "$TMP/proj" --title "Self Test" --voiceover "$TMP/vo.mp3" --script "$TMP/script.txt" --fps 30
N=$(python3 -c "import json;print(json.load(open('$TMP/proj/data/production-config.json'))['durationFrames'])")
check "original input preserved"       cmp "$TMP/vo.mp3" "$TMP/proj/inputs/vo.mp3"
check "generate-timeline"              python3 "$S/generate-timeline.py" --transcript "$TMP/tr.json" --fps 30 --duration-frames "$N" --project "$TMP/proj"
expect_fail "shot-plan QC rejects TODO skeleton" python3 "$S/validate-shot-plan.py" "$TMP/proj"
# direct a minimal valid plan: alternate orbit + travel around the lab
python3 - "$TMP/proj" "$N" <<'EOF'
import json, sys
P, N = sys.argv[1], int(sys.argv[2])
plan = json.load(open(f"{P}/data/shot-plan.json"))
shots = plan["shots"]
for i, s in enumerate(shots):
    s.update(visualPurpose="selftest", emotion="test", environment="lab", lighting=["mystery", "low-key-lab", "discovery"][i % 3],
             cameraTarget="lab.microscope", animation="none", transitionIn="none", transitionOut="none", sound=["amb:lab"])
    s["camera"] = {"move": "orbit", "target": "lab.microscope", "radius": 3, "sweepDeg": 70, "height": 0.6} if i % 3 != 2 else {"move": "spiral", "target": "lab.bench", "radius": 3.5, "sweepDeg": 60, "height": 1.2}
json.dump(plan, open(f"{P}/data/shot-plan.json", "w"), indent=1)
open(f"{P}/docs/fact-check.md", "w").write("# Fact check\nselftest\n")
EOF
check "shot-plan QC passes"            python3 "$S/validate-shot-plan.py" "$TMP/proj"
check "project assets valid"           python3 "$S/validate-assets.py" --project "$TMP/proj"
check "verify-lock clean"              python3 "$S/asset-library.py" verify-lock "$TMP/proj" --strict
if node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=18)?0:1)'; then
  check "bake camera (node)"           bash -c "cd '$TMP/proj' && node scripts/bake-camera.ts"
  check "camera continuity QC"         python3 "$S/validate-camera-path.py" "$TMP/proj"
  # negative test: a teleport must be caught
  python3 - "$TMP/proj" <<'EOF'
import json, sys
p = f"{sys.argv[1]}/src/generated/camera-track.json"; t = json.load(open(p))
t["p"][len(t["p"]) // 2] = [v + 5 for v in t["p"][len(t["p"]) // 2]]
json.dump(t, open(f"{sys.argv[1]}/bad-track.json", "w"))
EOF
  expect_fail "camera QC catches a teleport" python3 "$S/validate-camera-path.py" "$TMP/proj" --track "$TMP/proj/bad-track.json"
else echo "  (node < 22.18: bake skipped)"; fi
if python3 -c "import numpy" 2>/dev/null; then
  check "sound bed"                    python3 "$S/make-sound-bed.py" "$TMP/proj"
  check "storyboard split (grid)"      bash -c "ffmpeg -v error -y -f lavfi -i 'color=c=white:s=640x360' -f lavfi -i 'color=c=0x7a0a12:s=300x160' -filter_complex '[0][1]overlay=10:10[a];[a][1]overlay=330:10[b];[b][1]overlay=10:190[c];[c][1]overlay=330:190' -frames:v 1 '$TMP/sb.png' && python3 '$S/split-storyboard.py' '$TMP/sb.png' --out '$TMP/sb' | grep -q '^4 panels'"
fi
if [[ "${1:-}" == "--render" ]]; then
  check "npm install"                  bash -c "cd '$TMP/proj' && npm install --no-audit --no-fund"
  check "typecheck"                    bash -c "cd '$TMP/proj' && npx tsc --noEmit"
  check "render stills"                bash "$S/render-project.sh" "$TMP/proj" stills "0,$((N/2))" --scale 0.25
fi
echo "── $PASS passed, $FAIL failed  (artifacts: $TMP)"
[[ $FAIL -eq 0 ]]
