// Reusable SPATIAL transition building blocks. A transition is always: (1) physical geometry in the
// world + (2) a continuous camera move through/around it + (optionally) (3) a screen-space occlusion
// overlay driven by the camera's distance to an occluder. There are no editorial cuts.
// See references/transition-system.md and transition-types.json for recipes.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bevelBox } from '../core/geometry';

const bb = (v: [number, number, number] | number[]) => bevelBox(v[0], v[1], v[2]);
import { getMaterial, blendedMaterial, type MaterialPresetId } from '../materials/materials';
import { smoothstep, progress, easings } from '../core/math';
import { useAssetTime } from '../core/time';
import { FluidSurface } from '../biological/Fluid';

type V3 = [number, number, number];
const BOX = new THREE.BoxGeometry(1, 1, 1);

/** Optical path inside a microscope: concentric emissive rings receding along -Z. Entry z=0. */
export function LensTunnel({ length = 20, radius = 2.2, rings = 26, color = 'emissive-toxic' as MaterialPresetId, position, rotation, frame }: {
  length?: number; radius?: number; rings?: number; color?: MaterialPresetId; position?: V3; rotation?: V3; frame?: number;
}) {
  const { t } = useAssetTime(frame);
  const ring = useMemo(() => new THREE.TorusGeometry(1, 0.025, 4, 40), []);
  const tube = useMemo(() => new THREE.CylinderGeometry(radius * 1.2, radius * 1.2, length, 24, 1, true), [radius, length]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={tube} material={getMaterial('matte-black', { side: THREE.BackSide })} position={[0, 0, -length / 2]} rotation={[Math.PI / 2, 0, 0]} />
      {Array.from({ length: rings }, (_, i) => {
        const u = i / rings;
        const pulse = 0.6 + 0.4 * Math.sin(t * 3 - i * 0.5);
        return <mesh key={i} geometry={ring} material={getMaterial(i % 3 === 0 ? 'emissive-red' : color, { emissiveIntensity: 1.2 * pulse })} position={[0, 0, -u * length]} scale={radius * (1 - u * 0.55)} />;
      })}
    </group>
  );
}

/** Scales its children from `from` to `to` between frames [start, end] around a pivot (scale transformation). */
export function ScaleTransform({ start, end, from = 1, to = 50, pivot = [0, 0, 0] as V3, position, children, frame }: {
  start: number; end: number; from?: number; to?: number; pivot?: V3; position?: V3; children: React.ReactNode; frame?: number;
}) {
  const { frame: f } = useAssetTime(frame);
  // exponential interpolation reads as constant-rate zoom
  const k = easings.inOutSine(progress(f, start, end));
  const s = from * Math.pow(to / from, k);
  return (
    <group position={position}>
      <group position={pivot} scale={s}>
        <group position={[-pivot[0], -pivot[1], -pivot[2]]}>{children}</group>
      </group>
    </group>
  );
}

/** Architectural morph: blocks rise/slide into place with stagger between [start, end]. */
export function AssembleBlocks({ blocks, start, end, rise = 8, material = 'concrete-rough' as MaterialPresetId, position, rotation, frame }: {
  blocks: Array<{ position: V3; size: V3 }>; start: number; end: number; rise?: number; material?: MaterialPresetId; position?: V3; rotation?: V3; frame?: number;
}) {
  const { frame: f } = useAssetTime(frame);
  const m = getMaterial(material);
  const span = end - start;
  return (
    <group position={position} rotation={rotation}>
      {blocks.map((b, i) => {
        const s0 = start + (i / Math.max(1, blocks.length)) * span * 0.6;
        const k = smoothstep(s0, s0 + span * 0.4, f);
        return <mesh key={i} geometry={BOX} material={m} position={[b.position[0], b.position[1] + b.size[1] / 2 - (1 - k) * rise, b.position[2]]} scale={b.size} castShadow receiveShadow />;
      })}
    </group>
  );
}

/** Wall/slab whose material transforms (e.g. concrete → flesh-wall) between frames [start, end]. */
export function MaterialMorphSlab({ from = 'concrete-rough' as MaterialPresetId, to = 'flesh-wall' as MaterialPresetId, start, end, size = [10, 6, 0.5] as V3, position, rotation, frame }: {
  from?: MaterialPresetId; to?: MaterialPresetId; start: number; end: number; size?: V3; position?: V3; rotation?: V3; frame?: number;
}) {
  const { frame: f } = useAssetTime(frame);
  const k = smoothstep(start, end, f);
  return <mesh geometry={bb(size)} material={blendedMaterial(from, to, k)} position={position} rotation={rotation} castShadow receiveShadow />;
}

/** Liquid portal: a fluid surface with a darker volume underneath; camera dives through the surface. */
export function LiquidPortal({ size = [14, 14] as [number, number], depth = 6, color = '#5a0a10', glow = false, position, rotation, frame }: {
  size?: [number, number]; depth?: number; color?: string; glow?: boolean; position?: V3; rotation?: V3; frame?: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      <FluidSurface size={size} color={color} glow={glow} frame={frame} />
      <mesh geometry={bb([size[0], depth, size[1]])} material={getMaterial('glass-tinted-red', { opacity: 0.35, side: THREE.BackSide })} position={[0, -depth / 2, 0]} />
    </group>
  );
}
