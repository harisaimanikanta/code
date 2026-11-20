# Animation & Characters

## Determinism (hard rule)

Every animation is a pure function of the frame: `const { frame, t } = useAssetTime(props.frame)`. Use
`rng(seed)`, `noise1`, `fbm1` from `core/math.ts`. Never `Math.random()`, `Date.now()`, `useFrame` deltas or
physics engines with internal state — Remotion renders frames out of order across parallel workers.

## Characters (`characters/Figure.tsx`, `poses.ts`, `presets.ts`)

- World-layout actor:
  ```jsonc
  {"id": "marshall", "component": "Figure", "position": [x,y,z], "rotation": [0, yaw, 0],
   "props": {"character": "doctor", "item": "culture", "itemFrames": [1150, 1335]},
   "actions": [
     {"type": "walk", "start": 0, "end": 90, "path": [[0,0,0],[0,0,3]]},
     {"type": "turn", "start": 90, "end": 110, "yaw": 1.57},
     {"type": "pose", "pose": "gesture", "start": 100, "end": 220, "fade": 10},
     {"type": "look", "start": 150, "end": 260, "yaw": 0.4, "pitch": -0.1}
   ]}
  ```
- Poses: `stand` (breathing idle, default), `walk`, `sit`, `reach`, `hold`, `gesture`, `point`, `raise`,
  `cross`, `inspect`, `drink`, `slump`, `write`. Poses blend with envelopes (`fade` frames); `look` is additive.
- Hand items: `glass`, `flask`, `culture`, `paper`, `journal`, `medal`.
- Identity: presets `base-human`, `male-adult`, `male-broad`, `female-adult`, `female-bun`, `older-male`,
  `older-female`, `scientist`, `scientist-female`, `doctor`, `doctor-female`, `researcher`, `surgeon`,
  `audience-member`, `background-figure`. **Age variants** `"<id>@young|adult|older|elderly"` keep face seed,
  hair style and outfit (identity), change hair colour, skin, posture and height.
- New recurring character → add a `def()` spec in `presets.ts` (library update, version bump). One-off → pass a
  full `CharacterSpec` object as `character`.
- Body language over faces: stoop for age/defeat, crossed arms for dismissal, raised arm for triumph, slump for
  illness, inspect for curiosity. No facial animation unless the story needs it.
- Real historical people: generic figures (no likeness), consistent across scenes; never invent appearance details.

## Crowds (`characters/Crowd.tsx`)

Instanced seated/standing crowds. `attention` 0–1 turns heads toward `lookAt` — low attention reads as
indifference/rejection, high as rapt interest. One draw call per body part.

## Objects & environment motion

- Screens (`Screen` content bars/graph/scan), doors (`openStart/openEnd`), floating pages, award plinth reveal
  ramps, microbes (corkscrew spin, drift, `appear`), tissue undulation, fluid ripples, dust, embers.
- Use frame windows (`appearAt`, `revealStart`, `frames` on entities) synchronized to beats from
  `analysis/timeline.json` (beats have `startFrame`).

## Principles

Anticipation before big actions (5–10 frames), overlap (head look leads body turn), ease in/out on poses (via
`fade`), secondary motion (breathing idle is always on), and restraint: one primary action per beat.

## v2 character system

- Poses added: `cover-mouth`, `facepalm`, `clutch-stomach`, `examine`, `present`, `pickup`, `clap`, `think`, `vomit`,
  `lie` (rests on a bed: place the root ≈0.56 m above the bed's floor), `handshake`, `nod`.
- Facial channels in every pose: `browRaise`, `browFurrow`, `lids`, `mouthOpen`, `smile`; expression actions
  `{"type": "expression", "expression": "shock|pain|smile|determined|sad|closed|concentrate", start, end}`.
- Automatic secondary motion: blinking (deterministic per identity), breathing, weight shifts, head drift.
- Walks are distance-driven (`stride`), so feet don't slide; use `turn` + `walk` to get characters out of the camera's
  path before a push-in.
- Identity grammar: `"<preset>[@young|adult|older|elderly][+labcoat|suit|tuxedo|gown|sweater|surgical]"` — same face,
  hair style and skin in every variant.
- Hand items: `glass`, `tumbler`, `flask`, `culture`, `vial`, `paper`, `newspaper`, `journal`, `medal`, `pill`, `slide`, `pen`
  (`item` + `itemFrames`, `leftItem`).
- Camera anchors follow an actor's position and walk, not its pose: for lying/bent characters add a global anchor.
- Animals: `Pig` (breathing, sniffing, ear flicks, distance-driven trot), `PigPen`, `PigGroup`.
- Skeletal clips: `GLTFModel` plays named clips from a licensed .glb deterministically (`clips: [{clip, start, end}]`).
