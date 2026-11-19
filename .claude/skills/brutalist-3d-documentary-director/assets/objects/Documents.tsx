// Paper-based objects: single paper, stacks, scientific journal, floating/orbiting pages, stamp of rejection.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bevelBox } from '../core/geometry';

const bb = (v: [number, number, number] | number[]) => bevelBox(v[0], v[1], v[2]);
import { getMaterial } from '../materials/materials';
import { envelope, fbm1, rng } from '../core/math';
import { useAssetTime } from '../core/time';

type V3 = [number, number, number];
type P = { position?: V3; rotation?: V3; scale?: number };
const box = new THREE.BoxGeometry(1, 1, 1);
const plane = new THREE.PlaneGeometry(1, 1);

/** A4-ish paper sheet lying flat (y-up). */
export function Paper({ position, rotation, scale = 1 }: P) {
  return <mesh geometry={plane} material={getMaterial('paper')} position={position} rotation={rotation ?? [-Math.PI / 2, 0, 0]} scale={[0.21 * scale, 0.297 * scale, 1]} receiveShadow castShadow />;
}

/** Messy stack of papers. */
export function PaperStack({ sheets = 12, seed = 2, position, rotation, scale = 1 }: P & { sheets?: number; seed?: number }) {
  const offs = useMemo(() => { const r = rng(seed); return Array.from({ length: sheets }, () => [(r() - 0.5) * 0.02, (r() - 0.5) * 0.25]); }, [sheets, seed]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {offs.map(([dx, rot], i) => (
        <mesh key={i} geometry={box} material={getMaterial('paper')} position={[dx, 0.002 + i * 0.0025, dx * 0.7]} rotation={[0, rot, 0]} scale={[0.21, 0.002, 0.297]} castShadow receiveShadow />
      ))}
    </group>
  );
}

/** Bound scientific journal (closed or open). */
export function Journal({ open = false, position, rotation, scale = 1 }: P & { open?: boolean }) {
  if (!open) {
    return (
      <group position={position} rotation={rotation} scale={scale}>
        <mesh geometry={bb([0.22, 0.024, 0.29])} material={getMaterial('red-dark')} position={[0, 0.012, 0]} castShadow />
        <mesh geometry={bb([0.214, 0.02, 0.284])} material={getMaterial('paper')} position={[0.004, 0.012, 0]} />
        <mesh geometry={bb([0.14, 0.001, 0.02])} material={getMaterial('emissive-gold', { emissiveIntensity: 0.4 })} position={[0, 0.0245, -0.06]} />
      </group>
    );
  }
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {[-1, 1].map((s) => (
        <group key={s} rotation={[0, 0, s * -0.08]}>
          <mesh geometry={bb([0.22, 0.006, 0.29])} material={getMaterial('red-dark')} position={[s * 0.11, 0.004, 0]} castShadow />
          <mesh geometry={plane} material={getMaterial('paper')} position={[s * 0.11, 0.0075, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.2, 0.27, 1]} />
        </group>
      ))}
    </group>
  );
}

/** Pages drifting in a slow vortex around a center — "ideas / evidence piling up" metaphor. */
export function FloatingPages({ count = 40, radius = 3, height = 4, seed = 4, speed = 0.15, appearAt = 0, position, scale = 1, frame }: P & { count?: number; radius?: number; height?: number; seed?: number; speed?: number; appearAt?: number; frame?: number }) {
  const { frame: f, t } = useAssetTime(frame);
  const pages = useMemo(() => { const r = rng(seed); return Array.from({ length: count }, () => ({ a: r() * Math.PI * 2, r: radius * (0.4 + r() * 0.6), y: r() * height, s: 0.7 + r() * 0.6, ph: r() * 10 })); }, [count, radius, height, seed]);
  const vis = envelope(f, appearAt, 1e9, 20, 0);
  if (vis <= 0) return null;
  return (
    <group position={position} scale={scale}>
      {pages.map((p, i) => {
        const a = p.a + t * speed * (1 + (i % 3) * 0.2);
        const y = p.y + fbm1(seed + i, t * 0.2 + p.ph) * 0.4;
        return (
          <mesh key={i} geometry={plane} material={getMaterial('paper')} position={[Math.cos(a) * p.r, y, Math.sin(a) * p.r]} rotation={[t * 0.3 + p.ph, a, t * 0.2]} scale={[0.21 * p.s * vis, 0.297 * p.s * vis, 1]} castShadow />
        );
      })}
    </group>
  );
}

/** Crimson REJECTED-style stamp bar slamming onto a paper (no text: pure graphic). */
export function RejectionStamp({ at = 0, position, rotation, scale = 1, frame }: P & { at?: number; frame?: number }) {
  const { frame: f } = useAssetTime(frame);
  const k = Math.min(1, Math.max(0, (f - at) / 6));
  const drop = 1 - k;
  if (f < at - 12) return null;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([0.17, 0.002, 0.04])} material={getMaterial('emissive-red', { emissiveIntensity: 1.4 })} position={[0, 0.003 + drop * 0.3, 0]} rotation={[0, 0.35, 0]} />
    </group>
  );
}
