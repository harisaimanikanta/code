// Macro anatomy & molecular visualisation.
// StomachOrgan: J-shaped stomach (cardia → fundus → body → antrum → pylorus) with oesophagus and duodenum,
// wet PBR tissue, peristaltic motion, optional inflammation glow and glowing bacterial colonies on the
// antral surface. Molecule: ball-and-stick models (urea, ammonia, CO2, water) for mechanism beats.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getMaterial } from '../materials/materials';
import { tubeAlong, cached, taperedCapsule } from '../core/geometry';
import { envelope, rng, smoothstep } from '../core/math';
import { useAssetTime } from '../core/time';
import { spiralBodyGeometry } from './Microbes';

type V3 = [number, number, number];

// centreline of the stomach in organ space (≈ 0.3 m tall at scale 1; scale up for hero shots)
const STOMACH_PATH: V3[] = [[-0.02, 0.26, 0.0], [-0.05, 0.19, 0.0], [-0.1, 0.13, 0.01], [-0.09, 0.03, 0.02], [-0.03, -0.06, 0.02], [0.06, -0.09, 0.01], [0.13, -0.05, 0.0], [0.17, 0.01, -0.01]];
const radiusAt = (u: number) => {
  // oesophagus narrow → fundus bulge → body wide → antrum tapering → pylorus narrow
  const r = 0.018 + 0.072 * Math.sin(Math.min(1, u * 1.15) * Math.PI) ** 0.8 + 0.02 * Math.exp(-(((u - 0.25) / 0.12) ** 2));
  return u > 0.92 ? r * (1 - (u - 0.92) * 6) : r;
};

export function StomachOrgan({ inflamed = 0, colonies = 0, peristalsis = 1, position, rotation, scale = 1, frame }: {
  inflamed?: number; colonies?: number; peristalsis?: number; position?: V3; rotation?: V3; scale?: number; frame?: number;
}) {
  const { t } = useAssetTime(frame);
  // per-instance clone: the vertices are animated (peristalsis), the cached base must stay untouched
  const geo = useMemo(() => tubeAlong(STOMACH_PATH, radiusAt, 120, 32).clone(), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const mesh = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(STOMACH_PATH.map((p) => new THREE.Vector3(...p)), false, 'centripetal'), []);
  useLayoutEffect(() => {
    const pos = mesh.current!.geometry.attributes.position as THREE.BufferAttribute;
    const c = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / 33);
      const u = ring / 120;
      curve.getPointAt(u, c);
      v.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]).sub(c);
      const wave = 1 + peristalsis * 0.06 * Math.sin(u * 18 - t * 2.4) * smoothstep(0.3, 0.6, u);
      v.multiplyScalar(wave).add(c);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    mesh.current!.geometry.computeVertexNormals();
  }, [base, curve, t, peristalsis]);
  const duo = useMemo(() => tubeAlong([[0.17, 0.01, -0.01], [0.2, 0.05, -0.02], [0.21, 0.0, -0.04], [0.19, -0.09, -0.05], [0.16, -0.16, -0.04]], 0.018, 40, 16), []);
  const eso = useMemo(() => tubeAlong([[-0.02, 0.26, 0.0], [-0.01, 0.34, 0.0], [0.0, 0.45, 0.0]], 0.016, 20, 16), []);
  const colonyPts = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: 60 }, () => {
      const u = 0.55 + r() * 0.35, a = r() * Math.PI * 2;
      const p = curve.getPointAt(u), tan = curve.getTangentAt(u);
      const n = new THREE.Vector3(0, 0, 1).cross(tan).normalize();
      const b = tan.clone().cross(n).normalize();
      const rad = radiusAt(u) * 1.02;
      return { p: p.clone().add(n.multiplyScalar(Math.cos(a) * rad)).add(b.multiplyScalar(Math.sin(a) * rad)), s: 0.003 + r() * 0.004, ph: r() * 6 };
    });
  }, [curve]);
  const tissue = inflamed > 0.5 ? getMaterial('tissue-inflamed') : getMaterial('tissue-wet');
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh ref={mesh} geometry={geo} material={tissue} castShadow receiveShadow />
      <mesh geometry={duo} material={getMaterial('tissue-wet')} castShadow />
      <mesh geometry={eso} material={getMaterial('tissue-wet')} castShadow />
      {inflamed > 0 && <pointLight position={[0.02, -0.02, 0.12]} color="#ff2a1a" intensity={0.4 * inflamed} distance={0.6} decay={2} />}
      {inflamed > 0 && <pointLight position={[-0.03, 0.02, 0.01]} color="#ff6a4a" intensity={0.08 * inflamed} distance={0.35} decay={2} />}
      {colonies > 0 && colonyPts.slice(0, Math.round(60 * colonies)).map((c, i) => (
        <mesh key={i} geometry={cached('colony', () => new THREE.SphereGeometry(1, 10, 8))} material={getMaterial('bacteria-toxic')} position={c.p} scale={c.s * (1 + 0.15 * Math.sin(t * 2 + c.ph))} />
      ))}
    </group>
  );
}

// ------------------------------------------------------------------ molecules (CPK colours, stylised)
const ATOM: Record<string, { r: number; mat: Parameters<typeof getMaterial>[0]; overrides?: THREE.MeshPhysicalMaterialParameters }> = {
  C: { r: 0.17, mat: 'plastic-white', overrides: { color: '#2a2a2c' } },
  N: { r: 0.16, mat: 'plastic-white', overrides: { color: '#3050c8' } },
  O: { r: 0.15, mat: 'red-lacquer' },
  H: { r: 0.1, mat: 'plastic-white' },
};
const MOLECULES: Record<string, { atoms: [string, V3][]; bonds: [number, number][] }> = {
  urea: { atoms: [['C', [0, 0, 0]], ['O', [0, 0.42, 0]], ['N', [-0.36, -0.22, 0]], ['N', [0.36, -0.22, 0]], ['H', [-0.66, -0.06, 0]], ['H', [-0.38, -0.54, 0]], ['H', [0.66, -0.06, 0]], ['H', [0.38, -0.54, 0]]], bonds: [[0, 1], [0, 2], [0, 3], [2, 4], [2, 5], [3, 6], [3, 7]] },
  ammonia: { atoms: [['N', [0, 0, 0]], ['H', [0.3, -0.12, 0.12]], ['H', [-0.25, -0.12, 0.2]], ['H', [-0.04, -0.12, -0.3]]], bonds: [[0, 1], [0, 2], [0, 3]] },
  co2: { atoms: [['O', [-0.4, 0, 0]], ['C', [0, 0, 0]], ['O', [0.4, 0, 0]]], bonds: [[0, 1], [1, 2]] },
  water: { atoms: [['O', [0, 0, 0]], ['H', [0.26, -0.18, 0]], ['H', [-0.26, -0.18, 0]]], bonds: [[0, 1], [0, 2]] },
};

/** Ball-and-stick molecule. `appear` frame window scales it in; slow tumble. */
export function Molecule({ kind = 'urea', position, rotation, scale = 1, spin = 0.3, appearStart, appearEnd = 1e9, frame }: { kind?: keyof typeof MOLECULES | string; position?: V3; rotation?: V3; scale?: number; spin?: number; appearStart?: number; appearEnd?: number; frame?: number }) {
  const { t, frame: f } = useAssetTime(frame);
  const m = MOLECULES[kind] ?? MOLECULES.urea;
  const k = appearStart === undefined ? 1 : envelope(f, appearStart, appearEnd, 12, 12);
  if (k <= 0.001) return null;
  return (
    <group position={position} rotation={rotation} scale={scale * k}>
      <group rotation={[t * spin * 0.4, t * spin, 0]}>
        {m.atoms.map(([el, p], i) => { const a = ATOM[el]; return <mesh key={i} geometry={cached('atom', () => new THREE.SphereGeometry(1, 28, 20))} material={getMaterial(a.mat, a.overrides)} position={p} scale={a.r} castShadow />; })}
        {m.bonds.map(([a, b], i) => {
          const pa = new THREE.Vector3(...m.atoms[a][1]), pb = new THREE.Vector3(...m.atoms[b][1]);
                    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pb.clone().sub(pa).normalize());
          return <mesh key={`b${i}`} geometry={taperedCapsule(0.035, 0.035, 1, 10)} material={getMaterial('metal-brushed')} position={pa} quaternion={q} scale={[1, pa.distanceTo(pb), 1]} rotation-order="XYZ" />;
        })}
      </group>
    </group>
  );
}

/** Hero bacterium with an ammonia "cloud" (urease neutralising acid around it): glowing halo pulses. */
export function NeutralisingBacterium({ position, rotation, scale = 1, halo = 1, frame }: { position?: V3; rotation?: V3; scale?: number; halo?: number; frame?: number }) {
  const { t } = useAssetTime(frame);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group rotation={[0, t * 1.4, 0]}>
        <mesh geometry={spiralBodyGeometry(2.5, 0.12, 1, 0.08)} material={getMaterial('bacteria-toxic')} castShadow />
      </group>
      <mesh geometry={cached('halo', () => new THREE.SphereGeometry(1, 32, 24))} material={getMaterial('emissive-toxic', { transparent: true, opacity: 0.08 * halo, depthWrite: false, emissiveIntensity: 0.6, side: THREE.BackSide })} scale={0.75 + 0.06 * Math.sin(t * 2)} />
    </group>
  );
}
