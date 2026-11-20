// Material preset library (v2: PBR with procedural albedo/normal/roughness sets). Shared, cached materials — never create ad-hoc materials in scenes
// when a preset fits. Extend with `getMaterial(id, overrides)` (overrides produce a separate cached clone).
import * as THREE from 'three';
import { brushedSteelSet, hairSet, concreteSet, fabricSet, linoleumSet, paintedMetalSet, paperSet, plasterSet, skinSet, tileSet, tissueSet, velvetSet, woodSet, type SurfaceSet } from '../textures/surfaceSets';

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
  | 'concrete-rough' | 'concrete-dark' | 'concrete-red' | 'concrete-light'
  | 'metal-painted' | 'metal-brushed' | 'metal-dark' | 'chrome' | 'brass' | 'metal-cream'
  | 'glass' | 'glass-tinted-red' | 'glass-amber' | 'glass-green'
  | 'bio-translucent' | 'mucus' | 'flesh-wall' | 'tissue-wet' | 'tissue-inflamed' | 'bacteria-toxic'
  | 'matte-black' | 'red-dark' | 'red-lacquer' | 'rubber-black' | 'plastic-cream' | 'plastic-white'
  | 'emissive-red' | 'emissive-toxic' | 'emissive-gold' | 'emissive-white' | 'emissive-cool' | 'emissive-screen'
  | 'gold-metal' | 'fabric-labcoat' | 'fabric-suit-dark' | 'fabric-suit-burgundy' | 'fabric-shirt' | 'fabric-tux' | 'fabric-gown' | 'fabric-wool'
  | 'velvet-red' | 'leather-dark'
  | 'skin-stylized' | 'skin-stylized-aged' | 'skin-light' | 'skin-dark' | 'hair-dark' | 'hair-grey' | 'hair-brown' | 'eye-white' | 'eye-iris' | 'lips'
  | 'paper' | 'wood-dark' | 'wood-oak' | 'wood-floor' | 'tile-hospital' | 'tile-white' | 'linoleum' | 'plaster-wall' | 'plaster-red'
  | 'pig-skin' | 'straw' | 'liquid-green-glow' | 'liquid-red';

type Spec = { kind: 'standard' | 'physical'; params: THREE.MeshPhysicalMaterialParameters; textures?: () => Partial<THREE.MeshPhysicalMaterialParameters> };

/** Fabric/skin sets are applied to lathe/capsule UVs (0..1 around a whole body part) → tile them densely. */
const R = (set: SurfaceSet, repeat: number): SurfaceSet => {
  for (const t of [set.map, set.normalMap, set.roughnessMap]) t.repeat.set(repeat, repeat);
  return set;
};
const S = (set: SurfaceSet, normal = 1): Partial<THREE.MeshPhysicalMaterialParameters> => ({
  map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap, normalScale: new THREE.Vector2(normal, normal),
  ...(set.metalnessMap ? { metalnessMap: set.metalnessMap } : {}),
});

// Values are PBR-plausible: dielectrics roughness 0.35–0.95, metals metalness 1 with roughness from maps.
// Colours on textured materials are multipliers (white = texture colour).
export const MATERIAL_PRESETS: Record<MaterialPresetId, Spec> = {
  'concrete-rough': { kind: 'standard', params: { color: '#ffffff', roughness: 1, metalness: 0, envMapIntensity: 0.35 }, textures: () => S(concreteSet('#8c8782', 7), 0.8) },
  'concrete-dark': { kind: 'standard', params: { color: '#ffffff', roughness: 1, metalness: 0, envMapIntensity: 0.3 }, textures: () => S(concreteSet('#57534f', 19), 0.8) },
  'concrete-red': { kind: 'standard', params: { color: '#ffffff', roughness: 1, metalness: 0, envMapIntensity: 0.3 }, textures: () => S(concreteSet('#7d4a44', 23), 0.8) },
  'concrete-light': { kind: 'standard', params: { color: '#ffffff', roughness: 1, metalness: 0, envMapIntensity: 0.35 }, textures: () => S(concreteSet('#a8a39c', 29), 0.7) },
  'metal-painted': { kind: 'standard', params: { color: '#ffffff', roughness: 1, metalness: 1, envMapIntensity: 0.7 }, textures: () => S(paintedMetalSet('#5d1a1d', 6), 0.6) },
  'metal-cream': { kind: 'standard', params: { color: '#ffffff', roughness: 1, metalness: 1, envMapIntensity: 0.7 }, textures: () => S(paintedMetalSet('#c9bfa8', 16), 0.5) },
  'metal-brushed': { kind: 'standard', params: { color: '#ffffff', roughness: 1, metalness: 1, envMapIntensity: 1 }, textures: () => S(brushedSteelSet('#a7a8aa', 2), 0.4) },
  'metal-dark': { kind: 'standard', params: { color: '#2a2829', roughness: 0.38, metalness: 0.9, envMapIntensity: 0.9 } },
  chrome: { kind: 'standard', params: { color: '#d8d8da', roughness: 0.12, metalness: 1, envMapIntensity: 1.2 } },
  brass: { kind: 'standard', params: { color: '#b08840', roughness: 0.3, metalness: 1, envMapIntensity: 1.1 } },
  glass: { kind: 'physical', params: { color: '#dfe8ea', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, ior: 1.5, envMapIntensity: 1.6, depthWrite: false } },
  'glass-tinted-red': { kind: 'physical', params: { color: '#c0303a', roughness: 0.06, transparent: true, opacity: 0.32, clearcoat: 1, envMapIntensity: 1.4, depthWrite: false } },
  'glass-amber': { kind: 'physical', params: { color: '#8a4d10', roughness: 0.08, transparent: true, opacity: 0.7, clearcoat: 1, envMapIntensity: 1.3, depthWrite: false } },
  'glass-green': { kind: 'physical', params: { color: '#3d6a3a', roughness: 0.08, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 1.3, depthWrite: false } },
  'bio-translucent': { kind: 'physical', params: { color: '#c45a4a', roughness: 0.4, transparent: true, opacity: 0.6, sheen: 1, sheenColor: '#ff8a7a', clearcoat: 0.6, depthWrite: false, side: THREE.DoubleSide } },
  mucus: { kind: 'physical', params: { color: '#d8d49a', roughness: 0.1, transparent: true, opacity: 0.28, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.2 } },
  'flesh-wall': { kind: 'physical', params: { color: '#ffffff', roughness: 1, clearcoat: 0.8, clearcoatRoughness: 0.25, sheen: 0.5, sheenColor: '#ff6a5a', side: THREE.DoubleSide }, textures: () => S(tissueSet('#9e2d2d', 11), 1) },
  'tissue-wet': { kind: 'physical', params: { color: '#ffffff', roughness: 1, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.6, sheenColor: '#ff7a6a', envMapIntensity: 1.1, side: THREE.DoubleSide }, textures: () => S(R(tissueSet('#b8473f', 21), 8), 1.6) },
  'tissue-inflamed': { kind: 'physical', params: { color: '#ffffff', roughness: 1, clearcoat: 1, clearcoatRoughness: 0.15, emissive: '#5a0306', emissiveIntensity: 0.35, sheen: 0.6, sheenColor: '#ff4a3a', side: THREE.DoubleSide }, textures: () => S(R(tissueSet('#c2302a', 31), 8), 1.8) },
  'bacteria-toxic': { kind: 'physical', params: { color: '#5e8a1a', emissive: '#a8e03a', emissiveIntensity: 0.9, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 1, sheenColor: '#e0ff9a' } },
  'matte-black': { kind: 'standard', params: { color: '#0d0c0d', roughness: 0.92, metalness: 0 } },
  'red-dark': { kind: 'standard', params: { color: PALETTE.blood, roughness: 0.7 } },
  'red-lacquer': { kind: 'physical', params: { color: PALETTE.crimson, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 } },
  'rubber-black': { kind: 'standard', params: { color: '#151414', roughness: 0.8, metalness: 0 } },
  'plastic-cream': { kind: 'physical', params: { color: '#cfc4a8', roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.4 } },
  'plastic-white': { kind: 'physical', params: { color: '#e4e2dc', roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 } },
  'emissive-red': { kind: 'standard', params: { color: '#2a0004', emissive: '#ff1a2a', emissiveIntensity: 3, roughness: 1, toneMapped: false } },
  'emissive-toxic': { kind: 'standard', params: { color: '#102000', emissive: PALETTE.toxic, emissiveIntensity: 2.4, roughness: 1, toneMapped: false } },
  'emissive-gold': { kind: 'standard', params: { color: '#2a1800', emissive: '#ffbf4d', emissiveIntensity: 2.6, roughness: 1, toneMapped: false } },
  'emissive-white': { kind: 'standard', params: { color: '#202020', emissive: '#fff1e0', emissiveIntensity: 2.6, roughness: 1, toneMapped: false } },
  'emissive-cool': { kind: 'standard', params: { color: '#101418', emissive: '#d8ecff', emissiveIntensity: 2.4, roughness: 1, toneMapped: false } },
  'emissive-screen': { kind: 'standard', params: { color: '#050505', emissive: '#ffffff', emissiveIntensity: 1.2, roughness: 0.2, toneMapped: false } },
  'gold-metal': { kind: 'physical', params: { color: '#e0a948', roughness: 0.22, metalness: 1, clearcoat: 0.4, envMapIntensity: 1.5 } },
  'fabric-labcoat': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.4, sheenColor: '#ffffff', sheenRoughness: 0.8 }, textures: () => S(R(fabricSet('#ddd8cf', 9, 96), 7), 0.18) },
  'fabric-suit-dark': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.5, sheenColor: '#6a6a7a', sheenRoughness: 0.6 }, textures: () => S(R(fabricSet('#2a2a30', 14, 96), 7), 0.18) },
  'fabric-suit-burgundy': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.5, sheenColor: '#a04050' }, textures: () => S(R(fabricSet('#4f141c', 15, 96), 7), 0.18) },
  'fabric-shirt': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.3, sheenColor: '#ffffff' }, textures: () => S(R(fabricSet('#c9cdd3', 17, 96), 7), 0.18) },
  'fabric-tux': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.7, sheenColor: '#55556a', sheenRoughness: 0.4 }, textures: () => S(R(fabricSet('#111114', 18, 96), 7), 0.18) },
  'fabric-gown': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.3, sheenColor: '#ffffff' }, textures: () => S(R(fabricSet('#9fb4b6', 19, 96), 7), 0.18) },
  'fabric-wool': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.8, sheenColor: '#aa8877', sheenRoughness: 0.9 }, textures: () => S(R(fabricSet('#4a3a33', 20, 96), 7), 0.18) },
  'velvet-red': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 1, sheenColor: '#ff3a3a', sheenRoughness: 0.5, side: THREE.DoubleSide }, textures: () => S(velvetSet('#6e0710', 13), 0.8) },
  'leather-dark': { kind: 'physical', params: { color: '#2a1a14', roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.5 } },
  'skin-stylized': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.35, sheenColor: '#ffb8a0', sheenRoughness: 0.6 }, textures: () => S(R(skinSet('#b07a63', 12), 3), 0.25) },
  'skin-stylized-aged': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.25, sheenColor: '#e0a090' }, textures: () => S(R(skinSet('#a3735f', 22), 3), 0.25) },
  'skin-light': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.35, sheenColor: '#ffc0aa' }, textures: () => S(R(skinSet('#c9927a', 32), 3), 0.25) },
  'skin-dark': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.4, sheenColor: '#a87060' }, textures: () => S(R(skinSet('#6a4232', 42), 3), 0.25) },
  'hair-dark': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 1, sheenColor: '#6a5040', sheenRoughness: 0.3 }, textures: () => S(R(hairSet('#1a130f', 21), 4), 0.9) },
  'hair-grey': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 1, sheenColor: '#ffffff', sheenRoughness: 0.35 }, textures: () => S(R(hairSet('#9a958f', 23), 4), 0.9) },
  'hair-brown': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 1, sheenColor: '#8a6040', sheenRoughness: 0.3 }, textures: () => S(R(hairSet('#3a2416', 25), 4), 0.9) },
  'eye-white': { kind: 'physical', params: { color: '#d8d2c8', roughness: 0.15, clearcoat: 1 } },
  'eye-iris': { kind: 'physical', params: { color: '#2a1a12', roughness: 0.1, clearcoat: 1 } },
  lips: { kind: 'physical', params: { color: '#8a4a42', roughness: 0.5, sheen: 0.3, sheenColor: '#ff9a8a' } },
  paper: { kind: 'standard', params: { color: '#ffffff', roughness: 1, side: THREE.DoubleSide }, textures: () => S(paperSet(5), 0.3) },
  'wood-dark': { kind: 'physical', params: { color: '#ffffff', roughness: 1, clearcoat: 0.35, clearcoatRoughness: 0.35 }, textures: () => S(woodSet('#3b2216', 4), 0.6) },
  'wood-oak': { kind: 'physical', params: { color: '#ffffff', roughness: 1, clearcoat: 0.3, clearcoatRoughness: 0.4 }, textures: () => S(woodSet('#7a5434', 24), 0.6) },
  'wood-floor': { kind: 'physical', params: { color: '#ffffff', roughness: 1, clearcoat: 0.5, clearcoatRoughness: 0.3 }, textures: () => S(woodSet('#4a2c1c', 34, 6), 0.7) },
  'tile-hospital': { kind: 'physical', params: { color: '#ffffff', roughness: 1, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 0.9 }, textures: () => S(tileSet('#8fa39b', '#3a3a36', 13), 1) },
  'tile-white': { kind: 'physical', params: { color: '#ffffff', roughness: 1, clearcoat: 0.5, clearcoatRoughness: 0.15, envMapIntensity: 0.9 }, textures: () => S(tileSet('#b9b5ab', '#5a5853', 16, 15), 1) },
  linoleum: { kind: 'physical', params: { color: '#ffffff', roughness: 1, clearcoat: 0.3, clearcoatRoughness: 0.3 }, textures: () => S(linoleumSet('#4b2626', '#2a1c1c'), 0.5) },
  'plaster-wall': { kind: 'standard', params: { color: '#ffffff', roughness: 1 }, textures: () => S(plasterSet('#6d6460', 3), 0.6) },
  'plaster-red': { kind: 'standard', params: { color: '#ffffff', roughness: 1 }, textures: () => S(plasterSet('#5a1c1e', 33), 0.6) },
  'pig-skin': { kind: 'physical', params: { color: '#ffffff', roughness: 1, sheen: 0.6, sheenColor: '#ffc8c0', sheenRoughness: 0.5 }, textures: () => S(R(skinSet('#d9a09a', 52), 3), 0.25) },
  straw: { kind: 'standard', params: { color: '#ffffff', roughness: 1 }, textures: () => S(woodSet('#a88a48', 61, 40), 1.5) },
  'liquid-green-glow': { kind: 'physical', params: { color: '#2a4a08', emissive: '#a8e03a', emissiveIntensity: 1.4, roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1, toneMapped: false } },
  'liquid-red': { kind: 'physical', params: { color: '#5a0a10', roughness: 0.05, transparent: true, opacity: 0.88, clearcoat: 1, envMapIntensity: 1.3 } },
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
  m.normalMap = k < 0.5 ? ma.normalMap : mb.normalMap;
  m.roughnessMap = k < 0.5 ? ma.roughnessMap : mb.roughnessMap;
  m.name = key;
  cache.set(key, m);
  return m;
}
