// Low-poly, flat-shaded human figure with a procedural joint rig.
// Faces +Z at yaw 0. Supports standing, walking, turning, looking, reaching, holding,
// gesturing, pointing, sitting, inspecting, drinking via `actions` (see poses.ts).
// Body language and silhouette over facial detail: no facial animation by design.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getMaterial } from '../materials/materials';
import { rng } from '../core/math';
import { useAssetTime } from '../core/time';
import { evaluateCharacter, type CharacterAction, type Vec3 } from './poses';
import { resolveCharacter, type CharacterSpec } from './presets';
import { GlassContainer } from '../objects/LabEquipment';
import { Paper, Journal } from '../objects/Documents';
import { AwardMedal } from '../objects/Award';

export type HandItem = 'glass' | 'flask' | 'culture' | 'paper' | 'journal' | 'medal';

function renderItem(item: HandItem | undefined): React.ReactNode {
  switch (item) {
    case 'glass': return <GlassContainer kind="beaker" liquid="#7a0a12" fill={0.6} rotation={[Math.PI, 0, 0]} position={[0, 0.02, 0]} />;
    case 'flask': return <GlassContainer kind="flask" glow rotation={[Math.PI, 0, 0]} position={[0, 0.02, 0]} />;
    case 'culture': return <GlassContainer kind="beaker" glow fill={0.5} rotation={[Math.PI, 0, 0]} position={[0, 0.02, 0]} />;
    case 'paper': return <Paper rotation={[0, 0, 0]} position={[0, -0.1, 0]} />;
    case 'journal': return <Journal rotation={[Math.PI / 2, 0, 0]} />;
    case 'medal': return <AwardMedal spin={0} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.05, 0.02]} />;
    default: return null;
  }
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const HEX = new THREE.CylinderGeometry(1, 0.82, 1, 6);
const SKIRT = new THREE.CylinderGeometry(1, 1.35, 1, 6, 1, true);
const HEAD = new THREE.IcosahedronGeometry(1, 1);
const TORUS = new THREE.TorusGeometry(1, 0.08, 4, 12);

export interface FigureProps {
  character: string | CharacterSpec;
  position?: Vec3;
  yaw?: number; // radians, initial facing
  actions?: CharacterAction[];
  scale?: number;
  frame?: number;
  /** Optional object rendered in the right hand (e.g. a glass, a paper). */
  rightHand?: React.ReactNode;
  leftHand?: React.ReactNode;
  /** Library item held in the right hand (usable from world-layout.json props). */
  item?: HandItem;
  /** Optional frame window during which the item is held. */
  itemFrames?: [number, number];
}

export function proportions(spec: CharacterSpec) {
  const s = spec.height / 1.78;
  const sexShoulder = spec.sex === 'female' ? 0.18 : spec.sex === 'male' ? 0.215 : 0.198;
  const buildAdd = spec.build === 'broad' ? 0.03 : spec.build === 'slim' ? -0.015 : 0;
  const r = rng(spec.faceSeed);
  return {
    s,
    hipY: 0.95 * s,
    thigh: 0.45 * s,
    shin: 0.44 * s,
    torso: 0.54 * s,
    shoulderHalf: (sexShoulder + buildAdd) * s,
    hipHalf: (spec.sex === 'female' ? 0.135 : 0.115) * s,
    chestHalfDepth: (0.12 + (spec.build === 'broad' ? 0.02 : 0)) * s,
    upperArm: 0.3 * s,
    forearm: 0.27 * s,
    limb: (spec.build === 'broad' ? 0.1 : spec.build === 'slim' ? 0.075 : 0.085) * s,
    headR: 0.112 * s,
    face: { w: 0.82 + r() * 0.12, h: 1.0 + r() * 0.12, jaw: 0.75 + r() * 0.3, nose: 0.8 + r() * 0.5, brow: r() * 0.02 },
  };
}

export function Figure({ character, position = [0, 0, 0], yaw = 0, actions = [], scale = 1, frame, rightHand, leftHand, item, itemFrames }: FigureProps) {
  const spec = useMemo(() => resolveCharacter(character), [character]);
  const pr = useMemo(() => proportions(spec), [spec]);
  const { frame: f, fps } = useAssetTime(frame);
  const { root, pose } = evaluateCharacter(actions, f, fps, spec.faceSeed, pr.hipY, { position, yaw });

  const stoop = spec.age === 'elderly' ? 0.22 : spec.age === 'older' ? 0.1 : 0;
  const skin = getMaterial(spec.skin);
  const outfit = getMaterial(spec.outfitMaterial);
  const under = getMaterial(spec.underMaterial);
  const hair = getMaterial(spec.hairColor);
  const dark = getMaterial('matte-black');
  const coat = spec.outfit === 'labcoat';
  const L = pr.limb;
  const holding = item && (!itemFrames || (f >= itemFrames[0] && f <= itemFrames[1]));
  const right = rightHand ?? (holding ? renderItem(item) : null);

  const arm = (side: 1 | -1) => {
    const fwd = side === 1 ? pose.lShoulderFwd : pose.rShoulderFwd;
    const out = side === 1 ? pose.lShoulderOut : pose.rShoulderOut;
    const elbow = side === 1 ? pose.lElbow : pose.rElbow;
    return (
      <group position={[side * pr.shoulderHalf, pr.torso - 0.04 * pr.s, 0]} rotation={[-fwd, 0, side * out]}>
        <mesh geometry={BOX} material={coat || spec.outfit !== 'surgical' ? outfit : skin} position={[0, -pr.upperArm / 2, 0]} scale={[L, pr.upperArm, L]} castShadow />
        <group position={[0, -pr.upperArm, 0]} rotation={[-elbow, 0, 0]}>
          <mesh geometry={BOX} material={spec.outfit === 'surgical' ? skin : outfit} position={[0, -pr.forearm / 2, 0]} scale={[L * 0.9, pr.forearm, L * 0.9]} castShadow />
          <mesh geometry={BOX} material={skin} position={[0, -pr.forearm - 0.045 * pr.s, 0]} scale={[L * 0.8, 0.09 * pr.s, L * 0.5]} castShadow />
          <group position={[0, -pr.forearm - 0.07 * pr.s, 0.03 * pr.s]}>{side === 1 ? leftHand : right}</group>
        </group>
      </group>
    );
  };

  const leg = (side: 1 | -1) => {
    const hip = side === 1 ? pose.lHipFwd : pose.rHipFwd;
    const knee = side === 1 ? pose.lKnee : pose.rKnee;
    return (
      <group position={[side * pr.hipHalf * 0.75, 0, 0]} rotation={[-hip, 0, 0]}>
        <mesh geometry={BOX} material={under} position={[0, -pr.thigh / 2, 0]} scale={[L * 1.3, pr.thigh, L * 1.3]} castShadow />
        <group position={[0, -pr.thigh, 0]} rotation={[knee, 0, 0]}>
          <mesh geometry={BOX} material={under} position={[0, -pr.shin / 2, 0]} scale={[L * 1.1, pr.shin, L * 1.1]} castShadow />
          <mesh geometry={BOX} material={dark} position={[0, -pr.shin - 0.03 * pr.s, 0.05 * pr.s]} scale={[L * 1.1, 0.06 * pr.s, 0.24 * pr.s]} castShadow />
        </group>
      </group>
    );
  };

  const hr = pr.headR;
  const fc = pr.face;
  const hairNode = (() => {
    switch (spec.hair) {
      case 'bald': return null;
      case 'receding': return (
        <>
          <mesh geometry={HEAD} material={hair} position={[0, hr * 0.12, -hr * 0.3]} scale={[hr * fc.w * 1.05, hr * 0.85, hr * 0.85]} />
          <mesh geometry={HEAD} material={hair} position={[0, -hr * 0.12, -hr * 0.32]} scale={[hr * fc.w * 1.0, hr * 0.75, hr * 0.78]} />
        </>
      );
      case 'cropped': return (
        <>
          <mesh geometry={HEAD} material={hair} position={[0, hr * 0.2, -hr * 0.1]} scale={[hr * fc.w * 1.04, hr * 0.86, hr * 1.02]} />
          <mesh geometry={HEAD} material={hair} position={[0, -hr * 0.12, -hr * 0.3]} scale={[hr * fc.w * 1.0, hr * 0.75, hr * 0.78]} />
        </>
      );
      case 'long': return (
        <>
          <mesh geometry={HEAD} material={hair} position={[0, hr * 0.2, -hr * 0.12]} scale={[hr * fc.w * 1.1, hr * 0.95, hr * 1.05]} />
          <mesh geometry={BOX} material={hair} position={[0, -hr * 0.7, -hr * 0.55]} scale={[hr * 1.9, hr * 2.2, hr * 0.5]} />
        </>
      );
      case 'bun': return (
        <>
          <mesh geometry={HEAD} material={hair} position={[0, hr * 0.2, -hr * 0.12]} scale={[hr * fc.w * 1.06, hr * 0.9, hr * 1.02]} />
          <mesh geometry={HEAD} material={hair} position={[0, hr * 0.55, -hr * 0.95]} scale={hr * 0.42} />
        </>
      );
      default: return (
        <>
          <mesh geometry={HEAD} material={hair} position={[0, hr * 0.22, -hr * 0.1]} scale={[hr * fc.w * 1.07, hr * 0.88, hr * 1.04]} />
          <mesh geometry={HEAD} material={hair} position={[0, -hr * 0.1, -hr * 0.32]} scale={[hr * fc.w * 1.02, hr * 0.8, hr * 0.78]} />
        </>
      );
    }
  })();

  return (
    <group position={root.position} rotation={[0, root.yaw, 0]} scale={scale}>
      <group position={[0, pr.hipY + pose.rootDrop, 0]} rotation={[pose.rootPitch, 0, 0]}>
        {/* pelvis */}
        <mesh geometry={BOX} material={under} position={[0, 0.02 * pr.s, 0]} scale={[pr.hipHalf * 2.1, 0.16 * pr.s, pr.chestHalfDepth * 1.7]} castShadow />
        {coat && <mesh geometry={SKIRT} material={outfit} position={[0, -0.2 * pr.s, 0]} scale={[pr.shoulderHalf * 1.05, 0.48 * pr.s, pr.chestHalfDepth * 1.25]} castShadow />}
        {leg(1)}
        {leg(-1)}
        {/* spine / torso */}
        <group position={[0, 0.08 * pr.s, 0]} rotation={[pose.spineBend + stoop, pose.spineTwist, pose.spineSide]}>
          <mesh geometry={HEX} material={outfit} position={[0, pr.torso / 2, 0]} rotation={[0, Math.PI / 6, 0]} scale={[pr.shoulderHalf, pr.torso, pr.chestHalfDepth]} castShadow />
          {spec.accessories.includes('tie') && <mesh geometry={BOX} material={getMaterial('red-lacquer')} position={[0, pr.torso * 0.62, pr.chestHalfDepth * 0.97]} scale={[0.04 * pr.s, pr.torso * 0.55, 0.01]} />}
          {spec.accessories.includes('badge') && <mesh geometry={BOX} material={getMaterial('emissive-white', { emissiveIntensity: 0.6 })} position={[pr.shoulderHalf * 0.45, pr.torso * 0.7, pr.chestHalfDepth * 0.98]} scale={[0.05 * pr.s, 0.07 * pr.s, 0.01]} />}
          {coat && [-1, 1].map((sd) => <mesh key={sd} geometry={BOX} material={getMaterial('fabric-labcoat', { color: '#b8b0a4' })} position={[sd * 0.05 * pr.s, pr.torso * 0.75, pr.chestHalfDepth * 0.99]} rotation={[0, 0, sd * 0.35]} scale={[0.025 * pr.s, pr.torso * 0.45, 0.012]} />)}
          {arm(1)}
          {arm(-1)}
          {/* neck + head */}
          <group position={[0, pr.torso, 0]} rotation={[pose.neckPitch + stoop * 0.8, 0, 0]}>
            <mesh geometry={BOX} material={skin} position={[0, 0.05 * pr.s, 0]} scale={[0.09 * pr.s, 0.1 * pr.s, 0.09 * pr.s]} />
            {spec.accessories.includes('stethoscope') && <mesh geometry={TORUS} material={getMaterial('metal-dark')} position={[0, 0.0, 0.02 * pr.s]} rotation={[Math.PI / 2 + 0.3, 0, 0]} scale={[0.1 * pr.s, 0.12 * pr.s, 0.1 * pr.s]} />}
            <group position={[0, 0.1 * pr.s + hr, 0]} rotation={[pose.headPitch, pose.headYaw, 0]}>
              <mesh geometry={HEAD} material={skin} scale={[hr * fc.w, hr * fc.h, hr * 0.98]} castShadow />
              <mesh geometry={BOX} material={skin} position={[0, -hr * 0.62, hr * 0.18]} scale={[hr * fc.jaw * 1.2, hr * 0.5, hr * 1.1]} castShadow />
              <mesh geometry={BOX} material={skin} position={[0, -hr * 0.05, hr * 0.98]} rotation={[0.25, 0, 0]} scale={[hr * 0.22, hr * 0.42 * fc.nose, hr * 0.28]} />
              <mesh geometry={BOX} material={dark} position={[0, hr * (0.28 + fc.brow), hr * 0.86]} scale={[hr * 1.25, hr * 0.12, hr * 0.12]} />
              {[-1, 1].map((sd) => <mesh key={sd} geometry={BOX} material={dark} position={[sd * hr * 0.36, hr * 0.12, hr * 0.84]} scale={[hr * 0.3, hr * 0.14, hr * 0.1]} />)}
              {[-1, 1].map((sd) => <mesh key={`e${sd}`} geometry={BOX} material={skin} position={[sd * hr * fc.w, 0, 0]} scale={[hr * 0.12, hr * 0.32, hr * 0.22]} />)}
              {spec.accessories.includes('glasses') && (
                <group position={[0, hr * 0.12, hr * 0.96]}>
                  {[-1, 1].map((sd) => <mesh key={sd} geometry={BOX} material={getMaterial('metal-dark')} position={[sd * hr * 0.37, 0, 0]} scale={[hr * 0.48, hr * 0.32, hr * 0.04]} />)}
                </group>
              )}
              {spec.accessories.includes('mask') && <mesh geometry={BOX} material={getMaterial('fabric-labcoat')} position={[0, -hr * 0.42, hr * 0.62]} scale={[hr * 1.5, hr * 0.7, hr * 0.5]} />}
              {hairNode}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
