// Procedural pose library + action timeline evaluation for the low-poly Figure rig.
// Angles are radians in an "anatomical" convention (positive = forward / outward / bend),
// converted to rig rotations in Figure.tsx. Pure functions of time → deterministic renders.
import { clamp, envelope, lerp, noise1, smoothstep } from '../core/math.ts';

export interface Pose {
  rootDrop: number; rootPitch: number;
  spineBend: number; spineTwist: number; spineSide: number;
  neckPitch: number; headYaw: number; headPitch: number;
  lShoulderFwd: number; lShoulderOut: number; lElbow: number;
  rShoulderFwd: number; rShoulderOut: number; rElbow: number;
  lHipFwd: number; lKnee: number; rHipFwd: number; rKnee: number;
}

export const ZERO_POSE: Pose = {
  rootDrop: 0, rootPitch: 0, spineBend: 0, spineTwist: 0, spineSide: 0, neckPitch: 0, headYaw: 0, headPitch: 0,
  lShoulderFwd: 0, lShoulderOut: 0.08, lElbow: 0.12, rShoulderFwd: 0, rShoulderOut: 0.08, rElbow: 0.12,
  lHipFwd: 0, lKnee: 0, rHipFwd: 0, rKnee: 0,
};

const P = (o: Partial<Pose>): Pose => ({ ...ZERO_POSE, ...o });

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a };
  for (const k of Object.keys(a) as (keyof Pose)[]) out[k] = lerp(a[k], b[k], t);
  return out;
}

export type PoseName = 'stand' | 'walk' | 'sit' | 'reach' | 'hold' | 'gesture' | 'point' | 'raise' | 'cross' | 'inspect' | 'drink' | 'slump' | 'write';

/** Pose generators. `t` = seconds (for cyclic motion), `seed` = per-character variation, `hipY` for sitting. */
export const POSES: Record<PoseName, (t: number, seed: number, hipY: number) => Pose> = {
  stand: (t, seed) => P({
    spineBend: 0.03 + 0.012 * Math.sin(t * 1.6 + seed),
    headYaw: 0.08 * noise1(seed, t * 0.25), headPitch: 0.04 * noise1(seed + 7, t * 0.2),
    lShoulderFwd: 0.03 * Math.sin(t * 1.6), rShoulderFwd: 0.03 * Math.sin(t * 1.6 + 0.5),
  }),
  walk: (t) => {
    const p = t * Math.PI * 2 * 0.9; // ~0.9 strides/sec
    const s = Math.sin(p);
    return P({
      lHipFwd: 0.42 * s, rHipFwd: -0.42 * s,
      lKnee: 0.08 + 0.6 * Math.max(0, Math.sin(p - 1.3)), rKnee: 0.08 + 0.6 * Math.max(0, Math.sin(p + Math.PI - 1.3)),
      lShoulderFwd: -0.32 * s, rShoulderFwd: 0.32 * s, lElbow: 0.3, rElbow: 0.3,
      spineTwist: 0.06 * s, rootDrop: -0.025 * Math.abs(Math.cos(p)), spineBend: 0.06,
    });
  },
  sit: (t, seed, hipY) => P({ rootDrop: 0.5 - hipY, lHipFwd: 1.5, rHipFwd: 1.5, lKnee: 1.5, rKnee: 1.5, spineBend: 0.06 + 0.01 * Math.sin(t * 1.5 + seed), lShoulderFwd: 0.4, rShoulderFwd: 0.4, lElbow: 0.9, rElbow: 0.9 }),
  reach: () => P({ rShoulderFwd: 1.25, rShoulderOut: 0.05, rElbow: 0.2, spineBend: 0.18, spineTwist: -0.12, headPitch: 0.15 }),
  hold: () => P({ lShoulderFwd: 0.55, rShoulderFwd: 0.55, lShoulderOut: -0.12, rShoulderOut: -0.12, lElbow: 1.45, rElbow: 1.45, headPitch: 0.25 }),
  gesture: (t, seed) => P({
    rShoulderFwd: 0.6 + 0.18 * Math.sin(t * 2.7 + seed), rShoulderOut: 0.15, rElbow: 1.2 + 0.3 * Math.sin(t * 2.1),
    lShoulderFwd: 0.35 + 0.12 * Math.sin(t * 2.2 + 1), lElbow: 1.0 + 0.2 * Math.sin(t * 1.7 + 2),
    headYaw: 0.15 * Math.sin(t * 0.8 + seed), spineTwist: 0.05 * Math.sin(t * 0.8),
  }),
  point: () => P({ rShoulderFwd: 1.45, rShoulderOut: 0.25, rElbow: 0.05, spineTwist: -0.1 }),
  raise: (t) => P({ rShoulderFwd: 2.7, rShoulderOut: 0.1, rElbow: 0.25 + 0.05 * Math.sin(t * 2), spineBend: -0.08, headPitch: -0.25 }),
  cross: () => P({ lShoulderFwd: 0.42, rShoulderFwd: 0.42, lShoulderOut: -0.38, rShoulderOut: -0.38, lElbow: 1.95, rElbow: 1.95, spineBend: -0.06, headPitch: -0.08 }),
  inspect: (t) => P({ spineBend: 0.55, neckPitch: 0.3, headPitch: 0.1, lShoulderFwd: 0.75, rShoulderFwd: 0.75, lElbow: 0.85, rElbow: 0.85 + 0.08 * Math.sin(t * 1.3), lShoulderOut: -0.05, rShoulderOut: -0.05 }),
  drink: () => P({ rShoulderFwd: 1.0, rShoulderOut: -0.35, rElbow: 2.25, headPitch: -0.3, spineBend: -0.05 }),
  slump: (t) => P({ spineBend: 0.35, neckPitch: 0.35, headPitch: 0.2 + 0.03 * Math.sin(t), lShoulderFwd: 0.1, rShoulderFwd: 0.1 }),
  write: (t) => P({ spineBend: 0.35, neckPitch: 0.25, rShoulderFwd: 0.7, rElbow: 1.3 + 0.05 * Math.sin(t * 9), lShoulderFwd: 0.5, lElbow: 1.2 }),
};

export type Vec3 = [number, number, number];

export type CharacterAction =
  | { type: 'pose'; pose: PoseName; start: number; end: number; fade?: number }
  | { type: 'walk'; start: number; end: number; path: Vec3[]; fade?: number }
  | { type: 'turn'; start: number; end: number; yaw: number }
  | { type: 'look'; start: number; end: number; yaw?: number; pitch?: number; fade?: number };

export interface RootState { position: Vec3; yaw: number }

function pathPoint(path: Vec3[], u: number): { p: Vec3; dir: [number, number] } {
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][2] - path[i - 1][2]); lens.push(d); total += d; }
  let s = clamp(u) * total;
  for (let i = 1; i < path.length; i++) {
    const L = lens[i - 1];
    if (s <= L || i === path.length - 1) {
      const k = L > 0 ? clamp(s / L) : 0;
      const a = path[i - 1], b = path[i];
      return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)], dir: [b[0] - a[0], b[2] - a[2]] };
    }
    s -= L;
  }
  return { p: path[0], dir: [0, 1] };
}

const angleLerp = (a: number, b: number, t: number) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

/** Evaluate root position/yaw and blended pose at `frame`. */
export function evaluateCharacter(actions: CharacterAction[], frame: number, fps: number, seed: number, hipY: number, initial: RootState): { root: RootState; pose: Pose } {
  const t = frame / fps;
  const sorted = [...actions].sort((a, b) => a.start - b.start);
  let position: Vec3 = [...initial.position];
  let yaw = initial.yaw;
  let pose = POSES.stand(t, seed, hipY);

  for (const a of sorted) {
    if (a.start > frame) break;
    if (a.type === 'walk') {
      const u = smoothstep(a.start, a.end, frame) * 0.15 + clamp((frame - a.start) / Math.max(1, a.end - a.start)) * 0.85;
      const { p, dir } = pathPoint(a.path, u);
      position = p;
      const targetYaw = Math.atan2(dir[0], dir[1]);
      yaw = angleLerp(yaw, targetYaw, smoothstep(a.start, a.start + 12, frame));
      const w = envelope(frame, a.start, a.end, a.fade ?? 8, a.fade ?? 8);
      pose = lerpPose(pose, POSES.walk(t, seed, hipY), w);
    } else if (a.type === 'turn') {
      yaw = angleLerp(yaw, a.yaw, smoothstep(a.start, a.end, frame));
    } else if (a.type === 'pose') {
      const w = envelope(frame, a.start, a.end, a.fade ?? 10, a.fade ?? 10);
      if (w > 0) pose = lerpPose(pose, POSES[a.pose](t, seed, hipY), w);
    } else if (a.type === 'look') {
      const w = envelope(frame, a.start, a.end, a.fade ?? 10, a.fade ?? 10);
      pose = { ...pose, headYaw: pose.headYaw + (a.yaw ?? 0) * w, headPitch: pose.headPitch + (a.pitch ?? 0) * w, spineTwist: pose.spineTwist + (a.yaw ?? 0) * 0.25 * w };
    }
  }
  return { root: { position, yaw }, pose };
}
