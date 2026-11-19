// Atmospheric particles + fake volumetrics. All instanced / single-draw and deterministic.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { fbm1, rng, envelope } from '../core/math';
import { useAssetTime } from '../core/time';
import { radialGradientTexture } from '../textures/proceduralTextures';

type V3 = [number, number, number];

/** Floating dust motes in a box volume: soft round additive point sprites (read as bokeh when close to the
 *  lens, never as hard geometric chips). Deterministic drift. */
export function DustMotes({ count = 400, bounds = [20, 8, 20] as V3, color = '#ff6a5a', size = 0.014, drift = 0.15, seed = 12, position, frame, opacity = 0.55 }: {
  count?: number; bounds?: V3; color?: string; size?: number; drift?: number; seed?: number; position?: V3; frame?: number; opacity?: number;
}) {
  const { t } = useAssetTime(frame);
  const items = useMemo(() => { const r = rng(seed); return Array.from({ length: count }, () => ({ p: [(r() - 0.5) * bounds[0], r() * bounds[1], (r() - 0.5) * bounds[2]] as V3, ph: r() * 100 })); }, [count, bounds, seed]);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); return g; }, [count]);
  const mat = useMemo(() => new THREE.PointsMaterial({ color, size: size * 2.6, map: radialGradientTexture(), alphaMap: radialGradientTexture(), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false }), [color, size, opacity]);
  useLayoutEffect(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    items.forEach((it, i) => {
      pos.setXYZ(i, it.p[0] + fbm1(i, t * 0.1 + it.ph) * drift * 6, ((it.p[1] + t * drift * 0.3) % bounds[1]), it.p[2] + fbm1(i + 500, t * 0.1 + it.ph) * drift * 6);
    });
    pos.needsUpdate = true;
    geo.computeBoundingSphere();
  }, [items, t, drift, bounds, geo]);
  return <group position={position}><points geometry={geo} material={mat} frustumCulled={false} /></group>;
}

/** Rising embers / sparks (triumph or destruction beats). */
export function Embers({ count = 150, radius = 4, height = 8, color = '#ffb347', seed = 21, position, frame, start = 0, end = 1e9 }: {
  count?: number; radius?: number; height?: number; color?: string; seed?: number; position?: V3; frame?: number; start?: number; end?: number;
}) {
  const { frame: f } = useAssetTime(frame);
  const vis = envelope(f, start, end, 20, 20);
  return vis > 0 ? <DustMotes count={count} bounds={[radius * 2, height, radius * 2]} color={color} size={0.05} drift={0.6} seed={seed} position={position} frame={frame} opacity={0.9 * vis} /> : null;
}

const shaftMaterials = new Map<string, THREE.MeshBasicMaterial>();
/** Fake volumetric light shaft: open cone with additive radial falloff. Points down local -Y from its origin. */
export function LightShaft({ length = 10, radius = 2.5, color = '#ff2a2a', intensity = 0.18, position, rotation }: {
  length?: number; radius?: number; color?: string; intensity?: number; position?: V3; rotation?: V3;
}) {
  const key = `${color}|${intensity}`;
  let mat = shaftMaterials.get(key);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: intensity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, alphaMap: radialGradientTexture(), toneMapped: false });
    shaftMaterials.set(key, mat);
  }
  const geo = useMemo(() => new THREE.ConeGeometry(radius, length, 24, 1, true), [radius, length]);
  return <mesh geometry={geo} material={mat} position={position} rotation={rotation} />;
}

/** Stack of soft additive haze sheets — cheap atmospheric depth inside a zone. */
export function HazeVolume({ size = [30, 30] as [number, number], layers = 5, height = 6, color = '#7a0a12', opacity = 0.05, position }: {
  size?: [number, number]; layers?: number; height?: number; color?: string; opacity?: number; position?: V3;
}) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, alphaMap: radialGradientTexture(), side: THREE.DoubleSide, toneMapped: false }), [color, opacity]);
  const geo = useMemo(() => new THREE.PlaneGeometry(size[0], size[1]), [size]);
  return (
    <group position={position}>
      {Array.from({ length: layers }, (_, i) => <mesh key={i} geometry={geo} material={mat} position={[0, (i + 0.5) * (height / layers), 0]} rotation={[-Math.PI / 2, 0, 0]} />)}
    </group>
  );
}

/** Particle veil: a dense wall of particles the camera passes through (particle transition). */
export function ParticleVeil({ width = 12, height = 8, depth = 3, count = 1200, color = '#ff3344', seed = 33, position, rotation, frame }: {
  width?: number; height?: number; depth?: number; count?: number; color?: string; seed?: number; position?: V3; rotation?: V3; frame?: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      <DustMotes count={count} bounds={[width, height, depth]} color={color} size={0.03} drift={0.25} seed={seed} frame={frame} opacity={0.75} />
    </group>
  );
}
