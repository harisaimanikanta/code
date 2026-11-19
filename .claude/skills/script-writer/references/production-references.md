# Production References - how top 3D explainer channels build their videos

Analysed 2026-11-19 from YouTube storyboard frames (low-res, ~1/s for Shorts, ~1/5 s for long-form). Captions were not downloadable
(YouTube bot check), so narration is reconstructed from **burned-in captions visible in frames** and is approximate. Access: `storyboard`.

## Z1 - "How Long Are Your Blood Vessels? 🤔" - Zack D. Films (29.8M subs)
https://www.youtube.com/shorts/c5G_25dhoeU · 40 s · **157.8M views · 6.15M likes · 70K comments** · 2024-04-06

### Reconstructed narration (caption fragments, approximate)
"If you somehow removed all of the blood vessels in your body [and laid] them together, you might think it would be about this long.
But the human body has thousands [of] tiny vessels that weave [through] every body part. And with all of them combined, if you started
in New York, your blood vessels would [stretch] all the way [past the] Grand Canyon. It would go on to reach across the Pacific Ocean,
over Japan, Asia and all of Europe. And not only would it make it all the way back [to the] starting point, but [it'd be able] to make
this trip 2 to 4 times over."

### Beat map (frame times)
| Time | Beat | Visual |
|---|---|---|
| 0.0 | Hypothetical hook ("If you somehow removed…") | Plain 3D man, sky-blue background, green ground, centred, full body |
| 1.0–3.9 | The impossible action happens on screen | A red vessel network peels out of his body and stands beside him as a "vessel man" |
| 4.9–6.0 | Viewer's wrong guess ("you might think…") | He pulls the vessels into a tangled bundle; it stretches along the ground |
| 6.8–8.8 | The wrong guess visualised | Top-down push out to an American football field with branding → camera spins away |
| 8.8–9.8 | **"But"** - the turn | Cut back to the man, vessels visible through his skin |
| 9.8–14.6 | New information | Extreme close-up: vessels pour out of the jeans leg; full-body vessel map in X-ray style |
| 15.6–16.6 | Gather | Vessel figure collapses into a pile |
| 17.6–22.4 | **Scale ladder 1** - New York → Grand Canyon | FPV fly-along of a single red line over a low-poly US map, city blocks, desert canyon |
| 23.4–26.3 | Scale ladder 2 - across the Pacific | Fly-along over ocean and clouds, the line keeps going |
| 27.3–29.3 | Scale ladder 3 - Japan, Asia, Europe | 3D globe rotates; the red line wraps across continents |
| 30.2–34.1 | "And not only…" - setup for the final number | Back to the man; red ribbons whip past him (the line returning) |
| 35.1–37.3 | **Payoff number** - "2 to 4 times over" | Pull back into space: Earth with several red loops around it, shrinking to centre → end/loop |

### What makes it work
- **Hypothetical "you" + an impossible physical action in 1 s.** The image explains the premise before the sentence ends.
- **Plant the wrong guess** ("you might think… a football field"), then **"But"** flips it. Same doubt→reversal engine as the parable format, compressed.
- **Scale ladder:** each beat is a bigger, more familiar unit (field → city → canyon → ocean → continents → the whole Earth → ×2–4). Views climb with the camera.
- **One continuous visual thread** (the red line) carries the viewer through every location; cuts feel like one journey.
- **Ends on the biggest number** with the camera pulling out to the largest frame (Earth), and no CTA. The last frame is calm and loopable.
- **Cheap production:** one generic rigged character, a flat sky-blue background, a green plane, a procedural red tube, a low-poly map, a textured globe. No complex sets.
- Captions: 1–3 words, small bold white, lower-middle, synced. Logo only on a prop (the football field), never as an intro.

### Accuracy note
The "~60,000 miles / ~100,000 km" figure for adult blood vessels is widely quoted but rough and debated; the video hedges with "2 to 4
times". For our channel: hedge disputed numbers the same way, as a range.

## Z2 - "5 Unreleased Videos I Thought Would Go Viral" - Zack D. Films (long-form, 12 min, 6.25M views, 2026-09-26)
https://www.youtube.com/watch?v=9uIbPuBT0Uo · 143 storyboard frames (~every 5 s)
- **Characters:** semi-realistic 3D humans (digital-human style, real skin, hair and cloth), a furry gorilla; consistent per segment.
- **Sets:** a Colosseum arena, city streets, a pizza shop, a hospital, suburbia; plus a **product-shot style** (objects on solid cyan backgrounds).
- **Camera:** low-angle hero shots, macro inserts (glove on phone, fingertip), top-down city maps, Dutch angles, FPV/crash zooms
  (into the sun), over-the-shoulder; a new shot ≤ every 5 s.
- **Graphics:** comic-book overlays ("ROUND", speed lines, panel borders), 3D price text ("$240 → $160", "+$50,000"), phone UIs, a 3D "ORDER!"
  button; scale-comparison shots with labels ("2.5 in").
- **Look shift:** the fiction segment uses a cinematic film grade, shallow depth of field and warm practical lighting (likely Unreal Engine 5).
- **Sponsor integration:** shown on the character's own phone inside the story.

## How to apply to our scripts
- When a story has a **number** (distance, money, count), consider a **scale-ladder** beat with one continuous visual thread.
- Open on an image that *performs* the premise within 1 s.
- Plant the viewer's wrong assumption before the "But".
- Production level achievable with Three.js: Z1 yes (one character + simple shapes + globe); Z2 needs Blender/Unreal-level characters.
