#!/usr/bin/env python3
"""Aggregate analysis of a yt_research.py round file.

Prints: sample size by access level, outlier list, and comparisons of outliers vs the rest on
duration, narration speed, title pattern, opening-word patterns. Also writes a markdown table
(--md) suitable for research/competitor-database.md.

Usage: analyze_round.py research/data/round2.json [--md out.md] [--min-views 1000]
"""
import argparse
import json
import re
import statistics as st

PATTERNS = [  # first match wins; heuristics on the title, reviewed by hand in the database
    ("QUESTION", r"^(how|why|what|who|when|did|was|is)\b|\?"),
    ("PERSON-WHO", r"\b(the|a)\s+(\w+\s+){0,3}(who|that)\b"),
    ("CONTRADICTION", r"\b(but|didn't exist|never existed|after it ended|after he died|vs\.?)\b"),
    ("SUPERLATIVE", r"\b(craziest|strangest|weirdest|most|biggest|greatest|worst|dumbest|silliest|insane)\b"),
    ("CAUSE-EFFECT", r"\b(over a|because of|sparked|started over|caused)\b"),
    ("REACTION", r"\b(actually happened|believe it or not|real\?|this is real)\b"),
    ("PLAIN-CLAIM", r"\b(he|she|they|a man|a woman|a pope|this \w+)\s+\w+"),
]


def title_pattern(t):
    tl = (t or "").lower()
    for name, rx in PATTERNS:
        if re.search(rx, tl):
            return name
    return "LABEL"


def opener(text):
    t = (text or "").lower().strip()
    if re.match(r"^(in|on|by)\s+\d{3,4}\b|^\d{3,4}[,.]", t):
        return "year-first"
    if re.match(r"^(imagine|picture)", t):
        return "imagine"
    if re.match(r"^(did you know|have you ever|what if|what would|how|why|who|what)\b", t):
        return "question"
    if re.match(r"^(this is|meet|here's|here is)\b", t):
        return "presenter"
    if re.match(r"^(he|she|they|a man|a woman|one man|the man)\b", t):
        return "character-action"
    return "other"


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(st.median(xs), 2) if xs else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--md")
    ap.add_argument("--min-views", type=int, default=0)
    a = ap.parse_args()
    d = json.load(open(a.file))
    vs = [v for v in d["videos"].values() if not v.get("error") and (v.get("views") or 0) >= a.min_views]
    for v in vs:
        v["pattern"] = title_pattern(v["title"])
        v["opener"] = opener(v.get("transcript"))
    acc = {}
    for v in vs:
        acc[v["access"]] = acc.get(v["access"], 0) + 1
    errs = sum(1 for v in d["videos"].values() if v.get("error"))
    print(f"videos analysed: {len(vs)}  by access: {acc}  unavailable: {errs}  channels: {len(d['channels'])}")
    out = [v for v in vs if (v.get("outlier_ratio") or 0) >= 3]
    rest = [v for v in vs if v.get("outlier_ratio") is not None and v["outlier_ratio"] < 3]
    print(f"outliers (>=3x channel median): {len(out)}   others with baseline: {len(rest)}")
    print(f"\n{'metric':22}{'outliers':>12}{'others':>12}")
    for k in ("views", "duration", "words_per_sec", "word_count", "subscribers"):
        print(f"{k:22}{str(med(v.get(k) for v in out)):>12}{str(med(v.get(k) for v in rest)):>12}")
    for field in ("pattern", "opener"):
        print(f"\n{field} share (outliers vs others):")
        keys = sorted({v[field] for v in vs})
        for k in keys:
            o = sum(v[field] == k for v in out) / max(1, len(out))
            r = sum(v[field] == k for v in rest) / max(1, len(rest))
            print(f"  {k:18}{o:>8.0%}{r:>8.0%}")
    print("\nTop outliers:")
    for v in sorted(out, key=lambda v: -v["outlier_ratio"])[:30]:
        print(f"  {v['outlier_ratio']:>7}x {v['views']:>10,} {v['duration']:>4}s {v['channel'][:24]:24} {v['title'][:70]}")
    if a.md:
        with open(a.md, "w") as f:
            f.write("| # | Title | Channel | Subs | Views | Likes | Comments | Published | Dur (s) | Outlier × | Words/s | Title pattern | Opener | Access | URL |\n")
            f.write("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n")
            for i, v in enumerate(sorted(vs, key=lambda v: -(v.get("outlier_ratio") or 0)), 1):
                cell = lambda x: "—" if x is None else (f"{x:,}" if isinstance(x, int) else str(x))
                title = (v["title"] or "").replace("|", "/")
                f.write(f"| {i} | {title} | {(v['channel'] or '').replace('|','/')} | {cell(v.get('subscribers'))} | {cell(v.get('views'))} | "
                        f"{cell(v.get('likes'))} | {cell(v.get('comments'))} | {v.get('published') or '—'} | {cell(v.get('duration'))} | "
                        f"{cell(v.get('outlier_ratio'))} | {cell(v.get('words_per_sec'))} | {v['pattern']} | {v['opener']} | {v['access']} | {v['url']} |\n")
        print(f"\nwrote {a.md}")


if __name__ == "__main__":
    main()
