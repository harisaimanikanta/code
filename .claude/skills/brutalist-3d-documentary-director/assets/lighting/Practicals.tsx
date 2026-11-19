// Practical (in-world, physically placed) lights: hanging industrial lamp, spotlight pool, desk lamp.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bevelBox } from '../core/geometry';

const bb = (v: [number, number, number] | number[]) => bevelBox(v[0], v[1], v[2]);
import { getMaterial } from '../materials/materials';
import { LightShaft } from '../particles/Particles';

type V3 = [number, number, number];
const box = new THREE.BoxGeometry(1, 1, 1);
const shade = new THREE.ConeGeometry(0.35, 0.3, 8, 1, true);

/** Industrial hanging lamp with cable, emissive bulb, downward spot and optional volumetric shaft. */
export function HangingLamp({ position = [0, 4, 0] as V3, cable = 3, color = '#ffd0b0', intensity = 40, shaft = true, shaftColor = '#ff6a4a', castShadow = false, distance = 12 }: {
  position?: V3; cable?: number; color?: string; intensity?: number; shaft?: boolean; shaftColor?: string; castShadow?: boolean; distance?: number;
}) {
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, -10, 0); return o; }, []);
  return (
    <group position={position}>
      <mesh geometry={bb([0.02, cable, 0.02])} material={getMaterial('metal-dark')} position={[0, cable / 2, 0]} />
      <mesh geometry={shade} material={getMaterial('metal-dark', { side: THREE.DoubleSide })} />
      <mesh geometry={bb([0.14, 0.04, 0.14])} material={getMaterial('emissive-white')} position={[0, -0.12, 0]} />
      <primitive object={target} />
      <spotLight color={color} intensity={intensity} angle={0.6} penumbra={0.5} distance={distance} decay={1.5} target={target} castShadow={castShadow} />
      {shaft && <LightShaft position={[0, -2.6, 0]} length={5} radius={1.6} color={shaftColor} intensity={0.08} />}
    </group>
  );
}

/** A focused spotlight pool aimed at `target` (world-local). Use to isolate a subject. */
export function SpotPool({ position = [0, 6, 2] as V3, target = [0, 0, 0] as V3, color = '#ffffff', intensity = 80, angle = 0.35, penumbra = 0.6, castShadow = true, distance = 20 }: {
  position?: V3; target?: V3; color?: string; intensity?: number; angle?: number; penumbra?: number; castShadow?: boolean; distance?: number;
}) {
  const t = useMemo(() => { const o = new THREE.Object3D(); o.position.set(...target); return o; }, [target]);
  return (
    <>
      <primitive object={t} />
      <spotLight position={position} target={t} color={color} intensity={intensity} angle={angle} penumbra={penumbra} castShadow={castShadow} distance={distance} decay={1.4} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} />
    </>
  );
}

/** Angular desk lamp with warm pool on the desk. */
export function DeskLamp({ position, rotation, intensity = 8, color = '#ffc89a' }: { position?: V3; rotation?: V3; intensity?: number; color?: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bb([0.15, 0.02, 0.15])} material={getMaterial('metal-dark')} position={[0, 0.01, 0]} />
      <mesh geometry={bb([0.02, 0.4, 0.02])} material={getMaterial('metal-dark')} position={[0, 0.2, -0.03]} rotation={[0.3, 0, 0]} />
      <mesh geometry={bb([0.02, 0.3, 0.02])} material={getMaterial('metal-dark')} position={[0, 0.38, 0.08]} rotation={[-0.9, 0, 0]} />
      <mesh geometry={bb([0.08, 0.02, 0.08])} material={getMaterial('emissive-white', { emissive: color })} position={[0, 0.3, 0.18]} />
      <pointLight position={[0, 0.25, 0.18]} color={color} intensity={intensity} distance={2.5} decay={2} />
    </group>
  );
}

// ------------------------------------------------------------------------------------------------
// v2 fixtures: area lights (soft, physically shaped), three-point subject rig, monitor glow.
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { bevelBox as _bevel, cylinderBase } from '../core/geometry';
let rectInit = false;
const ensureRect = () => { if (!rectInit) { RectAreaLightUniformsLib.init(); rectInit = true; } };

/** Ceiling fluorescent fixture: housing + diffuser + RectAreaLight (soft, falloff-correct, no shadows).
 *  `flicker` (0..1) adds a deterministic subtle flicker. Points down (-Y). */
export function FluorescentFixture({ position = [0, 3, 0] as V3, rotation, length = 1.4, width = 0.3, color = '#f4f0ff', intensity = 6, flicker = 0, seed = 1, frame }: {
  position?: V3; rotation?: V3; length?: number; width?: number; color?: string; intensity?: number; flicker?: number; seed?: number; frame?: number;
}) {
  ensureRect();
  const f = frame ?? 0;
  const fl = flicker > 0 ? 1 - flicker * (Math.sin(f * 1.7 + seed) > 0.97 ? 0.6 : 0) : 1;
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={_bevel(length + 0.08, 0.08, width + 0.08, 0.015)} material={getMaterial('metal-cream')} position={[0, 0.04, 0]} castShadow />
      <mesh geometry={_bevel(length, 0.012, width, 0.004)} material={getMaterial('emissive-cool', { emissive: color, emissiveIntensity: 2.2 * fl })} position={[0, -0.002, 0]} />
      <rectAreaLight args={[color, intensity * fl, length, width]} position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  );
}

/** Industrial cage lamp (bulkhead) on a wall or ceiling; warm point light with short falloff. */
export function CageLamp({ position = [0, 2.5, 0] as V3, rotation, color = '#ffb070', intensity = 4, distance = 6 }: { position?: V3; rotation?: V3; color?: string; intensity?: number; distance?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={cylinderBase(0.07, 0.08, 0.05, 16)} material={getMaterial('metal-dark')} />
      <mesh geometry={cylinderBase(0.055, 0.055, 0.12, 16)} material={getMaterial('emissive-gold', { emissive: color, emissiveIntensity: 1.6 })} position={[0, -0.12, 0]} />
      {[0, 1, 2, 3].map((i) => <mesh key={i} geometry={_bevel(0.008, 0.14, 0.008, 0.002)} material={getMaterial('metal-dark')} position={[Math.cos(i * Math.PI / 2) * 0.065, -0.06, Math.sin(i * Math.PI / 2) * 0.065]} />)}
      <pointLight position={[0, -0.08, 0]} color={color} intensity={intensity} distance={distance} decay={2} />
    </group>
  );
}

/**
 * Three-point lighting rig for a subject (character / hero object), placed in the subject's space:
 * key (soft spot, shadows) from the front-side and above, fill (dim, opposite side), rim (strong, behind).
 * `facing` = subject yaw (radians) so the rig follows the subject's orientation, not the camera.
 */
export function SubjectRig({ position = [0, 0, 0] as V3, facing = 0, height = 1.6, keyColor = '#ffe2d0', keyIntensity = 40, fillColor = '#5a2a2a', fillIntensity = 4, rimColor = '#ff1a24', rimIntensity = 60, keySide = 1, distance = 3.2, castShadow = true }: {
  position?: V3; facing?: number; height?: number; keyColor?: string; keyIntensity?: number; fillColor?: string; fillIntensity?: number; rimColor?: string; rimIntensity?: number; keySide?: 1 | -1; distance?: number; castShadow?: boolean;
}) {
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, height * 0.85, 0); return o; }, [height]);
  const at = (ang: number, dist: number, y: number): V3 => [Math.sin(ang) * dist, y, Math.cos(ang) * dist];
  return (
    <group position={position} rotation={[0, facing, 0]}>
      <primitive object={target} />
      <spotLight position={at(keySide * 0.75, distance, height + 1.4)} target={target} color={keyColor} intensity={keyIntensity} angle={0.55} penumbra={0.9} distance={distance * 3} decay={1.8} castShadow={castShadow} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002} shadow-normalBias={0.02} />
      <spotLight position={at(-keySide * 1.1, distance, height + 0.3)} target={target} color={fillColor} intensity={fillIntensity} angle={0.8} penumbra={1} distance={distance * 3} decay={1.8} />
      <spotLight position={at(Math.PI - keySide * 0.5, distance * 0.9, height + 1.0)} target={target} color={rimColor} intensity={rimIntensity} angle={0.5} penumbra={0.7} distance={distance * 3} decay={1.8} />
    </group>
  );
}

/** Screen glow: a soft area light in front of a monitor/screen surface (pair with a Screen asset). */
export function ScreenGlow({ position = [0, 1.5, 0] as V3, rotation, width = 0.5, height = 0.4, color = '#ff5a4a', intensity = 3 }: { position?: V3; rotation?: V3; width?: number; height?: number; color?: string; intensity?: number }) {
  ensureRect();
  return <rectAreaLight args={[color, intensity, width, height]} position={position} rotation={rotation} />;
}
