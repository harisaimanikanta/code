# Cinematography

The film is one take. Cinematography = choosing, for every beat, **where the camera is going and why**.

## Motivation table — pick moves for a reason

| Intention | Move | Notes |
|---|---|---|
| Introduce a person with weight | `hero-orbit` (60–90°, r 2–3 m, eye level) | slow; end on 3/4 face |
| Intimate thought / decision | `portrait-revolve` (r 1.3–2.3 m, 120–300°) | full revolve for defiant acts |
| Reveal an object's form | `object-inspection` orbit (r 0.6–1.2 m, high angle) | |
| Establish scale / institution | `monument-revolve`, `crane-up-reveal` | wide FOV 38–45 |
| Escalation, system, crowd | `rising-spiral` | radius + height increase |
| Descend into a problem | `descending-spiral`, `crane-down-settle` | |
| Tension / attention | `slow-push` (dolly in) | 0.5–1 m/s |
| Isolation / consequence | `pull-reveal` | |
| Journey / time passing | `corridor-glide` (travel, lookAlongPath) | |
| Unease / instability | `dutch-drift` (roll 5–10°) | sparingly |
| Quiet emphasis | `focus-breath` / `drift` | still moving |
| Transition | `through` / `travel` with via-points | see transition-system.md |

**Orbit budget:** ≥30 % of frames orbit/revolve (validator measures it geometrically: tangential motion around the
look target). Spend orbits on people, faces, objects, instruments, biology, awards, landmarks. Don't spin
aimlessly; every orbit should *reveal* something (a face turning into light, an object's hidden side, a second
character behind the first).

## Composition

- Lens (vertical FOV): 26–32 portraits/objects, 34–40 standard, 42–55 environments/flythroughs, 55+ tunnels.
- Thirds for people; centred symmetry for monuments, corridors, lenses.
- Keep the horizon level unless a roll is motivated.
- Always layer: a foreground element (pillar, shoulder, glassware), the subject, and a lit background plane.
- Subjects must not fall under the subtitle band (bottom 15 % in 16:9; 24–35 % from bottom in 9:16) — use
  `subtitle.position: "top"` or frame higher.
- Camera height: eye level 1.5–1.7 m for empathy; low (0.6–1.0 m) for authority; high for vulnerability.

## Speed & rhythm (meters per second at human scale)

| Feel | Linear speed | Orbit rate |
|---|---|---|
| contemplative | 0.2–0.6 | 5–12 °/s |
| narrative | 0.6–1.5 | 12–25 °/s |
| energetic / transition | 2–8 | 25–45 °/s |
| tunnel dive | 5–10 | — |

Match speed to narration energy; slow down into dramatic pauses, accelerate through transitions. Hard limits are
enforced by `validate-camera-path.py` (default max 20 m/s, 14 m/s², 140 °/s).

## Rhythm across the film

Alternate scales (wide ↔ close), directions (clockwise ↔ counter-clockwise orbits — never back-to-back, put a crane/travel/spiral between them), and verticality
(rising ↔ descending). Avoid ≥4 identical consecutive moves (validator warns).
