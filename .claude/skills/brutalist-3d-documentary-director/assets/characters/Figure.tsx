// Figure v2 — art-directed stylised human for documentary cinematics.
// Smooth-shaded sculpted parts (lathe torso, tapered limbs, articulated hands, sculpted head with eyes,
// lids, brows, nose, lips, ears), layered clothing (open lab coat with lapels, suit/tuxedo jackets,
// shirts, ties, bow ties, patient gown), hair shells, PBR fabric/skin materials, facial expressions,
// blinking, breathing and weight shifts. Faces +Z at yaw 0. Same API as v1 (backward compatible).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getMaterial, type MaterialPresetId } from '../materials/materials';
import { clamp, rng } from '../core/math';
import { bevelBox, deformedSphere, lathe, taperedCapsule, cached } from '../core/geometry';
import { useAssetTime } from '../core/time';
import { evaluateCharacter, type CharacterAction, type Pose, type Vec3 } from './poses';
import { resolveCharacter, type CharacterSpec } from './presets';
import { GlassContainer } from '../objects/LabEquipment';
import { Paper, Journal } from '../objects/Documents';
import { AwardMedal } from '../objects/Award';

export type HandItem = 'glass' | 'flask' | 'culture' | 'paper' | 'journal' | 'medal' | 'pill' | 'slide' | 'vial' | 'newspaper' | 'pen' | 'tumbler';

const PILL = cached('fig-pill', () => new THREE.CapsuleGeometry(0.006, 0.014, 4, 10));
function renderItem(item: HandItem | undefined): React.ReactNode {
  switch (item) {
    case 'glass': return <GlassContainer kind="beaker" liquid="#7a0a12" fill={0.6} rotation={[Math.PI, 0, 0]} position={[0, 0.02, 0]} />;
    case 'tumbler': return <GlassContainer kind="beaker" liquid="#5a0a10" fill={0.7} rotation={[Math.PI, 0, 0]} position={[0, 0.02, 0]} scale={1.2} />;
    case 'flask': return <GlassContainer kind="flask" glow rotation={[Math.PI, 0, 0]} position={[0, 0.02, 0]} />;
    case 'culture': return <GlassContainer kind="beaker" glow fill={0.55} rotation={[Math.PI, 0, 0]} position={[0, 0.02, 0]} />;
    case 'vial': return <GlassContainer kind="cylinder" glow fill={0.6} rotation={[Math.PI, 0, 0]} position={[0, 0.03, 0]} scale={0.9} />;
    case 'paper': return <Paper rotation={[0, 0, 0]} position={[0, -0.1, 0]} />;
    case 'newspaper': return <Paper rotation={[0, 0, 0]} position={[0, -0.14, 0]} scale={1.6} />;
    case 'journal': return <Journal rotation={[Math.PI / 2, 0, 0]} />;
    case 'medal': return <AwardMedal spin={0} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.05, 0.02]} />;
    case 'pill': return <mesh geometry={PILL} material={getMaterial('red-lacquer')} position={[0, -0.02, 0.01]} rotation={[0, 0, Math.PI / 2]} />;
    case 'slide': return <mesh geometry={bevelBox(0.075, 0.025, 0.002, 0.0008)} material={getMaterial('glass')} position={[0, -0.02, 0.01]} />;
    case 'pen': return <mesh geometry={taperedCapsule(0.004, 0.003, 0.13, 8)} material={getMaterial('metal-dark')} rotation={[Math.PI, 0, 0]} position={[0, 0.02, 0]} />;
    default: return null;
  }
}

export interface FigureProps {
  character: string | CharacterSpec;
  position?: Vec3;
  yaw?: number;
  actions?: CharacterAction[];
  scale?: number;
  frame?: number;
  rightHand?: React.ReactNode;
  leftHand?: React.ReactNode;
  item?: HandItem;
  itemFrames?: [number, number];
  leftItem?: HandItem;
  leftItemFrames?: [number, number];
}

export function proportions(spec: CharacterSpec) {
  const s = spec.height / 1.78;
  const sexShoulder = spec.sex === 'female' ? 0.185 : spec.sex === 'male' ? 0.215 : 0.2;
  const buildAdd = spec.build === 'broad' ? 0.025 : spec.build === 'slim' ? -0.012 : 0;
  const r = rng(spec.faceSeed);
  return {
    s,
    hipY: 0.95 * s,
    thigh: 0.45 * s,
    shin: 0.44 * s,
    torso: 0.55 * s,
    shoulderHalf: (sexShoulder + buildAdd) * s,
    hipHalf: (spec.sex === 'female' ? 0.15 : 0.13) * s,
    chestHalfDepth: (0.115 + (spec.build === 'broad' ? 0.015 : 0)) * s,
    upperArm: 0.3 * s,
    forearm: 0.26 * s,
    limb: (spec.build === 'broad' ? 0.052 : spec.build === 'slim' ? 0.042 : 0.047) * s,
    headR: 0.105 * s,
    face: { w: 0.86 + r() * 0.1, h: 1.0 + r() * 0.1, jaw: 0.8 + r() * 0.35, nose: 0.85 + r() * 0.4, brow: r() * 0.4, chin: r() * 0.5, cheek: r() * 0.5 },
  };
}

// ---------------------------------------------------------------- sculpted parts (cached per identity)

function headGeometry(seed: number, female: boolean, face: ReturnType<typeof proportions>['face']) {
  return deformedSphere(`head-${seed}-${female}`, 1, (x, y, z) => {
    let X = x, Y = y * 1.17, Z = z;
    const lower = clamp(-y);
    X *= 1 - (female ? 0.3 : 0.24) * Math.pow(lower, 1.3) * face.jaw; // jaw taper
    Z *= 1 - 0.1 * Math.pow(lower, 1.5);
    if (Z > 0.55) Z = 0.55 + (Z - 0.55) * 0.55; // flatter face plane
    if (y < -0.55 && z > 0.1) Z += 0.1 * (0.6 + face.chin * 0.5) * (z - 0.1); // chin
    X *= 1 + (0.05 + face.cheek * 0.04) * Math.exp(-(((y + 0.05) / 0.22) ** 2)) * (z > 0.2 ? 1 : 0.3); // cheekbones
    if (z < 0) Z *= 1.06; // occiput
    if (y > 0.25 && z > 0.4) Z -= 0.06 * (y - 0.25); // forehead slope
    if (Math.abs(y - 0.22) < 0.12 && z > 0.6) Z += 0.03 * (1 - Math.abs(y - 0.22) / 0.12) * (1 + face.brow); // brow ridge
    // eye sockets
    for (const sx of [-1, 1]) {
      const d = Math.hypot(x - sx * 0.36, (y - 0.1) * 1.4);
      if (d < 0.22 && z > 0.5) Z -= 0.07 * (1 - d / 0.22);
    }
    return [X * face.w, Y * face.h, Z];
  }, 40, 30);
}
const NOSE = (k: number) => deformedSphere(`nose-${k.toFixed(2)}`, 1, (x, y, z) => [x * 0.5, y * 1.05 - (z > 0 ? 0.15 * z : 0), z * (0.85 + 0.25 * k) + (y < 0 ? 0.1 * y : 0)], 16, 12);
const EAR = deformedSphere('ear', 1, (x, y, z) => [x * 0.3, y, z * 0.55 + (x > 0 ? 0 : 0)], 12, 10);
const EYEBALL = cached('eyeball', () => new THREE.SphereGeometry(1, 20, 14));
const IRIS = cached('iris', () => new THREE.SphereGeometry(1, 16, 10));
const LID = cached('lid', () => new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2));
const LIP = taperedCapsule(0.5, 0.5, 1, 10);
const MOUTH = cached('mouthHole', () => new THREE.SphereGeometry(1, 14, 8));
const SPHERE = cached('unitSphere', () => new THREE.SphereGeometry(1, 24, 16));

function torsoProfile(female: boolean): [number, number][] {
  return female
    ? [[0.7, 0], [0.72, 0.15], [0.82, 0.35], [0.93, 0.55], [0.95, 0.68], [0.96, 0.82], [0.8, 0.94], [0.38, 1.0], [0.3, 1.02]]
    : [[0.8, 0], [0.82, 0.15], [0.88, 0.35], [0.96, 0.55], [1.0, 0.72], [0.98, 0.85], [0.8, 0.95], [0.4, 1.0], [0.3, 1.02]];
}
const scaleProfile = (p: [number, number][], k: number): [number, number][] => p.map(([r, y]) => [r * k, y]);

function hairGeometry(style: string) {
  const shell = (theta: number, tilt: number, r: number, puff = 0) => cached(`hair-${theta}-${tilt}-${r}-${puff}`, () => {
    const g = new THREE.SphereGeometry(r, 36, 20, 0, Math.PI * 2, 0, theta);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const top = Math.max(0, y / r);
      // volume on top + side part asymmetry
      const v = 1 + puff * top * top * (0.9 + 0.25 * Math.tanh((x / r) * 3));
      pos.setXYZ(i, x * (1 + puff * 0.04), y * v, z * (1 + puff * 0.05 * top));
    }
    g.rotateX(-tilt);
    g.computeVertexNormals();
    return g;
  });
  switch (style) {
    case 'side-part': return [shell(1.55, 0.62, 1.07, 0.16)];
    case 'swept': return [shell(1.5, 0.7, 1.07, 0.1)];
    case 'cropped': return [shell(1.5, 0.6, 1.035, 0)];
    case 'receding': return [shell(1.25, 1.05, 1.05, 0)];
    case 'long': return [shell(1.65, 0.45, 1.08, 0.08)];
    case 'bun': return [shell(1.55, 0.55, 1.06, 0.04)];
    case 'bald': return [];
    default: return [shell(1.5, 0.6, 1.06, 0.06)];
  }
}

// ---------------------------------------------------------------- component

export function Figure({ character, position = [0, 0, 0], yaw = 0, actions = [], scale = 1, frame, rightHand, leftHand, item, itemFrames, leftItem, leftItemFrames }: FigureProps) {
  const spec = useMemo(() => resolveCharacter(character), [character]);
  const pr = useMemo(() => proportions(spec), [spec]);
  const female = spec.sex === 'female';
  const { frame: f, fps } = useAssetTime(frame);
  const { root, pose } = evaluateCharacter(actions, f, fps, spec.faceSeed, pr.hipY, { position, yaw });

  const stoop = spec.age === 'elderly' ? 0.2 : spec.age === 'older' ? 0.08 : 0;
  const skin = getMaterial(spec.skin);
  const coatLike = spec.outfit === 'labcoat' || spec.outfit === 'suit' || spec.outfit === 'tuxedo';
  const outfit = getMaterial(spec.outfitMaterial, coatLike ? { side: THREE.DoubleSide } : undefined);
  const under = getMaterial(spec.underMaterial);
  const shirt = getMaterial(spec.outfit === 'tuxedo' ? 'plastic-white' : 'fabric-shirt');
  const torsoMat = coatLike ? shirt : spec.outfit === 'surgical' ? getMaterial('red-dark') : outfit;
  const sleeve = spec.outfit === 'gown' || spec.outfit === 'surgical' ? skin : outfit;
  const hair = getMaterial(spec.hairColor);
  const shoe = getMaterial('leather-dark');
  const L = pr.limb;
  const S = pr.s;

  const holdingR = item && (!itemFrames || (f >= itemFrames[0] && f <= itemFrames[1]));
  const holdingL = leftItem && (!leftItemFrames || (f >= leftItemFrames[0] && f <= leftItemFrames[1]));
  const right = rightHand ?? (holdingR ? renderItem(item) : null);
  const left = leftHand ?? (holdingL ? renderItem(leftItem) : null);

  const hand = (side: 1 | -1, curl: number, wrist: number, content: React.ReactNode) => {
    const palmW = 0.078 * S, palmH = 0.09 * S, palmD = 0.028 * S;
    return (
      <group rotation={[-wrist, 0, 0]}>
        <mesh geometry={bevelBox(palmD, palmH, palmW, palmD * 0.45, 3)} material={skin} position={[0, -palmH / 2, 0]} castShadow />
        {[0, 1, 2, 3].map((i) => {
          const z = (i - 1.5) * palmW * 0.24;
          const len = (i === 1 || i === 2 ? 0.05 : 0.043) * S;
          return (
            <group key={i} position={[0, -palmH * 0.98, z]} rotation={[0, 0, side * curl * 1.2]}>
              <mesh geometry={taperedCapsule(0.0085 * S, 0.0078 * S, len, 8)} material={skin} rotation={[Math.PI, 0, 0]} castShadow />
              <group position={[0, -len, 0]} rotation={[0, 0, side * curl * 1.3]}>
                <mesh geometry={taperedCapsule(0.0078 * S, 0.0068 * S, len * 0.8, 8)} material={skin} rotation={[Math.PI, 0, 0]} />
              </group>
            </group>
          );
        })}
        <group position={[-side * palmD * 0.3, -palmH * 0.3, palmW * 0.5]} rotation={[0.5 + curl * 0.6, 0, -side * 0.4]}>
          <mesh geometry={taperedCapsule(0.0105 * S, 0.0085 * S, 0.05 * S, 8)} material={skin} rotation={[Math.PI, 0, 0]} />
        </group>
        <group position={[side * -0.01 * S, -palmH - 0.035 * S, 0.012 * S]}>{content}</group>
      </group>
    );
  };

  const arm = (side: 1 | -1) => {
    const fwd = side === 1 ? pose.lShoulderFwd : pose.rShoulderFwd;
    const out = side === 1 ? pose.lShoulderOut : pose.rShoulderOut;
    const elbow = side === 1 ? pose.lElbow : pose.rElbow;
    const wrist = side === 1 ? pose.lWrist : pose.rWrist;
    const curl = side === 1 ? pose.lFingers : pose.rFingers;
    const sleeveR = coatLike ? 1.18 : 1;
    return (
      <group position={[side * pr.shoulderHalf * 0.92, pr.torso * 0.9, 0]} rotation={[-fwd, 0, side * out]}>
        <mesh geometry={SPHERE} material={sleeve} position={[-side * L * 0.15, -L * 0.15, 0]} scale={[L * 1.0 * sleeveR, L * 1.05 * sleeveR, L * 1.0 * sleeveR]} castShadow />
        <mesh geometry={taperedCapsule(L * 0.85 * sleeveR, L * 1.05 * sleeveR, pr.upperArm, 16)} material={sleeve} position={[0, -pr.upperArm, 0]} castShadow />
        <group position={[0, -pr.upperArm, 0]} rotation={[-elbow, 0, 0]}>
          <mesh geometry={taperedCapsule(L * 0.62 * sleeveR, L * 0.85 * sleeveR, pr.forearm, 16)} material={spec.outfit === 'gown' ? skin : sleeve} position={[0, -pr.forearm, 0]} castShadow />
          {coatLike && <mesh geometry={taperedCapsule(L * 0.7, L * 0.7, 0.03 * S, 14)} material={shirt} position={[0, -pr.forearm - 0.005 * S, 0]} />}
          <group position={[0, -pr.forearm - 0.01 * S, 0]}>{hand(side, curl, wrist, side === 1 ? left : right)}</group>
        </group>
      </group>
    );
  };

  const leg = (side: 1 | -1) => {
    const hip = side === 1 ? pose.lHipFwd : pose.rHipFwd;
    const knee = side === 1 ? pose.lKnee : pose.rKnee;
    const legMat = spec.outfit === 'gown' ? skin : under;
    return (
      <group position={[side * pr.hipHalf * 0.55, 0, 0]} rotation={[-hip, 0, 0]}>
        <mesh geometry={taperedCapsule(L * 1.25, L * 1.6, pr.thigh, 16)} material={under} position={[0, -pr.thigh, 0]} castShadow />
        <group position={[0, -pr.thigh, 0]} rotation={[knee, 0, 0]}>
          <mesh geometry={taperedCapsule(L * 0.95, L * 1.2, pr.shin, 16)} material={legMat} position={[0, -pr.shin, 0]} castShadow />
          <group position={[0, -pr.shin - 0.02 * S, 0.045 * S]}>
            <mesh geometry={bevelBox(0.1 * S, 0.075 * S, 0.27 * S, 0.035 * S, 3)} material={shoe} castShadow receiveShadow />
            <mesh geometry={bevelBox(0.104 * S, 0.018 * S, 0.274 * S, 0.006 * S)} material={getMaterial('rubber-black')} position={[0, -0.033 * S, 0]} />
          </group>
        </group>
      </group>
    );
  };

  // ---- head
  const hr = pr.headR;
  const fc = pr.face;
  const headGeo = headGeometry(spec.faceSeed, female, fc);
  const lidRot = pose.lids >= 0 ? 0.12 + pose.lids * 1.45 : 0.12 + pose.lids * 1.1; // resting lid covers the top of the iris
  const browY = hr * (0.36 + 0.07 * pose.browRaise);
  const mouthY = -hr * 0.52;
  const head = (
    <group position={[0, 0.075 * S + hr * 1.05, 0.012 * S]} rotation={[pose.headPitch, pose.headYaw, pose.headRoll]}>
      <mesh geometry={headGeo} material={skin} scale={hr} castShadow />
      {/* eyes */}
      {[-1, 1].map((sx) => (
        <group key={`eye${sx}`} position={[sx * hr * 0.33 * fc.w, hr * 0.1, hr * 0.62]}>
          <mesh geometry={EYEBALL} material={getMaterial('eye-white')} scale={hr * 0.13} />
          <mesh geometry={IRIS} material={getMaterial('eye-iris')} position={[0, 0, hr * 0.112]} scale={[hr * 0.085, hr * 0.085, hr * 0.03]} />
          <mesh geometry={LID} material={skin} scale={hr * 0.142} rotation={[lidRot, 0, 0]} />
          <mesh geometry={LID} material={skin} scale={hr * 0.14} rotation={[Math.PI + 0.55 - pose.smile * 0.15, 0, 0]} />
        </group>
      ))}
      {/* brows */}
      {[-1, 1].map((sx) => (
        <mesh key={`brow${sx}`} geometry={taperedCapsule(0.011 * S, 0.006 * S, hr * 0.42, 8)} material={hair}
          position={[sx * hr * 0.15, browY - pose.browFurrow * hr * 0.03, hr * 0.9]}
          rotation={[0.1, 0, sx * (-Math.PI / 2 + 0.12 - pose.browFurrow * 0.25 + pose.browRaise * 0.08)]} />
      ))}
      <mesh geometry={NOSE(fc.nose)} material={skin} position={[0, -hr * 0.12, hr * 0.84]} scale={[hr * 0.15, hr * 0.25, hr * 0.15]} castShadow />
      {[-1, 1].map((sx) => <mesh key={`ear${sx}`} geometry={EAR} material={skin} position={[sx * hr * 0.97 * fc.w, hr * 0.02, -hr * 0.05]} scale={[hr * 0.22, hr * 0.28, hr * 0.2]} rotation={[0, sx * -0.3, 0]} />)}
      {/* mouth: lips with smile corners and opening */}
      <mesh geometry={MOUTH} material={getMaterial('matte-black')} position={[0, mouthY - pose.mouthOpen * hr * 0.06, hr * 0.84]} scale={[hr * 0.17, hr * (0.01 + pose.mouthOpen * 0.09), hr * 0.04]} />
      {[-1, 1].map((sx) => (
        <group key={`lip${sx}`}>
          <mesh geometry={LIP} material={getMaterial('lips')} position={[sx * hr * 0.1, mouthY + hr * 0.02 + Math.max(0, pose.smile) * hr * 0.03 * 0.5, hr * 0.875]} rotation={[0, 0, sx * (Math.PI / 2 - pose.smile * 0.25)]} scale={[hr * 0.05, hr * 0.2, hr * 0.045]} />
          <mesh geometry={LIP} material={getMaterial('lips')} position={[sx * hr * 0.09, mouthY - hr * 0.025 - pose.mouthOpen * hr * 0.12, hr * 0.865]} rotation={[0, 0, sx * (Math.PI / 2 + pose.smile * 0.2)]} scale={[hr * 0.055, hr * 0.18, hr * 0.05]} />
        </group>
      ))}
      {hairGeometry(spec.hair).map((g, i) => <mesh key={`hair${i}`} geometry={g} material={hair} scale={[hr * fc.w, hr * 1.17 * fc.h, hr]} position={[0, hr * 0.02, -hr * 0.02]} castShadow />)}
      {spec.hair === 'bun' && <mesh geometry={SPHERE} material={hair} position={[0, hr * 0.5, -hr * 0.95]} scale={hr * 0.38} />}
      {spec.hair === 'long' && <mesh geometry={lathe([[0.9, -1.6], [1.0, -1.0], [1.02, -0.3], [0.9, 0.2]], 24, Math.PI * 0.62, Math.PI * 0.76)} material={hair} scale={[hr, hr, hr]} />}
      {spec.accessories.includes('glasses') && (
        <group position={[0, hr * 0.1, hr * 0.93]}>
          {[-1, 1].map((sx) => <mesh key={sx} geometry={cached('rim', () => new THREE.TorusGeometry(1, 0.1, 6, 24))} material={getMaterial('metal-dark')} position={[sx * hr * 0.34, 0, 0]} scale={[hr * 0.2, hr * 0.15, hr * 0.15]} />)}
          {[-1, 1].map((sx) => <mesh key={`g${sx}`} geometry={cached('lens', () => new THREE.CircleGeometry(1, 20))} material={getMaterial('glass')} position={[sx * hr * 0.34, 0, 0.002]} scale={[hr * 0.19, hr * 0.14, 1]} />)}
          <mesh geometry={bevelBox(hr * 0.22, hr * 0.03, hr * 0.03, hr * 0.01)} material={getMaterial('metal-dark')} position={[0, hr * 0.03, 0]} />
          {[-1, 1].map((sx) => <mesh key={`t${sx}`} geometry={bevelBox(hr * 0.02, hr * 0.025, hr * 0.95, hr * 0.008)} material={getMaterial('metal-dark')} position={[sx * hr * 0.55, 0, -hr * 0.47]} />)}
        </group>
      )}
      {spec.accessories.includes('mask') && <mesh geometry={SPHERE} material={getMaterial('fabric-labcoat')} position={[0, -hr * 0.45, hr * 0.62]} scale={[hr * 0.75, hr * 0.42, hr * 0.42]} />}
    </group>
  );

  // ---- torso & clothing
  const prof = torsoProfile(female);
  const depth = pr.chestHalfDepth / pr.shoulderHalf;
  const breathe = 1 + 0.012 * pose.breath;
  const gap = spec.outfit === 'labcoat' ? 0.34 : spec.outfit === 'gown' ? 0 : 0.42;
  const jacketHem = spec.outfit === 'labcoat' ? 0.62 : spec.outfit === 'gown' ? 0.45 : 0.24;

  return (
    <group position={root.position} rotation={[0, root.yaw, pose.rootRoll]} scale={scale}>
      <group position={[pose.hipSway * S, pr.hipY + pose.rootDrop, 0]} rotation={[pose.rootPitch, 0, 0]}>
        {/* pelvis */}
        <mesh geometry={lathe([[0.55, -0.1], [0.92, -0.04], [1.0, 0.04], [0.92, 0.12]], 20)} material={under} scale={[pr.hipHalf * 1.25, S, pr.hipHalf * 0.85]} castShadow />
        {/* coat / jacket skirt hangs from the hips */}
        {(coatLike || spec.outfit === 'gown') && (
          <mesh geometry={lathe([[1.0, -jacketHem], [0.96, -jacketHem * 0.5], [0.92, 0.0], [0.9, 0.12]], 28, gap / 2, Math.PI * 2 - gap)}
            material={outfit} scale={[pr.hipHalf * 1.45, S, pr.hipHalf * 1.05]} castShadow />
        )}
        {leg(1)}
        {leg(-1)}
        <group position={[0, 0.1 * S, 0]} rotation={[pose.spineBend + stoop, pose.spineTwist, pose.spineSide]}>
          <mesh geometry={lathe(prof, 28)} material={torsoMat} scale={[pr.shoulderHalf * breathe, pr.torso, pr.shoulderHalf * depth * breathe]} castShadow />
          {(coatLike || spec.outfit === 'gown') && (
            <mesh geometry={lathe(scaleProfile(prof.slice(0, 8), 1.07), 28, gap / 2, Math.PI * 2 - gap)} material={outfit}
              scale={[pr.shoulderHalf * breathe, pr.torso, pr.shoulderHalf * depth * 1.04 * breathe]} castShadow />
          )}
          {coatLike && [-1, 1].map((sd) => (
            <mesh key={`lapel${sd}`} geometry={bevelBox(0.055 * S, pr.torso * 0.42, 0.012 * S, 0.004 * S)} material={outfit}
              position={[sd * 0.07 * S, pr.torso * 0.72, pr.chestHalfDepth * 1.02]} rotation={[0.08, sd * 0.25, sd * 0.32]} castShadow />
          ))}
          {coatLike && <mesh geometry={lathe([[0.42, 0], [0.4, 0.05], [0.36, 0.09]], 20, 0.6, Math.PI * 2 - 1.2)} material={outfit} position={[0, pr.torso * 0.93, -0.005 * S]} scale={[pr.shoulderHalf, S, pr.shoulderHalf * 0.9]} />}
          {spec.accessories.includes('tie') && (
            <mesh geometry={lathe([[0.001, 0], [0.9, 0.04], [1, 0.6], [0.55, 0.97], [0.5, 1]], 4)} material={getMaterial('red-lacquer')}
              position={[0, pr.torso * 0.47, pr.chestHalfDepth * 0.98]} scale={[0.04 * S, pr.torso * 0.45, 0.006 * S]} rotation={[0.06, Math.PI / 4, 0]} />
          )}
          {spec.accessories.includes('bowtie') && [-1, 1].map((sd) => (
            <mesh key={`bt${sd}`} geometry={SPHERE} material={getMaterial('fabric-tux')} position={[sd * 0.028 * S, pr.torso * 0.95, pr.chestHalfDepth * 0.75]} scale={[0.03 * S, 0.018 * S, 0.012 * S]} />
          ))}
          {spec.accessories.includes('pen') && <mesh geometry={taperedCapsule(0.005 * S, 0.005 * S, 0.12 * S, 8)} material={getMaterial('metal-dark')} position={[pr.shoulderHalf * 0.5, pr.torso * 0.58, pr.chestHalfDepth * 1.06]} />}
          {spec.accessories.includes('badge') && <mesh geometry={bevelBox(0.05 * S, 0.07 * S, 0.004 * S, 0.004 * S)} material={getMaterial('plastic-white')} position={[-pr.shoulderHalf * 0.5, pr.torso * 0.7, pr.chestHalfDepth * 1.08]} />}
          {spec.accessories.includes('stethoscope') && <mesh geometry={cached('steth', () => new THREE.TorusGeometry(1, 0.06, 8, 32, Math.PI * 1.3))} material={getMaterial('rubber-black')} position={[0, pr.torso * 0.86, 0.02 * S]} rotation={[Math.PI / 2 + 0.5, 0, Math.PI * 0.85]} scale={[0.13 * S, 0.15 * S, 0.13 * S]} />}
          {arm(1)}
          {arm(-1)}
          <group position={[0, pr.torso * 0.98, 0]} rotation={[pose.neckPitch + stoop * 0.8, 0, 0]}>
            <mesh geometry={taperedCapsule(0.05 * S, 0.044 * S, 0.1 * S, 16)} material={skin} position={[0, -0.02 * S, 0]} />
            {coatLike && <mesh geometry={lathe([[0.065, 0], [0.063, 0.05]], 20)} material={shirt} scale={[S, S, S]} position={[0, 0.0, 0]} />}
            {head}
          </group>
        </group>
      </group>
    </group>
  );
}

export type { Pose };
export const FIGURE_MATERIALS: MaterialPresetId[] = ['skin-stylized', 'fabric-labcoat', 'fabric-shirt', 'hair-dark', 'eye-white', 'eye-iris', 'lips', 'leather-dark'];
