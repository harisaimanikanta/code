# Historical Research & Fact-Checking Guidelines

Accuracy is non-negotiable. A viral video built on a myth damages the channel permanently;
comment sections fact-check fast.

## Source hierarchy (strongest first)
| Tier | Examples | Use for |
|---|---|---|
| 1 Primary | Court/police/government records, period newspapers (Chronicling America, Gallica, Trove, British Newspaper Archive), letters, official reports, museum objects | Establishing that the event happened, dates, names, numbers |
| 2 Scholarly | Peer-reviewed journals, university press books, academic biographies, museum/archive curatorial essays | Interpretation, context, disputes |
| 3 Reputable secondary | Smithsonian Magazine, BBC History, History Extra, Britannica, National Archives blogs, major newspapers' history features | Readable synthesis; follow their citations to tiers 1–2 where possible |
| 4 Tertiary / popular | Wikipedia, Mental Floss, Atlas Obscura, listicles | Leads and citations only. Never the sole support for a claim |
| 5 Never as evidence | Other YouTube Shorts/TikToks, AI summaries, quote sites, content farms | Competitor research only |

Wikipedia is a map, not the territory: open its footnotes.

## The 10 questions (answer all, mark unknowns honestly)
1. What actually happened? 2. When? 3. Where? 4. Who were the main people? 5. Motives?
6. What happened first? 7. What happened next? 8. The biggest turning point? 9. Final outcome?
10. What evidence supports the story - and *how old* is the earliest source?

## Evidence buckets
Every claim that appears in the script goes into exactly one bucket, with a source:
- **VERIFIED FACT** - supported by a tier-1/2 source, or by 2+ independent tier-3 sources that don't just copy each other.
- **REPORTED CLAIM** - comes from a single account (memoir, one book, one newspaper) and isn't contradicted. Script must attribute it ("according to the agent who caught him…").
- **HISTORICAL DISPUTE** - credible sources disagree (numbers, dates, motives). Script uses the conservative figure or names the range.
- **POPULAR LEGEND** - widely repeated, weak or no early evidence. Script may only mention it as legend, or omit.
- **UNKNOWN** - nobody knows. Don't fill the gap with invention.

## Red flags - dig deeper when you see
- Exact round numbers repeated across listicles with no citation ("400 people died").
- The earliest source is decades after the event (check the citation chain's start date).
- Perfect dialogue or "he whispered…" details - usually a later dramatization.
- "Twice!" / "the whole country" / "nobody ever found out" - superlatives often grow over retellings.
- Story appears only in content-farm sites and Shorts.

## Process
1. Search broadly (WebSearch), then open the best 3–6 sources (WebFetch / browser). Note the URL, publisher, author, date.
2. Trace the citation chain for the central premise to its earliest source.
3. Check numbers (money, deaths, dates) across at least two independent sources; record discrepancies.
4. Convert money to modern equivalents only with a stated method/source, or don't convert.
5. Decide: **GO** (premise verified), **GO WITH QUALIFIERS** (premise reported/disputed - script attributes it), or **REJECT**.
6. Write `research/scripts/<slug>/research.md` from `templates/research-template.md`.

## Tool limitations
If a site can't be reached (network policy, paywall), note it in the research file and the
quality report under "Sources reviewed". Search-result snippets count as *leads*, not as having read
the source - say so. Never cite a page you could not open as if you had read it in full.
