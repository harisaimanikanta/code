// Material preset library. Shared, cached materials — never create ad-hoc materials in scenes
// when a preset fits. Extend with `getMaterial(id, overrides)` (overrides produce a separate cached clone).
import * as THREE from 'three';
import { brushedMetalTexture, concreteRoughness, concreteTexture, paperTexture, tissueTexture } from '../textures/proceduralTextures';

/** Studio palette (see references/visual-identity.md). */
export const PALETTE = {
  crimson: '#b3121f',
  blood: '#7a0a12',
  burgundy: '#4a0d17',
  charcoal: '#0c0b0c',
  black: '#050405',
  concrete: '#8a8580',
  concreteDark: '#4a4744',
  industrial: '#3b3a36',
  toxic: '#a8d63a',
  toxicDeep: '#4f7a12',
  gold: '#d9a441',
  goldDeep: '#8a5a12',
  bone: '#d8cfc2',
  white: '#f2ede6',
} as const;

export type MaterialPresetId =
  | 'concrete-rough' | 'concrete-dark' | 'concrete-red'
  | 'metal-painted' | 'metal-brushed' | 'metal-dark'
  | 'glass' | 'glass-tinted-red'
  | 'bio-translucent' | 'mucus' | 'flesh-wall' | 'bacteria-toxic'
  | 'matte-black' | 'red-dark' | 'red-lacquer'
  | 'emissive-red' | 'emissive-toxic' | 'emissive-gold' | 'emissive-white'
  | 'gold-metal' | 'fabric-labcoat' | 'fabric-suit-dark' | 'fabric-suit-burgundy'
  | 'skin-stylized' | 'skin-stylized-aged' | 'hair-dark' | 'hair-grey' | 'paper';

type Spec = { kind: 'standard' | 'physical'; params: THREE.MeshPhysicalMaterialParameters; textures?: () => Partial<THREE.MeshStandardMaterialParameters> };

export const MATERIAL_PRESETS: Record<MaterialPresetId, Spec> = {
  'concrete-rough': { kind: 'standard', params: { color: PALETTE.concrete, roughness: 0.95, metalness: 0, flatShading: true }, textures: () => ({ map: concreteTexture(7), roughnessMap: concreteRoughness(7) }) },
  'concrete-dark': { kind: 'standard', params: { color: PALETTE.concreteDark, roughness: 0.97, metalness: 0, flatShading: true }, textures: () => ({ map: concreteTexture(19), roughnessMap: concreteRoughness(19) }) },
  'concrete-red': { kind: 'standard', params: { color: '#7d3a36', roughness: 0.93, metalness: 0, flatShading: true }, textures: () => ({ map: concreteTexture(23) }) },
  'metal-painted': { kind: 'standard', params: { color: '#5b1a1e', roughness: 0.55, metalness: 0.35, flatShading: true } },
  'metal-brushed': { kind: 'standard', params: { color: '#9a9690', roughness: 0.35, metalness: 0.85 }, textures: () => ({ map: brushedMetalTexture(3) }) },
  'metal-dark': { kind: 'standard', params: { color: '#1d1c1d', roughness: 0.4, metalness: 0.8 } },
  glass: { kind: 'physical', params: { color: '#d9e2e6', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1, depthWrite: false } },
  'glass-tinted-red': { kind: 'physical', params: { color: '#c0303a', roughness: 0.08, transparent: true, opacity: 0.3, clearcoat: 1, depthWrite: false } },
  'bio-translucent': { kind: 'physical', params: { color: '#c45a4a', roughness: 0.45, transparent: true, opacity: 0.55, sheen: 1, sheenColor: '#ff8a7a', depthWrite: false, side: THREE.DoubleSide } },
  mucus: { kind: 'physical', params: { color: '#d7d79a', roughness: 0.15, transparent: true, opacity: 0.32, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide } },
  'flesh-wall': { kind: 'standard', params: { color: '#9c2b2b', roughness: 0.6, metalness: 0, side: THREE.DoubleSide }, textures: () => ({ map: tissueTexture(11) }) },
  'bacteria-toxic': { kind: 'standard', params: { color: PALETTE.toxicDeep, emissive: PALETTE.toxic, emissiveIntensity: 0.55, roughness: 0.4, flatShading: true } },
  'matte-black': { kind: 'standard', params: { color: PALETTE.charcoal, roughness: 1, metalness: 0 } },
  'red-dark': { kind: 'standard', params: { color: PALETTE.blood, roughness: 0.8, flatShading: true } },
  'red-lacquer': { kind: 'standard', params: { color: PALETTE.crimson, roughness: 0.3, metalness: 0.1 } },
  'emissive-red': { kind: 'standard', params: { color: '#2a0004', emissive: '#ff1a2a', emissiveIntensity: 2.2, roughness: 1, toneMapped: false } },
  'emissive-toxic': { kind: 'standard', params: { color: '#102000', emissive: PALETTE.toxic, emissiveIntensity: 1.8, roughness: 1, toneMapped: false } },
  'emissive-gold': { kind: 'standard', params: { color: '#2a1800', emissive: '#ffbf4d', emissiveIntensity: 2, roughness: 1, toneMapped: false } },
  'emissive-white': { kind: 'standard', params: { color: '#202020', emissive: '#fff1e0', emissiveIntensity: 2, roughness: 1, toneMapped: false } },
  'gold-metal': { kind: 'standard', params: { color: PALETTE.gold, roughness: 0.25, metalness: 1, flatShading: true } },
  'fabric-labcoat': { kind: 'standard', params: { color: '#cfc8bd', roughness: 0.9, flatShading: true } },
  'fabric-suit-dark': { kind: 'standard', params: { color: '#1a1819', roughness: 0.85, flatShading: true } },
  'fabric-suit-burgundy': { kind: 'standard', params: { color: PALETTE.burgundy, roughness: 0.85, flatShading: true } },
  'skin-stylized': { kind: 'standard', params: { color: '#a8735c', roughness: 0.75, flatShading: true } },
  'skin-stylized-aged': { kind: 'standard', params: { color: '#9b6d5c', roughness: 0.85, flatShading: true } },
  'hair-dark': { kind: 'standard', params: { color: '#16110f', roughness: 0.9, flatShading: true } },
  'hair-grey': { kind: 'standard', params: { color: '#8f8a85', roughness: 0.9, flatShading: true } },
  paper: { kind: 'standard', params: { color: '#e9e2d4', roughness: 0.95, side: THREE.DoubleSide }, textures: () => ({ map: paperTexture(5) }) },
};

const cache = new Map<string, THREE.Material>();

/** Get a shared material instance. Overrides create a distinct cached variant. */
export function getMaterial(id: MaterialPresetId, overrides?: THREE.MeshPhysicalMaterialParameters): THREE.MeshStandardMaterial {
  const key = overrides ? `${id}|${JSON.stringify(overrides)}` : id;
  const hit = cache.get(key);
  if (hit) return hit as THREE.MeshStandardMaterial;
  const spec = MATERIAL_PRESETS[id];
  if (!spec) throw new Error(`Unknown material preset "${id}"`);
  const params = { ...spec.params, ...(spec.textures ? spec.textures() : {}), ...(overrides ?? {}) };
  const mat = spec.kind === 'physical' ? new THREE.MeshPhysicalMaterial(params) : new THREE.MeshStandardMaterial(params as THREE.MeshStandardMaterialParameters);
  mat.name = key;
  cache.set(key, mat);
  return mat as THREE.MeshStandardMaterial;
}

/** Linear blend between two preset colors — for material-transformation transitions. */
export function blendedMaterial(a: MaterialPresetId, b: MaterialPresetId, t: number, cacheSteps = 24): THREE.MeshStandardMaterial {
  const step = Math.round(Math.max(0, Math.min(1, t)) * cacheSteps);
  const key = `blend|${a}|${b}|${step}`;
  const hit = cache.get(key);
  if (hit) return hit as THREE.MeshStandardMaterial;
  const ma = getMaterial(a);
  const mb = getMaterial(b);
  const k = step / cacheSteps;
  const m = ma.clone();
  m.color = ma.color.clone().lerp(mb.color, k);
  m.emissive = ma.emissive.clone().lerp(mb.emissive, k);
  m.emissiveIntensity = ma.emissiveIntensity + (mb.emissiveIntensity - ma.emissiveIntensity) * k;
  m.roughness = ma.roughness + (mb.roughness - ma.roughness) * k;
  m.metalness = ma.metalness + (mb.metalness - ma.metalness) * k;
  m.map = k < 0.5 ? ma.map : mb.map;
  m.name = key;
  cache.set(key, m);
  return m;
}
