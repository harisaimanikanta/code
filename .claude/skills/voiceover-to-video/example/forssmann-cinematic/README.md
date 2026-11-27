# The Road Home - Werner Forssmann, 1929 (cinematic documentary example, v5)

85.9 s, 37 shots, 13 sequences, 11 sets, built entirely in Blender (Cycles) with `blender/cinema/`.

| File | What it is |
|---|---|
| `storyboard.json` | The director's storyboard: sequences with takeaways, 37 shots with purpose, visible, word-synced action, camera type/lens/move, lighting setup, transition, continuity. Gate: `../../scripts/shotlist_check.py storyboard.json align/words.json` |
| `film.py` | Builds one set per process and directs its shots (`--set or --stills 1A,4C@0.9` / `--render --step 2`); `--set prepass` renders the radiograph + heart illustration from the anatomy model |
| `textures.py` | PIL props: X-ray film (from the prepass), 1929 anatomical chart, the real journal page title, sketch, diploma, portrait, town view |
| `render_all.sh` | Resumable render of all sets (540x960, 8 spp, on twos) |
| `post.py` | Per-shot interpolation to 24 fps, grades (memory sepia, light transition, fades), upscale, captions/supers, sound bed, mux |

Run: `pip install bpy==5.3.0 pillow` (Python 3.13), put `voice.mp3` here, then
`python film.py --set prepass && python textures.py && ./render_all.sh && python post.py`.
Voiceover not included (user's ElevenLabs audio).
