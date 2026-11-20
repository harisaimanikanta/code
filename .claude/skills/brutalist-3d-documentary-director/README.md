# brutalist-3d-documentary-director

A Claude Code skill that turns a **voiceover** into a directed, animated **3D documentary**. The film is shot as
one continuous camera move through one connected brutalist world. The voiceover sets the timing. The visuals
are built from a reusable, versioned library of procedural 3D assets and rendered with Remotion and Three.js.

The output is a real MP4 and an editable project, not a prompt or a slideshow.

## Installation

```bash
# project-scoped (this repository already contains it):
.claude/skills/brutalist-3d-documentary-director/
# or user-wide:
cp -r .claude/skills/brutalist-3d-documentary-director ~/.claude/skills/
```
Requirements (checked by `scripts/inspect-environment.sh`):
- **Required:** Node ≥ 22.18, npm, Python ≥ 3.10, FFmpeg/ffprobe, and headless Chromium. Playwright's headless shell is auto-detected; otherwise Remotion downloads its own.
- **Optional:** numpy (sound design and storyboard splitting), and an ASR backend (`faster-whisper`, `openai-whisper`, whisper.cpp or vosk) for transcription.

First run on a machine:
```bash
python3 .claude/skills/brutalist-3d-documentary-director/scripts/asset-library.py init   # persistent library
bash    .claude/skills/brutalist-3d-documentary-director/scripts/selftest.sh             # 26 offline checks
```

## Invoking

Ask Claude Code for a documentary, for example *"Make a cinematic 3D documentary from `vo.mp3`"*, or run
`/brutalist-3d-documentary-director` with your files. The skill loads automatically for documentary, cinematic 3D
and voiceover-driven video requests, then follows the 12-phase workflow in `SKILL.md`. It asks a question only when
something is genuinely blocking.

| You supply | Example request |
|---|---|
| Voiceover only | "Turn `narration.wav` into a 3D documentary." |
| + script | "Here's the voiceover and the script (`script.txt`)." |
| + storyboard | "Use `storyboard.png` for the look; the voiceover is `vo.m4a`." |
| + references / models | "Characters should look like `refs/*.png`; use `models/lab.glb`." |
| New voiceover, previous project | "Same studio look as last time, new episode: `ep2.mp3`." (reuses the library) |
| Overrides | "Vertical 9:16, colder palette, no subtitles." |

## How to supply a voiceover

WAV, MP3, M4A or anything FFmpeg decodes. It is copied untouched to `inputs/` and decoded to
`public/voiceover.wav` for rendering. Duration and frame count come from the exact decoded sample count.
The voiceover is never re-timed or replaced.

## How to supply a storyboard

Any image (grid sheets work best). `scripts/split-storyboard.py` cuts it into panels and extracts palettes.
Claude then looks at each panel and writes `docs/storyboard-analysis.md`, mapping panels to 3D reconstructions
and narration beats. Without a storyboard, Claude designs one (`docs/storyboard.md`).

## Reusing the asset library

The library lives at `$BRUTALIST_ASSET_LIBRARY` (default `~/.brutalist-3d-studio/library`), seeded from `assets/`.
```bash
python3 scripts/asset-library.py search "conference audience"      # always search first
python3 scripts/asset-library.py use ./my-doc env.conference-hall char.crowd
python3 scripts/asset-library.py promote ./my-doc src/project-assets/Centrifuge.tsx --id obj.centrifuge --category objects --name Centrifuge --description "…"
python3 scripts/asset-library.py update obj.microscope new.tsx --bump minor --note "focus ring"   # old version archived
python3 scripts/asset-library.py export --out studio-library.tar.gz   # ephemeral environments: keep this file
```
Projects pin assets in `asset-lock.json` (version and sha256), so old projects re-render identically.

## Layout

```
SKILL.md                     workflow, rules, reference map (loaded by Claude Code)
references/                  12 focused guides, loaded on demand
templates/project-template/  Remotion + R3F project (data-driven: shot plan, world layout, subtitles)
templates/*.json|.ts|.tsx    shot plan, manifest entry, production config, scene and camera-path templates
scripts/                     audio analysis, transcription and alignment, timeline, library manager,
                             project scaffold, sound design, storyboard splitter, validators, render driver, self-test
assets/                      seed library: 83 components/modules + 72 indexed presets, asset-manifest.json
```

## Scripts

| Script | Purpose |
|---|---|
| `inspect-environment.sh` | What the machine can actually do |
| `new-project.py` | Scaffold a project, ingest inputs, set the exact duration, vendor the assets |
| `inspect-audio.py` / `analyze-duration.py` | Format, loudness, clipping, silences and speech; frames, pauses, beat budget |
| `transcribe.py` | ASR (auto-detected) and/or script alignment with a discrepancy report; offline script-estimate fallback |
| `generate-timeline.py` | Beats, sentences, subtitle cues, shot-plan skeleton tiling the full timeline |
| `asset-library.py` | init/search/list/show/use/add/update/promote/reindex/verify-lock/export/import |
| `make-sound-bed.py` | Mood-driven drone score, ambience and SFX, ducked under the voice, self-levelled |
| `split-storyboard.py` | Panel detection and palette extraction |
| `validate-assets.py` / `validate-shot-plan.py` / `validate-camera-path.py` / `validate-video.py` | QC gates |
| `render-project.sh` | Pre-flight QC, then stills, preview or full render (ANGLE → SwiftShader fallback) |
| `selftest.sh` | Offline end-to-end test of all of the above |

## v2 visual standard

Version 2 rebuilt the visual pipeline:
- **Sets:** dressed production sets (lab, lecture theatre, endoscopy room, animal lab, ceremony stage, publication desk, brutalist exterior, red-sun horizon) and a period prop kit.
- **Geometry:** bevelled real-dimension geometry with world-scale UVs.
- **Materials:** procedural PBR surface sets (albedo, normal and roughness).
- **Lighting:** image-based reflections, fluorescent area lights and three-point subject rigs.
- **Post chain:** ambient occlusion, focus-tracked depth of field, bloom, ACES tone mapping and grade.
- **Characters v2:** sculpted, clothed, expressive, blinking, with distance-driven walks.
- **Extras:** animals; stomach and molecule visualisation; extruded 3D lettering (Oswald, OFL); a glTF loader with deterministic clip playback; shot-plan-driven set activation; and a mandatory visual proof-of-concept gate.

See `SKILL.md → Visual quality standard`, `references/asset-quality-checklist.md` and `examples/the-patient-was-him/`. The previous version is archived in `backups/` at the repository root.

## Known limitations

- **Transcription needs an ASR backend.** Without one, wording comes from a supplied script. Timing is then estimated from detected speech: sentence boundaries snap to real pauses, but word timing is approximate. With neither a script nor ASR, the skill stops and asks.
- **Rendering is CPU-bound without a GPU.** Expect about 0.5 s/frame at 960×540 on 4 cores. Preview first; full 1080p renders of long films take hours.
- **Procedural faces are stylised.** They have brows, lids, mouth and blinking but no lip-sync. For extreme close-ups, supply a licensed rigged glTF and use `GLTFModel`.
- **No external model library ships with the skill.** No licensed models were available offline, so v2 is entirely procedural; the glTF path is tested with a generated test model.
- **The library ships no external model files.** Every asset is procedural, so glTF imports are project assets.
