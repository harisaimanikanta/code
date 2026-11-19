---
name: idea-creator
description: Find and pitch video IDEAS (not scripts) for a "Historical WTF" YouTube Shorts channel - real historical events that sound fictional (cons, hoaxes, absurd wars, impostors, bizarre trials, backfired plans, doubted inventions). Searches the web for candidate stories, pre-checks the evidence, checks YouTube competition, scores fit with the channel's viral format, and outputs IDEA CARDS for the script-writer skill. Use when the user asks for video ideas, story ideas, topics, or "what should I make next".
argument-hint: "[number of ideas] [category or theme]"
---

# Idea Creator - Historical WTF Shorts

**Job: ideas only.** Find real, traceable stories that make viewers say "Wait. This actually happened?", check they fit the channel's
format, and hand them over as IDEA CARDS. Don't write scripts; that's the **script-writer** skill (repo `harisaimanikanta/VIRAL-SCRIPT-WRITER`).

Skill folder: `${CLAUDE_SKILL_DIR}`.

## 0. On invocation
Parse the request: how many ideas (default **10**) and an optional category/theme (cons, hoaxes, absurd wars, medical, science,
inventions, impostors, trials, disasters, espionage, backfired plans, a country or an era). Don't ask about anything already given.
If nothing is given, generate 10 across mixed categories. Never start writing a script.

## 1. Load context
- `references/niche.md` - what the channel wants and doesn't want.
- `references/style-target.md` - the viral format the ideas must fit (a summary of the script-writer's reference analysis).
- `references/idea-engine.md` - the 5-point fit test and the pitch format.
- `research/idea-bank.md` - **ideas already pitched or scripted. Never re-pitch one** unless asked; look for new angles.
- `research/competition-snapshot.md` - topics already saturated on YouTube.

## 2. Search (cast a wide net)
Follow `references/search-playbook.md`. Run several WebSearch queries in parallel across different seeds and categories;
gather 2–3× more candidates than needed. Use WebFetch or a browser to open promising pages when available.

## 3. Pre-check every candidate (quick, not full research)
For each candidate, confirm from at least **two independent reputable sources** (or one primary/scholarly source):
the central event happened; who, when and where; the doubt/mockery beat; the real outcome; the mechanism. Note anything legendary or
disputed. **Reject** candidates whose premise rests on listicles, Shorts or a single unsourced claim, and say why in one line.

## 4. Score
Apply the 5-point fit test (visual action, documented doubt, real reversal, mechanism, evidence; 0–2 each). Pitch only ≥ 7/10, and
evidence must be ≥ 1. Then check competition:
`python3 ${CLAUDE_SKILL_DIR}/scripts/competition_check.py "<topic>" ["<topic 2>" ...]`
(needs yt-dlp + YouTube access; if unavailable, use WebSearch with `allowed_domains: ["youtube.com"]` and label the result "estimated").
Prefer low/medium competition, or a famous story with a **fresh true angle** (e.g. the real ending competitors got wrong).

## 5. Output
In chat: a ranked table (rank, title, category, fit, competition, one-line hook), then one **IDEA CARD** per idea, exactly in the format in
`references/idea-engine.md` → "IDEA CARD format". End with: "To script one, give its IDEA CARD to the script-writer skill."
Append every pitched idea to `research/idea-bank.md` (status `idea`) and log rejects in its *Rejected* section, so nothing is pitched twice.
Optionally save the batch to `research/batches/<date>-<theme>.md`.

## Setup (ask first)
Competition checks need `yt-dlp`: `bash ${CLAUDE_SKILL_DIR}/scripts/setup.sh`. Idea search itself needs only WebSearch.
If YouTube is blocked by the network, say so and fall back as above.

## Rules
Real, traceable stories only; never invent facts to make an idea sound better; mark legends and disputes; never claim an idea "will go
viral". Ideas are leads; the script-writer does the full fact-check. Validate edits with `python3 ${CLAUDE_SKILL_DIR}/scripts/validate_skill.py`.
