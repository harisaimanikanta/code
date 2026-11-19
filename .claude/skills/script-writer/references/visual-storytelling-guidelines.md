# Visual Storytelling Guidelines

Format: 9:16 vertical, 1080×1920. Subject centred in the middle 60% (UI covers top/bottom/right edges).

## DEFAULT LOOK: stylised 3D parable (matches the reference Shorts)
- Simple, expressive 3D cartoon characters (round heads, dot eyes, big mouths) in **detailed, cinematic, period-accurate 3D
  environments**. The stylisation makes it obvious that it's a dramatization, not footage, which suits the True-Parable rules.
- **New image every ~1–1.5 s.** Pattern: object close-up in the first 1–2 s → characters reacting → wide stakes shot → recurring hero shot of the key object.
- Let **light carry time**: day → sunset → night → morning as the plot moves.
- **Captions:** 1–2 words at a time, bold white, centred lower-middle, synced to the voice.
- No title cards, maps or archival photos in this look. Optional: a single real photo/document flash in the final mechanism beat, labelled "real".
- Prompt recipe (image): `stylised 3D animation, simple cartoon character with round white head and dot eyes, [action], inside [detailed period-accurate environment, year], cinematic lighting, [time of day], vertical 9:16`
- Same character design across all shots of a video (state it in every prompt).

## Alternative look: documentary (archival + labelled reconstructions)

## Visual priorities
1. **Real archival material first** - photos, newspaper clippings, documents, maps. Credit and check licence (public domain / CC / Library of Congress "no known restrictions").
2. **Labelled AI reconstruction** - for scenes no camera captured. Add a small on-screen tag "AI reconstruction" or "Dramatization" whenever it could be mistaken for a real photo, and say so in the description.
3. **Maps & diagrams** - for geography, scale, money flows.
4. **3D / motion** - camera moves on stills (Ken Burns), parallax, or simple 3D scenes (see the `threejs-3d-video` skill).

Never create a fake "photo" of a real person and present it as authentic. Never fabricate documents
(letters, newspaper headlines) as if real; recreated documents must be labelled.

## Shot rhythm
- New visual every 1.5–3 s; never hold a static frame > 4 s without motion.
- Hook shot: the single most striking image of the story, instantly readable at thumbnail size.
- Match each cut to a narration beat (a new fact = a new image).
- Reveal moments: hard cut, brief silence or bass hit, then the reveal image.

## Period accuracy checklist
Clothing, architecture, vehicles, technology, signage language, currency and lighting (gas vs electric)
must match the year and place. State the period in every image prompt.

## Prompt recipes
**Image prompt:** `[shot type], [subject + action], [location], [year], period-accurate [clothing/architecture], [lighting], [mood], cinematic, 35mm film grain, photorealistic, vertical 9:16 composition`
**Video prompt:** `[image prompt] + camera: [slow push-in / pan left / orbit / handheld], [duration 3–5s], subtle motion: [smoke, dust, crowd movement]`

## Sound & music
- Music: low, tension-building bed (pizzicato strings, low piano, ticking percussion for cons/heists;
  ominous drones for dark stories; playful bassoon/pizzicato for absurd ones). Duck under voice (-18 to -22 LUFS bed vs voice at ~-14 LUFS integrated).
- SFX on reveals and cuts: whoosh, paper rustle, cash register, gavel, camera shutter, typewriter, crowd murmur, bass hit/riser before the twist.
- One moment of near-silence before the biggest reveal is often stronger than a louder hit.

## On-screen text
Only when it adds: a date/place stamp in the context beat, a key number, a source label for claims
("According to the U.S. Secret Service"), and "AI reconstruction" tags. Max ~5 words, large, high
contrast, within safe zone. Captions (burned-in subtitles) on for the whole voiceover.
