---
name: script-writer
description: Write fact-checked YouTube Shorts scripts for the Historical WTF niche (real historical events that sound fictional) in the channel's True Mechanism Parable style, reverse-engineered from viral reference Shorts. Use when the user gives a story, topic or an IDEA CARD from the idea-creator skill and wants a script, hooks, storyboard, editing plan or publishing package; also for analysing reference videos frame by frame or refreshing competitor research.
argument-hint: "[story | IDEA CARD | analyze <youtube urls> | research]"
---

# Script Writer - Historical WTF Shorts

Turns a real, traceable historical story into a ~60 s Short that makes viewers say **"Wait. This actually happened?"**
Ideas come from the companion skill **idea-creator** (repo `harisaimanikanta/CONTENT-IDEA-CREATOR-`); this skill researches,
writes, storyboards and quality-checks.

Skill folder: `${CLAUDE_SKILL_DIR}`. Everything below is relative to it.

## 0. On invocation
- **An IDEA CARD was pasted** (a block starting `IDEA CARD`, from idea-creator) → use its title, cold-open line, beats and
  sources as the starting point, then go to step 1. Its sources are leads; still do the full research.
- **A story or topic name** was given → go to step 1.
- **`analyze <urls>`** → Video analysis mode (below).
- **`research`** → Competitor research mode (below).
- **Nothing** → ask once: **"What historical WTF story are we making today? Paste an IDEA CARD from idea-creator, name a story,
  or pick one from the idea bank."** Show the top 10 from `research/story-ideas.md` that aren't yet scripted.

Defaults (don't ask): True Mechanism Parable format, ~60 s, English, 9:16, stylised 3D look, recommended hook pre-selected.

## 1. Load the knowledge base (every time, before writing)
1. `references/reference-style-analysis.md` - **the target style**: 5 reference Shorts (6.8M–35.1M views), beat map, pacing, visuals, True-Parable rules.
2. `references/scriptwriting-framework.md` - beat sheet, voice rules, hook types, QC rubric.
3. `references/viral-storytelling-playbook.md` - observed patterns from research rounds 1–2.
4. `research/research-log.md` and `research/scripts/` - reuse earlier research; don't redo it.
Production references (how top 3D explainers are built, incl. a 157.8M-view Short): `references/production-references.md`.
Worked examples: `research/scripts/zhang-heng-seismoscope/script.md` (parable format) and `research/scripts/eiffel-tower-lustig/script.md` (documentary format).

## 2. Historical research (mandatory)
Follow `references/historical-research-guidelines.md`. Write `research/scripts/<slug>/research.md` from `templates/research-template.md`:
the 10 questions, the evidence buckets (VERIFIED / REPORTED / DISPUTED / LEGEND / UNKNOWN), and source URLs.
For the parable format, specifically find: the **documented doubt/mockery**, the **real reversal**, and the **mechanism**.
If the premise can't be established → reject or qualify it, and tell the user. Never invent dialogue, events, dates or numbers as fact.

## 3. Write
Beat sheet: cold-open "He [visual absurd act]" → reaction → **"You see,"** context → mockery ladder with time jumps → rule of three →
real reversal → mechanism → hard cut. ~210–230 words at ~3.5 words/s. Five hooks (≥2 cold-open actions) scored 1–10.
Self-score /100 with the rubric and **revise until ≥ 85**, scoring honestly.
Check the length: `python3 ${CLAUDE_SKILL_DIR}/scripts/script_stats.py <file> --wps 3.5`.

## 4. Storyboard & edit
`references/visual-storytelling-guidelines.md` + `templates/storyboard-template.md`. A new image every ~1.2 s, a consistent character sheet,
1–2-word captions. Label dramatizations; never present AI images as archival.

## 5. Deliver
Save `research/scripts/<slug>/script.md` (from `templates/script-template.md`) in order: **A** research · **B** 5 hooks · **C** voiceover ·
**D** storyboard · **E** editing · **F** publishing · **G** quality report. In chat, show the voiceover, the recommended hook and the score.
Log it in `research/research-log.md` and mark the idea `scripted` in `research/story-ideas.md`.

## Video analysis mode
`python3 ${CLAUDE_SKILL_DIR}/scripts/storyboard.py <url>... --out <scratch dir>` builds frame + words contact sheets and a timed transcript;
`python3 ${CLAUDE_SKILL_DIR}/scripts/yt_research.py collect --ids <file> --out <json>` gets stats. View the sheets, map the beats against
`reference-style-analysis.md`, fact-check, and add the findings there. Access level = `storyboard+transcript`.

## Competitor research mode
`references/competitor-analysis-methodology.md`; collect with `yt_research.py`, then summarise with `analyze_round.py`; append to
`research/competitor-database.md`; update the playbook. Never fabricate stats; record access levels; revalidate view counts before quoting.

## Setup
Research modes need `yt-dlp` (and Node for YouTube extraction) plus network access to youtube.com. Run
`bash ${CLAUDE_SKILL_DIR}/scripts/setup.sh` **after asking the user**. Script writing itself needs only web search.

## Hard rules
Real stories only; disputed ≠ confirmed; no "Did you know / Welcome back / subscribe"; don't copy other creators' wording;
don't claim scores predict views or that you know the algorithm. Run `python3 ${CLAUDE_SKILL_DIR}/scripts/validate_skill.py` after editing this skill.
