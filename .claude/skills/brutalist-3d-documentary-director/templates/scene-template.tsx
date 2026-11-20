// TEMPLATE — new project asset (zone / object / effect). Copy to <project>/src/project-assets/<Name>.tsx,
// rename, export it from src/project-assets/index.ts, then reference it by name in data/world-layout.json.
// Rules: procedural + low-poly · deterministic (pure function of frame) · shared geometry/materials ·
// meters, y-up, stands on y=0, faces +Z · props for everything a director may want to tune.
// Promote when reusable:  python3 SKILL/scripts/asset-library.py promote . src/project-assets/<Name>.tsx --id ... --category ...
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getMaterial, type MaterialPresetId } from '../library/materials/materials';
import { useAssetTime } from '../library/core/time';
import { envelope, rng } from '../library/core/math';
import { Pillar, SlotLight } from '../library/architecture/Structural';
import { DustMotes } from '../library/particles/Particles';

type V3 = [number, number, number];
const BOX = new THREE.BoxGeometry(1, 1, 1); // module-level: never allocate geometry per render

export interface SceneNameProps {
  position?: V3;
  rotation?: V3;
  material?: MaterialPresetId;
  /** frame window in which the hero element is revealed */
  revealStart?: number;
  revealEnd?: number;
  seed?: number;
  frame?: number; // optional override; defaults to Remotion's current frame
}

/** One-line description (also used for the asset manifest). Anchors: center [0, 1.5, 0], hero [0, 2, -3]. */
export function SceneName({ position, rotation, material = 'concrete-rough', revealStart = 0, revealEnd = 1e9, seed = 1, frame }: SceneNameProps) {
  const { frame: f, t } = useAssetTime(frame);
  const blocks = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 6 }, (_, i) => ({ x: (i - 2.5) * 3, h: 3 + r() * 5 }));
  }, [seed]);
  const reveal = envelope(f, revealStart, revealEnd, 24, 24);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={BOX} material={getMaterial('concrete-dark')} position={[0, -0.15, 0]} scale={[20, 0.3, 20]} receiveShadow />
      {blocks.map((b, i) => <Pillar key={i} position={[b.x, 0, -6]} height={b.h} material={material} />)}
      <mesh geometry={BOX} material={getMaterial('emissive-red')} position={[0, 2 + Math.sin(t) * 0.05, -3]} scale={[0.6 * reveal, 0.6 * reveal, 0.6 * reveal]} />
      <SlotLight position={[0, 6, -6]} length={10} />
      <DustMotes bounds={[18, 8, 18]} count={200} frame={frame} />
    </group>
  );
}
