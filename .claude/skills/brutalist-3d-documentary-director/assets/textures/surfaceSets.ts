// PBR surface sets generated procedurally: albedo (sRGB) + normal + roughness (+ optional metalness) maps,
// all derived from one height/pattern function so they agree with each other. Deterministic and cached.
// Each set tiles in world space (pair with core/geometry boxUV / bevelBox, 1 UV = `tile` meters).
import * as THREE from 'three';
import { noise2, rng } from '../core/math';

export interface SurfaceSet { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture; metalnessMap?: THREE.Texture }
type Sample = { h: number; c: [number, number, number]; r: number; m?: number };

const cache = new Map<string, SurfaceSet>();

function fbm(seed: number, x: number, y: number, oct = 4, lac = 2.07) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) { s += noise2(seed + o * 17, x * f, y * f) * a; n += a; a *= 0.5; f *= lac; }
  return s / n;
}
// tileable value noise: sample on a torus by wrapping integer lattice (period p)
function tnoise(seed: number, x: number, y: number, p: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const h = (a: number, b: number) => noise2(seed, ((a % p) + p) % p * 1.0001, ((b % p) + p) % p * 1.0001);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}
function tfbm(seed: number, x: number, y: number, period: number, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) { s += tnoise(seed + o * 31, x * f, y * f, period * f) * a; n += a; a *= 0.5; f *= 2; }
  return s / n;
}

function build(key: string, size: number, normalStrength: number, sample: (u: number, v: number) => Sample, withMetal = false): SurfaceSet {
  const hit = cache.get(key);
  if (hit) return hit;
  const H = new Float32Array(size * size);
  const col = new Uint8Array(size * size * 4);
  const rough = new Uint8Array(size * size * 4);
  const metal = withMetal ? new Uint8Array(size * size * 4) : null;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const s = sample(x / size, y / size);
    const i = y * size + x;
    H[i] = s.h;
    col[i * 4] = Math.max(0, Math.min(255, s.c[0] * 255));
    col[i * 4 + 1] = Math.max(0, Math.min(255, s.c[1] * 255));
    col[i * 4 + 2] = Math.max(0, Math.min(255, s.c[2] * 255));
    col[i * 4 + 3] = 255;
    const r = Math.max(0, Math.min(255, s.r * 255));
    rough[i * 4] = rough[i * 4 + 1] = rough[i * 4 + 2] = r; rough[i * 4 + 3] = 255;
    if (metal) { const m = Math.max(0, Math.min(255, (s.m ?? 0) * 255)); metal[i * 4] = metal[i * 4 + 1] = metal[i * 4 + 2] = m; metal[i * 4 + 3] = 255; }
  }
  const nor = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hx = H[y * size + ((x + 1) % size)] - H[y * size + ((x - 1 + size) % size)];
    const hy = H[((y + 1) % size) * size + x] - H[((y - 1 + size) % size) * size + x];
    let nx = -hx * normalStrength, ny = -hy * normalStrength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * size + x) * 4;
    nor[i] = (nx * 0.5 + 0.5) * 255; nor[i + 1] = (ny * 0.5 + 0.5) * 255; nor[i + 2] = (nz * 0.5 + 0.5) * 255; nor[i + 3] = 255;
  }
  const tex = (data: Uint8Array, srgb: boolean) => {
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  const set: SurfaceSet = { map: tex(col, true), normalMap: tex(nor, false), roughnessMap: tex(rough, false), ...(metal ? { metalnessMap: tex(metal, false) } : {}) };
  cache.set(key, set);
  return set;
}

const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = (h: string): [number, number, number] => { const c = new THREE.Color(h); return [c.r ** (1 / 2.2), c.g ** (1 / 2.2), c.b ** (1 / 2.2)]; };

/** Board-formed brutalist concrete: board seams, wood-grain imprint, tie holes, pores, water staining. */
export function concreteSet(tint = '#8c8782', seed = 7, size = 512): SurfaceSet {
  const base = hex(tint);
  const r = rng(seed);
  const holes = Array.from({ length: 4 }, () => [r(), r()]);
  return build(`concrete|${tint}|${seed}|${size}`, size, 6, (u, v) => {
    const boards = 6;
    const bv = v * boards;
    const board = Math.floor(bv);
    const inB = bv - board;
    const seam = Math.min(inB, 1 - inB) < 0.025 ? 1 : 0;
    const grain = tfbm(seed + board * 7, u * 40, inB * 2, 40, 2) * 0.5 + Math.sin(u * 120 + tfbm(seed, u * 6, v * 6, 6) * 8) * 0.08;
    const blot = tfbm(seed + 3, u * 6, v * 6, 6, 5);
    const pore = tnoise(seed + 9, u * 180, v * 180, 180) > 0.86 ? 1 : 0;
    let hole = 0;
    for (const [hx, hy] of holes) { const d = Math.hypot(((u - hx + 1.5) % 1) - 0.5, ((v - hy + 1.5) % 1) - 0.5); if (d < 0.012) hole = 1; }
    const streak = Math.max(0, tfbm(seed + 11, u * 30, v * 1.2, 30, 3) - 0.55) * 2;
    const h = 0.5 + grain * 0.25 + blot * 0.3 - seam * 0.6 - pore * 0.35 - hole * 0.9;
    const shade = 0.82 + blot * 0.32 + (r() - 0.5) * 0.04 - streak * 0.25 - seam * 0.25 - hole * 0.5 - pore * 0.15 + (board % 2) * 0.03;
    return { h, c: [base[0] * shade, base[1] * shade, base[2] * shade], r: 0.82 + blot * 0.15 - streak * 0.1 };
  });
}

/** Painted plaster wall with subtle trowel marks and grime near the bottom (v=0 is floor level). */
export function plasterSet(tint = '#6d6460', seed = 3, size = 512): SurfaceSet {
  const base = hex(tint);
  return build(`plaster|${tint}|${seed}`, size, 2.5, (u, v) => {
    const t = tfbm(seed, u * 5, v * 5, 5, 5);
    const fine = tnoise(seed + 5, u * 90, v * 90, 90);
    const grime = Math.max(0, 0.35 - v) * 1.2 * tfbm(seed + 2, u * 12, v * 3, 12, 3);
    const s = 0.9 + t * 0.15 - grime * 0.4;
    return { h: t * 0.6 + fine * 0.15, c: [base[0] * s, base[1] * s, base[2] * s], r: 0.75 + fine * 0.1 };
  });
}

/** Square ceramic tiles with grout (hospital / lab dado). tilesPerUnit tiles per UV unit. */
export function tileSet(tint = '#8fa39b', grout = '#3a3a36', tilesPerUnit = 6, seed = 5, size = 512): SurfaceSet {
  const a = hex(tint), g = hex(grout);
  return build(`tile|${tint}|${grout}|${tilesPerUnit}|${seed}`, size, 5, (u, v) => {
    const tu = u * tilesPerUnit, tv = v * tilesPerUnit;
    const fu = tu - Math.floor(tu), fv = tv - Math.floor(tv);
    const edge = Math.min(fu, 1 - fu, fv, 1 - fv);
    const isGrout = edge < 0.04;
    const bevel = Math.min(1, edge / 0.09);
    const var1 = noise2(seed, Math.floor(tu) * 3.1, Math.floor(tv) * 7.7) * 0.12;
    const dirt = tfbm(seed + 1, u * 8, v * 8, 8, 4) * 0.2;
    const c = isGrout ? g : mix(a, [a[0] * 0.8, a[1] * 0.8, a[2] * 0.8], var1 + dirt * 0.5);
    return { h: isGrout ? 0 : 0.3 + bevel * 0.7, c, r: isGrout ? 0.95 : 0.18 + dirt * 0.4 };
  });
}

/** Linoleum / vinyl floor tiles (two-tone checker, scuffed). */
export function linoleumSet(a1 = '#4b2626', a2 = '#2d1d1d', perUnit = 2, seed = 8, size = 512): SurfaceSet {
  const A = hex(a1), B = hex(a2);
  return build(`lino|${a1}|${a2}|${perUnit}`, size, 2, (u, v) => {
    const tu = Math.floor(u * perUnit), tv = Math.floor(v * perUnit);
    const fu = u * perUnit - tu, fv = v * perUnit - tv;
    const seam = Math.min(fu, 1 - fu, fv, 1 - fv) < 0.006;
    const base = (tu + tv) % 2 === 0 ? A : B;
    const speck = tnoise(seed, u * 220, v * 220, 220);
    const scuff = Math.max(0, tfbm(seed + 4, u * 10, v * 10, 10, 4) - 0.5);
    const s = 0.92 + speck * 0.12 - scuff * 0.3;
    return { h: seam ? 0 : 0.5 + speck * 0.05, c: [base[0] * s, base[1] * s, base[2] * s], r: 0.45 + scuff * 0.6 + speck * 0.08 };
  });
}

/** Wood planks / veneer with grain, rings and plank seams. */
export function woodSet(tint = '#5a3420', seed = 4, planksPerUnit = 4, size = 512): SurfaceSet {
  const base = hex(tint);
  return build(`wood|${tint}|${seed}|${planksPerUnit}`, size, 3, (u, v) => {
    const pv = v * planksPerUnit;
    const plank = Math.floor(pv);
    const seam = Math.min(pv - plank, 1 - (pv - plank)) < 0.012;
    const off = noise2(seed, plank * 9.1, 0) * 10;
    const warp = tfbm(seed + plank, u * 4, pv * 2, 4, 3) * 3;
    const rings = Math.sin((u * 18 + off + warp) * Math.PI * 2 * 0.5) * 0.5 + 0.5;
    const fine = tnoise(seed + 7, u * 300, pv * 18, 300);
    const s = 0.75 + rings * 0.25 + fine * 0.1 + noise2(seed + 3, plank, 1) * 0.15;
    return { h: rings * 0.3 + fine * 0.2 - (seam ? 0.8 : 0), c: [base[0] * s, base[1] * s, base[2] * s], r: 0.55 + fine * 0.15 - rings * 0.1 };
  });
}

/** Brushed steel: directional streaks, metallic, fine scratches. */
export function brushedSteelSet(tint = '#a7a8aa', seed = 2, size = 512): SurfaceSet {
  const base = hex(tint);
  return build(`steel|${tint}|${seed}`, size, 1.5, (u, v) => {
    const streak = tnoise(seed, u * 4, v * 400, 4) * 0.7 + tnoise(seed + 1, u * 2, v * 900, 2) * 0.3;
    const scratch = tnoise(seed + 5, u * 60 + v * 30, v * 2, 60) > 0.93 ? 1 : 0;
    const s = 0.85 + streak * 0.2;
    return { h: streak * 0.5 - scratch * 0.3, c: [base[0] * s, base[1] * s, base[2] * s], r: 0.28 + streak * 0.18 + scratch * 0.2, m: 1 };
  }, true);
}

/** Painted metal with chipped edges/rust revealing dark metal underneath. */
export function paintedMetalSet(paint = '#5d1a1d', seed = 6, size = 512): SurfaceSet {
  const p = hex(paint);
  const under: [number, number, number] = [0.22, 0.2, 0.19];
  return build(`painted|${paint}|${seed}`, size, 4, (u, v) => {
    const chips = tfbm(seed, u * 14, v * 14, 14, 5);
    const chipped = chips > 0.68;
    const orange = tfbm(seed + 3, u * 220, v * 220, 220, 2);
    const s = 0.9 + orange * 0.12;
    return chipped
      ? { h: 0.2, c: under, r: 0.45, m: 0.9 }
      : { h: 0.6 + orange * 0.08, c: [p[0] * s, p[1] * s, p[2] * s], r: 0.5 + orange * 0.12, m: 0.05 };
  }, true);
}

/** Woven fabric (lab coat, suits, curtains): weave normal + soft colour variation. */
export function fabricSet(tint = '#d6d0c6', seed = 9, weave = 160, size = 512): SurfaceSet {
  const base = hex(tint);
  return build(`fabric|${tint}|${seed}|${weave}`, size, 2.2, (u, v) => {
    const wu = Math.sin(u * weave * Math.PI * 2), wv = Math.sin(v * weave * Math.PI * 2);
    const over = (Math.floor(u * weave) + Math.floor(v * weave)) % 2 === 0 ? wu : wv;
    const mott = tfbm(seed, u * 6, v * 6, 6, 4);
    const s = 0.88 + mott * 0.14 + over * 0.03;
    return { h: over * 0.5 + mott * 0.2, c: [base[0] * s, base[1] * s, base[2] * s], r: 0.85 + mott * 0.1 };
  });
}

/** Skin: very subtle pores + blotchiness + roughness variation (use on smooth-shaded heads/hands). */
export function skinSet(tint = '#b07a63', seed = 12, size = 256): SurfaceSet {
  const base = hex(tint);
  return build(`skin|${tint}|${seed}`, size, 0.8, (u, v) => {
    const pore = tnoise(seed, u * 140, v * 140, 140);
    const blot = tfbm(seed + 2, u * 5, v * 5, 5, 4);
    const red = tfbm(seed + 8, u * 3, v * 3, 3, 3) * 0.06;
    const s = 0.93 + blot * 0.1;
    return { h: pore * 0.4, c: [base[0] * s + red, base[1] * s - red * 0.3, base[2] * s - red * 0.3], r: 0.55 + pore * 0.15 + blot * 0.1 };
  });
}

/** Wet organic tissue (stomach wall, mucosa): veins, folds, specular wetness variation. */
export function tissueSet(tint = '#9e2d2d', seed = 11, size = 512): SurfaceSet {
  const base = hex(tint);
  return build(`tissue|${tint}|${seed}`, size, 5, (u, v) => {
    const fold = tfbm(seed, u * 4, v * 4, 4, 5);
    const veinField = Math.abs(tfbm(seed + 4, u * 3, v * 3, 3, 4) - 0.5);
    const vein = veinField < 0.018 ? 1 - veinField / 0.018 : 0;
    const cells = tnoise(seed + 6, u * 60, v * 60, 60);
    const s = 0.7 + fold * 0.45;
    const c: [number, number, number] = [base[0] * s, base[1] * s * 0.9, base[2] * s * 0.9];
    const vc: [number, number, number] = [0.32, 0.03, 0.08];
    return { h: fold * 0.8 + cells * 0.15 - vein * 0.2, c: mix(c, vc, vein * 0.8), r: 0.22 + cells * 0.25 + (1 - fold) * 0.15 };
  });
}

/** Velvet / theatre curtain: vertical pile direction + sheen variation. */
export function velvetSet(tint = '#6e0710', seed = 13, size = 256): SurfaceSet {
  const base = hex(tint);
  return build(`velvet|${tint}|${seed}`, size, 1.2, (u, v) => {
    const pile = tnoise(seed, u * 180, v * 30, 180);
    const crush = tfbm(seed + 1, u * 4, v * 2, 4, 4);
    const s = 0.75 + crush * 0.4;
    return { h: pile * 0.3 + crush * 0.3, c: [base[0] * s, base[1] * s, base[2] * s], r: 0.8 + pile * 0.15 };
  });
}

/** Paper with fibres, faint ruled text lines and edge yellowing. */
export function paperSet(seed = 5, size = 256): SurfaceSet {
  return build(`paper|${seed}`, size, 0.6, (u, v) => {
    const fibre = tnoise(seed, u * 120, v * 120, 120);
    const yellow = Math.max(0, 0.08 - Math.min(u, v, 1 - u, 1 - v)) * 4;
    const line = (v * 34) % 1 > 0.62 && u > 0.08 && u < 0.92 - noise2(seed, Math.floor(v * 34), 0) * 0.4 && v > 0.08 && v < 0.9;
    const s = 0.92 + fibre * 0.06 - yellow * 0.3;
    const c: [number, number, number] = line ? [0.25, 0.24, 0.22] : [s, s * 0.97, s * 0.88];
    return { h: fibre * 0.5, c, r: 0.9 };
  });
}

/** Hair: fine directional strands (normal) with clumping and sheen-friendly roughness. Stretched along v. */
export function hairSet(tint = '#15100d', seed = 21, size = 256): SurfaceSet {
  const base = hex(tint);
  return build(`hair|${tint}|${seed}`, size, 3.5, (u, v) => {
    const strand = tnoise(seed, u * 160, v * 3, 160) * 0.7 + tnoise(seed + 1, u * 60, v * 2, 60) * 0.3;
    const clump = tfbm(seed + 2, u * 8, v * 2, 8, 3);
    const s = 0.8 + strand * 0.35 + clump * 0.15;
    return { h: strand * 0.8 + clump * 0.4, c: [base[0] * s, base[1] * s, base[2] * s], r: 0.45 + strand * 0.2 };
  });
}
