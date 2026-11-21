#!/usr/bin/env python3
"""Mechanical retention lint for a Shorts voiceover (see references/retention-engine.md).

Checks length (60-90 s), hook shape, context-first openings, "and then" chains, re-hook spacing,
long sentences, name load, last-line length and banned phrases. Heuristic only: it catches
structural problems; the human-style retention simulation in the engine still decides.

Usage: retention_check.py <script.md|voiceover.txt> [--wps 3.6] [--min 60] [--max 90]
Reads text between <!-- VOICEOVER START --> and <!-- VOICEOVER END --> if present.
ElevenLabs-style [tags] are ignored.
"""
import re
import sys

BANNED = ["did you know", "welcome back", "let's dive in", "in a world where", "you won't believe",
          "stay till the end", "watch till the end", "the rest is history", "fast forward", "like and subscribe",
          "in this video", "little did he know", "little did she know"]
REHOOK = [r"\?", r"\bbut\b", r"\bso\b", r"\buntil\b", r"\bexcept\b", r"\binstead\b", r"\bthen\b", r"\bthat's when\b",
          r"\bturns out\b", r"\bhere's\b", r"\bone problem\b", r"\bthe catch\b", r"\bbecause\b", r"\bnobody\b",
          r"\bnever\b", r"\bonly\b", r"\bwhy\b", r"\bhow\b", r"\bwhat\b"]
GAP_WORDS = [r"\bhow\b", r"\bwhy\b", r"\bwhat\b", r"\?", r"\bonly\b", r"\bone\b", r"\bnever\b", r"\bbut\b",
             r"\bwithout\b", r"\bjust\b", r"\bsecret\b", r"\bnobody\b", r"\bminutes?\b", r"\bseconds?\b"]
VISUAL = [r"\bas you can see\b", r"\blook at\b", r"\bright here\b", r"\bthis guy\b", r"\bthis man\b", r"\bthis woman\b",
          r"\bon (the )?screen\b", r"\bpictured\b", r"\bshown here\b", r"\bwatch this\b", r"\bthis one\b", r"\bover here\b"]
EASY_LONG = {"everyone", "everything", "somebody", "anybody", "everybody", "another", "another's", "together", "however",
             "family", "important", "remember", "different", "eventually", "already", "nobody", "company", "police",
             "officer", "seventeen", "seventy", "hundred", "employee", "manager", "restaurant", "computer", "telephone",
             "america", "american", "anything", "something", "understand", "yesterday", "tomorrow", "beautiful", "animal",
             "january", "february", "november", "december", "october", "september", "history", "actually", "really",
             "eleven", "thirteen", "fourteen", "fifteen", "sixteen", "eighteen", "nineteen", "seventy", "eighty", "ninety"}


def syllables(word):
    w = word.lower().strip("'’")
    if len(w) <= 3:
        return 1
    w = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", w)
    w = re.sub(r"^y", "", w)
    return max(1, len(re.findall(r"[aeiouy]{1,2}", w)))


COMMON_CAPS = {"I", "He", "She", "They", "It", "The", "A", "An", "And", "But", "So", "Then", "One", "That", "This",
               "Now", "His", "Her", "No", "Nobody", "Every", "Because", "If", "When", "What", "Why", "How", "We",
               "You", "Your", "There", "Here", "In", "On", "At", "For", "After", "Before", "Years", "Two", "Three"}


def load(path):
    text = open(path, encoding="utf-8").read()
    m = re.search(r"<!-- VOICEOVER START -->(.*?)<!-- VOICEOVER END -->", text, re.S)
    vo = (m.group(1) if m else text)
    vo = re.sub(r"\[[^\]]*\]", " ", vo)          # drop audio tags
    return re.sub(r"[ \t]+", " ", vo).strip()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    args = sys.argv
    wps = float(args[args.index("--wps") + 1]) if "--wps" in args else 3.6
    lo = float(args[args.index("--min") + 1]) if "--min" in args else 60
    hi = float(args[args.index("--max") + 1]) if "--max" in args else 90
    vo = load(args[1])
    low = vo.lower()
    words = [w for w in re.findall(r"[A-Za-z0-9'’-]+", vo)]
    secs = len(words) / wps
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", vo) if s.strip()]
    issues, ok = [], []

    # length
    (ok if lo <= secs <= hi else issues).append(
        f"length: {len(words)} words ≈ {secs:.0f}s at {wps} w/s (target {lo:.0f}-{hi:.0f}s ≈ {int(lo*wps)}-{int(hi*wps)} words)")

    # hook
    hook = sentences[0] if sentences else ""
    hw = len(hook.split())
    (ok if hw <= 15 else issues).append(f"hook length: {hw} words (≤15): \"{hook}\"")
    first2 = " ".join(sentences[:2]).lower()
    has_gap = any(re.search(p, first2) for p in GAP_WORDS)
    (ok if has_gap else issues).append("hook gap: " + ("question/anticipation marker found in first 2 sentences"
                                                         if has_gap else "no question/anticipation marker in first 2 sentences"))
    if re.match(r"^(in \d{3,4}|it'?s \d{3,4}|you see|back in|once upon|imagine it'?s \d)", hook.lower()):
        issues.append("context-first opening: the hook starts with a date/setting; put the gap first")
    else:
        ok.append("hook does not open with context")

    # and-then chains
    n_and_then = len(re.findall(r"\band then\b", low))
    (ok if n_and_then == 0 else issues).append(f"'and then' count: {n_and_then} (use but/therefore)")
    but_so = len(re.findall(r"\b(but|so|because|therefore|until|instead)\b", low))
    ok.append(f"causal connectors (but/so/because/therefore/until/instead): {but_so}")

    # re-hook spacing (max words between markers)
    toks = low.split()
    positions = [0]
    for i in range(len(toks)):
        window = " ".join(toks[i:i + 3])
        if any(re.match(p, window) for p in REHOOK) or "?" in toks[i]:
            positions.append(i)
    positions.append(len(toks))
    gaps = [b - a for a, b in zip(positions, positions[1:])]
    max_gap = max(gaps or [0])
    (ok if max_gap <= 45 else issues).append(
        f"longest stretch without a re-hook marker: {max_gap} words ≈ {max_gap / wps:.0f}s (≤45 words ≈ 12s)")
    q = vo.count("?")
    ok.append(f"questions asked: {q}")

    # sentence length
    long = [s for s in sentences if len(s.split()) > 18]
    (ok if not long else issues).append(f"sentences over 18 words: {len(long)}" + ("".join(f"\n      - {s}" for s in long)))

    # name load (rough)
    caps = set()
    for s in sentences:
        for t in re.findall(r"\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*", s)[1:] if s else []:
            if t.split()[0] not in COMMON_CAPS:
                caps.add(t)
    (ok if len(caps) <= 6 else issues).append(f"capitalised names/places (rough): {len(caps)} {sorted(caps)[:12]} (aim: ≤3 people)")

    # last line
    last = sentences[-1] if sentences else ""
    lw = len(last.split())
    (ok if lw <= 12 else issues).append(f"last line: {lw} words (≤12): \"{last}\"")

    # kid test: reading grade (Flesch-Kincaid estimate) and hard words
    wl = [w for w in words if re.search(r"[A-Za-z]", w)]
    syl = sum(syllables(w) for w in wl)
    grade = 0.39 * (len(wl) / max(1, len(sentences))) + 11.8 * (syl / max(1, len(wl))) - 15.59
    (ok if grade <= 6 else issues).append(f"reading grade (kid test, estimate): {grade:.1f} (target ≤5, hard limit ≤6)")
    hard = sorted({w.lower() for w in wl if syllables(w) >= 3 and w.lower() not in EASY_LONG and not w[0].isupper()})
    (ok if len(hard) <= 6 else issues).append(f"hard words (3+ syllables, check each is everyday or explained): {len(hard)} {hard[:20]}")

    # audio-only test
    vis = [p.strip("\\b") for p in VISUAL if re.search(p, low)]
    (ok if not vis else issues).append("visual-dependent phrases: " + (", ".join(vis) if vis else "none"))
    digits = re.findall(r"\d[\d,.%]*|\(|\)|\b[A-Z]{2,}\b|e\.g\.|etc\.", vo)
    (ok if not digits else issues).append("digits / abbreviations / brackets in voiceover (write as spoken words): "
                                          + (" ".join(digits[:15]) if digits else "none"))
    amb = 0
    for a, b in zip(sentences, sentences[1:]):
        if re.match(r"^(he|she|they|it)\b", b.lower()) and len(re.findall(r"\b(man|woman|manager|caller|officer|doctor|boy|girl|brother|wife|husband|police|detective|killer)\b", a.lower())) >= 2:
            amb += 1
    (ok if amb == 0 else issues).append(f"possibly ambiguous pronouns (sentence starts with he/she/they after 2+ people): {amb}")

    # banned
    hits = [b for b in BANNED if b in low]
    (ok if not hits else issues).append("banned phrases: " + (", ".join(hits) if hits else "none"))

    print("PASS")
    for o in ok:
        print("  ✓", o)
    print("FIX" if issues else "FIX: none")
    for i in issues:
        print("  ✗", i)
    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
