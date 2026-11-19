# Lighting & Materials

Lighting is storytelling. Global mood comes from **presets** blended continuously across shots
(`lighting/LightingDirector.tsx`, data in `lighting/lighting-presets.json`); local motivation comes from
**practicals** placed in the world (slot lights, hanging lamps, spot pools, emissive screens, glowing liquids).

## Emotion → preset

| Emotion / beat | Preset | Recipe |
|---|---|---|
| Mystery, opening | `mystery` | deep red backlight + rim, heavy fog 0.045, minimal fill |
| Discovery | `discovery` | toxic-green focused key, red rim, moderate fog |
| Rejection, bureaucracy | `rejection` | cold grey-white top key, hard shadows, desaturated tint |
| Experiment, work | `experiment` / `low-key-lab` | warm focused key on work surfaces, deep falloff |
| Scientific explanation | `explanation` | readable even key, green rim for subjects, light fog |
| Triumph, reward | `triumph` / `golden-award` | warm gold key + top spot, golden haze |
| Final punchline | `punchline` | return to crimson and black, single strong rim |
| Corridors / journeys | `volumetric-corridor`, `industrial-red` | side shafts through haze |
| Portraits / orbits | `high-contrast-character`, `crimson-rim` | hard 3/4 key + red rim, no fill |
| Microscopic world | `microscopic-green` | green key, red tissue rim, dense medium |

Set `shot.lighting`; consecutive identical presets merge; changes cross-fade over `lighting.blendFrames`
(default 36) centred on the boundary. Put lighting changes at transitions (inside an occlusion window, at a
doorway threshold, behind a particle veil) so they feel motivated.

## Physical coherence

- Global key/rim/fill are directional lights with fixed world directions per preset; the key's shadow frustum
  follows the camera target (`LightingDirector focus`).
- Every bright area should have a visible or implied source: add `SlotLight`, `HangingLamp`, `SpotPool`,
  `DeskLamp`, `LightShaft` (fake volumetric), emissive materials.
- Keep 1–3 shadow-casting lights per zone. Mounting/unmounting zones changes light counts (shader recompiles —
  render-time only; fine).
- Fog density is the depth tool: denser = mystery/claustrophobia; lighter = clarity.

## Materials (always from presets: `getMaterial(id, overrides?)`)

`concrete-rough`, `concrete-dark`, `concrete-red`, `metal-painted`, `metal-brushed`, `metal-dark`, `glass`,
`glass-tinted-red`, `bio-translucent`, `mucus`, `flesh-wall`, `bacteria-toxic`, `matte-black`, `red-dark`,
`red-lacquer`, `emissive-red`, `emissive-toxic`, `emissive-gold`, `emissive-white`, `gold-metal`,
`fabric-labcoat`, `fabric-suit-dark`, `fabric-suit-burgundy`, `skin-stylized(-aged)`, `hair-dark/grey`, `paper`.

- Concrete is always textured (procedural board-form map + roughness) and flat-shaded.
- Emissives use `toneMapped: false` so they glow against fog.
- Glass = physical material with clearcoat + low opacity (no transmission pass: too slow in software WebGL).
- Material transformations: `blendedMaterial(a, b, t)` (cached steps) or `MaterialMorphSlab`.
- New material? Add a preset to `materials.ts` (library update + version bump), never inline in scenes.

## Exposure & grade

Each preset carries `exposure` and a `grade {tint, tintOpacity, vignette, grain}` used by `effects/Grade.tsx`
(soft-light tint, vignette, deterministic grain). If stills are too dark, first add practicals/spot pools, then
raise preset exposure in a project override (`shot.lighting` → custom preset in a project copy) — never
flatten with ambient light.
