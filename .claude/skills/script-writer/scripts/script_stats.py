#!/usr/bin/env python3
"""Word count, estimated duration and sentence stats for a voiceover.

Reads the text between <!-- VOICEOVER START --> and <!-- VOICEOVER END --> in a script.md
(or the whole file if the markers are missing).
Usage: script_stats.py <script.md> [--wps 2.7]
"""
import re
import sys

BANNED = ["did you know", "welcome back", "let's dive in", "in a world where", "you won't believe",
          "stay till the end", "the rest is history", "fast forward", "like and subscribe", "in this video"]


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    wps = 2.7
    if "--wps" in sys.argv:
        wps = float(sys.argv[sys.argv.index("--wps") + 1])
    text = open(sys.argv[1], encoding="utf-8").read()
    m = re.search(r"<!-- VOICEOVER START -->(.*?)<!-- VOICEOVER END -->", text, re.S)
    vo = (m.group(1) if m else text).strip()
    words = re.findall(r"[A-Za-z0-9'’,.-]+", vo)
    words = [w for w in words if re.search(r"[A-Za-z0-9]", w)]
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", vo) if s.strip()]
    lens = [len(s.split()) for s in sentences]
    secs = len(words) / wps
    print(f"words: {len(words)}")
    print(f"estimated duration: {secs:.0f}s at {wps} words/sec ({secs/60:.2f} min)")
    print(f"sentences: {len(sentences)}  avg words/sentence: {sum(lens)/max(1,len(lens)):.1f}  longest: {max(lens or [0])}")
    long = [s for s in sentences if len(s.split()) > 20]
    if long:
        print("sentences over 20 words (consider splitting):")
        for s in long:
            print("  -", s)
    hits = [b for b in BANNED if b in vo.lower()]
    print("banned phrases:", ", ".join(hits) if hits else "none")
    first = sentences[0] if sentences else ""
    print(f"first sentence ({len(first.split())} words): {first}")
    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
