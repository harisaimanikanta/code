---
name: script-writer
description: Write fact-checked, high-retention YouTube Shorts scripts (60-90 s) for the Historical WTF / true crime / dark psychology niche, using the Retention Engine - a question-or-anticipation hook, a but/therefore explanation with re-hooks, and a surprise payoff that answers the hook - gated at 10/10 for hook, explanation and payoff. Use when the user gives a story, topic or an IDEA CARD from the idea-creator skill and wants a script, hooks, storyboard, editing plan or publishing package; also for analysing reference videos frame by frame or refreshing competitor research.
argument-hint: "[story | IDEA CARD | analyze <youtube urls> | research]"
---

# Script Writer - Historical WTF Shorts

Turns a real, traceable story (even a tiny one) into a **60–90 s** Short that makes viewers say **"Wait. This actually happened?"**
and watch to the end. The writing method is `references/retention-engine.md`: **hook 10/10 · explanation 10/10 · payoff 10/10**, or it isn't delivered.
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

Defaults (don't ask): Retention Engine method, 60–90 s (aim ~70 s), English, 9:16, stylised 3D look, recommended hook pre-selected.

## 1. Load the knowledge base (every time, before writing)
0. **`references/retention-engine.md` - the writing method and the three 10/10 rubrics. Read it first, every time.**
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

## 3. Write (Retention Engine)
Follow `references/retention-engine.md` step by step:
1. **Find the question.** From the research, write the one question this story answers that a stranger would want answered
   (e.g. "How did a floppy disk catch a serial killer?"). Find the **answer**, the **surprise inside the answer**, a **planted
   detail** that makes it inevitable, and a **second reveal**. If the story has no surprising answer, say so and suggest another idea.
2. **Hooks:** write **at least 8 hooks from at least 5 archetypes** (H1–H10), score each /10 with the hook rubric, keep only 10/10.
   At least one must be a how/why question and one an anticipation hook (countdown, outcome-first or contradiction).
3. **Beat map before prose:** hook → first partial answer + new gap → 3–5 re-hooks (but/therefore) → main answer → second reveal →
   last line. Write the open question for every beat.
4. **Write** 60–90 s (≈ 210–330 words at 3.5–3.7 words/s), plain words, ≤ 3 named people, one idea per sentence.
   **Kid + audio-only rule (§4a):** a 10-year-old must understand it from the audio alone, with no visuals: everyday words, terms
   explained in the same breath, no "this/here/look", no unclear he/she, numbers written as spoken words, reading grade ≤ 6.
5. **Lint:** `python3 ${CLAUDE_SKILL_DIR}/scripts/retention_check.py <file>` and
   `python3 ${CLAUDE_SKILL_DIR}/scripts/script_stats.py <file> --wps 3.6`. Fix every ✗.
6. **Three-draft loop (mandatory, never skip, never shorten):** the script is written **three times** and audited **twice** before
   delivery, following `references/retention-engine.md` §7a:
   - **Draft 1** → **Audit 1**: run both lints, the retention simulation (§7 table) and the **drop-off audit** (§7a checklist).
     List every mistake that could make a viewer swipe in the middle, with the line, the second it happens and why.
   - **Draft 2** = a rewrite that fixes every Audit 1 finding (not just edits to the worst line) → **Audit 2**: repeat the full audit
     on Draft 2 from scratch, as if seeing it for the first time. Look for new problems the rewrite created.
   - **Draft 3 (final)** = a rewrite that fixes every Audit 2 finding → a final lint + score check.
   An audit that finds nothing is not allowed: if a draft seems clean, look harder at the weakest 5-second window and the payoff.
   All three drafts and both audits are saved in the script file (section **V. Revision log**).
7. **Score** the final draft: Hook /10, Explanation /10, Payoff /10 with the engine's rubrics, listing every lost point. If any is
   below 10/10 after Draft 3, run another audit + rewrite (Draft 4, 5…) until all three are 10/10, then the overall /100 rubric in
   `references/scriptwriting-framework.md` (must be ≥ 90). Score honestly; scores are editorial judgement, not view predictions.
Hard limits that override any score: no invented people, events, dialogue or numbers; disputed claims stay qualified.

## 4. Storyboard & edit
`references/visual-storytelling-guidelines.md` + `templates/storyboard-template.md`. A new image every ~1.2 s, a consistent character sheet,
1–2-word captions. Label dramatizations; never present AI images as archival.

## 5. Deliver
Save `research/scripts/<slug>/script.md` (from `templates/script-template.md`) in order: **A** research · **B** hooks (8+) · **C** voiceover + beat map ·
**R** retention simulation · **V** revision log (Draft 1 → Audit 1 → Draft 2 → Audit 2 → Draft 3) · **D** storyboard · **E** editing · **F** publishing · **G** quality report. In chat, show the voiceover, the
recommended hook, the question it opens, the three scores (hook / explanation / payoff), and a short list of what Audit 1 and
Audit 2 found and fixed. Never show the user a draft that hasn't been through both audits.
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
