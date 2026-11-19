// Procedural pose library + action timeline evaluation for the Figure rig (v2).
// Angles are radians in an "anatomical" convention (positive = forward / outward / bend),
// converted to rig rotations in Figure.tsx. Pure functions of time → deterministic renders.
// v2: facial channels (brows, lids, mouth, smile), finger curl, hip sway, lying, expressions,
//     distance-driven walk cycle (feet do not slide), blinking, breathing, weight shifts.
import { clamp, envelope, lerp, noise1, smoothstep } from '../core/math.ts';

export interface Pose {
  rootDrop: number; rootPitch: number; rootRoll: number; hipSway: number;
  spineBend: number; spineTwist: number; spineSide: number;
  neckPitch: number; headYaw: number; headPitch: number; headRoll: number;
  lShoulderFwd: number; lShoulderOut: number; lElbow: number; lWrist: number;
  rShoulderFwd: number; rShoulderOut: number; rElbow: number; rWrist: number;
  lHipFwd: number; lKnee: number; rHipFwd: number; rKnee: number;
  lFingers: number; rFingers: number; // 0 open … 1 fist
  browRaise: number; browFurrow: number; lids: number; mouthOpen: number; smile: number; breath: number;
}

export const ZERO_POSE: Pose = {
  rootDrop: 0, rootPitch: 0, rootRoll: 0, hipSway: 0, spineBend: 0, spineTwist: 0, spineSide: 0,
  neckPitch: 0, headYaw: 0, headPitch: 0, headRoll: 0,
  lShoulderFwd: 0, lShoulderOut: 0.1, lElbow: 0.15, lWrist: 0, rShoulderFwd: 0, rShoulderOut: 0.1, rElbow: 0.15, rWrist: 0,
  lHipFwd: 0, lKnee: 0, rHipFwd: 0, rKnee: 0, lFingers: 0.35, rFingers: 0.35,
  browRaise: 0, browFurrow: 0, lids: 0, mouthOpen: 0, smile: 0, breath: 0,
};

const P = (o: Partial<Pose>): Pose => ({ ...ZERO_POSE, ...o });

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a };
  for (const k of Object.keys(a) as (keyof Pose)[]) out[k] = lerp(a[k], b[k] ?? a[k], t);
  return out;
}

export type PoseName =
  | 'stand' | 'walk' | 'sit' | 'reach' | 'hold' | 'gesture' | 'point' | 'raise' | 'cross' | 'inspect' | 'drink' | 'slump' | 'write'
  | 'cover-mouth' | 'facepalm' | 'clutch-stomach' | 'examine' | 'present' | 'pickup' | 'clap' | 'think' | 'vomit' | 'lie' | 'handshake' | 'nod';

export type ExpressionName = 'neutral' | 'shock' | 'pain' | 'smile' | 'determined' | 'sad' | 'closed' | 'concentrate';
export const EXPRESSIONS: Record<ExpressionName, Partial<Pose>> = {
  neutral: {},
  shock: { browRaise: 1, lids: -0.35, mouthOpen: 0.7 },
  pain: { browFurrow: 1, browRaise: 0.3, lids: 0.45, mouthOpen: 0.25, smile: -0.6 },
  smile: { smile: 1, lids: 0.15, browRaise: 0.2 },
  determined: { browFurrow: 0.7, lids: 0.15, smile: -0.2 },
  sad: { browRaise: 0.5, browFurrow: 0.4, lids: 0.3, smile: -0.7 },
  closed: { lids: 1 },
  concentrate: { browFurrow: 0.5, lids: 0.25 },
};

/** Pose generators. `t` seconds, `seed` per character, `hipY` hip height, `phase` walk-cycle phase (cycles). */
export const POSES: Record<PoseName, (t: number, seed: number, hipY: number, phase?: number) => Pose> = {
  stand: (t, seed) => P({
    // weight shift + breathing + drifting attention: characters never freeze
    hipSway: 0.025 * Math.sin(t * 0.45 + seed), spineSide: -0.03 * Math.sin(t * 0.45 + seed),
    lHipFwd: 0.03 * Math.sin(t * 0.45 + seed), rHipFwd: -0.03 * Math.sin(t * 0.45 + seed), lKnee: 0.05 + 0.04 * Math.max(0, Math.sin(t * 0.45 + seed)), rKnee: 0.05 + 0.04 * Math.max(0, -Math.sin(t * 0.45 + seed)),
    spineBend: 0.03 + 0.01 * Math.sin(t * 1.5 + seed), breath: 0.5 + 0.5 * Math.sin(t * 1.5 + seed),
    headYaw: 0.1 * noise1(seed, t * 0.25), headPitch: 0.05 * noise1(seed + 7, t * 0.2), headRoll: 0.03 * noise1(seed + 9, t * 0.18),
    lShoulderFwd: 0.04 * Math.sin(t * 1.5), rShoulderFwd: 0.04 * Math.sin(t * 1.5 + 0.5),
  }),
  walk: (t, _seed, _hipY, phase) => {
    const p = (phase ?? t * 0.9) * Math.PI * 2;
    const s = Math.sin(p);
    return P({
      lHipFwd: 0.42 * s, rHipFwd: -0.42 * s,
      lKnee: 0.08 + 0.7 * Math.max(0, Math.sin(p - 1.3)), rKnee: 0.08 + 0.7 * Math.max(0, Math.sin(p + Math.PI - 1.3)),
      lShoulderFwd: -0.3 * s, rShoulderFwd: 0.3 * s, lElbow: 0.35 - 0.15 * s, rElbow: 0.35 + 0.15 * s,
      spineTwist: 0.07 * s, rootDrop: -0.03 * Math.abs(Math.cos(p)), hipSway: 0.02 * Math.sin(p), spineBend: 0.07, headPitch: -0.03,
      breath: 0.6,
    });
  },
  sit: (t, seed, hipY) => P({ rootDrop: 0.5 - hipY, lHipFwd: 1.5, rHipFwd: 1.5, lKnee: 1.5, rKnee: 1.5, spineBend: 0.06 + 0.01 * Math.sin(t * 1.5 + seed), lShoulderFwd: 0.4, rShoulderFwd: 0.4, lElbow: 0.9, rElbow: 0.9, breath: 0.5 + 0.5 * Math.sin(t * 1.4) }),
  reach: () => P({ rShoulderFwd: 1.25, rShoulderOut: 0.05, rElbow: 0.2, rFingers: 0.1, spineBend: 0.18, spineTwist: -0.12, headPitch: 0.15, browFurrow: 0.3 }),
  hold: () => P({ lShoulderFwd: 0.5, rShoulderFwd: 0.6, lShoulderOut: -0.12, rShoulderOut: -0.1, lElbow: 1.4, rElbow: 1.5, rFingers: 0.8, headPitch: 0.25 }),
  gesture: (t, seed) => P({
    rShoulderFwd: 0.6 + 0.18 * Math.sin(t * 2.7 + seed), rShoulderOut: 0.15, rElbow: 1.2 + 0.3 * Math.sin(t * 2.1), rWrist: 0.3 * Math.sin(t * 2.4), rFingers: 0.15,
    lShoulderFwd: 0.35 + 0.12 * Math.sin(t * 2.2 + 1), lElbow: 1.0 + 0.2 * Math.sin(t * 1.7 + 2), lFingers: 0.2,
    headYaw: 0.15 * Math.sin(t * 0.8 + seed), spineTwist: 0.05 * Math.sin(t * 0.8), browRaise: 0.3 + 0.3 * Math.max(0, Math.sin(t * 1.3)), mouthOpen: 0.15 + 0.15 * Math.abs(Math.sin(t * 7)),
  }),
  point: () => P({ rShoulderFwd: 1.45, rShoulderOut: 0.25, rElbow: 0.05, rFingers: 0.6, spineTwist: -0.1, browFurrow: 0.4 }),
  raise: (t) => P({ rShoulderFwd: 2.7, rShoulderOut: 0.1, rElbow: 0.25 + 0.05 * Math.sin(t * 2), rFingers: 0.85, spineBend: -0.08, headPitch: -0.25, smile: 1, browRaise: 0.3 }),
  cross: () => P({ lShoulderFwd: 0.42, rShoulderFwd: 0.42, lShoulderOut: -0.38, rShoulderOut: -0.38, lElbow: 1.95, rElbow: 1.95, spineBend: -0.06, headPitch: -0.08, browFurrow: 0.5, smile: -0.3 }),
  inspect: (t) => P({ spineBend: 0.55, neckPitch: 0.3, headPitch: 0.1, lShoulderFwd: 0.75, rShoulderFwd: 0.75, lElbow: 0.85, rElbow: 0.85 + 0.08 * Math.sin(t * 1.3), lShoulderOut: -0.05, rShoulderOut: -0.05, rFingers: 0.6 + 0.2 * Math.sin(t * 1.3), browFurrow: 0.5, lids: 0.3 }),
  drink: () => P({ rShoulderFwd: 0.85, rShoulderOut: -0.58, rElbow: 2.05, rFingers: 0.8, headPitch: -0.35, spineBend: -0.08, lids: 0.5, mouthOpen: 0.25 }),
  slump: (t) => P({ spineBend: 0.35, neckPitch: 0.35, headPitch: 0.2 + 0.03 * Math.sin(t), lShoulderFwd: 0.1, rShoulderFwd: 0.1, lids: 0.45, browFurrow: 0.5, breath: 0.5 + 0.5 * Math.sin(t * 2.6) }),
  write: (t) => P({ spineBend: 0.35, neckPitch: 0.25, rShoulderFwd: 0.7, rElbow: 1.3 + 0.05 * Math.sin(t * 9), rWrist: 0.1 * Math.sin(t * 11), rFingers: 0.7, lShoulderFwd: 0.5, lElbow: 1.2, lids: 0.35, browFurrow: 0.3 }),
  'cover-mouth': (t) => P({ rShoulderFwd: 1.05, rShoulderOut: -0.42, rElbow: 2.25, rWrist: -0.3, rFingers: 0.15, headPitch: 0.05, spineBend: -0.05, browRaise: 1, lids: -0.35, lShoulderFwd: 0.15 + 0.03 * Math.sin(t * 4) }),
  facepalm: () => P({ rShoulderFwd: 1.35, rShoulderOut: -0.25, rElbow: 2.45, rWrist: -0.4, rFingers: 0.25, headPitch: 0.4, spineBend: 0.25, lids: 1, browFurrow: 0.8 }),
  'clutch-stomach': (t) => P({ lShoulderFwd: 0.45, rShoulderFwd: 0.5, lShoulderOut: -0.3, rShoulderOut: -0.32, lElbow: 1.75, rElbow: 1.65, spineBend: 0.4 + 0.04 * Math.sin(t * 3), neckPitch: 0.2, lKnee: 0.15, rKnee: 0.15, browFurrow: 1, browRaise: 0.3, lids: 0.45, smile: -0.6, mouthOpen: 0.2 }),
  examine: (t) => P({ rShoulderFwd: 1.2, rShoulderOut: -0.22, rElbow: 1.55, rWrist: -0.2 + 0.08 * Math.sin(t * 0.9), rFingers: 0.75, headPitch: 0.12, headYaw: -0.1, lShoulderFwd: 0.2, lElbow: 0.5, browFurrow: 0.5, lids: 0.25 }),
  present: () => P({ lShoulderFwd: 0.75, rShoulderFwd: 0.75, lShoulderOut: -0.18, rShoulderOut: -0.18, lElbow: 1.15, rElbow: 1.15, lFingers: 0.7, rFingers: 0.7, spineBend: -0.04, headPitch: -0.05, smile: 0.8 }),
  pickup: () => P({ spineBend: 0.75, neckPitch: 0.2, rShoulderFwd: 1.1, rElbow: 0.3, rFingers: 0.7, lKnee: 0.45, rKnee: 0.45, lHipFwd: 0.35, rHipFwd: 0.35, rootDrop: -0.06 }),
  clap: (t) => P({ lShoulderFwd: 0.7, rShoulderFwd: 0.7, lShoulderOut: -0.35 + 0.18 * Math.abs(Math.sin(t * 9)), rShoulderOut: -0.35 + 0.18 * Math.abs(Math.sin(t * 9)), lElbow: 1.4, rElbow: 1.4, lFingers: 0.05, rFingers: 0.05, smile: 1 }),
  think: (t) => P({ rShoulderFwd: 0.95, rShoulderOut: -0.3, rElbow: 2.3, rFingers: 0.6, lShoulderFwd: 0.4, lShoulderOut: -0.3, lElbow: 1.6, headPitch: 0.08, headYaw: 0.1 * Math.sin(t * 0.3), browFurrow: 0.5, lids: 0.2 }),
  vomit: (t) => P({ spineBend: 0.95, neckPitch: 0.45 + 0.08 * Math.sin(t * 5), lShoulderFwd: 0.95, rShoulderFwd: 0.95, lElbow: 0.25, rElbow: 0.25, lShoulderOut: 0.2, rShoulderOut: 0.2, lKnee: 0.12, rKnee: 0.12, lids: 0.8, mouthOpen: 0.5, browFurrow: 1 }),
  lie: (t, _s, hipY) => P({ rootPitch: -Math.PI / 2, rootDrop: 0.12 - hipY, lShoulderOut: 0.12, rShoulderOut: 0.12, lShoulderFwd: -0.05, rShoulderFwd: -0.05, lElbow: 0.04, rElbow: 0.06, lFingers: 0.5, rFingers: 0.5, headPitch: -0.25, headYaw: 0.25 + 0.04 * Math.sin(t * 0.4), lids: 0.4, breath: 0.5 + 0.5 * Math.sin(t * 1.2) }),
  handshake: (t) => P({ rShoulderFwd: 0.65, rShoulderOut: -0.05, rElbow: 0.75 + 0.06 * Math.sin(t * 8), rFingers: 0.55, smile: 0.7 }),
  nod: (t) => P({ headPitch: 0.12 + 0.12 * Math.sin(t * 6), smile: 0.3 }),
};

export type Vec3 = [number, number, number];

export type CharacterAction =
  | { type: 'pose'; pose: PoseName; start: number; end: number; fade?: number }
  | { type: 'walk'; start: number; end: number; path: Vec3[]; fade?: number; stride?: number }
  | { type: 'turn'; start: number; end: number; yaw: number }
  | { type: 'look'; start: number; end: number; yaw?: number; pitch?: number; fade?: number }
  | { type: 'expression'; expression: ExpressionName; start: number; end: number; fade?: number };

export interface RootState { position: Vec3; yaw: number }

function pathInfo(path: Vec3[]) {
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][2] - path[i - 1][2]); lens.push(d); total += d; }
  return { lens, total };
}

function pathPoint(path: Vec3[], u: number): { p: Vec3; dir: [number, number] } {
  const { lens, total } = pathInfo(path);
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

/** Deterministic blink: ~every 2.6–5 s, 5 frames, per-character seed. Returns 0..1 lid closure. */
export function blinkAt(t: number, seed: number): number {
  const period = 2.6 + (seed % 7) * 0.35;
  const ph = ((t + seed * 0.37) % period) / period;
  const d = 0.17 / period; // ~170 ms
  return ph < d ? Math.sin((ph / d) * Math.PI) : 0;
}

/** Evaluate root position/yaw and blended pose at `frame`. Walk cycles are driven by distance travelled. */
export function evaluateCharacter(actions: CharacterAction[], frame: number, fps: number, seed: number, hipY: number, initial: RootState): { root: RootState; pose: Pose } {
  const t = frame / fps;
  const sorted = [...actions].sort((a, b) => a.start - b.start);
  let position: Vec3 = [...initial.position];
  let yaw = initial.yaw;
  let pose = POSES.stand(t, seed, hipY);

  for (const a of sorted) {
    if (a.start > frame) break;
    if (a.type === 'walk') {
      const u = smoothstep(a.start, a.end, frame) * 0.2 + clamp((frame - a.start) / Math.max(1, a.end - a.start)) * 0.8;
      const { p, dir } = pathPoint(a.path, u);
      position = p;
      const targetYaw = Math.atan2(dir[0], dir[1]);
      yaw = angleLerp(yaw, targetYaw, smoothstep(a.start, a.start + 12, frame));
      const stride = a.stride ?? 1.45 * (hipY / 0.95); // metres per full gait cycle
      const phase = (u * pathInfo(a.path).total) / stride; // distance-driven → feet do not slide
      const w = envelope(frame, a.start, a.end, a.fade ?? 8, a.fade ?? 8);
      pose = lerpPose(pose, POSES.walk(t, seed, hipY, phase), w);
    } else if (a.type === 'turn') {
      yaw = angleLerp(yaw, a.yaw, smoothstep(a.start, a.end, frame));
    } else if (a.type === 'pose') {
      const w = envelope(frame, a.start, a.end, a.fade ?? 10, a.fade ?? 10);
      if (w > 0) pose = lerpPose(pose, POSES[a.pose](t, seed, hipY), w);
    } else if (a.type === 'look') {
      const w = envelope(frame, a.start, a.end, a.fade ?? 10, a.fade ?? 10);
      pose = { ...pose, headYaw: pose.headYaw + (a.yaw ?? 0) * w, headPitch: pose.headPitch + (a.pitch ?? 0) * w, spineTwist: pose.spineTwist + (a.yaw ?? 0) * 0.25 * w };
    } else if (a.type === 'expression') {
      const w = envelope(frame, a.start, a.end, a.fade ?? 6, a.fade ?? 8);
      if (w > 0) {
        const e = EXPRESSIONS[a.expression] ?? {};
        const next = { ...pose };
        for (const k of Object.keys(e) as (keyof Pose)[]) next[k] = lerp(pose[k], e[k] as number, w);
        pose = next;
      }
    }
  }
  // blinking is layered on top of whatever the eyelids are doing
  pose = { ...pose, lids: Math.max(pose.lids, blinkAt(t, seed)) };
  return { root: { position, yaw }, pose };
}
