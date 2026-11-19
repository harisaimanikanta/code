# Reference Style Analysis - the "Mechanism Parable" format

The five Shorts the channel owner chose as the target style. All from one channel (Ricks Clips).
**Access level: `storyboard+transcript`** - the auto-captions were read word by word with timings, and the public storyboard
frames (~1 per second, 50×90 px) were viewed. The full-resolution video was not watched, so small on-screen text can't be read.
Stats were fetched with yt-dlp on 2026-11-19 (revalidate before quoting). Raw data: `research/data/reference.json`.
Rebuild the frame sheets with `scripts/storyboard.py <url> --out <dir>`.

| # | Title | Views | Likes | Comments | Dur | Words | Words/s | URL |
|---|---|---|---|---|---|---|---|---|
| R1 | The Ancient Jar That Warned an Empire | 35.1M | — | — | 65 s | 237 | ≈3.6 | https://www.youtube.com/shorts/VS1Z_Q-Klt8 |
| R2 | Why Perfect Railroads Don't Work | 30.2M | 577K | 1.1K | 65 s | 216 | 3.33 | https://www.youtube.com/shorts/7xS87iActkU |
| R3 | The Job Nobody Wants in Japan | 18.8M | 652K | 11K | 61 s | 226 | 3.81 | https://www.youtube.com/shorts/0m6G8pDtzNs |
| R4 | The Instinct That Makes You Crash | 10.2M | 193K | 1.1K | 59 s | 219 | 3.73 | https://www.youtube.com/shorts/aD73kaL_PtY |
| R5 | How Mine Salting Worked | 6.8M | 163K | 533 | 61 s | 232 | 3.82 | https://www.youtube.com/shorts/TRUkQ1wbV2E |

Channel: 197K subscribers. Median of its 30 most recent Shorts is ≈9.55M views, so these are typical for the channel
rather than outliers within it (ratios 0.7×–3.2×). The format works *consistently*, not by luck.

---

## 1. Accuracy audit (read before copying the style)
| # | Basis | Verdict |
|---|---|---|
| R1 | Zhang Heng's seismoscope (Han dynasty, 132 CE). In the recorded account a ball dropped, no quake was felt in the capital, rivals gloated, and days later a messenger reported a quake in Longxi, hundreds of km away. | **Real device, invented plot.** The inventor's exile, all eight balls dropping, and the palace in rubble are not in the record. |
| R2 | Rail thermal expansion gaps / sun kinks | **Fictional parable** about a real mechanism |
| R3 | Japan's *oidashibeya* ("expulsion rooms"), reported by Japan Times (2013) and Bloomberg/PC Gamer (Bandai Namco, 2024) | **Real practice**, dramatized in 2nd person ("Imagine your boss…") |
| R4 | Target fixation | **Fictional parable** about a real mechanism |
| R5 | Mine salting (shotgun salting is a documented technique) | **Real technique, invented plot.** The "vein ten feet past where he quit" ending echoes the "three feet from gold" fable. |

**Lesson:** the format's power comes from its *narrative engine*, not from the facts. This channel's rule is that every story
is real, so we copy the engine and source every plot beat. See §5 "True-Parable rules".

---

## 2. The formula (observed in all 5)

### Beat map (times from word-timed captions)
| Beat | R1 Jar | R2 Railroad | R3 Japan | R4 Tree | R5 Mine | Pattern |
|---|---|---|---|---|---|---|
| **Cold-open action (0–4 s)** | "He put a bronze ball in a dragon's mouth and told the emperor if this ever falls out, run." | "He saw gaps into a railroad every 39 feet." | "It's impossible to get fired in Japan, but companies found something way worse." | "If you plant a tree beside an empty road, cars will steer right into it." | "He loaded the shotgun with gold and fired it into the walls of the mine." | An unnamed **"He"** doing a **physical, absurd, visual action** (3/5), or a paradox claim (2/5). No names, dates or places. |
| **Reaction / doubt (3–9 s)** | "The whole court burst out laughing." | (boss) "face goes purple" | "Wait, I'm getting paid for this?" | "somebody hits it every week" | "So we're shooting gold into a gold mine?" | Someone reacts as the viewer would: laughter, disbelief, a mocking question. |
| **"You see," context** | 0:07 | 0:03 | 0:49 | 0:04 | 0:09 | **The literal phrase "You see," appears in all 5.** It opens the context: only who/what/stakes, in 1–2 sentences. |
| **Stakes** | "biggest army in the world" | "whoever finishes first gets the whole country's business" | "no law against making them miserable" | town adds a flashing arrow | "a rich guy is coming to buy it" | A clear prize or threat. |
| **Mockery escalation** | court laughs → "world's most expensive toy" → thrown out → guards mock | "You're wrecking my railroad" → newspapers' nickname → "Even your gaps know you were wrong" | boss's Friday smile; coworkers stare | tow-truck guy profits; sheriff crashes | "Why would anyone shoot gold into a wall? That's insane." | The protagonist (or the idea) is ridiculed **2–3 times**, each bigger. It sets up the reversal. |
| **Time-jump ladder** | "Weeks later" → "Then, one night" → "The next morning" | "Then summer comes" → "In May" → "By July" → "On the hottest day" | "At first" → "Then" → "Every Friday" → "one Monday" | "Eventually" → "The second his cruiser's fixed" | "Next morning" | 3–5 explicit time markers drive momentum without any explaining. |
| **Rule-of-three build** | "a ball dropped. Then another. Then all eight at once." | coin → sheet of paper → touching | — | crash → arrow → crashes double | — | Count-up escalation right before the climax. |
| **Reversal / payoff** | palace in rubble | perfect railroad buckles under a train | the happy guy vanishes | sheriff hits the stump | real vein 10 ft past | The mocked side is proven right **at maximum stakes**. |
| **Mechanism reveal (last 10–15 s)** | pendulum + rods explained 0:48–1:04 | expansion (shown, not named) | the law explained 0:49–0:59 | "it's called target fixation" 0:43 | "it's called salting" (early, 0:09) | The *why* comes last, briefly, in concrete physical terms. |
| **Ending** | last line = scale of the danger | **cuts mid-action** ("right as a train rolls onto it") | **cuts mid-sentence** ("nobody can do nothing") → loops to the hook | cuts on the stump image | ends on the image of the vein | **No CTA, no outro, no moral.** It stops at peak payoff, often mid-thought, which invites a rewatch. |

### Numbers
- **Length:** 59–65 s; **216–237 words**; narration **3.3–3.8 words/s** (≈200–230 wpm). Fast, but the sentences are short.
- **Sentences:** mostly 6–14 words. Fragments carry punchlines ("Then another." "Completely insane.").
- **First sentence:** 8–17 words, a complete mini-story with a gap.
- **Dialogue:** 2–4 short quoted lines per video, all from side characters, mocking or doubting. Never exposition.
- **Second person:** R3 uses "you" throughout ("Imagine your boss walks you past your desk…"); R4 uses a conditional "If you plant a tree…".
- **Humour:** a comic side character (tow-truck guy with lawn chair, rich guy bangs his head on a beam). Running gags.
- **Specificity:** physical, countable details (finger-wide gap → coin → sheet of paper; "last 100 bucks"; "15 miles an hour").

## 3. Visual style (from storyboard frames)
- **Look:** stylised 3D cartoon characters (round white heads, dot eyes, big expressive mouths, simple bodies) inside
  **rich, detailed, cinematic 3D environments**: palace halls, canyons, mines, offices. Warm/golden or moonlit colour grades.
- **Cut rate:** the image changes about **every 1.1–1.3 s** (43–56 changes per video, measured at ~1 fps, so the true rate may be faster).
- **Shot grammar:** a close-up insert of the key object in the first 1–2 s (dragon mouth, shotgun, gold pan) → medium shots of characters
  reacting → wide establishing shots for stakes (army, canyon, city gate) → a recurring hero shot of the object.
  Push-ins and rack-focus on objects; characters mostly static with face changes.
- **Time of day as story:** the light shifts with the plot (day court → sunset exile → moonlit night of the quake → morning rubble).
- **Captions:** small, bold, white, **1–2 words at a time**, centred in the lower-middle. Karaoke-style, synced to the voice.
- **No archival photos, no maps, no title cards.** Everything is diegetic animation.
- **Ending frame:** the payoff image (explosion, rubble, vein of gold), sometimes cut to black on the last words.

## 4. Why it works (craft reading - [ASSUMPTION], consistent with the numbers above)
1. **The hook is an action you can picture instantly**, and it makes no sense yet. The gap is "why would anyone do that?"
2. **The viewer is made to feel smart**: it sides with the doubters, then gets flipped.
3. **Mockery creates a debt** the ending must pay. Every laugh makes the reversal sweeter.
4. **The time ladder creates momentum** with almost no explaining.
5. **The mechanism is the prize**, delivered last, so the "how" keeps people watching to the end.
6. **Ending mid-thought loops** into the hook, which encourages a rewatch.

## 5. True-Parable rules (how this channel uses the engine without inventing history)
- Every **plot beat must be a documented event** (see `historical-research-guidelines.md`). The engine is fixed; the facts are not negotiable.
- **Mockery/doubt beats** must be documented reactions (e.g. Zhang Heng's rivals gloating, Semmelweis's colleagues ridiculing him). If no
  reaction is recorded, use the **viewer's** doubt instead ("Sounds insane, right?") rather than inventing a character's.
- **Dialogue:** quote real words where they exist. Otherwise allow at most one or two lines, clearly illustrative and *consistent with
  documented attitudes*, and note them as "dramatized" in the research file and the description. Never put invented words in a
  real person's mouth as a fact-claim (dates, numbers, admissions).
- **Unnamed "He" is fine** for the hook; give the name once, inside the "You see," beat.
- **The reversal must be the real outcome.** If the real ending is less dramatic, use the real one and find the irony in it.
  The true version is usually stranger (R1's real ending - nobody felt anything, rivals gloated, then the messenger arrived - is a
  perfect payoff on its own).
- **Second-person dramatization** ("Imagine you're a 19th-century scrap dealer…") is allowed for *practices* (like R3) when the
  practice itself is documented.
