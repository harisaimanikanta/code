// Brutalist enclosed spaces: corridor, underground passage, monumental room, generic concrete room shell.
// Each space is oriented so the camera travels along local -Z (entry at z=0, exit at z=-length).
import React from 'react';
import * as THREE from 'three';
import { bevelBox } from '../core/geometry';

const bb = (v: [number, number, number] | number[]) => bevelBox(v[0], v[1], v[2]);
import { getMaterial, type MaterialPresetId } from '../materials/materials';
import { Pillar, SlotLight, CofferedCeiling } from './Structural';

type V3 = [number, number, number];
const box = new THREE.BoxGeometry(1, 1, 1);

/** Long colonnaded corridor with ceiling beams and floor-level red slot lights. Entry z=0 → exit z=-length. */
export function BrutalistCorridor({ length = 40, width = 7, height = 7, bay = 5, position = [0, 0, 0] as V3, rotation, material = 'concrete-rough' as MaterialPresetId, lights = true, lightColor = '#ff1a2a', openEnds = true }: {
  length?: number; width?: number; height?: number; bay?: number; position?: V3; rotation?: V3; material?: MaterialPresetId; lights?: boolean; lightColor?: string; openEnds?: boolean;
}) {
  const m = getMaterial(material);
  const bays = Math.max(1, Math.floor(length / bay));
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bb([width + 2, 0.3, length])} material={getMaterial('concrete-dark')} position={[0, -0.15, -length / 2]} receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={box} material={m} position={[s * (width / 2 + 0.5), height / 2, -length / 2]} scale={[1, height, length]} receiveShadow castShadow />
      ))}
      <mesh geometry={bb([width + 2, 0.8, length])} material={m} position={[0, height + 0.4, -length / 2]} receiveShadow />
      {Array.from({ length: bays + 1 }, (_, i) => (
        <group key={i} position={[0, 0, -i * bay]}>
          <mesh geometry={bb([width, 0.8, 0.7])} material={m} position={[0, height - 0.4, 0]} castShadow />
          {[-1, 1].map((s) => (
            <Pillar key={s} position={[s * (width / 2 - 0.35), 0, 0]} height={height - 0.8} width={0.7} capital={false} material={material} />
          ))}
          {lights && i < bays && i % 2 === 0 && (
            <SlotLight position={[0, 0.05, -bay / 2]} rotation={[0, Math.PI / 2, 0]} length={bay * 0.6} color={lightColor} intensity={4} distance={9} />
          )}
        </group>
      ))}
      {!openEnds && <mesh geometry={bb([width + 2, height, 1])} material={m} position={[0, height / 2, -length - 0.5]} />}
    </group>
  );
}

/** Low trapezoidal underground passage with ribbed concrete segments. Entry z=0 → exit z=-length. */
export function UndergroundPassage({ length = 30, width = 4.5, height = 3.6, rib = 2.4, position = [0, 0, 0] as V3, rotation, lightColor = '#ff2a1a' }: {
  length?: number; width?: number; height?: number; rib?: number; position?: V3; rotation?: V3; lightColor?: string;
}) {
  const m = getMaterial('concrete-dark');
  const ribs = Math.floor(length / rib);
  const lean = 0.35;
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bb([width + 1, 0.2, length])} material={m} position={[0, -0.1, -length / 2]} receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={box} material={m} position={[s * (width / 2 + 0.2), height / 2, -length / 2]} rotation={[0, 0, s * lean * 0.3]} scale={[0.4, height + 0.4, length]} receiveShadow />
      ))}
      <mesh geometry={bb([width * 0.85, 0.4, length])} material={m} position={[0, height + 0.2, -length / 2]} receiveShadow />
      {Array.from({ length: ribs + 1 }, (_, i) => (
        <group key={i} position={[0, 0, -i * rib]}>
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={box} material={getMaterial('concrete-rough')} position={[s * (width / 2 - 0.05), height / 2, 0]} rotation={[0, 0, s * lean * 0.3]} scale={[0.35, height, 0.45]} castShadow />
          ))}
          <mesh geometry={bb([width * 0.9, 0.35, 0.45])} material={getMaterial('concrete-rough')} position={[0, height - 0.05, 0]} />
          {i % 3 === 1 && <SlotLight position={[0, height - 0.3, 0]} length={width * 0.5} color={lightColor} intensity={3} distance={7} />}
        </group>
      ))}
    </group>
  );
}

/** Monumental hall: huge volume, coffered ceiling, light slit, colonnade. Centered at origin. */
export function MonumentalRoom({ size = [30, 30] as [number, number], height = 14, position = [0, 0, 0] as V3, rotation, colonnade = true, skylight = true, material = 'concrete-rough' as MaterialPresetId, doorways = [] as Array<{ wall: 'n' | 's' | 'e' | 'w'; offset?: number; width?: number; height?: number }> }: {
  size?: [number, number]; height?: number; position?: V3; rotation?: V3; colonnade?: boolean; skylight?: boolean; material?: MaterialPresetId; doorways?: Array<{ wall: 'n' | 's' | 'e' | 'w'; offset?: number; width?: number; height?: number }>;
}) {
  const m = getMaterial(material);
  const [w, d] = size;
  const wall = (key: string, pos: V3, scale: V3) => <mesh key={key} geometry={box} material={m} position={pos} scale={scale} receiveShadow castShadow />;
  const walls: React.ReactNode[] = [];
  const buildWall = (side: 'n' | 's' | 'e' | 'w') => {
    const along = side === 'n' || side === 's' ? w : d;
    const door = doorways.find((x) => x.wall === side);
    const fixed = side === 'n' ? -d / 2 : side === 's' ? d / 2 : side === 'e' ? w / 2 : -w / 2;
    const horiz = side === 'n' || side === 's';
    const place = (a: number, len: number, y: number, h: number) =>
      wall(`${side}-${a}-${y}`, horiz ? [a, y, fixed] : [fixed, y, a], horiz ? [len, h, 1] : [1, h, len]);
    if (!door) { walls.push(place(0, along + 1, height / 2, height)); return; }
    const dw = door.width ?? 3, dh = door.height ?? 5, off = door.offset ?? 0;
    const leftLen = along / 2 + off - dw / 2;
    const rightLen = along / 2 - off - dw / 2;
    walls.push(place(-along / 2 + leftLen / 2, leftLen, height / 2, height));
    walls.push(place(along / 2 - rightLen / 2, rightLen, height / 2, height));
    walls.push(place(off, dw, dh + (height - dh) / 2, height - dh));
  };
  (['n', 's', 'e', 'w'] as const).forEach(buildWall);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bb([w + 2, 0.4, d + 2])} material={getMaterial('concrete-dark')} position={[0, -0.2, 0]} receiveShadow />
      {walls}
      <CofferedCeiling size={[w, d]} height={height} cell={w / 8} depth={1.2} />
      {skylight && <mesh geometry={bb([w * 0.06, 0.05, d * 0.8])} material={getMaterial('emissive-white', { emissiveIntensity: 1.2 })} position={[0, height + 1.3, 0]} />}
      {colonnade && [-1, 1].map((s) => (
        <group key={s}>
          {Array.from({ length: 5 }, (_, i) => (
            <Pillar key={i} position={[s * w * 0.32, 0, -d * 0.4 + i * (d * 0.8) / 4]} height={height} width={1.3} capital={false} />
          ))}
        </group>
      ))}
    </group>
  );
}

/** Closed concrete room shell (floor, 3 walls, ceiling, open front at +Z) with a window slit. */
export function ConcreteRoom({ size = [10, 4, 8] as V3, position = [0, 0, 0] as V3, rotation, windowSlit = true, material = 'concrete-rough' as MaterialPresetId }: {
  size?: V3; position?: V3; rotation?: V3; windowSlit?: boolean; material?: MaterialPresetId;
}) {
  const m = getMaterial(material);
  const [w, h, d] = size;
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bb([w, 0.3, d])} material={getMaterial('concrete-dark')} position={[0, -0.15, 0]} receiveShadow />
      <mesh geometry={box} material={m} position={[0, h / 2, -d / 2]} scale={[w, h, 0.4]} receiveShadow />
      {[-1, 1].map((s) => <mesh key={s} geometry={box} material={m} position={[s * w / 2, h / 2, 0]} scale={[0.4, h, d]} receiveShadow />)}
      <mesh geometry={bb([w, 0.4, d])} material={m} position={[0, h + 0.2, 0]} receiveShadow />
      {windowSlit && <mesh geometry={bb([w * 0.7, 0.18, 0.02])} material={getMaterial('emissive-white', { emissiveIntensity: 0.35, emissive: '#ffb59a' })} position={[0, h * 0.72, -d / 2 + 0.21]} />}
    </group>
  );
}
