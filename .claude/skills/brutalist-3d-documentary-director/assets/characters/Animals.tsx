// Animals. Pig: stylised but anatomically proportioned piglet/pig with breathing, ear flicks, snout
// twitch, head turns, tail curl and a distance-driven trot (no foot sliding). Faces +Z.
import React from 'react';
import * as THREE from 'three';
import { getMaterial } from '../materials/materials';
import { deformedSphere, lathe, taperedCapsule, tubeAlong, cached } from '../core/geometry';
import { clamp, noise1, smoothstep } from '../core/math';
import { useAssetTime } from '../core/time';

type V3 = [number, number, number];

const BODY = deformedSphere('pigbody', 1, (x, y, z) => {
  const back = z < 0 ? 1 - 0.12 * -z : 1;
  return [x * 0.82 * back, y * 0.78 * (1 + 0.06 * Math.max(0, y)) - (y < -0.6 ? 0.05 : 0), z * 1.45];
}, 40, 28);
const HEAD = deformedSphere('pighead', 1, (x, y, z) => [x * 0.85, y * 0.8, z * 1.1 + (z > 0.3 ? 0.25 * (z - 0.3) : 0)], 28, 20);
const EAR = cached('pigear', () => {
  const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0.05, 1.1)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.05, bevelSegments: 2 });
  g.computeVertexNormals();
  return g;
});

export interface PigProps {
  position?: V3;
  yaw?: number;
  size?: number; // body length metres (piglet 0.6, adult 1.2)
  walk?: { start: number; end: number; path: V3[] };
  sniff?: boolean;
  seed?: number;
  frame?: number;
}

export function Pig({ position = [0, 0, 0], yaw = 0, size = 0.9, walk, sniff = true, seed = 1, frame }: PigProps) {
  const { frame: f, t } = useAssetTime(frame);
  const s = size / 1.0;
  let pos: V3 = position;
  let heading = yaw;
  let phase = 0;
  let moving = 0;
  if (walk && walk.path.length > 1 && f >= walk.start) {
    const u = clamp((f - walk.start) / Math.max(1, walk.end - walk.start));
    const [a, b] = [walk.path[0], walk.path[walk.path.length - 1]];
    pos = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    heading = Math.atan2(b[0] - a[0], b[2] - a[2]);
    phase = (Math.hypot(b[0] - a[0], b[2] - a[2]) * u) / (0.5 * s); // stride 0.5 body-lengths
    moving = f < walk.end ? 1 : 0;
  }
  const breath = 1 + 0.025 * Math.sin(t * 3.1 + seed);
  const headYaw = 0.35 * noise1(seed + 3, t * 0.4);
  const headPitch = sniff ? 0.15 + 0.12 * Math.max(0, Math.sin(t * 2.2 + seed)) : 0;
  const earFlick = (k: number) => 0.25 * Math.max(0, Math.sin(t * 1.3 + seed * 3 + k * 2)) ** 8;
  const skin = getMaterial('pig-skin');
  const leg = (x: number, z: number, ph: number) => {
    const swing = moving * 0.5 * Math.sin((phase + ph) * Math.PI * 2);
    return (
      <group key={`${x}${z}`} position={[x * 0.27 * s, 0.32 * s, z * 0.42 * s]} rotation={[swing, 0, 0]}>
        <mesh geometry={taperedCapsule(0.045 * s, 0.075 * s, 0.3 * s, 12)} material={skin} position={[0, -0.3 * s, 0]} castShadow />
        <mesh geometry={lathe([[0.001, 0], [0.045, 0], [0.05, 0.03], [0.045, 0.06]], 12)} material={getMaterial('leather-dark')} position={[0, -0.33 * s, 0.01 * s]} scale={s} />
      </group>
    );
  };
  return (
    <group position={pos} rotation={[0, heading, 0]}>
      <group position={[0, 0.07 * s * moving * Math.abs(Math.sin(phase * Math.PI * 2)), 0]}>
        <mesh geometry={BODY} material={skin} position={[0, 0.55 * s, 0]} scale={[0.36 * s * breath, 0.34 * s * breath, 0.36 * s]} castShadow receiveShadow />
        {leg(1, 1, 0)}{leg(-1, 1, 0.5)}{leg(1, -1, 0.5)}{leg(-1, -1, 0)}
        <group position={[0, 0.63 * s, 0.5 * s]} rotation={[headPitch, headYaw, 0]}>
          <mesh geometry={HEAD} material={skin} position={[0, 0, 0.1 * s]} scale={0.22 * s} castShadow />
          {/* snout disc with nostrils */}
          <group position={[0, -0.02 * s, 0.36 * s]} rotation={[0, 0, 0.05 * Math.sin(t * 9) * (sniff ? 1 : 0)]}>
            <mesh geometry={cached('snout', () => new THREE.CylinderGeometry(1, 1.05, 0.7, 24).rotateX(Math.PI / 2))} material={skin} scale={[0.085 * s, 0.07 * s, 0.07 * s]} />
            {[-1, 1].map((sd) => <mesh key={sd} geometry={cached('nostril', () => new THREE.SphereGeometry(1, 10, 8))} material={getMaterial('matte-black')} position={[sd * 0.028 * s, 0, 0.026 * s]} scale={[0.012 * s, 0.018 * s, 0.006 * s]} />)}
          </group>
          {[-1, 1].map((sd) => (
            <mesh key={`eye${sd}`} geometry={cached('pigeye', () => new THREE.SphereGeometry(1, 12, 10))} material={getMaterial('eye-iris')} position={[sd * 0.1 * s, 0.07 * s, 0.24 * s]} scale={0.017 * s} />
          ))}
          {[-1, 1].map((sd) => (
            <mesh key={`ear${sd}`} geometry={EAR} material={skin} position={[sd * 0.12 * s, 0.15 * s, 0.05 * s]} rotation={[0.9 + earFlick(sd), sd * 0.4, sd * -0.6]} scale={0.12 * s} castShadow />
          ))}
        </group>
        <mesh geometry={tubeAlong([[0, 0.62, -0.5], [0.04, 0.68, -0.58], [-0.03, 0.73, -0.6], [0.0, 0.72, -0.53]], 0.012, 24, 8)} material={skin} scale={s} />
      </group>
    </group>
  );
}

/** Simple farrowing pen: steel tube railings, concrete kerb, straw bedding, trough. */
export function PigPen({ width = 3, depth = 2.4, position, rotation }: { width?: number; depth?: number; position?: V3; rotation?: V3 }) {
  const rail = (a: V3, b: V3) => tubeAlong([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.0001, (a[2] + b[2]) / 2], b], 0.022, 16, 10);
  const corners: V3[] = [[-width / 2, 0, -depth / 2], [width / 2, 0, -depth / 2], [width / 2, 0, depth / 2], [-width / 2, 0, depth / 2]];
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={cached(`straw${width}${depth}`, () => new THREE.PlaneGeometry(width, depth, 1, 1).rotateX(-Math.PI / 2))} material={getMaterial('straw')} position={[0, 0.02, 0]} receiveShadow />
      {corners.map((c, i) => <mesh key={i} geometry={cached('post', () => new THREE.CylinderGeometry(0.035, 0.035, 1.0, 12).translate(0, 0.5, 0))} material={getMaterial('metal-painted')} position={c} castShadow />)}
      {[0.35, 0.7, 0.95].map((y) => corners.map((c, i) => {
        const d = corners[(i + 1) % 4];
        return <mesh key={`${y}${i}`} geometry={rail([c[0], y, c[2]], [d[0], y, d[2]])} material={getMaterial('metal-painted')} castShadow />;
      }))}
      <mesh geometry={lathe([[0.001, 0], [0.18, 0], [0.22, 0.12], [0.2, 0.12], [0.16, 0.03], [0.001, 0.03]], 24)} material={getMaterial('metal-brushed')} position={[width / 2 - 0.4, 0.02, depth / 2 - 0.4]} scale={[1.4, 1, 0.8]} castShadow />
    </group>
  );
}

/** Small herd helper: N pigs scattered with seeds, gently wandering. */
export function PigGroup({ count = 3, area = [2.2, 1.6] as [number, number], size = 0.7, seed = 4, position, frame }: { count?: number; area?: [number, number]; size?: number; seed?: number; position?: V3; frame?: number }) {
  const { t } = useAssetTime(frame);
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => {
        const x = (noise1(seed + i, t * 0.05) * 0.5) * area[0];
        const z = (noise1(seed + i + 50, t * 0.05) * 0.5) * area[1];
        return <Pig key={i} position={[x + (i - (count - 1) / 2) * 0.6, 0, z]} yaw={noise1(seed + i * 7, t * 0.08) * 2.5} size={size * (0.9 + (i % 3) * 0.08)} seed={seed + i} frame={frame} />;
      })}
    </group>
  );
}
export { smoothstep as _pigSmooth };
