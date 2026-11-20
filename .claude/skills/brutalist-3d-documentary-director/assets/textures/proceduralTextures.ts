// Procedural, deterministic textures (no image files required).
// Generated once per (kind, seed, size) and cached.
import * as THREE from 'three';
import { noise2, rng } from '../core/math';

const cache = new Map<string, THREE.DataTexture>();

function make(key: string, size: number, fill: (x: number, y: number) => [number, number, number], srgb: boolean, repeat = 1): THREE.DataTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = fill(x / size, y / size);
      const i = (y * size + x) * 4;
      data[i] = Math.max(0, Math.min(255, r * 255));
      data[i + 1] = Math.max(0, Math.min(255, g * 255));
      data[i + 2] = Math.max(0, Math.min(255, b * 255));
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

const fbm2 = (seed: number, x: number, y: number, oct = 4) => {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) { s += noise2(seed + o * 31, x * f, y * f) * a; n += a; a *= 0.5; f *= 2.1; }
  return s / n;
};

/** Board-formed concrete: grain + horizontal formwork seams + pores. Returns a grey value map. */
export function concreteTexture(seed = 7, size = 256, boards = 6): THREE.DataTexture {
  const r = rng(seed);
  const pores: Array<[number, number, number]> = Array.from({ length: 140 }, () => [r(), r(), 0.002 + r() * 0.006]);
  return make(`concrete-${seed}-${size}-${boards}`, size, (u, v) => {
    let g = 0.55 + (fbm2(seed, u * 8, v * 8) - 0.5) * 0.35 + (noise2(seed + 9, u * 64, v * 64) - 0.5) * 0.12;
    const seam = Math.abs(((v * boards) % 1) - 0.5);
    if (seam > 0.485) g *= 0.72;
    const boardTone = noise2(seed + 3, 0, Math.floor(v * boards) * 3.7) * 0.12;
    g += boardTone - 0.06;
    for (const [px, py, pr] of pores) {
      const dx = u - px, dy = v - py;
      if (dx * dx + dy * dy < pr * pr) g *= 0.45;
    }
    return [g, g, g];
  }, true);
}

/** Roughness map companion for concrete (bright = rough). */
export function concreteRoughness(seed = 7, size = 128): THREE.DataTexture {
  return make(`concrete-rough-${seed}-${size}`, size, (u, v) => {
    const g = 0.75 + (fbm2(seed + 50, u * 10, v * 10) - 0.5) * 0.4;
    return [g, g, g];
  }, false);
}

/** Brushed metal streaks. */
export function brushedMetalTexture(seed = 3, size = 128): THREE.DataTexture {
  return make(`brushed-${seed}-${size}`, size, (u, v) => {
    const g = 0.6 + (noise2(seed, u * 2, v * 180) - 0.5) * 0.35;
    return [g, g, g];
  }, true);
}

/** Organic tissue: veined, mottled red. Used by stomach lining / tunnels. */
export function tissueTexture(seed = 11, size = 256): THREE.DataTexture {
  return make(`tissue-${seed}-${size}`, size, (u, v) => {
    const n = fbm2(seed, u * 6, v * 6, 5);
    const vein = Math.abs(fbm2(seed + 4, u * 3, v * 3) - 0.5) < 0.02 ? 0.55 : 1;
    const r = (0.55 + n * 0.45) * vein;
    return [r, r * 0.22, r * 0.2];
  }, true);
}

/** Paper with faint text lines (for documents / journals). */
export function paperTexture(seed = 5, size = 128, lines = 18): THREE.DataTexture {
  const r = rng(seed);
  const lens = Array.from({ length: lines }, () => 0.45 + r() * 0.45);
  return make(`paper-${seed}-${size}-${lines}`, size, (u, v) => {
    let g = 0.86 + (noise2(seed, u * 30, v * 30) - 0.5) * 0.05;
    const li = Math.floor(v * (lines + 4)) - 2;
    const inLine = ((v * (lines + 4)) % 1) > 0.55;
    if (li >= 0 && li < lines && inLine && u > 0.1 && u < 0.1 + lens[li] * 0.8) g = 0.35;
    return [g, g * 0.97, g * 0.9];
  }, true);
}

/** Radial falloff gradient (white center → black edge). Used for light shafts, glows, haze. */
export function radialGradientTexture(size = 128): THREE.DataTexture {
  return make(`radial-${size}`, size, (u, v) => {
    const d = Math.hypot(u - 0.5, v - 0.5) * 2;
    const g = Math.pow(Math.max(0, 1 - d), 2);
    return [g, g, g];
  }, false);
}
