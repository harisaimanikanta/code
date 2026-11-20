// Achievement objects: medal, faceted trophy, display plinth with golden reveal light.
import React from 'react';
import * as THREE from 'three';
import { bevelBox } from '../core/geometry';

const bb = (v: [number, number, number] | number[]) => bevelBox(v[0], v[1], v[2]);
import { getMaterial } from '../materials/materials';
import { envelope } from '../core/math';
import { useAssetTime } from '../core/time';

type V3 = [number, number, number];
type P = { position?: V3; rotation?: V3; scale?: number };
const box = new THREE.BoxGeometry(1, 1, 1);
const medalDisc = new THREE.CylinderGeometry(0.07, 0.07, 0.008, 24);
const medalRing = new THREE.TorusGeometry(0.06, 0.004, 6, 24);
const medalCore = new THREE.CylinderGeometry(0.03, 0.03, 0.01, 6);
const trophyStem = new THREE.CylinderGeometry(0.015, 0.03, 0.14, 6);
const trophyCup = new THREE.CylinderGeometry(0.11, 0.04, 0.16, 6);
const trophyGem = new THREE.OctahedronGeometry(0.035);

/** Gold medal disc (generic — no real-world insignia). Slowly rotates if `spin`. */
export function AwardMedal({ spin = 0.4, position, rotation, scale = 1, frame }: P & { spin?: number; frame?: number }) {
  const { t } = useAssetTime(frame);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group rotation={[0, t * spin, 0]}>
        <mesh geometry={medalDisc} material={getMaterial('gold-metal')} rotation={[Math.PI / 2, 0, 0]} castShadow />
        <mesh geometry={medalRing} material={getMaterial('gold-metal')} />
        <mesh geometry={medalCore} material={getMaterial('emissive-gold', { emissiveIntensity: 0.8 })} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}

/** Faceted low-poly trophy (~0.4 m). */
export function Trophy({ position, rotation, scale = 1 }: P) {
  const gold = getMaterial('gold-metal');
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([0.16, 0.08, 0.16])} material={getMaterial('matte-black')} position={[0, 0.04, 0]} castShadow />
      <mesh geometry={trophyStem} material={gold} position={[0, 0.15, 0]} castShadow />
      <mesh geometry={trophyCup} material={gold} position={[0, 0.3, 0]} castShadow />
      <mesh geometry={trophyGem} material={getMaterial('emissive-gold')} position={[0, 0.42, 0]} />
    </group>
  );
}

/** Display plinth with a top-down golden spotlight that ramps up during [revealStart, revealEnd]. */
export function AwardPlinth({ revealStart = 0, revealEnd = 1e9, height = 1.1, position, rotation, scale = 1, children, frame }: P & { revealStart?: number; revealEnd?: number; height?: number; children?: React.ReactNode; frame?: number }) {
  const { frame: f } = useAssetTime(frame);
  const k = envelope(f, revealStart, revealEnd, 30, 15);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([0.6, height, 0.6])} material={getMaterial('concrete-dark')} position={[0, height / 2, 0]} castShadow receiveShadow />
      <mesh geometry={bb([0.5, 0.01, 0.5])} material={getMaterial('emissive-gold', { emissiveIntensity: 1.5 })} position={[0, height + 0.005, 0]} visible={k > 0.05} />
      <group position={[0, height + 0.01, 0]}>{children}</group>
      <spotLight position={[0, height + 3, 0.4]} angle={0.35} penumbra={0.6} intensity={60 * k} color="#ffc86b" distance={8} decay={1.5} castShadow={k > 0.1} />
    </group>
  );
}
