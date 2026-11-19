# Example production — "The Bacterium Nobody Believed" (66 s)

A reference production made with this skill as an acceptance test (voiceover + script → full film). It shows
how the director's decisions are expressed as data.

| File | What it shows |
|---|---|
| `narration.txt` | the script (the test voiceover was synthesised from it with espeak-ng) |
| `world-layout.json` | ONE connected world: atrium → corridor → lab → lens tunnel (tilted down) → micro world → conference hall → award hall → void, with occluders and global anchors |
| `shot-plan.json` | 17 continuous moves (61 % orbital): crane, hero-orbit, rising spiral, doorway travel, room-to-room, lens dive, spiral, particle veil, 300° revolve, shoulder push-in, camera-through-object, golden orbits, pillar wipe, final orbit |
| `subtitles.json` | generated cues with crimson emphasis words |
| `fact-check.md` | claims vs metaphors, with the visual treatment of each |
| `direct.py` | the director's script that wrote the layout and plan (positions, frame windows, sound cues) |

Reproduce: create a project with `new-project.py --voiceover <vo> --script narration.txt`, then run the audio
pipeline. Run `python3 direct.py <project>` (it needs `analysis/timeline.json`), then `make-sound-bed.py` and
`render-project.sh <project> full`. Frame numbers assume the original 65.956 s voiceover at 30 fps.
