# Stylized Cartoon 3D — the mandatory visual style (v6)

**This is the skill's identity. Every video, in every mode, is a professionally art-directed stylized cartoon 3D film**:
stylized cartoon characters + sophisticated 3D modelling + physically convincing lighting and shadows + premium cinematic rendering.
It must read as a premium animated documentary, not photoreal CGI and not basic cartoon graphics.

It replaces the v5 "realistic-proportion humans" of cinematic mode. The *film-making* of cinematic mode stays (storyboard gate,
motivated light, operated camera, designed transitions). What changes is the *design of the world*. The user stated this as a
fundamental requirement (lesson L069). It outranks any example, habit or older lesson.

## Never

- Photorealistic humans, realistic skin (pores, wrinkles, veins) or live-action-looking characters.
- Minecraft, voxel or blocky characters or worlds. Low-poly primitives. Capsule "figurine" bodies with ball heads.
- Flat 2D cartoon characters, cel/toon shading with ink outlines, or flat unlit colour.
- A cheap plastic-toy look: uniform gloss, one colour per part, no SSS, no roughness variation.
- Oversized body parts beyond the style sheet (giant hands, bobble heads), broken facial geometry, stair-stepped hairlines.
- Mixing styles in one film: realistic people next to toon people, photo textures next to stylized props, low-poly next to smooth.

## 1. Character design (kit: `blender/cinema/human.py`, `STYLE = TOON`, the default)

`human.set_style('toon')` is the default. `'realistic'` exists only for anatomy references, and never shares a frame with toon.

| Feature | Style-sheet value (TOON) | Why |
|---|---|---|
| Proportions | head ×1.30 of the realistic head (about 6 heads tall), neck ×1.45 thicker and shorter | Appealing, readable at 9:16 |
| Cranium | rounder and fuller (`cranium` 0.12, `crown` 0.12), face ×1.1 wider, lower face shortened 10 % | Features sit compact in the lower half |
| Jaw | soft and rounded (`jaw` 1.42), not tapering to a point | Avoids the "egg" head |
| Eyes | radius 0.0168 (×1.42), iris 60 % of the ball with a light inner ring and a dark limbal ring, wet clear coat, lash line on the upper lid | The acting lives in the eyes |
| Brows | tapered, arched tubes ×1.7 thicker, expression keys ×1.7 | Carry emotion at a medium shot |
| Nose | round button bulb plus a soft bridge (0.95) | Catches the key light, gives the face depth |
| Mouth | sculpted lips plus a crisp lip-line crease, lip tint with a hard-edged mask | A soft colour blob reads as blur |
| Cheeks | full apple cheeks, warm blush | Pixar-like appeal, a target for the subsurface glow |
| Hands | real fingers (2 bones each), ×1.22 chunkier, palm ×1.12 | "Properly modelled hands and fingers" |
| Head mesh | 160×128 UV sphere before subdivision | Crisp lip and lid creases; at 96×64 they smear |
| Clothing | garments are the silhouette (long coat, apron, suit); lapels, buttons, pockets, collars | Attractive, readable silhouettes |

Keep a character's proportions identical in every shot (same constructor arguments). After any change to `human.py`, run
`python3 scripts/toon_lookdev.py --out <dir>` and look at the close-up, medium and full-body sheet before rendering anything else.

## 2. Cartoon skin shading (never flat, never oily)

`human._toon_face_material()` (face) and `human.toon_skin()` (neck, hands) set:
- **Subsurface** weight 0.3, radius (1.0, 0.4, 0.22) (red travels furthest), scale 0.006 m. Above about 0.01 m the subsurface
  washes the form out and the face goes flat (look-dev pass 2).
- **Controlled satin highlight:** clear coat weight 0.18, roughness 0.32, over a base roughness of about 0.45. A roughness map
  drops to 0.36 on the forehead, nose bridge and tip, and chin, so the specular kick lands where animated films put it. A sheen of
  0.15 rolls off at the edges.
- **Smooth tonal gradients:** large-scale tone drift only (noise scale 6). Add warm blush on the cheeks and nose tip, and slightly
  darker lids. **No pores**, only a faint 0.015 soft bump.
- Lips: a crisp mask (map range 0.3 to 0.55) and a satin roughness.
- Eyes: wet cornea (coat 1.0, roughness 0.02), so every eye carries a catchlight from the key.

## 3. Shadows on cartoon characters (physically convincing)

- Cycles path tracing gives real AO, contact shadows, self-shadowing (brows over eyes, nose on the lip, chin on the neck) and the
  shadows under collars, lapels, aprons and caps. Never turn shadows off on a character light.
- Every character stands on a surface that receives a **contact shadow**. A floating figure has no shadow, so fix the floor first.
- The key must be big (area 1.2 to 2.2 m) and **off-axis by 35 to 50°**. A frontal key flattens a stylized face completely
  (look-dev pass 1). Keep fill at 1:4 to 1:8 of the key so the shadow side keeps shape.

## 4. Environments (same world as the characters)

- Use the `props29` / `ck` procedural PBR library: bevelled edges everywhere (`box(..., bev=)`), material separation between wood,
  enamel, chrome, glass, fabric and plaster, roughness variation, and subtle reflections only on enamel, chrome, glass and polished floors.
- Shapes are clean and slightly simplified, with rounded bevels, and match the softness of the characters. Do not use photo
  textures on walls. Use procedural plaster, tiles and planks with grime.
- Depth: dressed foreground, a lit midground subject and a dressed background in every frame (L014). Add soft `haze()` volumes
  (density 0.005 to 0.02) behind the subject for atmospheric separation, and light shafts only from motivated windows or lamps.

## 5. Stylized cinematic lighting

Recipe per character shot (see `scripts/toon_lookdev.py` for the reference rig):
- **Key:** large, soft and warm (`#ffe0c0`), 40° off the camera axis and above.
- **Fill:** cool, about 1:8 of the key, with no shadow.
- **Rim:** warm white, behind and opposite the key, to separate the subject from the background.
- **Bounce:** a dim warm area light under the subject, facing up, to lift the chin and eye sockets.
- Practicals in every set (lamps, windows, light boxes), and haze where the light is motivated.
- Do not use excessive bloom, glow, emissive boosts or blown highlights (L002, L041). Keep exposure so that faces sit at
  55 to 75 % luminance.

## 6. Rigging and animation

The rig in `human.py` has IK hands with hold/ramp keys, 2-bone fingers with presets, a face with shape keys (smile, frown, jaw,
brow up/knit, lip press) ×1.7 for toon, eyes on pivots, blinking lids with lashes, `look()` with the eyes leading, `talk()`
lip-sync, `breathe()`, and a `walk()` driven by the distance travelled (no foot sliding).

- Every pose change uses ramps of 0.3 s or more (L033). Gestures blend from rest, and secondary motion comes from breathing,
  head follow-through and blinks.
- Weight shifts: hips lead a turn, and the head arrives last.
- Lip-sync while a character speaks; an emotion on every line (L019), expressed subtly for normal people (L035).

## 7. Rendering

- Cycles with OpenImageDenoise (albedo plus normal passes), AgX Medium High Contrast, motion blur, and DoF on every character shot
  (85 mm at f/4 for close-ups, focus on the eye plane, which `head_world()` returns for toon characters).
- CPU budget: 540×960, 8 to 16 spp, rendered on twos, then motion interpolation per shot in post (L061). On a GPU: 1080×1920 on every frame.
- The look must stay consistent frame to frame: no per-frame randomness in materials, the same sample settings across sets,
  and per-shot exposure only to fix white subjects (L064).

## 8. Visual consistency gate (before the full render)

1. The `toon_lookdev.py` sheet passes: faces shaded with highlights on the forehead, nose and cheeks, catchlights, a crisp mouth,
   no seams, a smooth hairline, readable fingers, and a contact shadow.
2. The contact sheet of every shot: every person is a toon character, every set uses the same material language, and no frame
   is photoreal, flat, blocky or plastic.
3. Name L069 in the `## Lessons applied` section of `TREATMENT.md`.
