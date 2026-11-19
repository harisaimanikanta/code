// Laboratory objects: table, glassware, petri dish, specimen rack, microscope.
// The Microscope exposes its eyepiece and objective world-offsets (MICROSCOPE_ANCHORS) for lens fly-through transitions.
import React from 'react';
import * as THREE from 'three';
import { bevelBox } from '../core/geometry';

const bb = (v: [number, number, number] | number[]) => bevelBox(v[0], v[1], v[2]);
import { getMaterial } from '../materials/materials';
import { useAssetTime } from '../core/time';

type V3 = [number, number, number];
type P = { position?: V3; rotation?: V3; scale?: number };
const box = new THREE.BoxGeometry(1, 1, 1);
const geoCache = new Map<string, THREE.CylinderGeometry>();
/** Cached cylinder geometry — never allocate geometry per render. */
const cyl = (rt: number, rb: number, h: number, seg = 10, open = false) => {
  const k = `${rt.toFixed(4)}|${rb.toFixed(4)}|${h.toFixed(4)}|${seg}|${open}`;
  let g = geoCache.get(k);
  if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); geoCache.set(k, g); }
  return g;
};

/** Heavy steel-and-concrete lab bench. Top surface at y=0.92. */
export function LabTable({ length = 3, depth = 1.1, position, rotation, scale = 1 }: P & { length?: number; depth?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([length, 0.06, depth])} material={getMaterial('metal-dark')} position={[0, 0.9, 0]} castShadow receiveShadow />
      <mesh geometry={bb([0.6, 0.88, depth * 0.9])} material={getMaterial('concrete-dark')} position={[-length / 2 + 0.35, 0.44, 0]} castShadow receiveShadow />
      <mesh geometry={bb([0.6, 0.88, depth * 0.9])} material={getMaterial('concrete-dark')} position={[length / 2 - 0.35, 0.44, 0]} castShadow receiveShadow />
      <mesh geometry={bb([length * 0.9, 0.012, 0.01])} material={getMaterial('emissive-red', { emissiveIntensity: 0.8 })} position={[0, 0.86, depth / 2 + 0.005]} />
    </group>
  );
}

/** Glass vessel. kind: beaker | flask | jar | cylinder. Optional coloured liquid with fill 0..1. */
export function GlassContainer({ kind = 'beaker', liquid = '#7a0a12', fill = 0.5, glow = false, position, rotation, scale = 1 }: P & { kind?: 'beaker' | 'flask' | 'jar' | 'cylinder'; liquid?: string | null; fill?: number; glow?: boolean }) {
  const dims = { beaker: [0.07, 0.07, 0.16], flask: [0.025, 0.09, 0.2], jar: [0.1, 0.1, 0.22], cylinder: [0.03, 0.03, 0.3] }[kind];
  const [rt, rb, h] = dims;
  const liquidMat = liquid ? getMaterial(glow ? 'emissive-toxic' : 'red-lacquer', glow ? undefined : { color: liquid, transparent: true, opacity: 0.85 }) : null;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={cyl(rt, rb, h, 14, true)} material={getMaterial('glass')} position={[0, h / 2, 0]} />
      {liquidMat && fill > 0 && (
        <mesh geometry={cyl(rb + (rt - rb) * fill * 0.9, rb * 0.97, h * fill * 0.95, 14)} material={liquidMat} position={[0, (h * fill * 0.95) / 2 + 0.003, 0]} />
      )}
      {kind === 'jar' && <mesh geometry={cyl(rt * 1.05, rt * 1.05, 0.03, 14)} material={getMaterial('metal-dark')} position={[0, h + 0.015, 0]} />}
    </group>
  );
}

/** Petri dish with optional glowing culture colonies. */
export function PetriDish({ colonies = 9, position, rotation, scale = 1 }: P & { colonies?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={cyl(0.05, 0.05, 0.012, 20, true)} material={getMaterial('glass')} position={[0, 0.006, 0]} />
      <mesh geometry={cyl(0.048, 0.048, 0.004, 20)} material={getMaterial('red-dark')} position={[0, 0.003, 0]} />
      {Array.from({ length: colonies }, (_, i) => {
        const a = i * 2.39996, r = 0.012 + (i % 4) * 0.008;
        return <mesh key={i} geometry={cyl(0.004, 0.005, 0.002, 6)} material={getMaterial('emissive-toxic', { emissiveIntensity: 1 })} position={[Math.cos(a) * r, 0.006, Math.sin(a) * r]} />;
      })}
    </group>
  );
}

/** Rack of test tubes. */
export function SpecimenRack({ tubes = 6, position, rotation, scale = 1 }: P & { tubes?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([tubes * 0.04 + 0.04, 0.02, 0.08])} material={getMaterial('metal-painted')} position={[0, 0.06, 0]} />
      <mesh geometry={bb([tubes * 0.04 + 0.04, 0.01, 0.08])} material={getMaterial('metal-painted')} position={[0, 0.005, 0]} />
      {Array.from({ length: tubes }, (_, i) => (
        <GlassContainer key={i} kind="cylinder" fill={0.3 + (i % 3) * 0.2} glow={i % 3 === 1} position={[-tubes * 0.02 + 0.02 + i * 0.04, 0.0, 0]} scale={0.45} />
      ))}
    </group>
  );
}

/** Offsets (in the microscope's local space, scale=1) used by lens fly-through camera moves. */
export const MICROSCOPE_ANCHORS = {
  eyepiece: [0, 0.52, 0.11] as V3,
  objective: [0, 0.27, -0.02] as V3,
  stage: [0, 0.22, -0.02] as V3,
};

/** Stylized monumental microscope (~0.55 m tall at scale 1). Animated focus knob turn optional. */
export function Microscope({ position, rotation, scale = 1, focusTurn = 0, lensGlow = 0.6, frame }: P & { focusTurn?: number; lensGlow?: number; frame?: number }) {
  const { t } = useAssetTime(frame);
  const metal = getMaterial('metal-painted');
  const dark = getMaterial('metal-dark');
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([0.22, 0.05, 0.28])} material={dark} position={[0, 0.025, 0]} castShadow receiveShadow />
      <mesh geometry={bb([0.06, 0.34, 0.07])} material={metal} position={[0, 0.2, 0.08]} rotation={[-0.25, 0, 0]} castShadow />
      <mesh geometry={bb([0.16, 0.015, 0.14])} material={dark} position={[0, 0.21, -0.02]} castShadow />
      <mesh geometry={cyl(0.012, 0.012, 0.025, 10)} material={getMaterial('emissive-toxic', { emissiveIntensity: lensGlow * 2 })} position={[0, 0.2, -0.02]} />
      {/* body tube angled toward the viewer */}
      <group position={[0, 0.38, 0.03]} rotation={[0.45, 0, 0]}>
        <mesh geometry={cyl(0.03, 0.035, 0.24, 12)} material={metal} castShadow />
        <mesh geometry={cyl(0.022, 0.022, 0.06, 12)} material={dark} position={[0, 0.15, 0]} />
        <mesh geometry={cyl(0.02, 0.02, 0.004, 12)} material={getMaterial('emissive-toxic', { emissiveIntensity: lensGlow })} position={[0, 0.182, 0]} />
      </group>
      {/* objective turret */}
      <group position={[0, 0.27, -0.02]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={cyl(0.008, 0.012, 0.05, 8)} material={getMaterial('metal-brushed')} position={[Math.sin(i * 2.1) * 0.02, -0.02, Math.cos(i * 2.1) * 0.02]} />
        ))}
      </group>
      {/* focus knobs */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={cyl(0.03, 0.03, 0.02, 10)} material={dark} position={[s * 0.045, 0.16, 0.09]} rotation={[focusTurn * t, 0, Math.PI / 2]} />
      ))}
    </group>
  );
}
