// Laboratory objects: table, glassware, petri dish, specimen rack, microscope.
// The Microscope exposes its eyepiece and objective world-offsets (MICROSCOPE_ANCHORS) for lens fly-through transitions.
import React from 'react';
import * as THREE from 'three';
import { bevelBox } from '../core/geometry';

const bb = (v: [number, number, number] | number[]) => bevelBox(v[0], v[1], v[2]);
import { getMaterial } from '../materials/materials';
import { useAssetTime } from '../core/time';
import { cylinderBase, extrudeOutline, lathe, tubeAlong, cached as gcached } from '../core/geometry';

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

/** Laboratory bench (v2): drawer pedestals with handles, kick plinth, black epoxy-resin worktop with upstand,
 * reagent rail. Top surface at y=0.92 (unchanged from v1). */
export function LabTable({ length = 3, depth = 1.1, position, rotation, scale = 1, rail = true }: P & { length?: number; depth?: number; rail?: boolean }) {
  const ped = Math.min(0.6, length / 4);
  const drawers = [0.24, 0.47, 0.7];
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bevelBox(length, 0.05, depth, 0.012)} material={getMaterial('matte-black', { roughness: 0.35 })} position={[0, 0.895, 0]} castShadow receiveShadow />
      <mesh geometry={bevelBox(length, 0.12, 0.03, 0.01)} material={getMaterial('matte-black', { roughness: 0.35 })} position={[0, 0.98, -depth / 2 + 0.015]} castShadow />
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * (length / 2 - ped / 2 - 0.02), 0, 0.02]}>
          <mesh geometry={bevelBox(ped, 0.78, depth - 0.1, 0.012)} material={getMaterial('wood-oak')} position={[0, 0.48, 0]} castShadow receiveShadow />
          <mesh geometry={bevelBox(ped - 0.04, 0.08, depth - 0.14, 0.01)} material={getMaterial('matte-black')} position={[0, 0.045, -0.02]} />
          {drawers.map((y) => (
            <group key={y} position={[0, y + 0.1, (depth - 0.1) / 2 + 0.004]}>
              <mesh geometry={bevelBox(ped - 0.05, 0.19, 0.012, 0.006)} material={getMaterial('wood-oak')} castShadow />
              <mesh geometry={bevelBox(ped * 0.35, 0.014, 0.02, 0.006)} material={getMaterial('chrome')} position={[0, 0.03, 0.014]} />
            </group>
          ))}
        </group>
      ))}
      <mesh geometry={bevelBox(length - 2 * ped - 0.1, 0.6, 0.02, 0.005)} material={getMaterial('wood-oak')} position={[0, 0.55, -depth / 2 + 0.06]} receiveShadow />
      {rail && (
        <group position={[0, 1.04, -depth / 2 + 0.06]}>
          <mesh geometry={bevelBox(length - 0.2, 0.02, 0.18, 0.006)} material={getMaterial('metal-brushed')} position={[0, 0.25, 0]} castShadow />
          {[-1, 1].map((sd) => <mesh key={sd} geometry={bevelBox(0.02, 0.27, 0.02, 0.006)} material={getMaterial('metal-brushed')} position={[sd * (length / 2 - 0.15), 0.12, 0]} />)}
        </group>
      )}
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

/** Period laboratory microscope (~0.55 m at scale 1): horseshoe foot, curved C-arm, inclined monocular head,
 * 3-objective revolving nosepiece, mechanical stage with clips and a specimen slide, coarse/fine focus knobs,
 * glowing substage illuminator. `focusTurn` rad/s animates the knobs (and a subtle stage travel);
 * `nosepieceTurn` rotates the turret. Anchors (MICROSCOPE_ANCHORS) are unchanged from v1. */
export function Microscope({ position, rotation, scale = 1, focusTurn = 0, nosepieceTurn = 0, lensGlow = 0.6, frame }: P & { focusTurn?: number; nosepieceTurn?: number; lensGlow?: number; frame?: number }) {
  const { t } = useAssetTime(frame);
  const body = getMaterial('metal-cream');
  const black = getMaterial('metal-dark');
  const chrome = getMaterial('chrome');
  const arm = tubeAlong([[0, 0.06, 0.1], [0, 0.17, 0.115], [0, 0.29, 0.09], [0, 0.36, 0.035]], (u) => 0.03 - u * 0.006, 40, 14);
  const tubeLen = Math.hypot(0.19, 0.1);
  const stageY = 0.215 + Math.sin(t * focusTurn) * 0.002;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* horseshoe foot */}
      <mesh geometry={extrudeOutline('mscope-foot', [[-0.1, 0.08], [-0.11, -0.06], [-0.05, -0.13], [0.05, -0.13], [0.11, -0.06], [0.1, 0.08], [0.05, 0.11], [0.05, -0.02], [-0.05, -0.02], [-0.05, 0.11]], 0.035, 0.008)} material={body} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} castShadow receiveShadow />
      <mesh geometry={cylinderBase(0.035, 0.04, 0.05, 20)} material={body} position={[0, 0.03, 0.095]} castShadow />
      <mesh geometry={arm} material={body} castShadow />
      {/* stage */}
      <mesh geometry={bevelBox(0.13, 0.014, 0.12, 0.004)} material={black} position={[0, stageY, -0.02]} castShadow receiveShadow />
      <mesh geometry={bevelBox(0.075, 0.0015, 0.025, 0.0005)} material={getMaterial('glass')} position={[0, stageY + 0.008, -0.02]} />
      <mesh geometry={bevelBox(0.012, 0.0006, 0.012, 0.0002)} material={getMaterial('emissive-toxic', { emissiveIntensity: 0.6 + lensGlow })} position={[0, stageY + 0.0095, -0.02]} />
      {[-1, 1].map((sd) => <mesh key={sd} geometry={tubeAlong([[sd * 0.05, stageY + 0.008, 0.02], [sd * 0.03, stageY + 0.01, -0.005], [sd * 0.025, stageY + 0.009, -0.03]], 0.0018, 12, 6)} material={chrome} />)}
      <mesh geometry={cylinderBase(0.018, 0.022, 0.06, 18)} material={black} position={[0, 0.06, -0.02]} />
      <mesh geometry={cylinderBase(0.016, 0.016, 0.005, 18)} material={getMaterial('emissive-white', { emissive: '#f4ffe0', emissiveIntensity: 1 + lensGlow * 2 })} position={[0, 0.12, -0.02]} />
      <pointLight position={[0, 0.14, -0.02]} color="#d8ff9a" intensity={0.25 + lensGlow * 0.4} distance={0.6} decay={2} />
      {/* focus knobs (coarse + fine) */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.04, 0.17, 0.1]} rotation={[t * focusTurn, 0, 0]}>
          <mesh geometry={gcached('knob', () => new THREE.CylinderGeometry(0.026, 0.026, 0.018, 24).rotateZ(Math.PI / 2))} material={black} position={[sd * 0.01, 0, 0]} castShadow />
          <mesh geometry={gcached('knobfine', () => new THREE.CylinderGeometry(0.015, 0.015, 0.016, 20).rotateZ(Math.PI / 2))} material={chrome} position={[sd * 0.027, 0, 0]} />
        </group>
      ))}
      {/* revolving nosepiece with objectives */}
      <group position={[0, 0.3, -0.005]} rotation={[-0.45, 0, 0]}>
        <mesh geometry={cylinderBase(0.032, 0.026, 0.02, 24)} material={chrome} rotation={[Math.PI, 0, 0]} />
        <group rotation={[0, nosepieceTurn * t, 0]}>
          {[0, 1, 2].map((i) => (
            <group key={i} position={[Math.sin((i * Math.PI * 2) / 3) * 0.016, -0.02, Math.cos((i * Math.PI * 2) / 3) * 0.016]} rotation={[Math.cos((i * Math.PI * 2) / 3) * 0.25, 0, -Math.sin((i * Math.PI * 2) / 3) * 0.25]}>
              <mesh geometry={lathe([[0.0, -0.05 - i * 0.008], [0.006, -0.05 - i * 0.008], [0.009, -0.035], [0.011, -0.01], [0.011, 0]], 16)} material={chrome} castShadow />
              <mesh geometry={cylinderBase(0.0115, 0.0115, 0.003, 16)} material={getMaterial(i === 1 ? 'red-lacquer' : 'brass')} position={[0, -0.02, 0]} />
            </group>
          ))}
        </group>
      </group>
      {/* inclined monocular body tube → eyepiece (anchor 0,0.52,0.11) */}
      <group position={[0, 0.31, 0.0]} rotation={[Math.atan2(0.1, 0.19), 0, 0]}>
        <mesh geometry={cylinderBase(0.021, 0.024, tubeLen, 24)} material={body} castShadow />
        <mesh geometry={cylinderBase(0.016, 0.016, 0.05, 20)} material={black} position={[0, tubeLen - 0.01, 0]} />
        <mesh geometry={cylinderBase(0.019, 0.017, 0.012, 20)} material={getMaterial('rubber-black')} position={[0, tubeLen + 0.035, 0]} />
        <mesh geometry={cylinderBase(0.011, 0.011, 0.002, 20)} material={getMaterial('emissive-toxic', { emissiveIntensity: lensGlow })} position={[0, tubeLen + 0.046, 0]} />
      </group>
    </group>
  );
}
