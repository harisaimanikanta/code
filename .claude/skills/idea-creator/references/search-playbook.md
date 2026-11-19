# Search Playbook - where real WTF stories hide

Run queries in parallel batches (5–8 per batch) mixing seeds below with the requested category. Use `mode: "standard"` first;
use `"extended"` for niche or non-English history.

## Seed queries by ingredient
- **Doubted, then vindicated:** "inventor ridiculed history", "scientist mocked proved right", "laughed at by the academy",
  "dismissed as a hoax turned out true", "patent rejected later revolutionary"
- **Backfired plans:** "bounty program backfired history", "unintended consequences historical policy", "perverse incentive example history",
  "government campaign backfired", "the plan made the problem worse"
- **Cons & hoaxes:** "how the scam worked 19th century", "historical hoax fooled experts", "impostor fooled royal court",
  "forgery detected how", "salting mine fraud"
- **Engineering & science failures:** "collapsed because of simple mistake history", "engineering disaster small cause",
  "unit conversion error history", "resonance failure history"
- **Absurd institutions & laws:** "strange law actually enforced history", "bizarre official practice", "medieval animal trial",
  "court case against object history"
- **Military oddities:** "military deception decoy history", "strangest military operation", "war started over trivial cause",
  "soldier didn't know war ended"
- **Medicine & body:** "medical hoax history", "doctor experimented on himself", "epidemic mass hysteria history"
- **Language variants:** search the same theme in French, Spanish, German, Japanese or Chinese (with `extended`); many stories are
  under-covered in English.

## Good hunting grounds (for leads and evidence)
Smithsonian Magazine · BBC History / History Extra · Atlas Obscura (leads; verify) · JSTOR Daily · Public Domain Review ·
National Archives (UK/US) blogs · Library of Congress / Chronicling America · Gallica / Retronews · university press and
museum collections · Wikipedia's "List of hoaxes", "List of unusual deaths", "List of wars by death toll" (leads only; open the citations).

## Evidence pre-check (per candidate, ~2–3 searches)
1. "<event> primary source" / "<event> historian"
2. "<event> myth" / "<event> debunked" / "<event> exaggerated"
3. Note: earliest source date, the strongest source, any legend parts.

## Saturation check
`scripts/competition_check.py` (YouTube Shorts search via yt-dlp) → count, median and top views of on-topic Shorts.
Rough guide (heuristic, not a law): ≤ 3 on-topic Shorts with ≥ 100K views = **low**; 4–10 = **medium**; more = **high**.
High competition is acceptable only with a fresh true angle.
