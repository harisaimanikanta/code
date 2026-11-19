// Instanced crowds: seated conference audience and standing background crowds.
// One draw call per body part regardless of crowd size. Subtle deterministic per-person motion.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getMaterial, type MaterialPresetId } from '../materials/materials';
import { noise1, rng } from '../core/math';
import { useAssetTime } from '../core/time';

type V3 = [number, number, number];
const BOX = new THREE.BoxGeometry(1, 1, 1);
// v2 silhouettes: lathe torso with sloped shoulders, smooth heads with hair caps (instanced, varied colours)
const TORSO = new THREE.LatheGeometry([[0.001, -0.5], [0.42, -0.5], [0.46, -0.1], [0.5, 0.25], [0.44, 0.42], [0.2, 0.5], [0.001, 0.5]].map(([r, y]) => new THREE.Vector2(r, y)), 18);
const HEAD = new THREE.SphereGeometry(1, 20, 14);
const HAIR = new THREE.SphereGeometry(1.08, 20, 10, 0, Math.PI * 2, 0, 1.5).rotateX(-0.6);
const HAIR_COLORS = ['#15100d', '#2a1a10', '#3a2416', '#8f8a85', '#4a3a2a', '#b9b2a8', '#1d1512'];

export interface CrowdProps {
  mode?: 'seated' | 'standing';
  rows?: number;
  perRow?: number;
  spacing?: [number, number]; // [seat spacing, row spacing]
  tier?: number; // rise per row (raked seating)
  seed?: number;
  position?: V3;
  rotation?: V3;
  /** Facing direction: crowd faces local +Z. `attention` in 0..1 turns heads toward `lookAt` (local). */
  attention?: number;
  lookAt?: V3;
  bodyMaterial?: MaterialPresetId;
  frame?: number;
  /** Rows to skip (for aisles), fraction of seats left empty. */
  emptyRatio?: number;
}

export function Crowd({ mode = 'seated', rows = 6, perRow = 14, spacing = [0.75, 1.1], tier = 0.35, seed = 9, position, rotation, attention = 0.6, lookAt = [0, 1.6, 8], bodyMaterial = 'fabric-suit-dark', frame, emptyRatio = 0.12 }: CrowdProps) {
  const { t } = useAssetTime(frame);
  const people = useMemo(() => {
    const r = rng(seed);
    const out: { x: number; y: number; z: number; h: number; w: number; ph: number; tone: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let i = 0; i < perRow; i++) {
        if (r() < emptyRatio) continue;
        out.push({ x: (i - (perRow - 1) / 2) * spacing[0] + (r() - 0.5) * 0.08, y: row * tier, z: -row * spacing[1], h: 0.9 + r() * 0.2, w: 0.9 + r() * 0.25, ph: r() * 100, tone: r() });
      }
    }
    return out;
  }, [rows, perRow, spacing, tier, seed, emptyRatio]);

  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const hairs = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sv = new THREE.Vector3();
    const pv = new THREE.Vector3();
    const seated = mode === 'seated';
    const color = new THREE.Color();
    people.forEach((p, i) => {
      const torsoBase = seated ? 0.5 : 0.92 * p.h;
      const sway = noise1(i + seed, t * 0.3 + p.ph) * 0.05;
      // torso
      e.set(0.05 + sway * 0.5, sway, 0); q.setFromEuler(e);
      pv.set(p.x, p.y + torsoBase + 0.3 * p.h, p.z); sv.set(0.46 * p.w, 0.62 * p.h, 0.3 * p.w);
      m.compose(pv, q, sv); bodies.current?.setMatrixAt(i, m);
      color.set(['#3a3a40', '#2a2a2e', '#4a1a20', '#5a5650', '#2a3040', '#6a6258'][Math.floor(p.tone * 6)]); bodies.current?.setColorAt(i, color);
      // head looks toward lookAt with per-person attention
      const dx = lookAt[0] - p.x, dz = lookAt[2] - p.z;
      const yaw = Math.atan2(dx, dz) * attention + noise1(i * 3 + seed, t * 0.2 + p.ph) * 0.25 * (1 - attention);
      e.set(-0.05 + noise1(i + 77, t * 0.25) * 0.06, yaw, 0); q.setFromEuler(e);
      pv.set(p.x, p.y + torsoBase + 0.72 * p.h, p.z); sv.set(0.1, 0.125, 0.11).multiplyScalar(p.h);
      m.compose(pv, q, sv); heads.current?.setMatrixAt(i, m);
      hairs.current?.setMatrixAt(i, m);
      color.set(HAIR_COLORS[Math.floor(p.tone * 997) % HAIR_COLORS.length]); hairs.current?.setColorAt(i, color);
      // legs (thigh block forward when seated, column when standing)
      e.set(0, 0, 0); q.setFromEuler(e);
      if (seated) { pv.set(p.x, p.y + 0.48, p.z + 0.22); sv.set(0.36 * p.w, 0.14, 0.45); }
      else { pv.set(p.x, p.y + 0.46 * p.h, p.z); sv.set(0.34 * p.w, 0.92 * p.h, 0.2); }
      m.compose(pv, q, sv); legs.current?.setMatrixAt(i, m);
    });
    for (const ref of [bodies, heads, legs, hairs]) {
      if (!ref.current) continue;
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [people, t, mode, attention, lookAt, seed]);

  const n = people.length;
  return (
    <group position={position} rotation={rotation}>
      <instancedMesh ref={bodies} args={[TORSO, getMaterial(bodyMaterial, { color: '#ffffff' }), n]} castShadow receiveShadow />
      <instancedMesh ref={heads} args={[HEAD, getMaterial('skin-stylized'), n]} castShadow />
      <instancedMesh ref={hairs} args={[HAIR, getMaterial('hair-dark', { color: '#ffffff' }), n]} castShadow />
      <instancedMesh ref={legs} args={[BOX, getMaterial('matte-black'), n]} castShadow />
    </group>
  );
}
