"""Shared helpers for the brutalist-3d-documentary-director scripts (stdlib only)."""
from __future__ import annotations

import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent


def need(tool: str) -> str:
    path = shutil.which(tool)
    if not path:
        sys.exit(f"error: required tool '{tool}' not found on PATH (install FFmpeg: apt-get install ffmpeg / brew install ffmpeg)")
    return path


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, text=True, capture_output=True, check=check)


def ffprobe(path: Path) -> dict:
    need("ffprobe")
    out = run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)]).stdout
    return json.loads(out)


def decode_mono_f32(path: Path, rate: int = 16000):
    """Decode audio to mono float32 at `rate`. Returns (samples: list[float] or numpy array, rate)."""
    need("ffmpeg")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(rate), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    try:
        import numpy as np  # optional acceleration
        return np.frombuffer(raw, dtype="<f4"), rate
    except ImportError:
        import array
        a = array.array("f")
        a.frombytes(raw)
        if sys.byteorder != "little":
            a.byteswap()
        return a, rate


def exact_duration(path: Path) -> float:
    """Duration from the decoded sample count at the native rate (more exact than container metadata)."""
    info = ffprobe(path)
    stream = next((s for s in info["streams"] if s.get("codec_type") == "audio"), None)
    if not stream:
        sys.exit(f"error: {path} has no audio stream")
    rate = int(stream["sample_rate"])
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return len(raw) / 2 / rate


def silences(path: Path, noise_db: float = -35.0, min_dur: float = 0.25) -> list[tuple[float, float]]:
    need("ffmpeg")
    err = run(["ffmpeg", "-v", "info", "-i", str(path), "-af", f"silencedetect=noise={noise_db}dB:d={min_dur}", "-f", "null", "-"]).stderr
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    out = []
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else None
        out.append((max(0.0, s), e if e is not None else float("nan")))
    return out


def speech_intervals(sil: list[tuple[float, float]], duration: float) -> list[tuple[float, float]]:
    t = 0.0
    out = []
    for s, e in sil:
        e = duration if math.isnan(e) else e
        if s - t > 0.05:
            out.append((round(t, 3), round(s, 3)))
        t = e
    if duration - t > 0.05:
        out.append((round(t, 3), round(duration, 3)))
    return out


def load_json(p: Path) -> dict:
    return json.loads(Path(p).read_text())


def write_json(p: Path, data) -> None:
    p = Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")


WORD_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9'’\-]*|[.,!?;:—–]")


def tokenize(text: str) -> list[str]:
    return WORD_RE.findall(text)


def norm_word(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower().replace("’", "'"))


def syllables(word: str) -> int:
    w = norm_word(word)
    if not w:
        return 0
    if w.isdigit():
        return max(1, len(w))  # numbers are spoken long
    groups = re.findall(r"[aeiouy]+", w)
    n = len(groups)
    if w.endswith("e") and n > 1 and not w.endswith(("le", "ee")):
        n -= 1
    return max(1, n)


class Report:
    """Collects PASS/WARN/FAIL lines and exits non-zero on failures."""

    def __init__(self, title: str):
        self.title = title
        self.items: list[tuple[str, str]] = []

    def ok(self, msg: str):
        self.items.append(("PASS", msg))

    def warn(self, msg: str):
        self.items.append(("WARN", msg))

    def fail(self, msg: str):
        self.items.append(("FAIL", msg))

    @property
    def failed(self) -> bool:
        return any(k == "FAIL" for k, _ in self.items)

    def finish(self, json_out: Path | None = None, extra: dict | None = None) -> None:
        print(f"== {self.title} ==")
        for k, m in self.items:
            print(f"[{k}] {m}")
        n_fail = sum(1 for k, _ in self.items if k == "FAIL")
        n_warn = sum(1 for k, _ in self.items if k == "WARN")
        print(f"-- {n_fail} failed, {n_warn} warnings, {len(self.items) - n_fail - n_warn} passed")
        if json_out:
            write_json(json_out, {"title": self.title, "passed": not self.failed, "items": [{"status": k, "message": m} for k, m in self.items], **(extra or {})})
        sys.exit(1 if self.failed else 0)
