# Storyboard analysis — "The Patient Was Him"

Source: `inputs/storyboard.png`, an 8×8 sheet of 64 illustrated panels (split: `analysis/storyboard/panel-01…64.png`, palette in `storyboard.json`).
Overall palette (k-means): `#1e0a08` 35 % · `#41251d` 23 % · `#7b4a3a` 15 % · `#640d0a` 11 % · `#bb7f67` 8 % · `#b41b14` 8 %. That is near-black burgundy with warm skin/concrete mid-tones and saturated crimson accents, which matches the studio palette. Toxic green is used only for bacteria and gold only for the Nobel row.

## Visual language
- **Style:** semi-realistic illustrated characters with strong side and back light, over brutalist concrete settings with heavy vignetting.
- **Framing:** mostly medium close-ups and close-ups, with frequent extreme close-ups of objects (petri dish, glass, stomach, pills, medal).
- **Recurring motifs:**
  - the young dark-haired doctor (Marshall) and the older pathologist with grey hair and glasses (Warren);
  - green spiral bacteria;
  - the stomach organ;
  - glasses of liquid;
  - "REJECTED" papers;
  - pigs;
  - the red sun or red disc;
  - question marks;
  - concrete monoliths.
- **Lighting:** a red key or rim from screen-side practicals, black backgrounds, green self-illumination on biology, warm gold for the ceremony.
- **Text panels:** "1980s", "REJECTED", "10%", "ANTIBIOTICS", "THE PATIENT", "THE PATIENT WAS HIM.", "THE NOBEL PRIZE" and "PERTH AUSTRALIA" are reconstructed as *physical 3D lettering* (cast concrete, stamp, gold, signage), never as flat cards.

## Panel → beat → 3D reconstruction

| Panels (row-col) | Content | Beat / narration | Reconstruction in 3D |
|---|---|---|---|
| 1-6, 1-7 | Brutalist building "PERTH AUSTRALIA", flag | B1–B2 "Perth, Australia…" | `InstituteExterior`: lit window bays, cast sign, waving Australian flag, red-sun sky; crane down then orbit |
| 2-1 | "1980s" on a concrete wall | "The early nineteen eighties" | lettering cast in the sign monolith, plus the period-dressed lab |
| 1-4, 8-5 | question mark silhouette | "Medicine had a rule…" | push toward the entrance (doorway transition); the question is carried by narration |
| 2-5, 2-7, 2-6 | older pathologist with slide, petri dish | "Warren kept seeing something…" | `PathologyLab`: Warren (senior-pathologist) at the period microscope, hero orbit |
| 1-2, 2-8, 5-x | green spiral bacteria in tissue | "Spiral bacteria, living in the stomach lining" | lens dive (`LensTunnel`) into `MicroscopicWorld` (lining, mucus, swarm), spiral orbit around a hero bacterium |
| 1-8, 2-2 | young doctor portraits | "A young doctor, Barry Marshall, believed him" | young-doctor identity introduced at the lectern with a subject rig (key + red rim) |
| 1-5 | lecture podium, red hall, silhouetted audience | "Together they presented their findings" | `LectureTheatre`: raked velvet seats, audience looking away (attention 0.15), slide of spiral organisms |
| 3-1 | "REJECTED" stamped papers | "They were rejected" | `StampMark` slamming onto a paper stack on the stage desk |
| 3-3, 3-4, 3-5 | scientist with pig; pig; pig crossed out | "They tried to infect pigs. The pigs stayed healthy" | `AnimalLab`: two pens of procedurally animated pigs |
| 1-1, 3-7, 4-4 | drinking the green culture; glass | "He drank the bacteria himself" | Marshall in the animal lab holding a glowing culture → `drink` pose; portrait revolve |
| 4-5, 4-6, 1-3 | sick; vomiting; shocked hand-to-mouth | "Within days, he was violently ill" | `clutch-stomach` + `pain` expression, push in |
| 4-1, 4-2, 4-3 | endoscope, monitor with stomach, man in bed | "An endoscope showed his stomach inflamed…" | `EndoscopyRoom`: patient in gown on the bed, endoscopy tower with a live inflamed feed; camera passes *through the monitor* |
| 2-3, 5-4, 5-8 | stomach organ, glowing | "…swarming with bacteria" | `StomachOrgan` at hero scale, inflamed, glowing colonies |
| 5-6, 5-7 | molecules, cell | "neutralising the acid around them" | urea → ammonia ball-and-stick `Molecule`s around a `NeutralisingBacterium` halo |
| 6-1, 6-2, 6-3 | pills, "ANTIBIOTICS" | "antibiotics could wipe them out" | `Capsules` pour; colonies fade out |
| 6-4, 6-5, 6-6, 6-8, 6-7 | "THE PATIENT" newspaper, reading, writing, "THE PATIENT WAS HIM.", facepalm | "When the case was published, the patient was him" | `PublicationDesk`: printed headline, wall lettering rising out of concrete, Marshall with a wry smile |
| 7-1…7-8 | tuxedos, medals, "THE NOBEL PRIZE", audience, celebration | "In 2005, Warren and Marshall received the Nobel Prize" | `CeremonyStage`: velvet curtains, gold plaque lettering, both laureates as older + tuxedo variants (same identities) presenting medals, gold light |
| 8-1, 8-8 | silhouette before red sun / on monument | "Sometimes, the proof has to go through you" | `RedSunHorizon`: lone silhouette on a plinth, giant red sun; final slow orbit and pull back |

## Interpretation notes
- **Likeness:** the real scientists are shown as generic, consistent identities ("young-doctor", "senior-pathologist"), not likenesses. They are aged with `@older`/`@elderly` and dressed with `+tuxedo` or `+gown` while keeping the same face, hair and skin.
- **Ambiguous panels:**
  - the "10%" graph (3-2) has no matching narration, so it appears only as the period chart on the publication-desk monitor;
  - the question-mark panels are carried by narration and lighting rather than literal geometry.
- **Facts:** see `docs/fact-check.md`.
