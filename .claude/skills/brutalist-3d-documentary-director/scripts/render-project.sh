#!/usr/bin/env bash
# Render driver with mandatory pre-flight QC.
#
#   render-project.sh PROJECT preview [FROM TO] [--scale 0.5] [--concurrency N]   representative clip
#   render-project.sh PROJECT stills  [F1,F2,...]                                    contact sheet of frames
#   render-project.sh PROJECT full    [--scale 1] [--concurrency N]                  final MP4 + video QC
#
# Pre-flight (always): bake camera → validate-assets → validate-shot-plan → validate-camera-path → typecheck.
# Browser: $REMOTION_BROWSER, else Playwright's headless shell if present, else Remotion's own download.
# WebGL: tries --gl=angle, falls back to --gl=swangle (software) if the first render fails.
set -euo pipefail

SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="$(cd "${1:?usage: render-project.sh PROJECT preview|stills|full ...}" && pwd)"
MODE="${2:-preview}"
shift 2 || true
SCALE=""; CONC=""; FROM=""; TO=""; FRAMES=""; ALLOW_TODO=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --scale) SCALE="$2"; shift 2;;
    --concurrency) CONC="$2"; shift 2;;
    --allow-todo) ALLOW_TODO="--allow-todo"; shift;;
    *) if [[ "$MODE" == "preview" && -z "$FROM" ]]; then FROM="$1"; TO="${2:-}"; shift 2 || shift; \
       elif [[ "$MODE" == "stills" && -z "$FRAMES" ]]; then FRAMES="$1"; shift; \
       else echo "unknown argument $1"; exit 2; fi;;
  esac
done

cd "$PROJECT"
for t in node npx ffmpeg ffprobe python3; do command -v "$t" >/dev/null || { echo "error: $t not found"; exit 1; }; done
[[ -d node_modules ]] || { echo "node_modules missing — running npm install"; npm install --no-audit --no-fund; }
mkdir -p out analysis

BROWSER_ARGS=()
if [[ -n "${REMOTION_BROWSER:-}" ]]; then BROWSER_ARGS=(--browser-executable="$REMOTION_BROWSER")
else
  HS=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell 2>/dev/null | head -1 || true)
  [[ -z "$HS" ]] && HS=$(ls -d "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell 2>/dev/null | head -1 || true)
  [[ -n "$HS" ]] && BROWSER_ARGS=(--browser-executable="$HS")
fi
FPS=$(python3 -c "import json;print(json.load(open('data/production-config.json'))['fps'])")
N=$(python3 -c "import json;print(json.load(open('data/production-config.json'))['durationFrames'])")
CONC_ARGS=(); [[ -n "$CONC" ]] && CONC_ARGS=(--concurrency="$CONC")

echo "── pre-flight ──────────────────────────────────────────"
node scripts/bake-camera.ts
python3 "$SKILL/scripts/validate-assets.py" --project . --json-out analysis/qc-assets.json
python3 "$SKILL/scripts/validate-shot-plan.py" . $ALLOW_TODO --json-out analysis/qc-shot-plan.json
python3 "$SKILL/scripts/validate-camera-path.py" . --json-out analysis/qc-camera.json
npx tsc --noEmit
echo "pre-flight passed"

normalise_pixfmt() { # Remotion's JPEG pipeline can tag output full-range yuvj420p → broadcast-safe yuv420p
  if [[ "$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$1")" != "yuv420p" ]]; then
    ffmpeg -v error -y -i "$1" -vf "scale=in_range=full:out_range=tv,format=yuv420p" -c:v libx264 -crf 16 -preset medium -c:a copy -movflags +faststart "${1%.mp4}.tmp.mp4" && mv "${1%.mp4}.tmp.mp4" "$1"
  fi
}

render() { # args...
  local gl
  for gl in angle swangle; do
    if npx remotion "$@" "${BROWSER_ARGS[@]}" --gl="$gl" --log=error --timeout="${RENDER_TIMEOUT_MS:-240000}"; then return 0; fi
    echo "render with --gl=$gl failed; trying next renderer"
  done
  return 1
}

case "$MODE" in
  preview)
    FROM="${FROM:-0}"; TO="${TO:-$(( FROM + FPS * 10 < N ? FROM + FPS * 10 : N - 1 ))}"
    OUT="out/preview-${FROM}-${TO}.mp4"
    render render src/index.ts Documentary "$OUT" --frames="${FROM}-${TO}" --scale="${SCALE:-0.5}" --pixel-format=yuv420p "${CONC_ARGS[@]}"
    normalise_pixfmt "$OUT"
    python3 "$SKILL/scripts/validate-video.py" . "$OUT" --preview --json-out analysis/qc-preview.json || true
    W=$(python3 -c "import json;c=json.load(open('data/production-config.json'));print(270 if c['height']>c['width'] else 480)")
    ffmpeg -v error -y -i "$OUT" -vf "fps=2,scale=${W}:-1,tile=6x2" -frames:v 1 "out/preview-${FROM}-${TO}-sheet.png" || true
    echo "preview: $OUT  (contact sheet: out/preview-${FROM}-${TO}-sheet.png) — INSPECT before full render";;
  stills)
    FRAMES="${FRAMES:-$(python3 -c "n=$N;print(','.join(str(int(n*k/8)) for k in range(8)))")}"
    IFS=',' read -ra FS <<< "$FRAMES"
    for f in "${FS[@]}"; do render still src/index.ts Documentary "out/still-$f.png" --frame="$f" --scale="${SCALE:-0.5}"; done
    ffmpeg -v error -y -pattern_type glob -i "out/still-*.png" -vf "scale=480:-1,tile=4x2" -frames:v 1 out/stills-sheet.png || true
    echo "stills: out/still-*.png, sheet out/stills-sheet.png";;
  full)
    TITLE=$(python3 -c "import json,re;print(re.sub(r'[^a-z0-9]+','-',json.load(open('data/production-config.json'))['title'].lower()).strip('-') or 'documentary')")
    OUT="out/${TITLE}.mp4"
    render render src/index.ts Documentary "$OUT" --scale="${SCALE:-1}" "${CONC_ARGS[@]}" --crf=18 --pixel-format=yuv420p
    # Remotion's JPEG frame pipeline can tag output as full-range yuvj420p; normalise to broadcast-safe yuv420p
    if [[ "$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$OUT")" != "yuv420p" ]]; then
      ffmpeg -v error -y -i "$OUT" -vf "scale=in_range=full:out_range=tv,format=yuv420p" -c:v libx264 -crf 16 -preset medium -c:a copy -movflags +faststart "${OUT%.mp4}.tmp.mp4" && mv "${OUT%.mp4}.tmp.mp4" "$OUT"
    fi
    if [[ "${SCALE:-1}" == "1" ]]; then python3 "$SKILL/scripts/validate-video.py" . "$OUT" --json-out analysis/qc-video.json
    else python3 "$SKILL/scripts/validate-video.py" . "$OUT" --preview --json-out analysis/qc-video.json; fi
    echo "final: $OUT";;
  *) echo "unknown mode $MODE"; exit 2;;
esac
