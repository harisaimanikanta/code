// Brutalist structural kit: slabs, pillars, pillar rows, platforms, stairs, doorways, monoliths,
// coffered ceilings, slot lights. All sizes in meters; all pieces sit on y=0 unless noted.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bevelBox } from '../core/geometry';

const bb = (v: [number, number, number] | number[]) => bevelBox(v[0], v[1], v[2]);
import { getMaterial, type MaterialPresetId } from '../materials/materials';
import { rng } from '../core/math';

type V3 = [number, number, number];
type Base = { position?: V3; rotation?: V3; material?: MaterialPresetId; castShadow?: boolean; receiveShadow?: boolean };

const box = new THREE.BoxGeometry(1, 1, 1);

/** Axis-aligned concrete block. `size` = [w, h, d]; positioned by its base center. */
export function ConcreteSlab({ size = [4, 0.4, 4], position = [0, 0, 0], rotation, material = 'concrete-rough', castShadow = true, receiveShadow = true }: Base & { size?: V3 }) {
  return (
    <mesh geometry={bb(size)} material={getMaterial(material)} position={[position[0], position[1] + size[1] / 2, position[2]]} rotation={rotation} castShadow={castShadow} receiveShadow={receiveShadow} />
  );
}

/** Monumental square pillar with stepped capital and plinth. */
export function Pillar({ height = 8, width = 1.1, position = [0, 0, 0], rotation, material = 'concrete-rough', capital = true }: Base & { height?: number; width?: number; capital?: boolean }) {
  const m = getMaterial(material);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bb([width * 1.35, 0.4, width * 1.35])} material={m} position={[0, 0.2, 0]} castShadow receiveShadow />
      <mesh geometry={bb([width, height, width])} material={m} position={[0, height / 2, 0]} castShadow receiveShadow />
      {capital && (
        <>
          <mesh geometry={bb([width * 1.3, 0.3, width * 1.3])} material={m} position={[0, height - 0.35, 0]} castShadow />
          <mesh geometry={bb([width * 1.6, 0.2, width * 1.6])} material={m} position={[0, height - 0.1, 0]} castShadow />
        </>
      )}
    </group>
  );
}

/** Row of pillars along local +Z. Classic occlusion-wipe foreground element. */
export function PillarRow({ count = 6, spacing = 5, height = 8, width = 1.1, position = [0, 0, 0], rotation, material = 'concrete-rough' }: Base & { count?: number; spacing?: number; height?: number; width?: number }) {
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: count }, (_, i) => (
        <Pillar key={i} position={[0, 0, i * spacing]} height={height} width={width} material={material} />
      ))}
    </group>
  );
}

/** Raised platform with optional steps on the front (+Z) face. */
export function Platform({ size = [6, 0.8, 6], steps = 3, position = [0, 0, 0], rotation, material = 'concrete-rough' }: Base & { size?: V3; steps?: number }) {
  const m = getMaterial(material);
  const stepH = size[1] / Math.max(1, steps);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bb(size)} material={m} position={[0, size[1] / 2, 0]} castShadow receiveShadow />
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={i} geometry={box} material={m} position={[0, stepH * (i + 0.5), size[2] / 2 + (steps - i) * 0.4 - 0.2]} scale={[size[0] * 0.6, stepH * (i + 1), 0.4]} castShadow receiveShadow />
      ))}
    </group>
  );
}

/** Monumental straight staircase rising along local -Z. */
export function Staircase({ steps = 14, rise = 0.25, run = 0.45, width = 5, position = [0, 0, 0], rotation, material = 'concrete-rough', walls = true }: Base & { steps?: number; rise?: number; run?: number; width?: number; walls?: boolean }) {
  const m = getMaterial(material);
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={i} geometry={box} material={m} position={[0, (rise * (i + 1)) / 2, -i * run]} scale={[width, rise * (i + 1), run]} castShadow receiveShadow />
      ))}
      {walls && [-1, 1].map((s) => (
        <mesh key={s} geometry={box} material={m} position={[(s * (width + 0.6)) / 2, (rise * steps) / 2 + 0.6, (-steps * run) / 2]} scale={[0.6, rise * steps + 1.2, steps * run + 0.5]} castShadow receiveShadow />
      ))}
    </group>
  );
}

/** Wall with a rectangular opening. Camera passes through the opening (doorway transition). */
export function Doorway({ width = 2.4, height = 4, depth = 1, wallWidth = 14, wallHeight = 9, position = [0, 0, 0], rotation, material = 'concrete-rough', glow }: Base & { width?: number; height?: number; depth?: number; wallWidth?: number; wallHeight?: number; glow?: MaterialPresetId }) {
  const m = getMaterial(material);
  const side = (wallWidth - width) / 2;
  return (
    <group position={position} rotation={rotation}>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={box} material={m} position={[s * (width / 2 + side / 2), wallHeight / 2, 0]} scale={[side, wallHeight, depth]} castShadow receiveShadow />
      ))}
      <mesh geometry={bb([width, wallHeight - height, depth])} material={m} position={[0, height + (wallHeight - height) / 2, 0]} castShadow receiveShadow />
      {/* recessed frame */}
      <mesh geometry={bb([width + 0.6, 0.3, 0.1])} material={getMaterial('concrete-dark')} position={[0, height + 0.15, depth / 2 + 0.05]} />
      {glow && <mesh geometry={bb([width, 0.04, depth])} material={getMaterial(glow)} position={[0, 0.02, 0]} />}
    </group>
  );
}

/** Stack of offset blocks — abstract monument / landmark for orbits. */
export function Monolith({ seed = 1, blocks = 5, scale = 1, position = [0, 0, 0], rotation, material = 'concrete-dark' }: Base & { seed?: number; blocks?: number; scale?: number }) {
  const parts = useMemo(() => {
    const r = rng(seed);
    let y = 0;
    return Array.from({ length: blocks }, () => {
      const h = (1 + r() * 2.5) * scale;
      const w = (1.5 + r() * 2.5) * scale;
      const d = (1.5 + r() * 2.5) * scale;
      const p: V3 = [(r() - 0.5) * scale * 1.2, y + h / 2, (r() - 0.5) * scale * 1.2];
      y += h * 0.92;
      return { p, s: [w, h, d] as V3 };
    });
  }, [seed, blocks, scale]);
  const m = getMaterial(material);
  return (
    <group position={position} rotation={rotation}>
      {parts.map((b, i) => <mesh key={i} geometry={box} material={m} position={b.p} scale={b.s} castShadow receiveShadow />)}
    </group>
  );
}

/** Deep coffered ceiling grid placed at `height`, spanning `size` = [w, d]. */
export function CofferedCeiling({ size = [20, 20], height = 9, cell = 2.5, depth = 0.8, position = [0, 0, 0], material = 'concrete-dark' }: Base & { size?: [number, number]; height?: number; cell?: number; depth?: number }) {
  const m = getMaterial(material);
  const nx = Math.max(1, Math.round(size[0] / cell));
  const nz = Math.max(1, Math.round(size[1] / cell));
  return (
    <group position={position}>
      <mesh geometry={bb([size[0], 0.3, size[1]])} material={m} position={[0, height + depth + 0.15, 0]} receiveShadow />
      {Array.from({ length: nx + 1 }, (_, i) => (
        <mesh key={`x${i}`} geometry={box} material={m} position={[-size[0] / 2 + i * (size[0] / nx), height + depth / 2, 0]} scale={[0.3, depth, size[1]]} />
      ))}
      {Array.from({ length: nz + 1 }, (_, i) => (
        <mesh key={`z${i}`} geometry={box} material={m} position={[0, height + depth / 2, -size[1] / 2 + i * (size[1] / nz)]} scale={[size[0], depth, 0.3]} />
      ))}
    </group>
  );
}

/** Emissive slot/strip light (practical). Optionally emits a real light. */
export function SlotLight({ length = 6, thickness = 0.08, position = [0, 0, 0], rotation, material = 'emissive-red', light = true, color = '#ff2233', intensity = 6, distance = 12 }: Base & { length?: number; thickness?: number; light?: boolean; color?: string; intensity?: number; distance?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bb([length, thickness, thickness])} material={getMaterial(material)} />
      {light && <pointLight color={color} intensity={intensity} distance={distance} decay={1.6} />}
    </group>
  );
}
