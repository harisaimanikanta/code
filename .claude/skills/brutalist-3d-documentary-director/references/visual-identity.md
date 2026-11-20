# Visual Identity — Dark Cinematic Brutalism

The studio signature: **dark brutalist architecture, cinematic red light, low-to-medium-poly 3D, one continuous
orbital camera.** Every film must look like it came from the same studio while telling its own story.

## Palette (art-direction targets, not quotas)

| Role | Hex | Share | Use |
|---|---|---|---|
| Crimson red | `#b3121f` (emissive `#ff1a2a`) | ~50 % of *light* | key/rim light, practicals, emphasis |
| Blood red | `#7a0a12` | (inside red) | surfaces, liquids, fog tint |
| Charcoal / black | `#0c0b0c` / `#050405` | ~25 % | negative space, silhouettes, void |
| Concrete grey | `#8a8580` / `#4a4744` | ~15 % | architecture (always textured) |
| Burgundy | `#4a0d17` | ~7 % | fabrics, secondary surfaces, shadows |
| Toxic yellow-green | `#a8d63a` | accent ≤3 % | biology, discovery, science subjects |
| Warm gold | `#d9a441` / `#ffc86b` | accent ≤3 % | achievement, reveal, triumph |

Constants live in `assets/materials/materials.ts → PALETTE`. Story-specific shifts are allowed (e.g. a cold
blue-grey rejection beat) but each act returns to crimson/black; the final beat is always crimson.

Measure it: grab stills (`render-project.sh . stills`) and eyeball the balance. Too grey → raise red rim/key,
add practical slot lights. Too uniformly red → open darker negative space and add a concrete-grey plane.

## Geometry

- **Low-to-medium poly, flat-shaded**: boxes, hex prisms, icosahedra (detail 1), tubes with ≤14 radial segments.
- **Angular, monumental, massive**: thick slabs, deep coffers, oversized pillars, stepped capitals, slit windows.
- Characters: believable proportions (1.6–1.85 m), faceted heads, strong silhouettes, no cartoon proportions,
  no photoreal skin. Identity via silhouette, hair, outfit, accessories.
- Biology: stylised but morphologically honest (spiral vs rod vs coccus; mucus above epithelium).
- Procedural detail beats polycount: board-formed concrete textures, seams, pores, emissive strips.

## Composition signatures

- Strong single subject, framed off-centre on thirds or dead-centre for monumentality.
- Foreground occluders (pillars, shoulders, papers) for depth and wipes.
- Haze/fog depth falloff — far geometry dissolves into red-black.
- Vertical light shafts and slit lights as graphic lines.
- Silhouettes against crimson rim light.

## Avoid

Generic cartoon aesthetics · cute proportions · photoreal skin · random style switches · stock-looking
environments · rainbow palettes · flat even lighting · busy frames where one strong shape would do ·
text-heavy screens · real logos/insignia · likenesses of real people (use generic figures + narration).

## Overrides

Users may override palette ("cold blue brutalism"), geometry ("higher poly"), or aspect ratio. Apply overrides
via lighting presets (`lighting-presets.json`), material overrides (`getMaterial(id, {color})`) and project
config — never by forking library assets. Record the override in `docs/creative-direction.md`.

## v2 production standard

See `SKILL.md → Visual quality standard` and `asset-quality-checklist.md`. In short: dressed sets with layered
depth, bevelled geometry, PBR surfaces, motivated practical lights + subject rigs, real post (AO, DoF, bloom,
ACES), expressive characters, 3D lettering for text. Colour contrast is intelligent: red dominates the light, but
skin, concrete grey, toxic green biology and gold achievement must still read as themselves.
