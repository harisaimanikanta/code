# Scriptwriting Framework

Voice: an intelligent friend telling the craziest true story they've ever heard. Spoken, not read.

## DEFAULT FORMAT: the True Mechanism Parable
This is the owner's chosen style, reverse-engineered from five reference Shorts (6.8M–35.1M views). Full breakdown in
`references/reference-style-analysis.md`. Use it for every script unless the user asks for another style.

### Length & pace (measured on the references)
**Target 60 s ≈ 210–230 words, spoken at ~3.5 words/s.** Range 55–65 s. Short sentences make the speed comfortable.
Use `scripts/script_stats.py <file> --wps 3.5` for estimates.

### Beat sheet (≈60 s)
| Beat | Time | Words | What it does |
|---|---|---|---|
| 1 Cold-open action | 0–4 s | 10–17 | **"He [did a physical, absurd, visual thing]."** No name, no date, no place. Or a one-line paradox ("It's impossible to X, but Y found something way worse."). |
| 2 Reaction | 4–7 s | 5–12 | Someone (or the viewer) reacts: laughs, doubts, mocks. Must be documented, or the viewer's own doubt. |
| 3 "You see," | 7–12 s | 15–25 | **Starts with "You see,"**. Name, place, era and stakes, in 1–2 sentences. Only what's needed. |
| 4 Mockery ladder | 12–35 s | 60–80 | Time markers ("Weeks later", "Then one night", "By July") drive 2–3 rounds of doubt or ridicule, each bigger. Concrete countable details. |
| 5 Rule-of-three climax | 35–45 s | 25–35 | "Then X. Then another. Then all of them." Rising count into the moment it all flips. |
| 6 Reversal | 45–50 s | 15–20 | The doubted side is proven right **at peak stakes**, using the real outcome. |
| 7 Mechanism | 50–60 s | 30–40 | "It's called X." / "Inside the jar…". The *why*, physical and concrete, in 2–3 sentences. |
| 8 Cut | last 1–2 s | — | **End on the strongest image or mid-thought. No moral, no CTA, no "and that's why".** Ideally the last line flows back into the hook. |

The mechanism can move earlier (R5 names "salting" at 0:09) when the twist is *not* the mechanism but the outcome.

### Voice rules for this format
- Present tense for the story ("He loads the shotgun…"), or simple past. Pick one and keep it.
- **"You see,"** exactly once, at the context beat. Use "So," "But," "Then," "Meanwhile," as the gears.
- 2–3 short quoted lines max, from *side characters*, never exposition. Real quotes where they exist; see the True-Parable rules.
- One comic side character or running gag if the record offers one.
- Physical, countable specifics (coin → sheet of paper; last 100 bucks).

### True-Parable rules (non-negotiable)
The reference channel invents plot. **We don't.** Every beat is documented; reactions are recorded or are the viewer's own;
illustrative lines are marked "dramatized" in `research.md` and the description; the reversal is the real outcome.
See `reference-style-analysis.md` §5.

---

## Alternative: documentary format (use only when asked)
The original 45–90 s structure below remains for stories that don't fit the parable engine.

## Length (documentary format)
45–90 s. Narration ≈ 2.7–3.0 words/sec. 60 s ≈ 170 words · 90 s ≈ 250 words.
Fit the story; never pad.

## Structure (documentary format)
| Beat | Time | Job |
|---|---|---|
| 1 Hook | 0–3 s | The most unbelievable true element, stated plainly. Opens a gap the viewer needs closed. No intro, no "Did you know", no context. |
| 2 Context | 3–10 s | Only who / where / when needed to follow. One or two sentences. |
| 3 Escalation | 10–35 s | Chain of events. Each sentence adds new info, raises stakes, or flips understanding. "But / so / then" logic, not "and then and then". |
| 4 Big reveal | 35–55 s | The twist, consequence or discovery - held back until here. |
| 5 Payoff | 55–75 s | Satisfying end: final irony, consequence, or detail that recontextualizes the hook. Last line should land like a punchline. |

Proportions scale with total length.

## Writing rules
- Short sentences, mostly 4–14 words. Vary rhythm; one longer sentence can build momentum before a short punch.
- Concrete nouns and numbers over adjectives ("7,000 tonnes of iron" > "a huge amount of metal").
- One idea per sentence. Cut any sentence that doesn't advance, escalate or flip.
- Don't put the whole story in the first line - the hook states the *what*, withholds the *how* and *what happened next*.
- Transitions are earned by events: "But there was one problem." only when there is one.
- No fake cliffhangers ("you won't believe what happened next"), no "Did you know", no "Welcome back", no "In this video", no generic CTA.
- Attribute single-source claims inside the narration naturally ("according to the Secret Service agent who caught him").
- No invented dialogue. Quotes only if sourced, and short.
- Numbers: say them how a person would ("seventy thousand francs", not "70,000 FRF").
- End strong. Don't trail off into "and that's the story of…".

## Five hook types (generate one of each, every script)
In the parable format, at least two of the five should be **cold-open actions** ("He …"), since that is the reference style's dominant opener.
1. **Shock** - the most extreme true fact, bluntly. "In 1925, a man sold the Eiffel Tower."
2. **Curiosity** - an open loop with a specific promise. "There's a reason no one ever reported the Eiffel Tower stolen."
3. **Contradiction** - two facts that shouldn't both be true. "He was one of history's best con men - and his death certificate called him a salesman."
4. **Mystery** - an unanswered question at the core. "Nobody knows his real name. But we know what he sold."
5. **Direct storytelling** - drop into the action. "Paris, 1925. Six scrap dealers are called to a secret meeting at a luxury hotel."

### Hook scoring (1–10 each, then average)
Clarity (understood instantly, no context needed) · Curiosity (gap strength) · Originality
(not the same phrasing as every competitor) · Accuracy (fully supported by research) ·
Scroll-stop (concrete, visual, surprising in < 2 s). An inaccurate hook can't be recommended,
whatever its other scores. Scores are editorial judgement, **not** view predictions.

## Quality control (score /100, revise below 85)
| Criterion | Max | What earns full marks |
|---|---|---|
| Hook strength | 20 | First sentence alone creates a must-know gap; concrete; accurate |
| Story progression | 20 | Every beat advances; clear cause→effect; no loops or repeats |
| Retention potential | 20 | New info every 3–5 s; reveal held back; at least one genuine turn mid-story |
| Historical accuracy | 20 | Every claim maps to a research bucket; qualifiers present where needed |
| Narration quality | 10 | Sounds human aloud; rhythm varies; no clichés or AI phrasing |
| Ending / payoff | 10 | Final line rewards the watch; ironic or recontextualizing; no limp CTA |

Checklist before delivering:
- [ ] First sentence creates immediate curiosity?
- [ ] Central event genuinely extraordinary?
- [ ] Story moves forward every sentence?
- [ ] Anything that can be cut without losing meaning? (cut it)
- [ ] Twist positioned in the back half?
- [ ] Ending satisfying, not abrupt?
- [ ] Every major claim supported by `research.md`?
- [ ] Natural when spoken aloud? (no tongue-twisters, no list-reading)

Be a harsh scorer. If a category is weak, say why in the quality report and fix it before delivery;
show only the improved script.

## Banned / overused phrases
"Did you know", "Welcome back", "Let's dive in", "In a world where", "little did he know"
(unless genuinely apt, max once per channel per month), "shocking", "insane" as filler,
"you won't believe", "stay till the end", "the rest is history", "fast forward to".
