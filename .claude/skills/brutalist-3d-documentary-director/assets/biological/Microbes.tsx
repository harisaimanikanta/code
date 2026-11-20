// Microorganisms (stylized, scale-free: 1 unit ≈ 1 µm at "microscopic" world scale, rendered ~1 m long).
// SpiralBacterium: helical body + polar flagella (H. pylori-like morphology, generic).
// RodBacterium: bacillus capsule. MicrobeSwarm: instanced population with drift/corkscrew motion.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getMaterial, type MaterialPresetId } from '../materials/materials';
import { fbm1, rng } from '../core/math';
import { useAssetTime } from '../core/time';

type V3 = [number, number, number];

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private turns: number, private radius: number, private length: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.radius, (t - 0.5) * this.length, Math.sin(a) * this.radius);
  }
}

class Wave extends THREE.Curve<THREE.Vector3> {
  constructor(private len: number, private amp: number, private waves: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) {
    return target.set(Math.sin(t * this.waves * Math.PI * 2) * this.amp * t, -t * this.len, Math.cos(t * this.waves * Math.PI * 2) * this.amp * t * 0.6);
  }
}

const geoCache = new Map<string, THREE.BufferGeometry>();
const cached = (k: string, make: () => THREE.BufferGeometry) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };

export function spiralBodyGeometry(turns = 2.5, radius = 0.12, length = 1, thickness = 0.07) {
  return cached(`helix-${turns}-${radius}-${length}-${thickness}`, () => new THREE.TubeGeometry(new Helix(turns, radius, length), 64, thickness, 7, false));
}
const flagellumGeometry = (len = 0.7) => cached(`flag-${len}`, () => new THREE.TubeGeometry(new Wave(len, 0.06, 2.5), 32, 0.008, 4, false));

/** Single spiral bacterium. Long axis = local Y. Rotates around its axis (corkscrew) and wiggles flagella. */
export function SpiralBacterium({ length = 1, turns = 2.5, flagella = 4, spin = 2.5, material = 'bacteria-toxic' as MaterialPresetId, position, rotation, scale = 1, frame, seed = 1 }: {
  length?: number; turns?: number; flagella?: number; spin?: number; material?: MaterialPresetId; position?: V3; rotation?: V3; scale?: number; frame?: number; seed?: number;
}) {
  const { t } = useAssetTime(frame);
  const body = spiralBodyGeometry(turns, 0.12 * length, length, 0.07 * length);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group rotation={[0, t * spin + seed, 0]}>
        <mesh geometry={body} material={getMaterial(material)} castShadow />
        {Array.from({ length: flagella }, (_, i) => (
          <mesh key={i} geometry={flagellumGeometry(0.7 * length)} material={getMaterial(material)} position={[0.12 * length, -length / 2, 0]} rotation={[0.25 * Math.sin(t * 6 + i), (i / flagella) * Math.PI * 2, 0.2 * Math.cos(t * 5 + i * 2)]} />
        ))}
      </group>
    </group>
  );
}

const capsule = (len: number, r: number) => cached(`caps-${len}-${r}`, () => new THREE.CapsuleGeometry(r, len, 4, 8));

/** Rod-shaped bacterium (bacillus). Long axis = local Y. */
export function RodBacterium({ length = 1, radius = 0.18, material = 'bacteria-toxic' as MaterialPresetId, position, rotation, scale = 1, frame, seed = 0 }: {
  length?: number; radius?: number; material?: MaterialPresetId; position?: V3; rotation?: V3; scale?: number; frame?: number; seed?: number;
}) {
  const { t } = useAssetTime(frame);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={capsule(length, radius)} material={getMaterial(material)} rotation={[fbm1(seed, t * 0.3) * 0.2, 0, fbm1(seed + 5, t * 0.3) * 0.2]} castShadow />
    </group>
  );
}

/** Instanced swarm of microbes inside a box volume. kind: spiral | rod | coccus. Deterministic drift + corkscrew. */
export function MicrobeSwarm({ count = 200, kind = 'spiral' as 'spiral' | 'rod' | 'coccus', bounds = [12, 6, 12] as V3, size = 0.6, speed = 0.4, seed = 3, material = 'bacteria-toxic' as MaterialPresetId, position, rotation, frame, flow = [0, 0, -1] as V3, appear = 0 }: {
  count?: number; kind?: 'spiral' | 'rod' | 'coccus'; bounds?: V3; size?: number; speed?: number; seed?: number; material?: MaterialPresetId; position?: V3; rotation?: V3; frame?: number; flow?: V3; appear?: number;
}) {
  const { t, frame: f } = useAssetTime(frame);
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => (kind === 'spiral' ? spiralBodyGeometry(2.5, 0.12, 1, 0.08) : kind === 'rod' ? capsule(0.8, 0.2) : cached('coccus', () => new THREE.IcosahedronGeometry(0.35, 1))), [kind]);
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({ p: [(r() - 0.5) * bounds[0], (r() - 0.5) * bounds[1], (r() - 0.5) * bounds[2]] as V3, ax: r() * Math.PI, ay: r() * Math.PI * 2, s: size * (0.7 + r() * 0.6), ph: r() * 50, v: 0.6 + r() * 0.8 }));
  }, [count, bounds, size, seed]);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
    const vis = Math.min(1, Math.max(0, (f - appear) / 20));
    items.forEach((it, i) => {
      const wrap = (v: number, b: number) => ((((v + b / 2) % b) + b) % b) - b / 2;
      const x = wrap(it.p[0] + flow[0] * t * speed * it.v + fbm1(i, t * 0.2 + it.ph) * 0.8, bounds[0]);
      const y = wrap(it.p[1] + flow[1] * t * speed * it.v + fbm1(i + 99, t * 0.2 + it.ph) * 0.5, bounds[1]);
      const z = wrap(it.p[2] + flow[2] * t * speed * it.v + fbm1(i + 199, t * 0.2 + it.ph) * 0.8, bounds[2]);
      e.set(it.ax + fbm1(i + 7, t * 0.15) * 0.6, it.ay + t * 2.2 * it.v, Math.PI / 2 * (kind === 'coccus' ? 0 : 1)); q.setFromEuler(e);
      m.compose(pv.set(x, y, z), q, sv.setScalar(it.s * vis));
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items, t, f, bounds, speed, flow, kind, appear]);
  return (
    <group position={position} rotation={rotation}>
      <instancedMesh ref={ref} args={[geo, getMaterial(material), count]} castShadow />
    </group>
  );
}
