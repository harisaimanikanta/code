# Transition System — spatial, never editorial

A transition = **(1) physical geometry** placed in the world + **(2) a continuous camera move** through/around it
+ optionally **(3) an occluder** (screen-space fill while the camera is inside an object). Catalogue:
`assets/transitions/transition-types.json` (shot `transitionIn/Out` must use these keys; `minSeconds` enforced).
Components: `transitions/Transitions.tsx` (LensTunnel, ScaleTransform, AssembleBlocks, MaterialMorphSlab,
LiquidPortal), `transitions/occlusion.ts`, `particles/ParticleVeil`, `architecture/Doorway`, `PillarRow`.

**Design the transition before building the two spaces it connects.** The second space must be *physically
behind* the transition geometry along the camera's path. Zones may be stacked vertically (micro world under the
lab floor) or chained horizontally; fog + culling hide what shouldn't be seen.

## Recipes

| Type | Geometry | Camera | Occluder |
|---|---|---|---|
| doorway | `Doorway` / `MonumentalRoom.doorways` | travel via [before, door centre, after], lookAlongPath | — |
| corridor | `BrutalistCorridor`, `UndergroundPassage` | travel along centreline | — |
| pillar-occlusion | `Pillar`/`PillarRow` near path | track/travel passing 0.5–1.5 m from a pillar; change zone/lighting behind it | optional box |
| object-fly-through | object with gap | travel via the gap | — |
| microscope-lens | `Microscope` + `LensTunnel` (+ `MicroscopicWorld` beyond) | push to eyepiece → through barrel → down tunnel → emerge; fov widens 30→55 | box around barrel, dark green |
| anatomical-tunnel | `AnatomicalTunnel` | via `tunnelCenterline(len, bend, u)` points | — |
| liquid | `LiquidPortal` / `FluidSurface` | descend through surface; lighting cue changes | box under surface |
| scale-transformation | `ScaleTransform` | orbit at constant distance while subject scales | — |
| architectural-morph | `AssembleBlocks` | crane/orbit while blocks rise into the next space | — |
| foreground-wipe | near element | track so it fills the lens briefly | sphere/box |
| particle | `ParticleVeil` | push through veil; next zone + lighting behind it | — |
| material-transformation | `MaterialMorphSlab`, `blendedMaterial()` | slow push/orbit during morph | — |
| camera-through-object | any solid (shoulder, wall) | travel through volume | **required**: matching colour, 4–12 frames full |
| room-to-room | adjacent rooms sharing an opening | continuous travel, lighting cue at threshold | — |
| match-position | shared silhouette in two zones | orbit around it while the zone behind changes | — |

## Worked example — doctor → lab → lens → micro world

```
orbit doctor (hero-orbit) ──► travel behind his shoulder (occluder sphere on shoulder: frame fills with coat colour)
   ──► emerge in lab (zone placed directly behind him) ──► push to microscope eyepiece
   ──► through barrel (box occluder, dark green) ──► LensTunnel (rings rush past, fov 55)
   ──► MicroscopicWorld below (lighting cue microscopic-green) ──► spiral around a hero bacterium
```
world-layout:
```jsonc
"occluders": [
 {"id": "shoulder", "shape": "sphere", "center": [x,y,z], "radius": 0.2, "color": "#1a0d0d", "feather": 0.25, "frames": [f0, f1]},
 {"id": "barrel", "shape": "box", "center": [x,y,z], "halfSize": [0.22, 1.1, 0.3], "color": "#030703", "frames": [f0, f1]}
]
```
Rules: keep full occlusion ≤ 12 frames; the camera must keep moving while occluded; change lighting cue inside
the occlusion window so the new mood "appears" on emergence; `validate-video.py` excuses black frames only inside
declared occluder windows.

## Tilted tunnels
Avoid pointing the camera exactly vertical (look-at degeneracy); tilt vertical tunnels ≥15° (e.g.
`rotation: [-1.2, 0, 0]`). Compute tunnel waypoints in world space (anchors ignore X/Z rotations).
