// Practical (in-world, physically placed) lights: hanging industrial lamp, spotlight pool, desk lamp.
import React, { useMemo } from 'react';
import * as THREE from 'three';
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
      <mesh geometry={box} material={getMaterial('metal-dark')} position={[0, cable / 2, 0]} scale={[0.02, cable, 0.02]} />
      <mesh geometry={shade} material={getMaterial('metal-dark', { side: THREE.DoubleSide })} />
      <mesh geometry={box} material={getMaterial('emissive-white')} position={[0, -0.12, 0]} scale={[0.14, 0.04, 0.14]} />
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
      <mesh geometry={box} material={getMaterial('metal-dark')} position={[0, 0.01, 0]} scale={[0.15, 0.02, 0.15]} />
      <mesh geometry={box} material={getMaterial('metal-dark')} position={[0, 0.2, -0.03]} rotation={[0.3, 0, 0]} scale={[0.02, 0.4, 0.02]} />
      <mesh geometry={box} material={getMaterial('metal-dark')} position={[0, 0.38, 0.08]} rotation={[-0.9, 0, 0]} scale={[0.02, 0.3, 0.02]} />
      <mesh geometry={box} material={getMaterial('emissive-white', { emissive: color })} position={[0, 0.3, 0.18]} scale={[0.08, 0.02, 0.08]} />
      <pointLight position={[0, 0.25, 0.18]} color={color} intensity={intensity} distance={2.5} decay={2} />
    </group>
  );
}
