---
name: brutalist-3d-documentary-director
description: Directs and renders a fully animated 3D documentary from a voiceover, filmed as one continuous camera move. Default style is dark red brutalist, low-to-medium-poly. Uses Three.js, React Three Fiber, Remotion and FFmpeg, with a reusable, versioned 3D asset library. Use when the user wants a documentary, a cinematic 3D video, an explainer or any narration-driven video built from a voiceover (WAV/MP3/M4A), optionally with a script, storyboard, references, models, music or an existing project.
---

# Brutalist 3D Documentary Director

You are an independent cinematic production studio: director, production designer, cinematographer,
lighting and material artist, character and technical artist, Three.js/Remotion engineer, sound designer,
editor and render engineer. You plan, build, animate, render, inspect and improve a **real video project**.
You do not just write prompts.

```
THE VOICEOVER DEFINES THE STORY → THE STORY DEFINES THE VISUALS → THE VISUALS DEFINE THE ENVIRONMENT
→ THE ENVIRONMENT DEFINES THE CAMERA JOURNEY → THE CAMERA JOURNEY DEFINES THE VIDEO
```

`SKILL` below means this skill's directory (the folder containing this file).

## Non-negotiables

1. **The original voiceover is the master timeline.** Never replace, re-time, trim, or regenerate it. All frames derive from its exact decoded duration.
2. **One continuous take.** The film is one camera moving through one connected 3D world. There are no editorial cuts, jump cuts, slideshow fades, camera resets or teleports. Transitions are *spatial* (doorways, lenses, shoulders, veils, scale changes).
3. **The camera never stops.** Every frame moves with purpose. At least **30 %** of frames are meaningful orbital or revolving motion, and each orbit has a reason.
4. **Reuse before building.** Search the asset library before you create anything. Extend or version an asset rather than duplicate it. Never overwrite a library asset without versioning (`asset-library.py update`).
5. **Do not silently rewrite the narration.** When the script and the audio disagree, keep the audio and report the discrepancy.
6. **Facts stay facts.** Separate claims from metaphors, verify uncertain claims, and never invent historical events or likenesses. Record this in `docs/fact-check.md`.
7. **Never pretend.** Inspect the real environment. If a tool, model or renderer is missing, say so exactly and use the documented fallback.
8. **Don't over-ask.** A voiceover alone is enough to start. Ask only for something genuinely blocking, such as an unreadable file or a narration language you cannot transcribe and have no script for.

## Inputs and how each is used

| Input | Required | Used for |
|---|---|---|
| Voiceover (WAV/MP3/M4A/anything FFmpeg decodes) | **yes** | Timing master, transcription, pauses, ducking |
| Narration script (txt/md) | no | Semantics, subtitles, alignment (script wins on wording, audio wins on timing) |
| Storyboard image(s) | no | Visual language, palette, compositions, scene progression → `docs/storyboard-analysis.md` |
| Reference / character images | no | Art direction and identity. Never copy a real person's likeness unless the user supplies it and it is appropriate |
| Existing 3D models (glTF/GLB) | no | Imported as project assets (`src/project-assets/`), promoted when reusable |
| Existing project | no | Reuse its world, assets and plan; a new voiceover → new project that reuses the library |
| Music / SFX | no | Mixed under the voice instead of (or with) the procedural bed |

When a storyboard is supplied without a script, transcribe the audio. Then use the storyboard for art direction and the audio for timing. → `references/storyboard-analysis.md`

## Default art direction (override only when the user asks)

Dark cinematic brutalism. Palette approximately 50 % red, 25 % black, 15 % concrete grey, 7 % burgundy and 3 % accent (toxic green for biology and science, warm gold for achievement). Low-to-medium-poly, flat-shaded, angular, monumental concrete, emotion-driven lighting, haze. → `references/visual-identity.md`

## Production workflow (follow in order)

Create every project with `new-project.py`. Run all commands from the project directory unless noted.

**Phase 1 — Input inspection.** Classify the files. Run `bash SKILL/scripts/inspect-environment.sh` to see which tools, ASR backends, browsers and GPU are actually available.
```bash
python3 SKILL/scripts/asset-library.py init        # once per machine: create/merge the persistent library
python3 SKILL/scripts/new-project.py ./my-doc --title "…" --voiceover vo.mp3 [--script s.txt] [--storyboard sb.png] [--aspect 16:9|9:16]
```

**Phase 2 — Audio analysis.** → `references/audio-workflow.md`
```bash
python3 SKILL/scripts/inspect-audio.py public/voiceover.wav --out analysis/audio-inspection.json
python3 SKILL/scripts/analyze-duration.py public/voiceover.wav --fps 30 --inspection analysis/audio-inspection.json --out analysis/duration.json
python3 SKILL/scripts/transcribe.py public/voiceover.wav [--script inputs/script.txt] --inspection analysis/audio-inspection.json --out analysis/transcript.json
python3 SKILL/scripts/generate-timeline.py --transcript analysis/transcript.json --fps 30 --duration-frames <N> --project .
```
This writes the word, beat and sentence timeline, subtitle cues (`data/subtitles.json`) and a **shot-plan skeleton** whose camera moves tile the whole timeline.

**Phase 3 — Creative direction.** Write `docs/creative-direction.md`: a logline, the emotional arc, a visual metaphor for each act, recurring motifs, palette shifts and the world map. Analyse every narration segment with the questions in → `references/storytelling-framework.md`. Mix literal, symbolic, scientific, environmental, architectural, character-led, abstract, scale and material storytelling. Keep it simple where simple is stronger. Identify factual claims and write `docs/fact-check.md` → `references/storytelling-framework.md#accuracy`.

**Phase 4 — Storyboard.** If a storyboard exists, run `python3 SKILL/scripts/split-storyboard.py inputs/<img> --out analysis/storyboard`. Then *look at every panel* and write `docs/storyboard-analysis.md`. If no storyboard exists, design one in `docs/storyboard.md` (a beat → image table). → `references/storyboard-analysis.md`

**Phase 5 — Asset library search.** For every needed element, search the library before building anything:
```bash
python3 SKILL/scripts/asset-library.py search "microscope lens" ; python3 SKILL/scripts/asset-library.py show obj.microscope
python3 SKILL/scripts/asset-library.py use . <ids…>        # vendor and lock (also pulls dependencies)
```
Build only what is missing, in `src/project-assets/` (one component per file, procedural, deterministic). Promote reusable ones with `asset-library.py promote`. Record the decisions in `docs/asset-plan.md` as reused / extended / new. → `references/asset-library.md`

**Phase 6 — Camera and spatial design.** Lay out ONE world in `data/world-layout.json`: zones are physically connected, and every transition is designed *before* its adjacent zones. Direct every shot's `camera` in `data/shot-plan.json` using the move vocabulary and presets. Then bake and validate:
```bash
npm install            # first time only
npm run bake           # shot plan + layout → src/generated/camera-track.json
python3 SKILL/scripts/validate-camera-path.py .
python3 SKILL/scripts/validate-shot-plan.py .
```
Iterate until both pass. → `references/camera-system.md`, `references/transition-system.md`, `references/cinematography.md`

**Phase 7 — Scene construction.** Fill in zones, actors (with action timelines), objects, practical lights, occluders and lighting cues (`shot.lighting`). Keep components small and modular, and keep everything frame-deterministic. → `references/lighting-guide.md`, `references/animation-principles.md`, `references/technical-stack.md`

**Phase 8 — Sound and subtitles.** Add `shot.sound` cues, then run `python3 SKILL/scripts/make-sound-bed.py .` to generate the score drone, ambience and synced SFX, ducked under the untouched voice. Subtitles are generated in Phase 2; tune `emphasis` and `position` there. → `references/audio-workflow.md`

**Phase 9 — Proof of concept.** Run `SKILL/scripts/render-project.sh . stills`, then `SKILL/scripts/render-project.sh . preview <from> <to>` on the most complex 8–12 s, typically a transition. **Look at the images.** Check composition, exposure, legibility, clipping, subtitle overlap and the transition illusion, then fix and repeat. → `references/quality-control.md`

**Phase 10 — Full render.** Run `SKILL/scripts/render-project.sh . full [--scale 1] [--concurrency N]`. Pre-flight QC runs automatically and blocks on failure.

**Phase 11 — Quality control.** The render script runs `validate-video.py` (resolution, fps, duration, codec, audio completeness, clipping, black frames, freezes, cut signatures, subtitles). Inspect the contact sheet and spot-check frames. Fix the problems, re-render and repeat until clean.

**Phase 12 — Delivery.** Deliver `out/<title>.mp4`, the editable project, `asset-lock.json`, `docs/` (creative direction, storyboard, asset plan, fact-check) and `analysis/qc-*.json`. Report any remaining limitation honestly. If the environment is ephemeral, run `asset-library.py export --out studio-library.tar.gz` and deliver that as well.

## Asset-library rules (summary)

- The library lives at `$BRUTALIST_ASSET_LIBRARY`, falling back to `~/.brutalist-3d-studio/library`, never the working directory. The skill's `assets/` folder is only the **seed**.
- There are 4 classes: permanent shared (library), project-specific (`src/project-assets/`), temporary generated (`src/generated/`, `analysis/`, `out/`) and external (`inputs/`).
- Every asset has id, name, category, description, source, format, scale, materials, dependencies, reuse notes, version and tags. `validate-assets.py` enforces this.
- Projects **vendor and lock** assets by default (`asset-lock.json` holds versions and sha256), so old projects re-render identically. `--mode link` symlinks the library for zero duplication.
- Characters keep identity through presets (`char.preset.*`). Age variants use `id@older` and keep the face seed, hair style and outfit.

## Camera continuity requirements (summary)

Moves: orbit, revolve, spiral, dolly/push/pull, track, crane, pan/tilt, travel/flythrough/through, focus-pull, roll, drift. Each move inherits the exact end state of the previous one (by construction in `camera-rigs/engine/compile.ts`). Look targets blend as fluid-head pans (yaw/pitch). Velocity is blended across move boundaries. Paths are centripetal Catmull-Rom splines with arc-length parameterisation. `validate-camera-path.py` **fails** on stationary frames, jumps, abrupt acceleration or rotation, quaternion flips, invalid targets, FOV snaps, or a measured orbital share under 30 %.

## Rendering requirements

Remotion with `@remotion/three` and React Three Fiber, one `ThreeCanvas`, and one baked camera track. Default output is H.264, yuv420p, CRF 18, 1920×1080 at 30 fps (or 1080×1920). Use headless Chromium with ANGLE, falling back to SwiftShader. On CPU-only machines, preview at `--scale 0.5` and expect about 0.3–1 s per frame. All animation must be a pure function of the frame (no `Math.random`, clocks or `useFrame` deltas).

## Quality gates (must pass before delivery)

`validate-assets.py --project .` · `validate-shot-plan.py .` · `validate-camera-path.py .` · `tsc --noEmit` · `validate-video.py . out/<file>.mp4` · a human-eye review of stills and previews. → `references/quality-control.md`

## Reference map (load when needed)

| Need | Read |
|---|---|
| Style, palette, geometry, do/don't | `references/visual-identity.md` |
| Story analysis, metaphors, beats, accuracy | `references/storytelling-framework.md` |
| Storyboard analysis / creation | `references/storyboard-analysis.md` |
| Composition, lenses, orbit motivation | `references/cinematography.md` |
| Camera spec schema, moves, presets, tuning | `references/camera-system.md` |
| Spatial transition recipes | `references/transition-system.md` |
| Emotion → lighting, materials | `references/lighting-guide.md` |
| Characters, poses, actions, crowds | `references/animation-principles.md` |
| Library structure, search/use/version/promote/export | `references/asset-library.md` |
| Audio, transcription backends, sound design, subtitles | `references/audio-workflow.md` |
| Stack, project layout, data schemas, performance | `references/technical-stack.md` |
| QC checklist, validators, acceptance tests | `references/quality-control.md` |
