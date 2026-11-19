# Camera System — continuous one-take engine

Source: `assets/camera-rigs/engine/compile.ts` (+ `vec.ts`), applied by `camera-rigs/CameraRig.tsx`.
Baked by `npm run bake` (`scripts/bake-camera.ts`) → `src/generated/camera-track.json`, validated by
`validate-camera-path.py`. The track is the single source of truth for every frame.

## How continuity is guaranteed

1. **Inheritance by construction** — moves are compiled in order; each generator receives the previous move's exact
   end state (position, look target, FOV, roll) and must return it at u=0 (the compiler asserts this).
2. **Orbits derive from the inherited position** — start angle/radius/height are measured from where the camera
   *is*; `radius`/`height` are approached over `approach` (default 35 %) of the move.
3. **Fluid-head look blending** — the inherited aim is carried *with the camera* as a held direction (so flying
   past the previous target can't whip the view), then blends to the new one by interpolating yaw (shortest
   way, direction locked at move start) and pitch, never by lerping points (which can flip 180°) or slerping
   through the pole. The blend length `lead` is auto-extended so re-aiming stays under ~100°/s.
4. **Velocity blending** — positions and look angles are Gaussian-smoothed (`camera.smoothingSeconds`, default
   0.4 s) with velocity-preserving end padding, removing velocity discontinuities at move boundaries.
5. **Splines** — `travel`/`through` use centripetal Catmull-Rom through via-points with arc-length
   parameterisation (constant speed unless `ease` is set).
6. **Orientation** — quaternion from look-at + roll, hemisphere-continuous; sub-frames are slerped.
7. **Operator breathing** — ~1 cm / 0.12° smooth noise on top (config `camera.handheld`); never the only motion.

## Shot camera spec (`shot.camera`)

```jsonc
{
  "preset": "hero-orbit",          // optional, from camera-rigs/move-presets.json; explicit keys override
  "move": "orbit",                 // orbit|revolve|spiral|dolly|push|pull|track|crane|pan|tilt|travel|flythrough|through|goto|focus-pull|roll|drift
  "target": "doctor.head",         // look target; anchor string | [x,y,z] | {"anchor": "...", "offset": [x,y,z]}
  "center": "plinth.top",          // orbit centre if different from target
  "radius": 2.4, "radiusEnd": 3.0, "approach": 0.35,     // orbit/spiral
  "sweepDeg": 90,                  // + = counter-clockwise seen from above
  "height": 0.2, "heightEnd": 1.0, // orbit height relative to centre
  "to": "lab.door", "via": ["a", "b"],                   // travel/through/goto/dolly
  "distance": 2.5, "forward": 1.0, // dolly/track/crane amounts (m)
  "yawDeg": 30, "pitchDeg": -10,   // pan/tilt without target
  "fov": 34, "fovEnd": 28, "rollDeg": 6,
  "lead": 0.3,                     // fraction of move for look-target blend (auto-extended when needed)
  "lookAlongPath": true, "lookAhead": 2.5,               // travel: aim ahead along the path
  "drift": 0.4,                    // pan/focus-pull/drift residual motion (m)
  "ease": "linear"                 // linear (default, keeps momentum) | cinematic | inOutSine | …
}
```

### Anchors
`"<entityId>"` → entity centre (actors: chest). `"<entityId>.<name>"` → component anchor from
`environments/anchors.json` (e.g. `lab.microscopeEyepiece`, `plinth.top`, `marshall.shoulderR`) or the entity's
own `anchors` in world-layout. Global named points live in `world-layout.json → anchors`. Anchors account for the
entity's position, Y-rotation, uniform scale and — for actors — their walk paths over time (orbits track walking
characters). Pose deformation (e.g. a slump) is *not* tracked: add an `offset`.

## Move reference

| Move | Inherits | Key params | Typical use |
|---|---|---|---|
| orbit / revolve / spiral | angle, radius, height | target/center, radius(End), sweepDeg, height(End) | people, objects, landmarks |
| dolly / push / pull | direction of view | distance or to | tension, reveal |
| track | lateral axis | distance, forward | parallax, pillar wipes |
| crane | vertical | distance, forward | reveal geography, settle |
| pan / tilt | position (drifts) | yawDeg, pitchDeg, drift | survey (sparingly) |
| travel / flythrough / through / goto | spline from current pos | to, via, lookAlongPath | corridors, doors, lenses, tunnels |
| focus-pull / roll | slight dolly | fovEnd / rollDeg, drift | emphasis, unease |
| drift | slow push + 4° arc | drift, sweepDeg | quietest allowed move |

## Workflow & tuning

1. Write moves; `npm run bake` prints planned orbital %, peak speeds and warnings.
2. `python3 SKILL/scripts/validate-camera-path.py .` — fix every FAIL:
   - *angular speed* → lengthen `lead`, move via-points so the path doesn't pass close to the target, avoid aiming
     at a point the camera flies past.
   - *acceleration / speed* → lengthen the move, reduce distance, add a via-point, or split into slower + faster moves.
   - *stationary* → add drift or orbit; never hold.
   - *orbital share* → convert pushes on people/objects into orbits or spirals.
3. Print positions at shot boundaries to debug layout (`python3 -c` over camera-track.json `p`/`t`).
4. Stills at key frames to confirm framing; adjust `radius`, `height`, `sweepDeg`, `fov`.

Direction reversals: two consecutive moves whose motion directions oppose (e.g. orbit +70° then −70°) force the
velocity through zero → the validator reports stationary frames. Separate reversals with a move that adds
radial/vertical motion (crane, spiral with height change, travel), or keep orbit direction and alternate
between subjects instead.

Helpful facts: orbit ends at angle `a0 + sweepDeg` where `a0 = atan2(z−cz, x−cx)` of the starting position;
choose sweep sign/size so the orbit ends where the next move wants to start (e.g. in front of a face before a
push into a shoulder).

## Config (`production-config.json → camera`)

`initial {position, target, fov, rollDeg}`, `smoothingSeconds`, `handheld {position, rotationDeg, frequency}`,
`maxSpeed`, `orbitTargetRatio` (0.3), and optional `qc` overrides for validator thresholds (`minSpeed`,
`minAngularSpeed`, `maxAccel`, `maxAngularSpeed`, `maxAngularAccel`, `jumpFactor`, `orbitMinRate`). Scale-aware: for
miniature/micro worlds built at real micro scale, scale thresholds accordingly (the library builds micro worlds at
~1 m per microbe precisely so defaults work).
