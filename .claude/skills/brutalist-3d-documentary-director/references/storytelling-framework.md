# Storytelling Framework — the Autonomous Creative Thinking Engine

Think before constructing. The transcript is not a list of illustrations; it is a sequence of *intentions*.

## 1. Read the whole narration first

Write a one-line **logline**, the **emotional arc** (e.g. certainty → doubt → discovery → rejection → sacrifice →
vindication → irony), and the **act structure** (3–6 acts). Mark the punchline/final idea — the last image must land it.

## 2. Analyse every segment (sentence or beat group)

For each, answer in `docs/creative-direction.md` (a table is fine):

| Question | Produces |
|---|---|
| What is being communicated? | the *idea* (not the words) |
| What should the audience feel? | `emotion` + lighting preset |
| What must be visually understood? | the non-negotiable information |
| What metaphor makes it stronger? | the visual idea |
| What environment communicates it? | zone choice |
| Which object deserves emphasis? | camera target / hero asset |
| Direct or symbolic? | literal vs metaphor decision |
| Foreground / midground / background? | layering + occluders |
| What lighting supports it? | `shot.lighting` |
| What camera movement makes it interesting? | `shot.camera` (with a reason) |
| How does this space connect to the next? | transition type + world adjacency |

## 3. Choose the storytelling mode per beat (mix them)

A literal · B symbolic · C scientific visualisation · D environmental · E architectural metaphor ·
F character-based · G abstract transition · H scale transformation · I material transformation · J spatial.

Heuristics:
- **Claims about mechanisms** → C (scientific), clearly readable, labels only if essential.
- **Beliefs, institutions, consensus** → E (architecture: halls, monoliths, colonnades) or B.
- **People's decisions** → F (character, body language, orbit).
- **Change of understanding** → H or I (scale / material transformation), or a G transition.
- **Emptiness / absence** → D (empty corridor, void, single light).
- Use **one strong idea per beat**. When a sentence is already vivid, show it plainly and let camera + light do the work.
- Sustain: a visual sequence may span several sentences; do not change the picture on every clause.
- Repetition with variation (motifs): an object seen early returns transformed (e.g. the plinth that held dogma later holds the prize).

## 4. Beats and shots

- **Beat** = one meaningful visual idea (~1.6–2.6 s). Typical short documentary (4–5 min): 100–150 beats; scale to 200+ only when justified.
- **Shot / camera move** = 3–8 s of continuous motion containing 1–4 beats. Moves tile the timeline (no gaps).
- Place move boundaries inside pauses (generate-timeline.py does this); dramatic pauses deserve a slow move with a reveal at the end.
- Never add beats to hit a number. Never leave a beat without purpose.

## 5. Act → world mapping

Each act gets a zone (or a pair of zones) with its own palette shift; zones are laid out physically so the
camera can travel between them. Design transitions *before* zones (see `transition-system.md`).

## Accuracy

1. Extract factual claims from the transcript into `docs/fact-check.md`: claim · status (established / contested /
   uncertain / metaphor) · basis/source · visual treatment.
2. Verify uncertain claims with available reliable sources (WebSearch/WebFetch when available). If research is
   unavailable, mark as unverified and keep visuals non-committal.
3. Never invent historical events, dates, quotes, places or appearances. Real people → generic figures unless the
   user supplies references; no logos/insignia.
4. Scientific visualisation: metaphor may be artistic, mechanism must stay correct (e.g. H. pylori lives in the
   mucus layer near the epithelium — show it there, not floating in acid).
5. Distinguish metaphor visually (abstract spaces, impossible scale) from literal depiction.
6. If the narration states something wrong, do not change it — flag it to the user in the delivery notes.
