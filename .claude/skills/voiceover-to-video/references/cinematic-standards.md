# Cinematic Documentary Standards (v5)

The production bible for **cinematic mode** (`blender/cinema/`). It exists because v1–v4 output was judged *generic*:
primitive-looking assets, flat light, one lighting template for every set, repetitive camera moves, sentences turned literally
into objects, and pictures that didn't explain the story. Every rule below fixes one of those causes. Worked example:
`example/forssmann-cinematic/` (85.9 s, 37 shots, 11 sets).

---

## 0. Why the old pipeline looked generic (diagnosis, keep in mind)
| Symptom | Root cause in v1–v4 | v5 fix |
|---|---|---|
| "Basic shapes" | Props were raw spheres/cylinders/boxes with one flat colour | `ck.box` is always bevelled; `lathe`/`tube` profiles; every material is procedural PBR (`ck.m_*`) |
| Flat light | Two global looks (`look_night`, `look_day`) reused everywhere | A lighting setup **per shot**, motivated by a practical in the set; per-shot light/exposure cuts (`light_cut`, `exposure`) |
| Same camera every shot | One easing helper; moves chosen to "keep moving" | Camera grammar (§4) + `shotlist_check.py` refuses repeated types and > 25 % of one type |
| Story not understood | Storyboard written per sentence, objects illustrated words | Sequence-first storyboard with a takeaway per sequence and a purpose per shot (§1) |
| Template feel | One set reused | No set may exceed 40 % of runtime; no lighting setup > 30 % |
| Toy characters | Round-head cartoon kit only | `human.Human`: 7.5-head proportions, garments as silhouettes, sculpted head, real eyes, expressions, finger rig |

## 1. Storyboard first (the highest priority)
Nothing is built until `storyboard.json` passes `scripts/shotlist_check.py storyboard.json words.json` (prints `STORYBOARD OK`).
1. **Read the whole voiceover twice.** Mark the emotional curve (curious → serious → tense → amazed → warm…) from the ElevenLabs tags
   and the pauses in `beats.json`.
2. **Sequences before shots.** Split the film into 8–15 sequences. Each gets a one-sentence **takeaway** (the mute test: what the viewer
   understands with the sound off).
3. **Shots answer ten questions** (all required fields): `vo` (exact words), `purpose` (what the audience must understand), `visible`,
   `action` (with the word it lands on), `environment`, `camera {type, lens, fstop, move}`, `lighting {setup, mood, notes}`,
   `transition_out`, duration (`t0`/`t1`), `connects` (how it leads to the next shot).
4. **Cuts land in pauses or word boundaries**, never mid-word (the checker verifies against `words.json`). Hold 1.2–6 s.
5. **Show meaning, not nouns.** "Touching the inside of a heart meant death" is *senior doctors at a 1929 anatomical chart, one tapping the
   heart, the other shaking his head on "death"*, not a heart icon. Every visual adds context the narration doesn't.
6. **Reveals land on the word** (`action` names the word; code uses `wt('inside', after)` to key it).
7. **Continuity block** in the storyboard: character looks per age, prop look, screen direction (story moves left→right), which arm.

## 2. Assets
- Primitives are starting points only. Use: `box` (bevelled, weighted normals), `lathe(profile)` for anything turned (lamps, bottles,
  columns, vessels), `tube(points, r)` for pipes/rails/cables/veins/catheters (animate `bevel_factor_end` to grow), `solidify` for
  sheets/paper/lids, `subsurf` + `_wrinkle` (displace) for cloth, mattresses, linen.
- Real dimensions in metres (door 0.95×2.15, desk 0.77 high, ceiling 3.2–4.4 in 1920s buildings). Thickness everywhere.
- Rooms: `props29.room()` builds walls **with real openings**, skirting, dado band and cornice; windows/doors fill the openings.
  Always build the wall behind the camera when the camera can see it (`front=True`), or the frame shows black void.
- Period accuracy: check every prop against the year; no modern UI, no holograms in historical scenes.
- Printed text on props is either historically accurate (verify it) or unreadable grey text blocks (`textures.text_block`).
- Characters (`human.Human`): outfits `doctor | suit | tails | nurse | scrubs | ghost`; age, hair style, glasses, moustache, build.
  The garments ARE the silhouette (skin-modifier meshes on one armature), so there is no clipping between body and clothes.
  **Honest limit:** faces are sculpted procedurally; they hold up at medium distance and in low-key light. Stage faces in profile,
  three-quarter backlight, over-the-shoulder or silhouette; avoid flat, frontal, evenly-lit close-ups. Prefer prop/hand inserts
  for tight action. If a close-up of hands looks tangled, re-stage it as a prop insert (lesson L057).
- Anatomy (`anatomy.Anatomy`): ghost skin with a keyable skin↔ghost dissolve, cutaway ribcage (sternum removed so the heart reads),
  sculpted heart with great vessels and surface-snapped coronaries, venous road in the correct order, catheter growth, heartbeat,
  travelling road glow, and an X-ray material mode that renders a radiograph texture from the same model.

## 3. Lighting (every shot has an intentional setup)
Name a setup per shot in the storyboard; no setup may cover > 30 % of the runtime. Recipes used in the example:
| Setup | Recipe | Mood |
|---|---|---|
| Practical low-key (office, small town) | Banker's lamp bulb (`practical_bulb`) as key, cool window rim (`window_light`), deep falloff, 1:6 ratio | authority, melancholy |
| Window haze (ward, Berlin) | `sun` through real window openings + `window_light` sky + `haze` box 0.01–0.015 → visible shafts | historic, solemn |
| Surgical overhead (OR) | `surgical_lamp` disk area light as the motivated key, tile bounce fill, cool window rim; lower it for close-ups | clinical |
| Hard side key (procedure) | One spot from the side, nothing else; steel glints | dread |
| Light box (X-ray) | The film viewer is the only key; warm doorway rim for separation | revelation |
| Theatrical spot (amphitheatre) | One narrow spot through haze + a dim warm bounce so the tiers read | humiliation |
| Stage gold (ceremony) | Warm key spot + cool blue back spot + haze, gold highlights | vindication |
| Anatomy void | Cool area rim + warm key + a per-shot heart/elbow spot; no world light | awe, clarity |
| Modern clinic | Soft ceiling panels, monitor glow, −2 EV exposure | confident |
Rules: key + fill + rim (or a deliberate absence of one) on every subject; at least one motivated practical per set; contact shadows always
(Cycles); AO comes from path tracing; no random coloured lights; no blown highlights. Use `exposure({shot: ev})` per shot rather than
lighting everything brighter. Haze costs render time; use it where it tells the story.

## 4. Camera (professionally operated)
`ck.Shot(sc, C, id, t0, keys=[(t, pos, aim[, lens][, focus_distance])], lens, fstop, ease, shake)` binds a camera to a marker at `t0` (a cut).
- Grammar: `macro_slide, dolly_in, dolly_out, push_in, track, follow, orbit, crane_up, crane_down, ots, low_angle, top_down, rack_focus, parallax, reveal`.
  `static` is not a move. Consecutive shots never share a type; ≥ 8 types per film; ≤ 25 % for any one type.
- Every move is motivated: push-in = growing tension/realisation, pull-out = scale/consequence, crane up = isolation or vindication,
  low angle = authority, top-down = procedure/objectivity, rack focus = a shift of attention, follow = intention.
- Easing: `smooth` (bezier ease in/out) by default, `linear` for tracks/follows, `out` to settle onto a reveal. Hand-held `shake` ≤ 4 mm.
- Depth of field: f/1.8–2.8 for faces and inserts, f/4–5.6 for wides, f/8 for overheads. Rack focus = keyed `focus_distance`.
  A focus object's **origin** must be at the subject (curves/tubes built in world space have their origin at 0,0,0; use distances).
- Composition: foreground element, midground subject, background depth; leading lines; rule of thirds; headroom; 9:16 safe area.
- Never place a camera inside a character or prop: check the mid-frame still of every shot (characters move between shots).

## 5. Materials
All via `ck.m_*`: plaster (grime gathering low), tiles (grid, grout recess, glaze variation; `plane='wall'|'floor'`), wood (rings, figure,
clear coat), floor planks, brushed metal, chrome, brass (tarnish), enamel (chips), painted metal, glass, frosted glass, cotton/linen
(weave bump, sheen), wool (twill, sheen), leather, varnished rubber catheter (SSS + coat), skin (SSS, mottling, pores), hair (strand
stripes, low spec), paper (aged), emissive practicals, backlit radiograph film. AgX "Medium High Contrast". No default grey, no plastic.

## 6. Transitions (part of the film)
Use cuts on motion or in pauses by default. Designed transitions in the example: **anatomical match cut** (his real elbow → the same
framing with the skin dissolving to ghost), **light transition** (corridor door glow fills the frame → Nobel stage light), **motion-matched
cut** (track continues direction across the cut), **object match** (monitor catheter line → glowing vein). Fades only at the very start/end.

## 7. Voiceover sync
Use the given audio unchanged. `align.py` → `words.json`; cut points in pauses; key actions at word times (`wt(word, after)`);
heartbeats on "heart"/"survive"/"home"; holds on long pauses (the 0.58 s silence before "And he was still alive" is a held close-up).

## 8. Render budget (CPU containers)
Measured on 4 CPU cores (Cycles 5.3): 540×960, 8 spp + OIDN ≈ 7–15 s/frame. EEVEE through software GL is slower (≈ 35 s).
So: render at 540×960, **on twos** (`--step 2`), interpolate each shot separately to 24 fps in post (`minterpolate`, never across a cut),
upscale to 1080×1920 with lanczos + light sharpen + fine grain. Keep haze, glass and transparency where they matter. On a GPU machine
render every frame at 1080×1920 / 64 spp with the same scripts.

## 9. Quality control (before delivery)
1. Stills of every shot (`film.py --stills id@frac,...`) → contact sheet → fix: generic assets, flat light, missing shadows, blown or black
   frames, camera inside geometry, tangled poses, empty frames, unreadable action.
2. After the render: `scripts/review.py final.mp4 <workdir>` sheet + flags; check timing of reveals against `words.json`.
3. Typical failures found in the Forssmann QC pass (L063–L066), so check them first:
   - **White slab windows**: a light behind glass is visible through transmission rays (fixed in `ck.window_light`).
   - **White-on-white inserts** (coats, linen, enamel under the surgical key): per-shot `exposure()` −2…−3 EV and lower the key with `light_cut`.
   - **Rack focus with the foreground subject out of frame**: derive cameras and focus distances from `head_world()`/`bone_world()` at that frame.
   - **Tight reaction close-ups of stylized faces**: frame a medium close-up that includes what the character is reacting to.
4. Re-render only the failing shots: delete their frames, then `film.py --set X --render --shots A,B --step 2`; `HIDE=name1,name2` hides objects
   in a still to isolate what causes an artefact.
5. Record every problem as a lesson (`learn.py add`) and fix the kit, not only the film.
