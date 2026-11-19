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

## v2 proof-of-concept gate (what it caught in the reference production)

The storyboard production `examples/the-patient-was-him/` went through six PoC iterations. Each failure below was
invisible to the automated validators and was fixed at its source:
salmon-pink colour (AgX tone mapping → ACES), unreadable sign lettering (raking shadow light), the camera pushing
through a character (walk him aside), a glass held at the forehead (pose), a sun hidden by slabs (set layout), a
non-silhouette (outfit + camera height), camera staring at walls mid-transition (look along the path; lower the path
under a lintel), a lying character's anchor pointing at the ceiling (global anchor), hard particle diamonds (soft point
sprites), wall text overflowing 9:16 (two lines). Always render and look.
The full-render video QC then caught two more that stills missed, both fixed at source and re-rendered for the affected range:
- **About 1 s of black void** between two sets (the camera turned away from the lit subject before reaching a thin veil). Replaced with a camera-through-object pass through the stomach, using double-sided wet tissue and finely tiled textures so the interior reads as an organ, not a red card.
- **An oversized occluder** that held a solid colour long enough to register as a frozen picture. Occluders are now sized so full coverage lasts 4–12 frames. A freeze inside a declared occluder window is reported as intentional, like a declared black frame.

To fix a range without re-rendering the whole film: `render-project.sh . preview F0 F1`, then splice it onto the earlier render with ffmpeg (trim + concat), reusing the original audio, and run `validate-video.py` on the result.

