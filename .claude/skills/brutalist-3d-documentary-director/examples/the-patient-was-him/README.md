# Example production — "The Patient Was Him" (9:16, 68 s)

The v2 visual-standard reference: a YouTube Shorts documentary built from a storyboard sheet (64 panels) and a
voiceover. **The voiceover used here is a placeholder** (espeak-ng reading `narration.txt`) because no voice was
supplied. Replace it with a real recording and re-run the audio pipeline; every timing is derived from the audio.

| File | What it shows |
|---|---|
| `storyboard-reference.jpg` | the storyboard used as the primary visual blueprint (downscaled) |
| `storyboard-analysis.md` | panel → beat → 3D reconstruction table, visual language, palette |
| `world-layout.json` | 10 connected sets: InstituteExterior → PathologyLab → LensTunnel → MicroscopicWorld → LectureTheatre → AnimalLab → EndoscopyRoom → stomach macro → PublicationDesk → CeremonyStage → RedSunHorizon; subject rigs, occluders, zone tags |
| `shot-plan.json` | 19 continuous moves (45 % measured orbital), per-shot lighting, post (DoF/bloom), `activeZones` |
| `direct.py` | the director's script that writes layout + plan (all positions, actions, frame windows) |
| `fact-check.md` | claims vs metaphors with visual treatment |

Reproduce:
```bash
python3 SKILL/scripts/new-project.py proj --voiceover vo.wav --script narration.txt --storyboard storyboard.png --aspect 9:16 --all-assets
cd proj && python3 SKILL/scripts/inspect-audio.py public/voiceover.wav --out analysis/audio-inspection.json
python3 SKILL/scripts/transcribe.py public/voiceover.wav --script inputs/narration.txt --inspection analysis/audio-inspection.json --out analysis/transcript.json
python3 SKILL/scripts/generate-timeline.py --transcript analysis/transcript.json --fps 30 --duration-frames <N> --project .
python3 ../direct.py .        # frame numbers assume the 68.08 s placeholder read — re-time for a real voiceover
python3 SKILL/scripts/make-sound-bed.py . && SKILL/scripts/render-project.sh . stills 100,470,1080,1450,1840,2010
SKILL/scripts/render-project.sh . full --scale 0.5 --concurrency 4
```
