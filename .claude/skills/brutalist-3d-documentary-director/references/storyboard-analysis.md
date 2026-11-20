# Storyboard Intelligence

The storyboard is **optional**. The skill must never depend on it.

## A. Storyboard supplied

1. Split it: `python3 SKILL/scripts/split-storyboard.py inputs/storyboard.png --out analysis/storyboard`
   → panel crops (`panel-01.png` …, reading order), `storyboard.json` (boxes, per-panel + overall dominant palette).
   If gutters are not detected (painted boards, irregular layouts) use `--grid COLSxROWS`, or inspect the whole image.
2. **Look at every panel** (Read the PNGs). For each panel record in `docs/storyboard-analysis.md`:
   - subject / characters (silhouette, clothing, age, props) → map to `char.preset.*` or a new spec
   - environment & architectural elements → map to library zones/architecture
   - camera: shot size, angle, implied lens, implied movement (arrows), foreground/background
   - lighting direction & mood → lighting preset
   - palette (use storyboard.json values) → compare to studio palette; note deliberate shifts
   - recurring motifs
3. Infer the **scene progression** and map panels onto the transcript beats (panel → beat ids). Panels may cover
   several beats or none; the audio still drives timing.
4. **Reconstruct, don't reproduce**: each panel becomes a 3D zone/composition the continuous camera *passes
   through*. A panel's framing is a waypoint/target in a move, not a still to hold.
5. If the storyboard's style conflicts with the studio identity, the storyboard wins for that project
   (record as an override) unless the user said otherwise.
6. With voiceover + storyboard but no script: transcribe the audio (ASR) — the storyboard does not supply wording.

## B. No storyboard

Design one yourself in `docs/storyboard.md`: a table `beat id · time · narration · image description · zone ·
camera move · lighting · transition`. Optionally render a **visual storyboard** after Phase 6 with
`render-project.sh . stills 0,300,600,…` and tile the stills (the render script writes `out/stills-sheet.png`).

## Output: scene-reference document (template)

```markdown
# Storyboard analysis
Source: inputs/storyboard.png (N panels) · Palette (overall): #…, #…, #…
## Visual language
- …
## Panels
| Panel | Beats | Subject | Environment | Camera | Lighting | Motifs | Reconstruction |
|---|---|---|---|---|---|---|---|
| 01 | B001–B003 | lone doctor on dais | monumental hall | low angle, wide | red backlight | dais | atrium zone, crane-down + hero orbit |
```
