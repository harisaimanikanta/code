#!/usr/bin/env bash
# Report what this machine can actually do before choosing a production path. Never installs anything.
set -uo pipefail
ok() { printf '  %-22s %s\n' "$1" "$2"; }
echo "── production environment ─────────────────────────────"
for t in node npm npx python3 ffmpeg ffprobe git; do
  if command -v "$t" >/dev/null; then ok "$t" "$($t --version 2>&1 | head -1)"; else ok "$t" "MISSING"; fi
done
NODE_MAJOR=$(node -p 'process.versions.node.split(".").map(Number)' 2>/dev/null | tr -d '[] \n' || true)
node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=18)?0:1)' 2>/dev/null \
  && ok "node TS stripping" "yes (bake-camera.ts runs natively)" || ok "node TS stripping" "NO — need Node >= 22.18 (or run bake via npx tsx)"
python3 - <<'EOF'
import importlib.util as u, shutil
mods = {"numpy": "sound design / fast audio", "faster_whisper": "ASR backend", "whisper": "ASR backend", "vosk": "ASR backend"}
for m, why in mods.items():
    print(f"  {m:<22} {'yes' if u.find_spec(m) else 'no'}  ({why})")
for b in ("whisper-cli", "whisper-cpp"):
    print(f"  {b:<22} {'yes' if shutil.which(b) else 'no'}")
EOF
HS=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell 2>/dev/null | head -1)
ok "headless chromium" "${REMOTION_BROWSER:-${HS:-none found (Remotion will try to download one)}}"
command -v nvidia-smi >/dev/null && ok "gpu" "$(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)" || ok "gpu" "none (software/ANGLE WebGL — expect ~0.3–1 s/frame at 540p)"
ok "cpus" "$(nproc 2>/dev/null || sysctl -n hw.ncpu)"
ok "asset library" "${BRUTALIST_ASSET_LIBRARY:-$HOME/.brutalist-3d-studio/library} $( [[ -f "${BRUTALIST_ASSET_LIBRARY:-$HOME/.brutalist-3d-studio/library}/asset-manifest.json" ]] && echo '(initialised)' || echo '(not initialised — asset-library.py init)')"
df -h . 2>/dev/null | tail -1 | awk '{print "  disk (cwd)             "$4" free"}'
