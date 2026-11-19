#!/usr/bin/env bash
# Installs research tools for this skill: yt-dlp (YouTube metadata/captions/storyboards), Pillow (contact sheets).
# Node.js is used by yt-dlp for YouTube extraction if present. Run only with the user's OK.
set -e
python3 -m pip install -q --upgrade yt-dlp pillow 2>/dev/null || python3 -m pip install -q --user --upgrade yt-dlp pillow
command -v node >/dev/null || echo "note: Node.js not found - yt-dlp works but YouTube extraction is more reliable with it (https://nodejs.org)"
command -v yt-dlp >/dev/null && echo "yt-dlp $(yt-dlp --version) ready" || echo "yt-dlp installed as a Python module: use 'python3 -m yt_dlp' if 'yt-dlp' is not on PATH"
