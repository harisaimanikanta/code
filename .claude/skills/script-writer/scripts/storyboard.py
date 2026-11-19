#!/usr/bin/env python3
"""Frame-by-frame breakdown of a YouTube Short from its public storyboard + captions (via yt-dlp).

Produces, per video, in <outdir>/<id>/:
  sheet-N.jpg   contact sheets: every storyboard frame with its timestamp and the words spoken during it
  frames.json   [{t, words}] per frame
  transcript.txt  word-timed transcript ([mm:ss.s] line per caption chunk)
Storyboard frames are low resolution (≈100×180) and roughly one per second: good for shot changes, layout,
on-screen text blocks and pacing - not for reading small text. Record access level as `storyboard+transcript`.

Usage: storyboard.py <url-or-id> [...] --out <dir>
"""
import argparse
import glob
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from yt_research import parse_vtt  # noqa: E402

YTDLP = ["yt-dlp", "--js-runtimes", "node", "--no-warnings"]


def vid_of(s):
    m = re.search(r"(?:shorts/|v=|youtu\.be/)([\w-]{11})", s)
    return m.group(1) if m else s.strip()[:11]


def font(size):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/System/Library/Fonts/Helvetica.ttc"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def process(vid, out):
    url = f"https://www.youtube.com/shorts/{vid}"
    info = json.loads(subprocess.run(YTDLP + ["-j", url], capture_output=True, text=True).stdout)
    sbs = [f for f in info["formats"] if f["format_id"].startswith("sb")]
    sb = max(sbs, key=lambda f: f["width"])
    w, h, rows, cols = sb["width"], sb["height"], sb["rows"], sb["columns"]
    frames, t = [], 0.0
    for frag in sb["fragments"]:
        data = urllib.request.urlopen(frag["url"], timeout=60).read()
        im = Image.open(io.BytesIO(data)).convert("RGB")
        per = frag["duration"] / (rows * cols)
        for r in range(rows):
            for c in range(cols):
                if (c + 1) * w > im.width or (r + 1) * h > im.height:
                    continue
                fr = im.crop((c * w, r * h, (c + 1) * w, (r + 1) * h))
                if t < info["duration"] and max(fr.convert("L").getextrema()) > 12:
                    frames.append((round(t, 2), fr))
                t += per
    # captions
    wd = tempfile.mkdtemp()
    subprocess.run(YTDLP + ["--skip-download", "--write-auto-subs", "--write-subs", "--sub-langs", "en.*,en",
                            "--sub-format", "vtt", "-o", f"{wd}/%(id)s.%(ext)s", url], capture_output=True)
    vtts = sorted(glob.glob(f"{wd}/*.vtt"), key=lambda p: ("orig" not in p, p))
    words = parse_vtt(vtts[0]) if vtts else []
    d = os.path.join(out, vid)
    os.makedirs(d, exist_ok=True)
    step = (frames[1][0] - frames[0][0]) if len(frames) > 1 else 1
    meta = []
    for i, (ft, _) in enumerate(frames):
        nxt = frames[i + 1][0] if i + 1 < len(frames) else ft + step
        meta.append({"t": ft, "words": " ".join(x for tt, x in words if ft <= tt < nxt)})
    json.dump({"id": vid, "title": info.get("title"), "duration": info.get("duration"), "frame_w": w, "frame_h": h,
               "frames": meta}, open(f"{d}/frames.json", "w"), indent=1, ensure_ascii=False)
    with open(f"{d}/transcript.txt", "w") as f:
        line, start = [], 0.0
        for tt, x in words:
            if not line:
                start = tt
            line.append(x)
            if x.endswith((".", "?", "!")) or len(line) >= 14:
                f.write(f"[{int(start // 60):02d}:{start % 60:04.1f}] {' '.join(line)}\n")
                line = []
        if line:
            f.write(f"[{int(start // 60):02d}:{start % 60:04.1f}] {' '.join(line)}\n")
    # sheets: 6 columns x 4 rows per sheet, frames upscaled to 200 px wide
    W = 200
    H = int(W * h / w)
    TH, per_sheet, ncol = 70, 24, 6
    f13, f15 = font(13), font(15)
    for s in range(0, len(frames), per_sheet):
        chunk = frames[s:s + per_sheet]
        nrow = (len(chunk) + ncol - 1) // ncol
        sheet = Image.new("RGB", (ncol * W, nrow * (H + TH)), "white")
        dr = ImageDraw.Draw(sheet)
        for i, (ft, fr) in enumerate(chunk):
            x, y = (i % ncol) * W, (i // ncol) * (H + TH)
            sheet.paste(fr.resize((W, H), Image.LANCZOS), (x, y))
            dr.text((x + 4, y + H + 2), f"{ft:5.1f}s", fill="red", font=f15)
            txt, line, ly = meta[s + i]["words"].split(), "", y + H + 20
            for wd_ in txt:
                if dr.textlength(f"{line} {wd_}", font=f13) > W - 8:
                    dr.text((x + 4, ly), line, fill="black", font=f13)
                    ly += 15
                    line = wd_
                else:
                    line = f"{line} {wd_}".strip()
            if ly <= y + H + TH - 15:
                dr.text((x + 4, ly), line, fill="black", font=f13)
        sheet.save(f"{d}/sheet-{s // per_sheet + 1}.jpg", quality=88)
    print(f"{vid}: {len(frames)} frames ({w}x{h}, ~{step:.2f}s apart), {len(words)} caption words -> {d}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("videos", nargs="+")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    for v in a.videos:
        try:
            process(vid_of(v), a.out)
        except Exception as e:  # keep going on one bad video
            print(f"{v}: FAILED {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
