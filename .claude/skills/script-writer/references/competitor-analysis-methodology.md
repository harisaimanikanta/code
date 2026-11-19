# Competitor Analysis Methodology

Goal: learn *techniques* that keep viewers watching history Shorts, then apply them in an original voice.

## 1. Find videos
- YouTube search with the Shorts filter for each story in `research/story-ideas.md` and for niche phrases:
  "bizarre history", "this actually happened", "history that sounds fake", "strangest war", "con man history", "historical hoax".
- Channels in the niche (start list in `research/competitor-database.md`) - open their Shorts tab sorted by Popular.
- If YouTube is unreachable, use WebSearch with `allowed_domains: ["youtube.com"]` to discover URLs and titles. This yields **metadata-only** rows.

Target: 30–40 videos minimum per research round; 100+ when access allows. Report the real number.

## 2. Access levels (record one per row - never upgrade it)
| Level | Meaning | Fields you may fill |
|---|---|---|
| `watched` | Video actually played (browser tool) | All 23 fields |
| `transcript` | Captions/transcript read, not watched | Narration, structure, hook text, pacing - not visuals |
| `page` | Watch page read (title, description, stats, comments) | Title, channel, date, stats, description, comments |
| `metadata-only` | Title/URL from search results only | Title, channel (if shown), URL, topic, title-hook type |

Unfilled fields are written as `—` (not accessible), never guessed.

## 3. The 23 fields per video
Title · Channel · URL · Published · Views · Likes · Comments · Duration · Hook (0–3 s, verbatim if transcript) ·
First-5 s structure · Opening visual · Narration style · Sentence length/pacing · Story progression ·
Curiosity gaps · Pattern interrupts · Reveal sequence · Twists · Emotional triggers · Ending/payoff ·
CTA · Why it might have performed · What to adapt.

## 4. Analyses
- **Hooks:** classify into impossible fact / shock / question / revelation / contradiction / mystery / immediate action / in medias res. Count frequency among outliers vs. the rest.
- **Retention:** seconds until the central event is named; seconds between new facts; reveal position (% of runtime); cliffhanger placement; ending type.
- **Narration:** conversational vs documentary; average sentence length; intensity; pauses; speed (words ÷ seconds).
- **Visuals:** archival vs AI vs 3D vs stock; cut frequency; text overlay usage; music/SFX.
- **Performance:** views ÷ channel median views of its recent Shorts (outlier ratio). ≥ 3× = outlier. Also compare to subscriber count and video age (views/day). Raw views alone prove nothing.

Never claim to know how the recommendation system works. Write "observed correlation in our sample", not "the algorithm rewards".

## 5. Output
1. Append rows to `research/competitor-database.md` (with date and access level).
2. Update `references/viral-storytelling-playbook.md`: move findings from *Assumptions* to *Observed* only when the sample supports them; cite example URLs.
3. Log the session in `research/research-log.md` (date, queries, count by access level, limitations).

## 6. Reuse & freshness
- Check the log before researching; don't redo a topic analysed in the last 90 days unless asked.
- View counts go stale: re-check before quoting any number in the playbook or to the user, and keep the "as of" date.
- Don't copy scripts, sentences, or a creator's distinctive style. Extract structure, timing and technique.
