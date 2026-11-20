// CONTINUOUS ONE-TAKE CAMERA COMPILER
// Shot plan (camera specs) + world layout → one baked per-frame camera track.
//
// Continuity is enforced BY CONSTRUCTION:
//   * every move generator receives the exact end state (position, look target, fov, roll) of the
//     previous move and must return that state at u=0 — the camera can never reset or teleport;
//   * look targets blend from the previous target over a `lead` fraction (dynamic look-at);
//   * orbits derive their start angle/radius/height from the inherited position;
//   * a Gaussian velocity-blending pass removes velocity discontinuities between moves;
//   * orientation is derived from smoothed position/target and kept hemisphere-continuous.
// The output is validated by scripts/validate-camera-path.py before any render.
import { add, ArcSpline, cross, dist, len, lerp3, lookQuat, mul, norm, qdot, rotAxis, rotY, sub, UP, type Q, type V3 } from './vec.ts';
import { clamp, deg, ease, fbm1, smoothstep, type EasingName } from '../../core/math.ts';
import { evaluateCharacter, type CharacterAction } from '../../characters/poses.ts';

export type MoveType =
  | 'orbit' | 'revolve' | 'spiral'
  | 'dolly' | 'push' | 'pull' | 'track' | 'crane'
  | 'pan' | 'tilt' | 'travel' | 'flythrough' | 'through' | 'goto'
  | 'focus-pull' | 'roll' | 'drift';

export const ORBITAL_MOVES: MoveType[] = ['orbit', 'revolve', 'spiral'];

export type AnchorRef = string | V3 | { anchor: string; offset?: V3 };

export interface CameraSpec {
  preset?: string;
  move: MoveType;
  target?: AnchorRef; // look-at (and orbit centre unless `center` given)
  center?: AnchorRef;
  to?: AnchorRef;
  via?: AnchorRef[];
  radius?: number; radiusEnd?: number; approach?: number;
  sweepDeg?: number;
  height?: number; heightEnd?: number; // orbit: height relative to centre
  distance?: number; forward?: number;
  yawDeg?: number; pitchDeg?: number;
  fov?: number; fovEnd?: number;
  rollDeg?: number;
  lead?: number; // fraction of the move over which the look target blends from the previous one
  lookAlongPath?: boolean; lookAhead?: number;
  drift?: number;
  ease?: EasingName;
  purpose?: string;
}

export interface ShotIn {
  id: string;
  startFrame: number;
  endFrame: number; // exclusive
  camera: CameraSpec;
  transitionIn?: { type: string } | string;
  transitionOut?: { type: string } | string;
}

export interface Entity {
  id: string;
  component: string;
  position?: V3;
  rotation?: V3; // radians; only Y is used for anchors
  scale?: number;
  anchors?: Record<string, V3>;
  props?: Record<string, unknown>;
  actions?: CharacterAction[];
  cullRadius?: number;
}

export interface LayoutIn {
  anchors?: Record<string, V3>;
  zones?: Entity[];
  actors?: Entity[];
  objects?: Entity[];
}

export interface CameraState { pos: V3; target: V3; fov: number; roll: number }

export interface CompileOptions {
  fps: number;
  durationFrames: number;
  initial: { position: V3; target: V3; fov?: number; rollDeg?: number };
  smoothingSeconds?: number;
  handheld?: { position: number; rotationDeg: number; frequency: number };
  movePresets?: Record<string, Partial<CameraSpec>>;
  componentAnchors?: Record<string, Record<string, V3>>;
  /** pan/tilt speed budget used to auto-lengthen look-target blends (deg/s). Default 100. */
  maxPanDegPerSec?: number;
}

export interface BakedTrack {
  version: 1;
  fps: number;
  frames: number;
  p: number[][];
  q: number[][];
  fov: number[];
  t: number[][];
  roll: number[];
  shot: number[]; // index into shots
  shots: { id: string; move: MoveType; startFrame: number; endFrame: number; orbital: boolean; transitionIn?: string; peakSpeed: number }[];
  warnings: string[];
}

// ---------------------------------------------------------------------------------------------
// Anchor resolution (time-aware for walking actors)

export class AnchorResolver {
  private entities = new Map<string, Entity & { kind: 'zone' | 'actor' | 'object' }>();
  private layout: LayoutIn;
  private fps: number;
  private componentAnchors: Record<string, Record<string, V3>>;
  // (no TS parameter properties: this file must run under Node's type stripping)
  constructor(layout: LayoutIn, fps: number, componentAnchors: Record<string, Record<string, V3>> = {}) {
    this.layout = layout;
    this.fps = fps;
    this.componentAnchors = componentAnchors;
    for (const [kind, list] of [['zone', layout.zones], ['actor', layout.actors], ['object', layout.objects]] as const) {
      for (const e of list ?? []) {
        if (this.entities.has(e.id)) throw new Error(`Duplicate entity id "${e.id}" in world layout`);
        this.entities.set(e.id, { ...e, kind });
      }
    }
  }
  has(ref: string): boolean {
    try { this.resolve(ref, 0); return true; } catch { return false; }
  }
  private rootAt(e: Entity & { kind: string }, frame: number): { pos: V3; yaw: number } {
    const pos = e.position ?? [0, 0, 0];
    const yaw = e.rotation?.[1] ?? 0;
    if (e.kind === 'actor' && e.actions?.length) {
      const { root } = evaluateCharacter(e.actions, frame, this.fps, 1, 0.95, { position: pos, yaw });
      return { pos: root.position, yaw: root.yaw };
    }
    return { pos, yaw };
  }
  resolve(ref: AnchorRef, frame: number): V3 {
    if (Array.isArray(ref)) return ref as V3;
    if (typeof ref === 'object') return add(this.resolve(ref.anchor, frame), ref.offset ?? [0, 0, 0]);
    if (this.layout.anchors?.[ref]) return this.layout.anchors[ref];
    const [id, name] = ref.split('.');
    const e = this.entities.get(id);
    if (!e) throw new Error(`Unknown anchor "${ref}": no entity "${id}" and no global anchor. Known entities: ${[...this.entities.keys()].join(', ')}`);
    const { pos, yaw } = this.rootAt(e, frame);
    const s = e.scale ?? 1;
    const compAnchors = { ...(this.componentAnchors[e.component] ?? {}), ...(e.anchors ?? {}) };
    let local: V3;
    if (!name) local = compAnchors.center ?? (e.kind === 'actor' ? compAnchors.chest ?? [0, 1.35, 0] : [0, 0, 0]);
    else if (compAnchors[name]) local = compAnchors[name];
    else throw new Error(`Unknown anchor "${ref}": entity "${id}" (${e.component}) has anchors [${Object.keys(compAnchors).join(', ')}]`);
    return add(pos, rotY(mul(local, s), yaw));
  }
}

// ---------------------------------------------------------------------------------------------
// Move generators. Each returns sample(u, frame) with sample(0, startFrame) === start.

type Sampler = (u: number, frame: number) => CameraState;
interface Ctx { start: CameraState; spec: CameraSpec; R: AnchorResolver; startFrame: number; endFrame: number; fps: number; maxPanDegPerSec: number }

/**
 * Blend two look targets as seen from `pos`, the way a fluid-head camera operator would: interpolate the
 * look direction's yaw (shortest way round) and pitch separately, and the look distance linearly.
 * Lerping target points can sweep the target through the camera (180° flip); slerping directions can tilt
 * through the vertical pole (roll spin). Yaw/pitch interpolation does neither.
 */
export function blendLook(pos: V3, a: V3, b: V3, w: number, yawHint?: number): V3 {
  if (w <= 0) return a;
  if (w >= 1) return b;
  const va = sub(a, pos), vb = sub(b, pos);
  const la = len(va), lb = len(vb);
  if (la < 1e-6 || lb < 1e-6) return lerp3(a, b, w);
  const yawA = Math.atan2(va[0], va[2]), yawB = Math.atan2(vb[0], vb[2]);
  const pitA = Math.asin(Math.max(-1, Math.min(1, va[1] / la))), pitB = Math.asin(Math.max(-1, Math.min(1, vb[1] / lb)));
  let dy = yawB - yawA;
  while (dy > Math.PI) dy -= 2 * Math.PI;
  while (dy < -Math.PI) dy += 2 * Math.PI;
  // keep the turning direction decided at the start of the move (no mid-pan reversal near 180°)
  if (yawHint !== undefined && Math.abs(dy) > (5 * Math.PI) / 6) {
    const alt = dy > 0 ? dy - 2 * Math.PI : dy + 2 * Math.PI;
    if (Math.abs(alt - yawHint) < Math.abs(dy - yawHint)) dy = alt;
  }
  const yaw = yawA + dy * w;
  const pitch = pitA + (pitB - pitA) * w;
  const d = la + (lb - la) * w;
  const dir: V3 = [Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)];
  return add(pos, mul(dir, d));
}

/** Angle (deg) between two look targets as seen from pos, measured as a fluid head would pan+tilt. */
function lookAngle(pos: V3, a: V3, b: V3): number {
  const va = sub(a, pos), vb = sub(b, pos);
  const la = len(va) || 1, lb = len(vb) || 1;
  let dy = Math.atan2(vb[0], vb[2]) - Math.atan2(va[0], va[2]);
  while (dy > Math.PI) dy -= 2 * Math.PI;
  while (dy < -Math.PI) dy += 2 * Math.PI;
  const dp = Math.asin(Math.max(-1, Math.min(1, vb[1] / lb))) - Math.asin(Math.max(-1, Math.min(1, va[1] / la)));
  return (Math.hypot(dy * Math.cos((Math.asin(va[1] / la) + Math.asin(vb[1] / lb)) / 2), dp) * 180) / Math.PI;
}

function yawDelta(pos: V3, a: V3, b: V3): number {
  const va = sub(a, pos), vb = sub(b, pos);
  let dy = Math.atan2(vb[0], vb[2]) - Math.atan2(va[0], va[2]);
  while (dy > Math.PI) dy -= 2 * Math.PI;
  while (dy < -Math.PI) dy += 2 * Math.PI;
  return dy;
}

/** Lead fraction long enough that re-aiming by `angleDeg` stays under the pan-speed limit (smoothstep peak = 1.5× mean). */
function autoLead(ctx: Ctx, angleDeg: number, requested: number): number {
  const seconds = Math.max(1, ctx.endFrame - ctx.startFrame) / ctx.fps;
  const needed = (1.5 * angleDeg) / (ctx.maxPanDegPerSec * seconds);
  return Math.min(1, Math.max(requested, needed));
}

function lookBlend(ctx: Ctx, u: number, frame: number, fallback?: V3, pos?: V3): V3 {
  const { start, spec, R } = ctx;
  const goal = spec.target !== undefined ? R.resolve(spec.target, frame) : fallback ?? start.target;
  const goal0 = spec.target !== undefined ? R.resolve(spec.target, ctx.startFrame) : fallback ?? start.target;
  const lead = autoLead(ctx, lookAngle(start.pos, start.target, goal0), spec.lead ?? 0.3);
  const w = lead <= 0 ? 1 : smoothstep(0, lead, u);
  const p = pos ?? start.pos;
  // the inherited aim travels WITH the camera (a held direction), so flying past the old target can't whip the view
  const carried = add(p, sub(start.target, start.pos));
  return blendLook(p, carried, goal, w, yawDelta(start.pos, start.target, goal0));
}
function fovAt(ctx: Ctx, u: number): number {
  const end = ctx.spec.fovEnd ?? ctx.spec.fov ?? ctx.start.fov;
  return ctx.start.fov + (end - ctx.start.fov) * smoothstep(0, 1, u);
}
function rollAt(ctx: Ctx, u: number): number {
  const end = deg(ctx.spec.rollDeg ?? 0);
  return ctx.start.roll + (end - ctx.start.roll) * smoothstep(0, 1, u);
}
const viewDir = (s: CameraState): V3 => norm(sub(s.target, s.pos));
const horiz = (v: V3): V3 => { const h: V3 = [v[0], 0, v[2]]; return len(h) < 1e-6 ? [0, 0, -1] : norm(h); };

const generators: Record<MoveType, (ctx: Ctx) => Sampler> = {
  orbit: (ctx) => {
    const { start, spec, R, startFrame } = ctx;
    const centerRef = spec.center ?? spec.target;
    if (centerRef === undefined) throw new Error('orbit requires `target` or `center`');
    const c0 = R.resolve(centerRef, startFrame);
    const rel = sub(start.pos, c0);
    const r0 = Math.hypot(rel[0], rel[2]);
    if (r0 < 0.05) throw new Error(`orbit: camera starts on the orbit axis of ${JSON.stringify(centerRef)} — add a preceding move that offsets it`);
    const a0 = Math.atan2(rel[2], rel[0]);
    const h0 = rel[1];
    const rA = spec.radius ?? r0, rB = spec.radiusEnd ?? rA;
    const hA = spec.height ?? h0, hB = spec.heightEnd ?? hA;
    const appr = spec.approach ?? 0.35;
    const sweep = deg(spec.sweepDeg ?? 60);
    const E = (u: number) => ease(spec.ease ?? 'linear', u);
    return (u, frame) => {
      const c = R.resolve(centerRef, frame);
      const e = E(u);
      const r = r0 + (rA - r0) * smoothstep(0, appr, e) + (rB - rA) * smoothstep(appr, 1, e);
      const h = h0 + (hA - h0) * smoothstep(0, appr, e) + (hB - hA) * smoothstep(appr, 1, e);
      const a = a0 + sweep * e;
      const pos: V3 = [c[0] + r * Math.cos(a), c[1] + h, c[2] + r * Math.sin(a)];
      return { pos, target: lookBlend(ctx, u, frame, c, pos), fov: fovAt(ctx, u), roll: rollAt(ctx, u) };
    };
  },
  revolve: (ctx) => generators.orbit({ ...ctx, spec: { sweepDeg: 180, ...ctx.spec } }),
  spiral: (ctx) => generators.orbit({ ...ctx, spec: { approach: 0.15, ...ctx.spec } }),

  dolly: (ctx) => {
    const { start, spec, R, startFrame } = ctx;
    const dir = viewDir(start);
    const to = spec.to !== undefined ? R.resolve(spec.to, startFrame) : add(start.pos, mul(dir, spec.distance ?? 2));
    return (u, frame) => {
      const pos = lerp3(start.pos, to, ease(spec.ease ?? 'linear', u));
      return { pos, target: lookBlend(ctx, u, frame, undefined, pos), fov: fovAt(ctx, u), roll: rollAt(ctx, u) };
    };
  },
  push: (ctx) => generators.dolly({ ...ctx, spec: { distance: 2, ...ctx.spec } }),
  pull: (ctx) => generators.dolly({ ...ctx, spec: { ...ctx.spec, distance: -Math.abs(ctx.spec.distance ?? 3) } }),

  track: (ctx) => {
    const { start, spec } = ctx;
    const dir = viewDir(start);
    const right = norm(cross(horiz(dir), UP));
    const delta = add(mul(right, spec.distance ?? 3), mul(horiz(dir), spec.forward ?? 0));
    return (u, frame) => {
      const e = ease(spec.ease ?? 'linear', u);
      const pos = add(start.pos, mul(delta, e));
      // without an explicit target the aim travels with the camera (true tracking shot)
      const fallback = add(start.target, mul(delta, e));
      return { pos, target: lookBlend(ctx, u, frame, fallback, pos), fov: fovAt(ctx, u), roll: rollAt(ctx, u) };
    };
  },

  crane: (ctx) => {
    const { start, spec } = ctx;
    const fwd = horiz(viewDir(start));
    const delta = add(mul(UP, spec.distance ?? 3), mul(fwd, spec.forward ?? 0));
    return (u, frame) => {
      const e = ease(spec.ease ?? 'linear', u);
      const pos = add(start.pos, mul(delta, e));
      return { pos, target: lookBlend(ctx, u, frame, undefined, pos), fov: fovAt(ctx, u), roll: rollAt(ctx, u) };
    };
  },

  pan: (ctx) => {
    const { start, spec } = ctx;
    const dir0 = sub(start.target, start.pos);
    const d0 = len(dir0);
    const right = norm(cross(horiz(dir0), UP));
    const drift = spec.drift ?? 0.3;
    return (u, frame) => {
      const e = ease(spec.ease ?? 'inOutSine', u);
      const pos = add(start.pos, mul(right, drift * u));
      let d = rotY(dir0, -deg(spec.yawDeg ?? 0) * e);
      const axis = norm(cross(norm(d), UP));
      d = rotAxis(d, axis, deg(spec.pitchDeg ?? 0) * e);
      const free = add(pos, mul(norm(d), d0));
      return { pos, target: spec.target !== undefined ? lookBlend(ctx, u, frame, undefined, pos) : free, fov: fovAt(ctx, u), roll: rollAt(ctx, u) };
    };
  },
  tilt: (ctx) => generators.pan(ctx),

  travel: (ctx) => {
    const { start, spec, R, startFrame } = ctx;
    if (spec.to === undefined) throw new Error('travel/flythrough/through requires `to`');
    const pts: V3[] = [start.pos, ...(spec.via ?? []).map((v) => R.resolve(v, startFrame)), R.resolve(spec.to, startFrame)];
    const spline = new ArcSpline(pts);
    const ahead = (spec.lookAhead ?? 2.5) / Math.max(spline.length, 1e-3);
    return (u, frame) => {
      const e = ease(spec.ease ?? 'linear', u);
      const pos = spline.atU(e);
      let target: V3;
      if (spec.lookAlongPath) {
        const along = spline.atU(e + ahead);
        const along0 = spline.atU(0.15 + ahead);
        const alongLead = autoLead(ctx, lookAngle(start.pos, start.target, along0), spec.lead ?? 0.25);
        const carried = add(pos, sub(start.target, start.pos));
        const fromPrev = blendLook(pos, carried, along, smoothstep(0, alongLead, u), yawDelta(start.pos, start.target, along0));
        target = spec.target !== undefined ? blendLook(pos, fromPrev, R.resolve(spec.target, frame), smoothstep(0.6, 1, u)) : fromPrev;
      } else target = lookBlend(ctx, u, frame, undefined, pos);
      return { pos, target, fov: fovAt(ctx, u), roll: rollAt(ctx, u) };
    };
  },
  flythrough: (ctx) => generators.travel({ ...ctx, spec: { lookAlongPath: true, ...ctx.spec } }),
  through: (ctx) => generators.travel({ ...ctx, spec: { lookAlongPath: true, ...ctx.spec } }),
  goto: (ctx) => generators.travel(ctx),

  'focus-pull': (ctx) => {
    const { start, spec } = ctx;
    const dir = viewDir(start);
    return (u, frame) => {
      const pos = add(start.pos, mul(dir, (spec.drift ?? 0.4) * u));
      return { pos, target: lookBlend(ctx, u, frame, undefined, pos), fov: fovAt(ctx, u), roll: rollAt(ctx, u) };
    };
  },
  roll: (ctx) => generators['focus-pull'](ctx),

  drift: (ctx) => {
    // The quietest allowed move: slow push + slight arc around the look target. Never static.
    const { start, spec } = ctx;
    const dir = viewDir(start);
    const pivot = start.target;
    return (u, frame) => {
      const pushed = add(start.pos, mul(dir, (spec.drift ?? 0.35) * u));
      const rel = rotY(sub(pushed, pivot), deg(spec.sweepDeg ?? 4) * u);
      const pos = add(pivot, rel);
      return { pos, target: lookBlend(ctx, u, frame, undefined, pos), fov: fovAt(ctx, u), roll: rollAt(ctx, u) };
    };
  },
};

// ---------------------------------------------------------------------------------------------

function gaussianSmooth(values: number[][], sigma: number): number[][] {
  if (sigma <= 0) return values.map((v) => [...v]);
  const n = values.length;
  const dim = values[0].length;
  const radius = Math.ceil(sigma * 3);
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)));
  const ksum = kernel.reduce((a, b) => a + b, 0);
  // linear extrapolation padding preserves end velocity (no artificial slow-down at the ends)
  const at = (i: number, d: number) => {
    if (i < 0) return values[0][d] + (values[0][d] - values[Math.min(1, n - 1)][d]) * -i;
    if (i >= n) return values[n - 1][d] + (values[n - 1][d] - values[Math.max(0, n - 2)][d]) * (i - n + 1);
    return values[i][d];
  };
  return values.map((_, i) => Array.from({ length: dim }, (_, d) => {
    let s = 0;
    for (let k = -radius; k <= radius; k++) s += at(i + k, d) * kernel[k + radius];
    return s / ksum;
  }));
}

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export function compileCameraTrack(shotsIn: ShotIn[], layout: LayoutIn, opts: CompileOptions): BakedTrack {
  const { fps, durationFrames } = opts;
  const warnings: string[] = [];
  const R = new AnchorResolver(layout, fps, opts.componentAnchors);
  const shots = [...shotsIn].sort((a, b) => a.startFrame - b.startFrame);
  if (!shots.length) throw new Error('Shot plan has no shots');

  // contiguity: shots must tile [0, durationFrames)
  if (shots[0].startFrame !== 0) { warnings.push(`first shot starts at ${shots[0].startFrame}; extended to 0`); shots[0] = { ...shots[0], startFrame: 0 }; }
  for (let i = 1; i < shots.length; i++) {
    if (shots[i].startFrame < shots[i - 1].endFrame) throw new Error(`Shots ${shots[i - 1].id} and ${shots[i].id} overlap`);
    if (shots[i].startFrame > shots[i - 1].endFrame) {
      warnings.push(`gap ${shots[i - 1].endFrame}-${shots[i].startFrame} after ${shots[i - 1].id}; previous move extended`);
      shots[i - 1] = { ...shots[i - 1], endFrame: shots[i].startFrame };
    }
  }
  const last = shots.length - 1;
  if (shots[last].endFrame !== durationFrames) {
    if (shots[last].endFrame < durationFrames) warnings.push(`last shot ends at ${shots[last].endFrame} < ${durationFrames}; extended`);
    shots[last] = { ...shots[last], endFrame: durationFrames };
  }

  // build samplers in sequence, each inheriting the previous end state
  let state: CameraState = { pos: opts.initial.position, target: opts.initial.target, fov: opts.initial.fov ?? 38, roll: deg(opts.initial.rollDeg ?? 0) };
  const samplers: { sample: Sampler; start: number; end: number }[] = [];
  for (const shot of shots) {
    const preset = shot.camera.preset ? opts.movePresets?.[shot.camera.preset] : undefined;
    if (shot.camera.preset && !preset) throw new Error(`Shot ${shot.id}: unknown camera preset "${shot.camera.preset}"`);
    const spec = { ...(preset ?? {}), ...shot.camera } as CameraSpec;
    const gen = generators[spec.move];
    if (!gen) throw new Error(`Shot ${shot.id}: unknown camera move "${spec.move}"`);
    let sample: Sampler;
    try { sample = gen({ start: state, spec, R, startFrame: shot.startFrame, endFrame: shot.endFrame, fps, maxPanDegPerSec: opts.maxPanDegPerSec ?? 100 }); }
    catch (e) { throw new Error(`Shot ${shot.id}: ${(e as Error).message}`); }
    const s0 = sample(0, shot.startFrame);
    if (dist(s0.pos, state.pos) > 1e-6) throw new Error(`Shot ${shot.id}: move "${spec.move}" violated continuity at u=0 (engine bug)`);
    samplers.push({ sample, start: shot.startFrame, end: shot.endFrame });
    state = sample(1, shot.endFrame);
  }

  // sample every frame
  const P: number[][] = [], T: number[][] = [], F: number[][] = [], RL: number[][] = [], SH: number[] = [];
  let si = 0;
  for (let f = 0; f < durationFrames; f++) {
    while (si < samplers.length - 1 && f >= samplers[si].end) si++;
    const s = samplers[si];
    const u = clamp((f - s.start) / Math.max(1, s.end - s.start));
    const st = s.sample(u, f);
    P.push(st.pos); T.push(st.target); F.push([st.fov]); RL.push([st.roll]); SH.push(si);
  }

  // velocity blending
  const sigma = (opts.smoothingSeconds ?? 0.4) * fps;
  const Ps = gaussianSmooth(P, sigma);
  // Smooth the LOOK DIRECTION as unwrapped yaw / pitch / distance (averaging target points would let
  // opposite targets cancel out and flip the view), then rebuild targets around the smoothed positions.
  const YPD: number[][] = [];
  let prevYaw = 0;
  for (let f = 0; f < P.length; f++) {
    const v = sub(T[f] as V3, P[f] as V3);
    const d = Math.max(len(v), 1e-6);
    let yaw = Math.atan2(v[0], v[2]);
    if (f > 0) { while (yaw - prevYaw > Math.PI) yaw -= 2 * Math.PI; while (yaw - prevYaw < -Math.PI) yaw += 2 * Math.PI; }
    prevYaw = yaw;
    YPD.push([yaw, Math.asin(Math.max(-1, Math.min(1, v[1] / d))), d]);
  }
  const YPDs = gaussianSmooth(YPD, sigma);
  const Ts = YPDs.map(([yaw, pitch, d], f) => add(Ps[f] as V3, mul([Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)], d)));
  const Fs = gaussianSmooth(F, sigma);
  const Rs = gaussianSmooth(RL, sigma);

  // organic micro-motion ("operator breathing") — tiny, on top of the purposeful move
  const hh = opts.handheld ?? { position: 0.01, rotationDeg: 0.12, frequency: 0.35 };
  const q: number[][] = [];
  let prevQ: Q | null = null;
  const outP: number[][] = [], outT: number[][] = [];
  for (let f = 0; f < durationFrames; f++) {
    const t = f / fps;
    const n = (seed: number) => fbm1(seed, t * hh.frequency, 3);
    const p: V3 = [Ps[f][0] + n(11) * hh.position, Ps[f][1] + n(23) * hh.position, Ps[f][2] + n(37) * hh.position];
    const viewLen = dist(Ps[f] as V3, Ts[f] as V3);
    const rot = deg(hh.rotationDeg) * viewLen;
    const tg: V3 = [Ts[f][0] + n(41) * rot, Ts[f][1] + n(53) * rot, Ts[f][2] + n(67) * rot];
    if (dist(p, tg) < 0.05) warnings.push(`frame ${f}: look target within 5cm of camera`);
    let qq = lookQuat(p, tg, Rs[f][0]);
    if (prevQ && qdot(prevQ, qq) < 0) qq = [-qq[0], -qq[1], -qq[2], -qq[3]];
    prevQ = qq;
    q.push(qq.map(r4));
    outP.push(p.map(r4));
    outT.push(tg.map(r4));
  }

  const shotMeta = shots.map((s, i) => {
    let peak = 0;
    for (let f = Math.max(1, s.startFrame); f < s.endFrame; f++) peak = Math.max(peak, dist(outP[f] as V3, outP[f - 1] as V3) * fps);
    const ti = typeof s.transitionIn === 'string' ? s.transitionIn : s.transitionIn?.type;
    const spec = { ...(s.camera.preset ? opts.movePresets?.[s.camera.preset] : {}), ...s.camera } as CameraSpec;
    void i;
    return { id: s.id, move: spec.move, startFrame: s.startFrame, endFrame: s.endFrame, orbital: ORBITAL_MOVES.includes(spec.move), transitionIn: ti, peakSpeed: r4(peak) };
  });

  return { version: 1, fps, frames: durationFrames, p: outP, q, fov: Fs.map((x) => r4(x[0])), t: outT, roll: Rs.map((x) => r4(x[0])), shot: SH, shots: shotMeta, warnings: [...new Set(warnings)].slice(0, 50) };
}
