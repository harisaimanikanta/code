#!/usr/bin/env python3
"""How crowded is a topic on YouTube Shorts? Uses yt-dlp's YouTube search with the Shorts filter.

For each topic: number of results, how many are actually short (<=180 s), the median and top views, and the top 5 titles.
Competition level (heuristic): count of results with >=100K views among short results: <=3 low, 4-10 medium, >10 high.
Note: YouTube's search filter can let in non-Shorts and off-topic videos - skim the titles before trusting the level.

Usage: competition_check.py "topic one" ["topic two" ...] [--n 20]
"""
import json
import statistics
import subprocess
import sys
from datetime import date

YT = ["yt-dlp", "--js-runtimes", "node", "--no-warnings", "--ignore-errors", "--flat-playlist"]
FILTER = "&sp=EgIYAQ%253D%253D"


def check(topic, n):
    url = "https://www.youtube.com/results?search_query=" + topic.replace(" ", "+") + FILTER
    out = subprocess.run(YT + ["--playlist-end", str(n), "-J", url], capture_output=True, text=True, timeout=180).stdout
    if not out.strip():
        return {"topic": topic, "error": "no data (yt-dlp missing or YouTube blocked) - fall back to WebSearch and label 'estimated'"}
    entries = json.loads(out).get("entries") or []
    short = [e for e in entries if (e.get("duration") or 0) <= 180]
    views = [e.get("view_count") or 0 for e in short]
    big = sum(v >= 100_000 for v in views)
    level = "low" if big <= 3 else "medium" if big <= 10 else "high"
    top = sorted(short, key=lambda e: -(e.get("view_count") or 0))[:5]
    return {"topic": topic, "checked": date.today().isoformat(), "results": len(entries), "short_results": len(short),
            "median_views": statistics.median(views) if views else None, "top_views": max(views) if views else None,
            "results_100k_plus": big, "competition": level,
            "top": [{"title": e.get("title"), "views": e.get("view_count"), "channel": e.get("channel"),
                     "url": f"https://www.youtube.com/shorts/{e.get('id')}"} for e in top]}


def main():
    args = sys.argv[1:]
    n = 20
    if "--n" in args:
        n = int(args[args.index("--n") + 1])
        del args[args.index("--n"):args.index("--n") + 2]
    if not args:
        print(__doc__)
        sys.exit(1)
    for t in args:
        r = check(t, n)
        if "error" in r:
            print(f"## {t}: {r['error']}")
            continue
        print(f"## {t}: competition {r['competition'].upper()} - {r['short_results']}/{r['results']} short results, "
              f"{r['results_100k_plus']} with 100K+ views, median {r['median_views']:,.0f}, top {r['top_views']:,} (checked {r['checked']})")
        for e in r["top"]:
            print(f"   {e['views'] or 0:>12,}  {(e['channel'] or '')[:22]:22}  {(e['title'] or '')[:70]}  {e['url']}")


if __name__ == "__main__":
    main()
