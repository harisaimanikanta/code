# Asset Library

## Locations & classes

| Class | Where | Lifetime |
|---|---|---|
| Permanent shared assets | persistent library: `--library` > `$BRUTALIST_ASSET_LIBRARY` > `~/.brutalist-3d-studio/library` | across projects |
| Seed | `SKILL/assets/` (shipped with the skill; read-only source for `init`) | skill version |
| Project-specific | `<project>/src/project-assets/` | one project (promote when reusable) |
| Vendored copies | `<project>/src/library/` + `asset-lock.json` | pinned per project |
| Temporary generated | `src/generated/`, `analysis/`, `out/`, `public/sound-bed.wav` | regenerable |
| External | `<project>/inputs/` (user files, untouched) | user-owned |

Never assume the working directory is permanent. In ephemeral environments (cloud sessions, CI), run
`asset-library.py export --out studio-library.tar.gz` at delivery and tell the user to keep it;
`asset-library.py import studio-library.tar.gz` restores/merges it next time.

## Layout

```
library/
  asset-manifest.json      every asset: id, name, category, description, source, exports, format, scale,
                           materials, dependencies (auto from imports), reuse, version, tags, files, sha256, history
  core/ characters/ environments/ architecture/ objects/ materials/ textures/ lighting/
  particles/ biological/ props/ camera-rigs/ transitions/
  .versions/<id>/<version>/<file>    archived previous versions
```
Presets inside modules (materials, lighting presets, camera move presets, character identities) are indexed as
their own searchable entries (`mat.*`, `light.*`, `cam.preset.*`, `char.preset.*`).

## Commands (`python3 SKILL/scripts/asset-library.py …`)

| Task | Command |
|---|---|
| Where is it? | `path` |
| Create / merge from seed | `init` (never overwrites modified library files) |
| Find before building | `search "spiral bacteria stomach" [--json]`, `list [--category biological]`, `show bio.spiral-bacterium` |
| Put assets into a project | `use PROJECT id1 id2 …` (deps + required core added, `asset-lock.json` written), `--all`, `--mode link` |
| Add new asset | `add file.tsx --id obj.centrifuge --category objects --name … --description … --tags … --reuse …` |
| Promote from a project | `promote PROJECT src/project-assets/Centrifuge.tsx --id obj.centrifuge …` |
| Change an asset | `update ID newfile.tsx --bump minor --note "…"` (old file archived, history appended) |
| Rebuild derived data | `reindex` (deps from real imports, hashes, preset entries) |
| Check project drift | `verify-lock PROJECT [--strict]` |
| Portable package | `export --out lib.tar.gz` / `import lib.tar.gz` |

## Reuse decision procedure (Phase 5)

1. List needed elements per beat (characters, architecture, objects, biology, lighting, transitions).
2. `search` each; score ≥ 10 usually a match. Read `reuse` notes and props in the source.
3. **Exact match** → `use`. **Partial** → prefer props/overrides (sizes, materials, frame windows) or compose
   existing parts in a project component. **Missing** → build a new procedural component in `src/project-assets/`.
4. If the new/extended component is generally useful, `promote` it (or `update` the library asset with a version
   bump when extending a library component in a backwards-compatible way: new optional props only).
5. Record in `docs/asset-plan.md`: element → asset id/version → reused | extended | new.

## Authoring rules for new assets

- One responsibility per file; export named components; props for size/material/frame windows.
- Procedural, deterministic, low-poly; shared geometries/materials (module-level or cached), never per-render
  allocation; instancing for >50 repeats.
- Units: meters; y-up; objects stand on y=0; characters face +Z; corridors run along −Z.
- Add named anchors to `environments/anchors.json` for camera targeting.
- Pure-TS modules imported by the camera engine must use explicit `.ts` import extensions and no TS-only runtime
  syntax (no enums/parameter properties) so Node can run them.
- After adding: `asset-library.py reindex` then `validate-assets.py --library`.
- Never overwrite: use `update` (archives the previous version). Projects keep their locked copies.
