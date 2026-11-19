# Quality Control

Automated gates run in `render-project.sh` pre-flight and post-render. A FAIL blocks delivery. Then **look**:
validators can't judge beauty, legibility or story.

## Automated validators

| Gate | Script | Fails on |
|---|---|---|
| Assets | `validate-assets.py --project .` (`--library` for the library) | missing metadata, unknown components/characters/materials, lock hash drift, unresolved imports, undeclared deps, placeholder files, stale manifest hashes |
| Shot plan | `validate-shot-plan.py .` | TODO fields, gaps/overlaps (timeline must tile), narration ≠ transcript, unknown moves/presets/lighting/transitions, unresolved anchors, planned orbital share < 30 %, missing fact-check |
| Camera | `validate-camera-path.py .` | stationary frames, jumps/teleports, speed/acceleration spikes, angular speed/acceleration spikes, quaternion flips (resets), target collapse, misaimed orientation, FOV snaps, *measured* orbital share < 30 % |
| Types | `npx tsc --noEmit` | type errors |
| Video | `validate-video.py . out/x.mp4` | resolution/aspect/fps/duration/codec, missing or truncated voiceover, clipping, unintended black segments (outside occluder windows), frozen picture (static camera), invalid subtitles; warns on hard-cut signatures and loudness outside −20…−12 LUFS |

Black-frame detection doubles as a composition check: a "black segment" outside an occluder window usually means
the camera is staring at an unlit wall, sits outside a room, or a zone lacks practical light — fix the shot, don't
raise the threshold. Intentional dark wipes must be declared as occluders with a `frames` window.

## Human review checklist (stills + preview)

Camera: motion purposeful and smooth · orbits reveal something · no wall/geometry clipping (camera inside a
mesh outside an occluder window) · transitions read as physical passages.
Scene: no missing environments (empty fog), no broken/floating models, characters grounded, no unintended
intersections, materials present (no white/default), lighting motivated, frame not too dark (subject readable)
nor flat.
Story: each beat's visual purpose visible within ~1 s · metaphors understandable · facts depicted correctly ·
final image lands the punchline.
Audio: voice intelligible over the bed everywhere · SFX land on visual events · ending intact.
Subtitles: synced, never over the primary subject, ≤2 lines, emphasis meaningful.

Fix → re-bake → re-validate → re-render affected range (`preview FROM TO`) → full render.

## Acceptance tests (self-review before declaring a production done)

| Test | Input | Must produce |
|---|---|---|
| A | voiceover only | audio analysis, ASR transcript (or explicit block + ask for script), original storyboard, creative direction, asset selection, continuous camera plan, project |
| B | voiceover + storyboard | split + analysed panels, style extraction, 3D reconstruction (not reproduction), asset reuse, continuous plan, project |
| C | voiceover + script | script↔audio alignment with discrepancy report, sentence timing on real pauses, plan, subtitles, project |
| D | voiceover + storyboard + script | storyboard art direction + script semantics + audio timing, complete project |
| E | new voiceover after a previous project | library search/reuse, only missing assets created, versions preserved (`.versions/`), new independent project with its own lock |
| F | camera continuity | no cuts, no static frames, continuous path, ≥30 % orbital (measured), smooth transitions, no resets |

The skill's own self-test (`bash SKILL/scripts/selftest.sh`) exercises the scripts end-to-end on a synthetic
voiceover; run it after modifying the skill.
