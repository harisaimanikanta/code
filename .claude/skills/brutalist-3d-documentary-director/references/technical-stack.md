# Technical Stack & Project Architecture

## Stack (pinned in the template)

Remotion 4.0.540 (`remotion`, `@remotion/cli`, `@remotion/three`) · React 19.2 · three 0.186 ·
@react-three/fiber 9.8 · TypeScript 5.9 · Node ≥ 22.18 (native TS type stripping runs `scripts/bake-camera.ts`)
· FFmpeg/ffprobe · Python ≥ 3.10 (stdlib; numpy for sound design) · headless Chromium (Playwright's
`chrome-headless-shell` auto-detected, or `$REMOTION_BROWSER`, or Remotion's download).

**Drei** is optional: the library is deliberately Drei-free (fewer moving parts in headless renders). Add
`@react-three/drei` to a project only when a helper materially helps (e.g. `Text`, `useGLTF`, `MeshReflectorMaterial`).

Inspect first (`inspect-environment.sh`); install only what is missing (`npm install` in the project). No GPU →
ANGLE/SwiftShader software WebGL works (measured ≈0.5 s/frame at 960×540 with 4 workers on a 4-core VM).

## Separation of concerns

| Concern | Where |
|---|---|
| A. Creative planning | `docs/*.md`, `data/shot-plan.json` |
| B. Asset generation | library (`src/library`, vendored) + `src/project-assets/` |
| C. Environment construction | `data/world-layout.json` → `src/world/World.tsx` (registry by component name) |
| D. Character animation | actor `actions` in layout → `Figure` / `poses.ts` |
| E. Camera animation | `shot.camera` → `bake-camera.ts` → `src/generated/camera-track.json` → `CameraRig` |
| F. Audio sync | `public/voiceover.wav`, `public/sound-bed.wav`, `audio/Soundtrack.tsx` |
| G. Timeline editing | shot frames (data), lighting cues, subtitle cues |
| H. Rendering | `render-project.sh` (Remotion CLI) |
| I. Quality control | `validate-*.py`, `analysis/qc-*.json` |

## Project layout

```
my-doc/
  package.json  tsconfig.json  remotion.config.ts  asset-lock.json
  inputs/        original user files (never modified)
  public/        voiceover.wav, sound-bed.wav, any imported models/music
  data/          production-config.json, shot-plan.json, world-layout.json, subtitles.json
  analysis/      audio-inspection, transcript, timeline, duration, sound-design, qc-*.json
  docs/          creative-direction.md, storyboard(-analysis).md, asset-plan.md, fact-check.md
  scripts/       bake-camera.ts
  src/
    index.ts Root.tsx Documentary.tsx data.ts library-index.ts (generated)
    library/        vendored assets (or symlink in link mode)
    project-assets/ project-only components (export from index.ts)
    world/ (World.tsx, registry.ts)  effects/Grade.tsx  subtitles/Subtitles.tsx  audio/Soundtrack.tsx
    generated/camera-track.json
  out/           renders, stills, contact sheets
```

## Data schemas

- `production-config.json`: `title, fps, width, height, durationFrames, audio{voiceover, soundBed,
  voiceoverDurationSec, voiceVolume, bedVolume}, camera{initial, smoothingSeconds, handheld, maxSpeed,
  orbitTargetRatio, qc?}, lighting{blendFrames}, style{letterbox, grainScale}, subtitles{…}, render{shadows,
  antialias}, library{path, linkMode}, inputs{…}` (template: `templates/production-config-template.json`).
- `world-layout.json`: `anchors{name:[x,y,z]}`, `zones[]`, `objects[]`, `actors[]` (entity: `id, component,
  position, rotation, scale, props, actions?, cullRadius?, frames?, children?, anchors?`), `occluders[]`.
- `shot-plan.json`: see `templates/shot-plan-template.json` (all Part-11 fields + camera spec).

## Importing external 3D models

Put `.glb` in `public/models/`, write a project asset using drei-free three loaders
(`GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js`) with `delayRender/continueRender` around loading,
apply studio materials (`getMaterial`) to keep the look, register by export name. If a model is unavailable,
build a procedural stand-in — never block on it.

## Performance

Cull radii per entity (zones 40–70 m typical), instancing for crowds/particles/microbes, shared geometry and
material caches, ≤3 shadow casters per zone, 2048 shadow map on the key only, DataTextures ≤256 px, no
transmission/post-processing passes (grade is CSS). Preview at `--scale 0.5`; full at 1.0 with
`--concurrency` ≈ CPU cores. A 3-minute 1080p film on CPU can take hours: render previews first.

## Vertical / other formats

`new-project.py --aspect 9:16` → 1080×1920. Use tighter FOV (26–34), keep subjects in the upper-middle third,
subtitles auto-move to 24 % from bottom.
