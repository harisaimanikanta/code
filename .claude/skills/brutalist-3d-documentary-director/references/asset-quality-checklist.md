# Asset Quality Checklist (v2 visual standard)

Low-poly is a style, not an excuse. An asset is **production** quality only when every box below is ticked;
otherwise mark it `"quality": "placeholder"` in the manifest (or in `docs/asset-plan.md` for project assets) and
never present it as finished.

## Geometry
- [ ] Real dimensions (metres), built with `core/geometry.ts` — `bevelBox`, `lathe`, `taperedCapsule`, `tubeAlong`,
      `extrudeOutline`, `deformedSphere`. **No scaled unit cubes** (they stretch textures and have razor edges).
- [ ] Every hard edge bevelled (catches light); silhouettes read at 9:16 thumbnail size.
- [ ] Hierarchy of detail: hero objects have sub-parts (knobs, clips, seams, handles, cables); background props
      are simpler but still bevelled and textured.
- [ ] Repeats are instanced (`Instances`, InstancedMesh) — shelves of bottles, seats, tiles, crowds, windows.
- [ ] No geometry allocated per render (cache by parameters; `useMemo` for per-instance animated clones).

## Materials
- [ ] Studio preset via `getMaterial()` — PBR with albedo + normal + roughness maps from `textures/surfaceSets.ts`.
- [ ] Roughness varies across the surface; metals are metalness 1 with roughness maps; glass/wet/clearcoat use
      environment reflections (IBL is on by default).
- [ ] Texel density consistent with neighbours (box UVs in world units; fabrics/skin use dense repeats).
- [ ] No default/untextured grey, no uniformly glossy plastic, no flat concrete.

## Lighting response
- [ ] Looks right under at least two presets (e.g. `low-key-lab` and `punchline`).
- [ ] Emissives exist only where a real light source would be (screens, bulbs, glowing cultures) and bloom softly.
- [ ] Practical light sources in sets are real lights (area/spot/point) — bright areas are motivated.

## Animation
- [ ] Moves with purpose (operating machinery, breathing, ear flicks, peristalsis) and as a pure function of frame.
- [ ] No sliding (walks are distance-driven), no constant aimless spinning; secondary motion is subtle.

## Characters
- [ ] Identity preset (face seed, hair, outfit) reused across the film; age/outfit variants via `@age` / `+outfit`.
- [ ] Subject rig (`SubjectRig`) on every hero character: key, fill, rim.
- [ ] Close-ups: the procedural face is stylised — frame faces in 3/4 or profile with rim light, or supply a licensed
      rigged glTF (`GLTFModel`, deterministic clip playback) for extreme close-ups. Record the licence in
      `docs/asset-plan.md`.

## Text
- [ ] Storyboard text panels are physical: `Text3D` (cast concrete, gold, stamped) or printed canvas textures
      on in-world objects (newspaper, screens). Never flat cards floating in space.

## Verification
- [ ] Rendered with `AssetPreview` (`render-asset-previews.py` or a look-dev still) and inspected by eye.
- [ ] `validate-assets.py --library` passes after `asset-library.py reindex`.
