// Shared deterministic math utilities for every library asset.
// Pure TypeScript, no runtime dependencies — safe to import from Node scripts and Remotion.

export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number): number => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp(invLerp(e0, e1, x));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (e0: number, e1: number, x: number): number => {
  const t = clamp(invLerp(e0, e1, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const deg = (d: number): number => (d * Math.PI) / 180;

export const easings = {
  linear: (t: number) => t,
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  // Gentle: mostly linear (keeps momentum) with softened ends. Preferred for camera.
  cinematic: (t: number) => 0.7 * t + 0.3 * (-(Math.cos(Math.PI * t) - 1) / 2),
} as const;
export type EasingName = keyof typeof easings;
export const ease = (name: EasingName | undefined, t: number): number =>
  (easings[name ?? 'linear'] ?? easings.linear)(clamp(t));

/** Mulberry32 seeded PRNG. Always use this instead of Math.random so renders are deterministic. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const hash1 = (seed: number, i: number): number => {
  let x = Math.imul((i | 0) ^ seed, 0x27d4eb2d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  return ((x >>> 0) % 100000) / 100000;
};

/** Smooth 1D value noise in [-1, 1]. Deterministic for (seed, x). */
export function noise1(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(seed, i), hash1(seed, i + 1), u) * 2 - 1;
}

/** Fractal 1D noise, roughly in [-1, 1]. */
export function fbm1(seed: number, x: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise1(seed + o * 101, x * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/** Hash-based 2D value noise in [0, 1] (used by procedural textures). */
export function noise2(seed: number, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const h = (a: number, b: number) => hash1(seed, a * 374761 + b * 668265);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}

/** Progress of `frame` through [start, end] clamped to 0..1. */
export const progress = (frame: number, start: number, end: number): number =>
  clamp(invLerp(start, end, frame));

/** Envelope that fades in over `fadeIn` frames and out over `fadeOut` frames. */
export function envelope(frame: number, start: number, end: number, fadeIn = 10, fadeOut = 10): number {
  if (frame < start || frame > end) return 0;
  const a = fadeIn > 0 ? smoothstep(start, start + fadeIn, frame) : 1;
  const b = fadeOut > 0 ? 1 - smoothstep(end - fadeOut, end, frame) : 1;
  return Math.min(a, b);
}
