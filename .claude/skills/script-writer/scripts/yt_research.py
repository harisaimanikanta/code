#!/usr/bin/env python3
"""Competitor research collector for YouTube Shorts (uses yt-dlp; needs YouTube network access).

For each video: real metadata (views, likes, comments, duration, upload date, channel, subscribers)
and, when captions exist, the timed transcript (auto or manual captions -> words with timestamps).
For each channel: a baseline = median views of its most recent Shorts (flat listing), used to compute
an outlier ratio (video views / channel median). Access level is recorded honestly:
  transcript   - captions downloaded and parsed (narration analysed from text; video NOT watched)
  page         - metadata only, no captions available

Usage:
  yt_research.py collect --ids ids.txt --out research/data/round2.json
  yt_research.py collect --search "great emu war" --search "dancing plague" --per-search 10 --out ...
  yt_research.py collect --channel https://www.youtube.com/@SomeChannel/shorts --per-channel 15 --out ...
  (options combine; existing results in --out are reused, not refetched, unless --refresh)
  yt_research.py summary research/data/round2.json      # print aggregate stats
"""
import argparse
import glob
import html
import json
import os
import re
import statistics
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import date

YTDLP = ["yt-dlp", "--js-runtimes", "node", "--no-warnings", "--ignore-errors"]
SHORTS_FILTER = "&sp=EgIYAQ%253D%253D"


def run(args, timeout=180):
    p = subprocess.run(YTDLP + args, capture_output=True, text=True, timeout=timeout)
    return p.stdout


def flat_ids(url, limit):
    out = run(["--flat-playlist", "--playlist-end", str(limit), "--print", "%(id)s\t%(view_count)s", url])
    rows = []
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) == 2 and re.fullmatch(r"[\w-]{11}", parts[0]):
            rows.append((parts[0], None if parts[1] in ("NA", "None") else int(parts[1])))
    return rows


def parse_vtt(path):
    """Return [(seconds, word)] from a YouTube auto-caption VTT (word-timed) or plain VTT."""
    def ts(s):
        h, m, rest = s.split(":")
        return int(h) * 3600 + int(m) * 60 + float(rest)

    words, cue_start, cue_end, plain = [], 0.0, 0.0, []
    for line in open(path, encoding="utf-8"):
        line = html.unescape(line.rstrip("\n")).replace("\xa0", " ")
        m = re.match(r"(\d\d:\d\d:\d\d\.\d+) --> (\d\d:\d\d:\d\d\.\d+)", line)
        if m:
            cue_start, cue_end = ts(m.group(1)), ts(m.group(2))
            continue
        if "<c>" in line:  # auto captions: word-timed line
            first = re.split(r"<", line, maxsplit=1)[0].strip()
            if first:
                words.append((cue_start, first))
            for t, w in re.findall(r"<(\d\d:\d\d:\d\d\.\d+)><c>\s*([^<]+)</c>", line):
                words.append((ts(t), w.strip()))
        elif line.strip() and not line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")):
            plain.append((cue_start, cue_end, re.sub(r"<[^>]+>", "", line).strip()))
    if not words and plain:  # manual captions: interpolate each cue's words across its duration
        last = None
        for start, end, text in plain:
            if text == last:
                continue
            toks = text.split()
            step = (end - start) / max(1, len(toks))
            words += [(start + i * step, w) for i, w in enumerate(toks)]
            last = text
    return words


def fetch_video(vid, workdir):
    url = f"https://www.youtube.com/shorts/{vid}"
    run(["--skip-download", "--write-info-json", "--write-auto-subs", "--write-subs",
         "--sub-langs", "en.*,en", "--sub-format", "vtt", "-o", os.path.join(workdir, "%(id)s.%(ext)s"), url])
    info_path = os.path.join(workdir, f"{vid}.info.json")
    if not os.path.exists(info_path):
        return {"id": vid, "url": url, "error": "unavailable"}
    info = json.load(open(info_path, encoding="utf-8"))
    vtts = sorted(glob.glob(os.path.join(workdir, f"{vid}.en*.vtt")), key=lambda p: ("orig" not in p, p))
    words = parse_vtt(vtts[0]) if vtts else []
    text = " ".join(w for _, w in words)
    dur = info.get("duration") or 0
    speech_end = words[-1][0] if words else 0
    rec = {
        "id": vid, "url": url, "title": info.get("title"),
        "channel": info.get("channel"), "channel_url": info.get("channel_url"),
        "subscribers": info.get("channel_follower_count"),
        "published": info.get("upload_date"), "views": info.get("view_count"),
        "likes": info.get("like_count"), "comments": info.get("comment_count"),
        "duration": dur, "description": (info.get("description") or "")[:600],
        "tags": info.get("tags") or [],
        "access": "transcript" if words else "page",
        "fetched": date.today().isoformat(),
        "transcript": text,
        "hook_3s": " ".join(w for t, w in words if t < 3.0),
        "first_5s": " ".join(w for t, w in words if t < 5.0),
        "word_count": len(words),
        "words_per_sec": round(len(words) / speech_end, 2) if speech_end > 5 else None,
    }
    return rec


def channel_baseline(channel_url, limit=30):
    base = channel_url.rstrip("/") + "/shorts"
    rows = flat_ids(base, limit)
    views = [v for _, v in rows if v is not None]
    return {"median_views": statistics.median(views) if views else None, "n": len(views),
            "fetched": date.today().isoformat()}


def collect(a):
    a.out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    data =json.load(open(a.out)) if os.path.exists(a.out) else {"videos": {}, "channels": {}}
    ids = []
    if a.ids:
        for line in open(a.ids):
            m = re.search(r"(?:shorts/|v=)?([\w-]{11})", line.strip())
            if m:
                ids.append(m.group(1))
    for q in a.search or []:
        url = "https://www.youtube.com/results?search_query=" + q.replace(" ", "+") + SHORTS_FILTER
        ids += [i for i, _ in flat_ids(url, a.per_search)]
    for c in a.channel or []:
        ids += [i for i, _ in flat_ids(c, a.per_channel)]
    ids = list(dict.fromkeys(ids))
    todo = [i for i in ids if a.refresh or i not in data["videos"]]
    print(f"{len(ids)} ids, fetching {len(todo)}", file=sys.stderr)
    with tempfile.TemporaryDirectory() as wd, ThreadPoolExecutor(a.workers) as ex:
        for n, rec in enumerate(ex.map(lambda v: fetch_video(v, wd), todo), 1):
            data["videos"][rec["id"]] = rec
            print(f"  [{n}/{len(todo)}] {rec['id']} {rec.get('access', rec.get('error'))} {rec.get('views')} {rec.get('title')}",
                  file=sys.stderr)
            if n % 10 == 0:
                json.dump(data, open(a.out, "w"), indent=1, ensure_ascii=False)
    chans = {v["channel_url"] for v in data["videos"].values() if v.get("channel_url")}
    todo_c = [c for c in chans if a.refresh or c not in data["channels"]]
    print(f"channel baselines: {len(todo_c)}", file=sys.stderr)
    with ThreadPoolExecutor(a.workers) as ex:
        for c, b in zip(todo_c, ex.map(channel_baseline, todo_c)):
            data["channels"][c] = b
    for v in data["videos"].values():
        b = data["channels"].get(v.get("channel_url") or "", {})
        med = b.get("median_views")
        v["outlier_ratio"] = round(v["views"] / med, 2) if med and v.get("views") is not None else None
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(data, open(a.out, "w"), indent=1, ensure_ascii=False)
    print(f"saved {len(data['videos'])} videos, {len(data['channels'])} channels -> {a.out}", file=sys.stderr)


def summary(a):
    data = json.load(open(a.file))
    vs = [v for v in data["videos"].values() if not v.get("error")]
    tr = [v for v in vs if v["access"] == "transcript"]
    print(f"videos: {len(vs)} (transcript {len(tr)}, page-only {len(vs) - len(tr)}), channels: {len(data['channels'])}")
    for k in ("views", "duration", "words_per_sec", "outlier_ratio"):
        xs = [v[k] for v in vs if v.get(k) is not None]
        if xs:
            print(f"{k:14} median {statistics.median(xs):>12,.2f}  min {min(xs):>12,.2f}  max {max(xs):>12,.2f}  n={len(xs)}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("collect")
    c.add_argument("--ids")
    c.add_argument("--search", action="append")
    c.add_argument("--per-search", type=int, default=10)
    c.add_argument("--channel", action="append")
    c.add_argument("--per-channel", type=int, default=15)
    c.add_argument("--out", required=True)
    c.add_argument("--workers", type=int, default=4)
    c.add_argument("--refresh", action="store_true")
    s = sub.add_parser("summary")
    s.add_argument("file")
    a = ap.parse_args()
    collect(a) if a.cmd == "collect" else summary(a)


if __name__ == "__main__":
    main()
