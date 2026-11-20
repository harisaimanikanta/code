#!/usr/bin/env python3
"""Validate the baked continuous camera track (src/generated/camera-track.json).

  python3 validate-camera-path.py PROJECT [--json-out analysis/qc-camera.json] [--track PATH]

FAILS on: wrong frame count, non-finite values, stationary frames (no purposeful motion), jumps
(speed spikes), abrupt acceleration, abrupt orientation change (angular velocity / acceleration),
quaternion hemisphere flips (resets), invalid look targets, FOV out of range or snapping,
orbital share below target (measured geometrically, not just by label).
Thresholds come from production-config.json "camera.qc" (defaults below) and are scale-aware.
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import Report, load_json  # noqa: E402

DEFAULTS = {
    "minSpeed": 0.06,            # m/s — below this AND below minAngularSpeed = stationary
    "minAngularSpeed": 1.5,      # deg/s of view rotation
    "maxSpeed": 20.0,            # m/s
    "maxAccel": 14.0,            # m/s^2 (sustained over 3 frames)
    "jumpFactor": 6.0,           # frame step > jumpFactor × median of neighbouring steps = jump
    "maxAngularSpeed": 140.0,    # deg/s
    "maxAngularAccel": 900.0,    # deg/s^2
    "fovRange": [8, 100],
    "maxFovRate": 40.0,          # deg/s
    "orbitMinRate": 4.0,         # deg/s azimuth around look target to count as orbital motion
    "orbitTargetRatio": 0.30,
}


def qangle(a, b):
    d = abs(sum(x * y for x, y in zip(a, b)))
    return 2 * math.degrees(math.acos(min(1.0, d)))


def fwd(q):
    x, y, z, w = q
    # camera looks down -Z: forward = rotate (0,0,-1)
    return (-(2 * (x * z + w * y)), -(2 * (y * z - w * x)), -(1 - 2 * (x * x + y * y)))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project")
    ap.add_argument("--track")
    ap.add_argument("--json-out")
    a = ap.parse_args()
    P = Path(a.project)
    cfg = load_json(P / "data/production-config.json")
    th = {**DEFAULTS, **cfg.get("camera", {}).get("qc", {})}
    if "orbitTargetRatio" in cfg.get("camera", {}):
        th["orbitTargetRatio"] = cfg["camera"]["orbitTargetRatio"]
    tp = Path(a.track) if a.track else P / "src/generated/camera-track.json"
    if not tp.exists():
        sys.exit(f"error: {tp} missing — run `npm run bake` first")
    T = load_json(tp)
    R = Report("camera continuity validation")
    fps = T["fps"]
    n = T["frames"]
    p, q, fov, tg = T["p"], T["q"], T["fov"], T["t"]
    dt = 1 / fps

    (R.ok if n == cfg["durationFrames"] and len(p) == n else R.fail)(f"track frames {n} / config durationFrames {cfg['durationFrames']} / samples {len(p)}")
    finite = all(math.isfinite(v) for arr in (p, q, tg) for row in arr for v in row) and all(math.isfinite(v) for v in fov)
    (R.ok if finite else R.fail)("all camera values finite" if finite else "NaN/Inf in camera track")
    if not finite or n < 3:
        R.finish()

    step = [0.0] + [math.dist(p[i], p[i - 1]) for i in range(1, n)]
    speed = [s * fps for s in step]
    ang = [0.0] + [qangle(q[i], q[i - 1]) * fps for i in range(1, n)]
    speed[0], ang[0] = speed[1], ang[1]

    # stationary frames
    still = [i for i in range(n) if speed[i] < th["minSpeed"] and ang[i] < th["minAngularSpeed"]]
    if still:
        runs, start = [], still[0]
        for x, y in zip(still, still[1:] + [None]):
            if y != x + 1:
                runs.append((start, x))
                start = y
        R.fail(f"{len(still)} stationary frames (speed<{th['minSpeed']} m/s and rotation<{th['minAngularSpeed']}°/s); runs: {runs[:6]}")
    else:
        R.ok(f"camera moves purposefully on every frame (min speed {min(speed):.3f} m/s, min rotation {min(ang):.2f}°/s)")

    # jumps
    jumps = []
    for i in range(2, n - 2):
        neigh = sorted([step[i - 2], step[i - 1], step[i + 1], step[i + 2]])
        med = (neigh[1] + neigh[2]) / 2
        if step[i] > max(th["jumpFactor"] * med, 0.05) and step[i] > 0.02:
            jumps.append(i)
    over = [i for i in range(n) if speed[i] > th["maxSpeed"]]
    R.fail(f"position jumps/teleports at frames {jumps[:10]}") if jumps else R.ok("no position jumps or resets")
    R.fail(f"speed above {th['maxSpeed']} m/s at {len(over)} frames (first {over[:5]}, peak {max(speed):.1f})") if over else R.ok(f"peak speed {max(speed):.2f} m/s")

    # acceleration over 3-frame window (vector)
    vel = [[(p[i][k] - p[i - 1][k]) * fps for k in range(3)] if i else [0, 0, 0] for i in range(n)]
    vel[0] = vel[1]
    acc = [0.0] * n
    for i in range(3, n):
        acc[i] = math.dist(vel[i], vel[i - 3]) / (3 * dt)
    bad_acc = [i for i in range(n) if acc[i] > th["maxAccel"]]
    R.fail(f"abrupt acceleration > {th['maxAccel']} m/s² at {len(bad_acc)} frames (first {bad_acc[:6]}, peak {max(acc):.1f})") if bad_acc else R.ok(f"peak acceleration {max(acc):.2f} m/s² (smooth)")

    # orientation
    flips = [i for i in range(1, n) if sum(x * y for x, y in zip(q[i], q[i - 1])) < 0]
    R.fail(f"quaternion hemisphere flips at {flips[:6]}") if flips else R.ok("orientation continuous (no quaternion flips)")
    fast_rot = [i for i in range(n) if ang[i] > th["maxAngularSpeed"]]
    R.fail(f"angular speed > {th['maxAngularSpeed']}°/s at {len(fast_rot)} frames (first {fast_rot[:6]}, peak {max(ang):.0f})") if fast_rot else R.ok(f"peak angular speed {max(ang):.1f}°/s")
    ang_acc = [abs(ang[i] - ang[i - 3]) / (3 * dt) if i >= 3 else 0 for i in range(n)]
    bad_aa = [i for i in range(n) if ang_acc[i] > th["maxAngularAccel"]]
    R.fail(f"abrupt orientation change (ang. accel > {th['maxAngularAccel']}°/s²) at {bad_aa[:6]}") if bad_aa else R.ok("no abrupt orientation changes")

    # look targets
    bad_t = [i for i in range(n) if math.dist(p[i], tg[i]) < 0.05]
    R.fail(f"look target collapses onto camera at {bad_t[:6]}") if bad_t else R.ok("look targets valid")
    # verify quaternion actually looks at target (consistency of bake)
    misaim = 0
    for i in range(0, n, max(1, n // 200)):
        f = fwd(q[i])
        d = [tg[i][k] - p[i][k] for k in range(3)]
        L = math.sqrt(sum(x * x for x in d)) or 1
        cosang = sum(f[k] * d[k] / L for k in range(3))
        if cosang < math.cos(math.radians(3)):
            misaim += 1
    (R.ok if misaim == 0 else R.fail)("orientation consistent with look targets" if misaim == 0 else f"{misaim} sampled frames not aimed at their target")

    # fov
    lo, hi = th["fovRange"]
    if any(not (lo <= v <= hi) for v in fov):
        R.fail(f"fov outside [{lo},{hi}]")
    fr = max(abs(fov[i] - fov[i - 1]) * fps for i in range(1, n))
    (R.ok if fr <= th["maxFovRate"] else R.fail)(f"max focal change {fr:.1f}°/s")

    # orbital share — geometric: azimuth rate of camera around its look target
    # A frame counts as orbital when the camera revolves around its subject: azimuth rate ≥ orbitMinRate
    # AND tangential motion dominates radial motion (so approaching/receding travel is not miscounted).
    orbit_frames = 0
    for i in range(1, n):
        a0 = math.atan2(p[i - 1][2] - tg[i - 1][2], p[i - 1][0] - tg[i - 1][0])
        a1 = math.atan2(p[i][2] - tg[i][2], p[i][0] - tg[i][0])
        d = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
        r0 = math.hypot(p[i - 1][0] - tg[i - 1][0], p[i - 1][2] - tg[i - 1][2])
        r1 = math.hypot(p[i][0] - tg[i][0], p[i][2] - tg[i][2])
        tangential = abs(d) * (r0 + r1) / 2
        radial = abs(r1 - r0)
        if abs(math.degrees(d)) * fps >= th["orbitMinRate"] and tangential >= 1.5 * radial and r1 > 0.3 and r1 < 60:
            orbit_frames += 1
    share = orbit_frames / n
    labelled = sum(s["endFrame"] - s["startFrame"] for s in T.get("shots", []) if s.get("orbital")) / n
    (R.ok if share >= th["orbitTargetRatio"] else R.fail)(f"measured orbital motion {share * 100:.1f}% of frames (planned orbit moves {labelled * 100:.1f}%; target ≥ {th['orbitTargetRatio'] * 100:.0f}%)")

    # boundary continuity (explicit, per shot)
    worst = 0.0
    for s in T.get("shots", [])[1:]:
        b = s["startFrame"]
        if 2 <= b < n - 2:
            worst = max(worst, step[b] / max(1e-6, (step[b - 1] + step[b + 1]) / 2))
    R.ok(f"{len(T.get('shots', []))} move boundaries, worst step ratio at a boundary {worst:.2f} (1.0 = perfectly continuous)")
    for w in T.get("warnings", []):
        R.warn(f"bake: {w}")
    R.finish(Path(a.json_out) if a.json_out else None, {"orbitalShare": share, "peakSpeed": max(speed), "peakAccel": max(acc), "peakAngularSpeed": max(ang)})


if __name__ == "__main__":
    main()
