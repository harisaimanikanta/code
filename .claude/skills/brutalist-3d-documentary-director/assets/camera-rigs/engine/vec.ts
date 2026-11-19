// Minimal vector / quaternion math for the camera engine (no three.js dependency so it runs in Node).
export type V3 = [number, number, number];
export type Q = [number, number, number, number]; // x, y, z, w (three.js order)

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: V3, b: V3): number => len(sub(a, b));
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const UP: V3 = [0, 1, 0];

/** Rotate v around the world Y axis by angle (radians). */
export const rotY = (v: V3, a: number): V3 => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];

/** Rotate v around arbitrary unit axis k by angle (Rodrigues). */
export function rotAxis(v: V3, k: V3, a: number): V3 {
  const c = Math.cos(a), s = Math.sin(a);
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
}

/** Quaternion for a camera at `pos` looking at `target` (three.js convention: camera looks down -Z), with roll (radians). */
export function lookQuat(pos: V3, target: V3, roll = 0, up: V3 = UP): Q {
  let f = norm(sub(target, pos));
  if (!Number.isFinite(f[0]) || len(sub(target, pos)) < 1e-6) f = [0, 0, -1];
  const z = mul(f, -1);
  let x = cross(up, z);
  if (len(x) < 1e-5) x = cross([0, 0, 1], z);
  x = norm(x);
  let y = cross(z, x);
  if (roll !== 0) {
    const xr = add(mul(x, Math.cos(roll)), mul(y, Math.sin(roll)));
    const yr = add(mul(x, -Math.sin(roll)), mul(y, Math.cos(roll)));
    x = xr; y = yr;
  }
  // rotation matrix columns x, y, z → quaternion
  const m00 = x[0], m01 = y[0], m02 = z[0];
  const m10 = x[1], m11 = y[1], m12 = z[1];
  const m20 = x[2], m21 = y[2], m22 = z[2];
  const tr = m00 + m11 + m22;
  let qx: number, qy: number, qz: number, qw: number;
  if (tr > 0) {
    const s = 0.5 / Math.sqrt(tr + 1);
    qw = 0.25 / s; qx = (m21 - m12) * s; qy = (m02 - m20) * s; qz = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    qw = (m21 - m12) / s; qx = 0.25 * s; qy = (m01 + m10) / s; qz = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    qw = (m02 - m20) / s; qx = (m01 + m10) / s; qy = 0.25 * s; qz = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    qw = (m10 - m01) / s; qx = (m02 + m20) / s; qy = (m12 + m21) / s; qz = 0.25 * s;
  }
  const l = Math.hypot(qx, qy, qz, qw);
  return [qx / l, qy / l, qz / l, qw / l];
}

export const qdot = (a: Q, b: Q) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
/** Angle in radians between two orientations. */
export const qangle = (a: Q, b: Q) => 2 * Math.acos(Math.min(1, Math.abs(qdot(a, b))));

/** Centripetal Catmull-Rom spline through points with arc-length parameterisation. */
export class ArcSpline {
  private pts: V3[];
  private table: { s: number; seg: number; t: number }[] = [];
  readonly length: number;
  constructor(points: V3[], samplesPerSegment = 64) {
    if (points.length < 2) throw new Error('ArcSpline needs at least 2 points');
    const first = sub(mul(points[0], 2), points[1]);
    const last = sub(mul(points[points.length - 1], 2), points[points.length - 2]);
    this.pts = [first, ...points, last];
    let s = 0;
    let prev = this.raw(0, 0);
    this.table.push({ s: 0, seg: 0, t: 0 });
    for (let seg = 0; seg < points.length - 1; seg++) {
      for (let i = 1; i <= samplesPerSegment; i++) {
        const t = i / samplesPerSegment;
        const p = this.raw(seg, t);
        s += dist(p, prev);
        prev = p;
        this.table.push({ s, seg, t });
      }
    }
    this.length = s;
  }
  private raw(seg: number, t: number): V3 {
    const [p0, p1, p2, p3] = [this.pts[seg], this.pts[seg + 1], this.pts[seg + 2], this.pts[seg + 3]];
    const alpha = 0.5;
    const tj = (ti: number, a: V3, b: V3) => ti + Math.max(1e-4, Math.pow(dist(a, b), alpha));
    const t0 = 0, t1 = tj(t0, p0, p1), t2 = tj(t1, p1, p2), t3 = tj(t2, p2, p3);
    const tt = t1 + (t2 - t1) * t;
    const L = (a: V3, b: V3, ta: number, tb: number): V3 => lerp3(a, b, (tt - ta) / (tb - ta));
    const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
    const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
    return L(B1, B2, t1, t2);
  }
  /** Point at arc length s (clamped). */
  at(s: number): V3 {
    const S = Math.max(0, Math.min(this.length, s));
    let lo = 0, hi = this.table.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (this.table[mid].s < S) lo = mid; else hi = mid; }
    const a = this.table[lo], b = this.table[hi];
    const k = b.s > a.s ? (S - a.s) / (b.s - a.s) : 0;
    return lerp3(this.raw(a.seg, a.t), this.raw(b.seg, b.t), k);
  }
  /** Point at normalized arc length u in [0,1]. Points beyond the end extrapolate along the end tangent. */
  atU(u: number): V3 {
    if (u <= 1) return this.at(u * this.length);
    const end = this.at(this.length);
    const tan = norm(sub(end, this.at(this.length - 0.05)));
    return add(end, mul(tan, (u - 1) * this.length));
  }
}
