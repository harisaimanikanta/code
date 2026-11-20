// Medical props: hospital bed, IV stand, vitals monitor, surgical lamp, endoscope cart.
import React from 'react';
import * as THREE from 'three';
import { bevelBox } from '../core/geometry';

const bb = (v: [number, number, number] | number[]) => bevelBox(v[0], v[1], v[2]);
import { getMaterial } from '../materials/materials';
import { useAssetTime } from '../core/time';

type V3 = [number, number, number];
type P = { position?: V3; rotation?: V3; scale?: number };
const box = new THREE.BoxGeometry(1, 1, 1);
const pole = new THREE.CylinderGeometry(0.015, 0.015, 1, 6);
const lampHousing = new THREE.CylinderGeometry(0.4, 0.5, 0.15, 8);
const lampFace = new THREE.CylinderGeometry(0.38, 0.38, 0.02, 8);

export function HospitalBed({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([0.95, 0.12, 2.1])} material={getMaterial('metal-dark')} position={[0, 0.45, 0]} castShadow receiveShadow />
      <mesh geometry={bb([0.88, 0.1, 1.95])} material={getMaterial('fabric-labcoat')} position={[0, 0.56, 0.05]} castShadow receiveShadow />
      <mesh geometry={bb([0.6, 0.1, 0.35])} material={getMaterial('fabric-labcoat')} position={[0, 0.66, -0.8]} rotation={[0.25, 0, 0]} />
      <mesh geometry={bb([0.95, 0.6, 0.05])} material={getMaterial('metal-painted')} position={[0, 0.75, -1.05]} castShadow />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <mesh key={i} geometry={box} material={getMaterial('metal-dark')} position={[x * 0.42, 0.2, z * 0.95]} scale={[0.04, 0.4, 0.04]} />)}
    </group>
  );
}

export function IVStand({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={pole} material={getMaterial('metal-brushed')} position={[0, 1, 0]} scale={[1, 2, 1]} castShadow />
      <mesh geometry={bb([0.5, 0.04, 0.06])} material={getMaterial('metal-dark')} position={[0, 0.02, 0]} />
      <mesh geometry={bb([0.06, 0.04, 0.5])} material={getMaterial('metal-dark')} position={[0, 0.02, 0]} />
      <mesh geometry={bb([0.12, 0.2, 0.05])} material={getMaterial('glass-tinted-red')} position={[0.1, 1.75, 0]} />
    </group>
  );
}

/** Vitals monitor with animated heartbeat trace (bpm controls speed). */
export function VitalsMonitor({ bpm = 72, position, rotation, scale = 1, frame }: P & { bpm?: number; frame?: number }) {
  const { t } = useAssetTime(frame);
  const segs = 20;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([0.5, 0.36, 0.12])} material={getMaterial('metal-dark')} castShadow />
      <mesh geometry={bb([0.44, 0.3, 0.005])} material={getMaterial('matte-black')} position={[0, 0, 0.061]} />
      {Array.from({ length: segs }, (_, i) => {
        const x = i / segs;
        const ph = (x * 2 - t * (bpm / 60)) % 1;
        const p = ph < 0 ? ph + 1 : ph;
        const y = p > 0.45 && p < 0.5 ? 0.09 : p > 0.5 && p < 0.55 ? -0.05 : 0;
        return <mesh key={i} geometry={box} material={getMaterial('emissive-red')} position={[-0.2 + x * 0.42, y, 0.065]} scale={[0.022, 0.008 + Math.abs(y) * 0.6, 0.002]} />;
      })}
    </group>
  );
}

/** Overhead surgical lamp with strong downward light. */
export function SurgicalLamp({ position = [0, 2.6, 0] as V3, intensity = 60, on = true }: { position?: V3; intensity?: number; on?: boolean }) {
  return (
    <group position={position}>
      <mesh geometry={bb([0.04, 1.2, 0.04])} material={getMaterial('metal-dark')} position={[0, 0.6, 0]} />
      <mesh geometry={lampHousing} material={getMaterial('metal-painted')} castShadow />
      <mesh geometry={lampFace} material={getMaterial(on ? 'emissive-white' : 'matte-black')} position={[0, -0.08, 0]} />
      {on && <spotLight position={[0, -0.1, 0]} intensity={intensity} angle={0.5} penumbra={0.4} distance={6} decay={1.4} castShadow />}
    </group>
  );
}
