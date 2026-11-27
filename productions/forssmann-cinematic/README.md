# Forssmann 1929: cinematic Blender Short

- `final.mp4`: 1080x1920, 24 fps, 85.9 s. Uses the ElevenLabs "Dan" voiceover unchanged, with captions, supers and a quiet sound bed.
- `storyboard.json` / `storyboard_sheet.png`: 37 shots across 13 sequences, with the ten required fields per shot. It passed `shotlist_check.py`.
- `skill-patches/`: `git am` these onto `harisaimanikanta/voiceover-to-video` (base 17c4b86) to apply the v5 cinematic upgrade.
  The same upgraded skill is mirrored in `.claude/skills/voiceover-to-video/`. Its production sources are in `example/forssmann-cinematic/`.

Render compromises (4-core CPU, no GPU):
- Rendered in Cycles at 540x960, 8 spp (7B at 16 spp), with OIDN.
- Rendered on twos, then motion-interpolated per shot and upscaled to 1080x1920.
- On a GPU, render every frame at full resolution with the same scripts.
