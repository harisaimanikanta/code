// Furniture & architectural objects: chair, desk, lectern, bench, hinged door, screen, crate, filing cabinet.
import React from 'react';
import * as THREE from 'three';
import { bevelBox } from '../core/geometry';

const bb = (v: [number, number, number] | number[]) => bevelBox(v[0], v[1], v[2]);
import { getMaterial, type MaterialPresetId } from '../materials/materials';
import { envelope, progress, smoothstep } from '../core/math';
import { useAssetTime } from '../core/time';

type V3 = [number, number, number];
type P = { position?: V3; rotation?: V3; scale?: number };
const box = new THREE.BoxGeometry(1, 1, 1);

/** Angular steel chair. Seat height 0.46. Front faces +Z. */
export function Chair({ position, rotation, scale = 1, material = 'metal-dark' as MaterialPresetId }: P & { material?: MaterialPresetId }) {
  const m = getMaterial(material);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([0.46, 0.04, 0.44])} material={m} position={[0, 0.46, 0]} castShadow />
      <mesh geometry={bb([0.46, 0.6, 0.04])} material={m} position={[0, 0.78, -0.21]} rotation={[-0.08, 0, 0]} castShadow />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} geometry={box} material={m} position={[x * 0.2, 0.23, z * 0.19]} scale={[0.03, 0.46, 0.03]} />
      ))}
    </group>
  );
}

/** Heavy concrete-and-steel desk. Top at 0.76. */
export function Desk({ width = 1.8, depth = 0.85, position, rotation, scale = 1 }: P & { width?: number; depth?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([width, 0.05, depth])} material={getMaterial('metal-dark')} position={[0, 0.74, 0]} castShadow receiveShadow />
      <mesh geometry={bb([0.45, 0.72, depth])} material={getMaterial('concrete-dark')} position={[-width / 2 + 0.25, 0.36, 0]} castShadow receiveShadow />
      <mesh geometry={bb([0.08, 0.72, depth])} material={getMaterial('concrete-dark')} position={[width / 2 - 0.05, 0.36, 0]} castShadow />
    </group>
  );
}

/** Monolithic lectern for conference scenes. Front faces +Z. */
export function Lectern({ position, rotation, scale = 1, glow = true }: P & { glow?: boolean }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([0.7, 1.1, 0.5])} material={getMaterial('concrete-dark')} position={[0, 0.55, 0]} castShadow receiveShadow />
      <mesh geometry={bb([0.8, 0.05, 0.55])} material={getMaterial('metal-dark')} position={[0, 1.15, -0.05]} rotation={[0.3, 0, 0]} castShadow />
      {glow && <mesh geometry={bb([0.5, 0.02, 0.01])} material={getMaterial('emissive-red')} position={[0, 0.9, 0.255]} />}
    </group>
  );
}

/** Long concrete bench. */
export function Bench({ length = 3, position, rotation, scale = 1 }: P & { length?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([length, 0.12, 0.5])} material={getMaterial('concrete-rough')} position={[0, 0.42, 0]} castShadow receiveShadow />
      {[-1, 1].map((s) => <mesh key={s} geometry={box} material={getMaterial('concrete-rough')} position={[s * (length / 2 - 0.3), 0.18, 0]} scale={[0.25, 0.36, 0.45]} />)}
    </group>
  );
}

/** Hinged steel door; opens between openStart..openEnd frames (angle in degrees). Hinge on local -X edge. */
export function Door({ width = 1.4, height = 3, openStart = 0, openEnd = 0, openAngle = 100, position, rotation, scale = 1, frame }: P & { width?: number; height?: number; openStart?: number; openEnd?: number; openAngle?: number; frame?: number }) {
  const { frame: f } = useAssetTime(frame);
  const a = openEnd > openStart ? smoothstep(0, 1, progress(f, openStart, openEnd)) * (openAngle * Math.PI) / 180 : 0;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group position={[-width / 2, 0, 0]} rotation={[0, -a, 0]}>
        <mesh geometry={bb([width, height, 0.08])} material={getMaterial('metal-painted')} position={[width / 2, height / 2, 0]} castShadow receiveShadow />
        <mesh geometry={bb([0.04, 0.3, 0.04])} material={getMaterial('metal-brushed')} position={[width - 0.15, height * 0.45, 0.06]} />
        <mesh geometry={bb([width * 0.25, height * 0.3, 0.01])} material={getMaterial('glass-tinted-red')} position={[width / 2, height * 0.72, 0.045]} />
      </group>
    </group>
  );
}

/** Wall screen / monitor. `content`: 'bars' | 'graph' | 'scan' | 'blank'. Content animates with frame. */
export function Screen({ width = 3.2, height = 1.8, content = 'graph' as 'bars' | 'graph' | 'scan' | 'blank', color = 'emissive-red' as MaterialPresetId, on = [0, 1e9] as [number, number], position, rotation, scale = 1, frame }: P & { width?: number; height?: number; content?: 'bars' | 'graph' | 'scan' | 'blank'; color?: MaterialPresetId; on?: [number, number]; frame?: number }) {
  const { frame: f, t } = useAssetTime(frame);
  const power = envelope(f, on[0], on[1], 8, 8);
  const em = getMaterial(color);
  const n = 12;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb([width + 0.12, height + 0.12, 0.08])} material={getMaterial('metal-dark')} castShadow />
      <mesh geometry={bb([width, height, 0.01])} material={getMaterial('matte-black')} position={[0, 0, 0.045]} />
      {power > 0.01 && content === 'bars' && Array.from({ length: n }, (_, i) => {
        const h = (0.2 + 0.7 * Math.abs(Math.sin(i * 1.7 + t * 1.3))) * height * 0.8 * power;
        return <mesh key={i} geometry={box} material={em} position={[-width / 2 + (i + 0.5) * (width / n), -height * 0.4 + h / 2, 0.055]} scale={[(width / n) * 0.6, h, 0.005]} />;
      })}
      {power > 0.01 && content === 'graph' && Array.from({ length: 24 }, (_, i) => {
        const x = -width / 2 + (i + 0.5) * (width / 24);
        const y = Math.sin(i * 0.5 + t * 2) * height * 0.25 * power;
        return <mesh key={i} geometry={box} material={em} position={[x, y, 0.055]} scale={[width / 30, 0.03, 0.005]} />;
      })}
      {power > 0.01 && content === 'scan' && (
        <mesh geometry={bb([width * 0.95, 0.025, 0.005])} material={em} position={[0, ((t * 0.6) % 1 - 0.5) * height, 0.055]} />
      )}
    </group>
  );
}

/** Industrial crate / container. */
export function Crate({ size = [1, 1, 1] as V3, position, rotation, scale = 1 }: P & { size?: V3 }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bb(size)} material={getMaterial('metal-painted')} position={[0, size[1] / 2, 0]} castShadow receiveShadow />
      {[-1, 1].map((s) => <mesh key={s} geometry={box} material={getMaterial('metal-dark')} position={[0, size[1] / 2, s * (size[2] / 2 + 0.01)]} scale={[size[0] * 1.02, size[1] * 0.12, 0.02]} />)}
    </group>
  );
}

/** Steel filing cabinet with N drawers (archive / bureaucracy scenes). */
export function FilingCabinet({ drawers = 4, position, rotation, scale = 1 }: P & { drawers?: number }) {
  const h = drawers * 0.35;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={box} material={getMaterial('metal-dark')} position={[0, h / 2, 0]} scale={[0.5, h, 0.65]} castShadow receiveShadow />
      {Array.from({ length: drawers }, (_, i) => (
        <mesh key={i} geometry={box} material={getMaterial('metal-brushed')} position={[0, 0.17 + i * 0.35, 0.33]} scale={[0.14, 0.025, 0.02]} />
      ))}
    </group>
  );
}
