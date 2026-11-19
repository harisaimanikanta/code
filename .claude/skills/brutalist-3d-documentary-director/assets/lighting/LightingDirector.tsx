// Continuous, emotion-driven global lighting. Given a schedule of presets over frames, blends
// every parameter smoothly across boundaries (no lighting "cuts"), drives scene background/fog,
// and keeps the shadow-casting key light's frustum centred on the current camera focus.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { smoothstep } from '../core/math';
import { useAssetTime } from '../core/time';
import presetsJson from './lighting-presets.json';

export type LightingPresetId = keyof typeof presetsJson.presets;
export interface LightingPreset {
  background: string; fog: { color: string; density: number };
  hemi: { sky: string; ground: string; intensity: number };
  key: { color: string; intensity: number; dir: number[] };
  rim: { color: string; intensity: number; dir: number[] };
  fill: { color: string; intensity: number; dir: number[] };
  exposure: number; grade: { tint: string; tintOpacity: number; vignette: number; grain: number };
  environment?: { intensity: number; rotation?: number };
  post?: { bloom?: number; bloomThreshold?: number; ao?: number; contrast?: number; saturation?: number; vignette?: number; grain?: number; dof?: number };
}
export const LIGHTING_PRESETS = presetsJson.presets as unknown as Record<string, LightingPreset & { description: string }>;

export interface LightingCue { start: number; end: number; preset: string; overrides?: Partial<LightingPreset> }

const c = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const n = (a: number, b: number, t: number) => a + (b - a) * t;
const v = (a: number[], b: number[], t: number) => a.map((x, i) => n(x, b[i], t));

export function blendPresets(a: LightingPreset, b: LightingPreset, t: number): LightingPreset {
  return {
    background: c(a.background, b.background, t),
    fog: { color: c(a.fog.color, b.fog.color, t), density: n(a.fog.density, b.fog.density, t) },
    hemi: { sky: c(a.hemi.sky, b.hemi.sky, t), ground: c(a.hemi.ground, b.hemi.ground, t), intensity: n(a.hemi.intensity, b.hemi.intensity, t) },
    key: { color: c(a.key.color, b.key.color, t), intensity: n(a.key.intensity, b.key.intensity, t), dir: v(a.key.dir, b.key.dir, t) },
    rim: { color: c(a.rim.color, b.rim.color, t), intensity: n(a.rim.intensity, b.rim.intensity, t), dir: v(a.rim.dir, b.rim.dir, t) },
    fill: { color: c(a.fill.color, b.fill.color, t), intensity: n(a.fill.intensity, b.fill.intensity, t), dir: v(a.fill.dir, b.fill.dir, t) },
    exposure: n(a.exposure, b.exposure, t),
    grade: { tint: c(a.grade.tint, b.grade.tint, t), tintOpacity: n(a.grade.tintOpacity, b.grade.tintOpacity, t), vignette: n(a.grade.vignette, b.grade.vignette, t), grain: n(a.grade.grain, b.grade.grain, t) },
    environment: { intensity: n(a.environment?.intensity ?? 0.25, b.environment?.intensity ?? 0.25, t), rotation: n(a.environment?.rotation ?? 0, b.environment?.rotation ?? 0, t) },
    post: Object.fromEntries([...new Set([...Object.keys(a.post ?? {}), ...Object.keys(b.post ?? {})])].map((key) => {
      const ka = key as keyof NonNullable<LightingPreset['post']>;
      const va = a.post?.[ka], vb = b.post?.[ka];
      return [key, va === undefined ? vb : vb === undefined ? va : n(va, vb, t)];
    })),
  };
}

function resolve(cue: LightingCue): LightingPreset {
  const p = LIGHTING_PRESETS[cue.preset];
  if (!p) throw new Error(`Unknown lighting preset "${cue.preset}". Known: ${Object.keys(LIGHTING_PRESETS).join(', ')}`);
  return { ...p, ...(cue.overrides ?? {}) } as LightingPreset;
}

/** Pure: lighting parameters at `frame`. Cross-fades over `blendFrames` centred on each cue boundary. */
export function lightingAt(schedule: LightingCue[], frame: number, blendFrames = 36): LightingPreset {
  if (schedule.length === 0) return resolve({ start: 0, end: 1, preset: 'industrial-red' });
  const sorted = [...schedule].sort((a, b) => a.start - b.start);
  let i = sorted.findIndex((cue) => frame >= cue.start && frame < cue.end);
  if (i < 0) i = frame < sorted[0].start ? 0 : sorted.length - 1;
  const cur = resolve(sorted[i]);
  const next = sorted[i + 1];
  const prev = sorted[i - 1];
  const half = blendFrames / 2;
  if (next && next.preset !== sorted[i].preset && frame > sorted[i].end - half) {
    return blendPresets(cur, resolve(next), smoothstep(sorted[i].end - half, sorted[i].end + half, frame));
  }
  if (prev && prev.preset !== sorted[i].preset && frame < sorted[i].start + half) {
    return blendPresets(resolve(prev), cur, smoothstep(sorted[i].start - half, sorted[i].start + half, frame));
  }
  return cur;
}

const dirVec = (d: number[], dist: number) => new THREE.Vector3(d[0], d[1], d[2]).normalize().multiplyScalar(dist);

/** Mount once inside the canvas. `focus` = world point the key light's shadow frustum follows (camera target). */
export function LightingDirector({ schedule, focus = [0, 0, 0], blendFrames = 36, shadowSize = 12, shadowMapSize = 2048, frame }: { schedule: LightingCue[]; focus?: [number, number, number]; blendFrames?: number; shadowSize?: number; shadowMapSize?: number; frame?: number }) {
  const { frame: f } = useAssetTime(frame);
  const L = useMemo(() => lightingAt(schedule, f, blendFrames), [schedule, f, blendFrames]);
  const { scene, gl } = useThree();
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  // Image-based lighting: a PMREM-filtered studio room, tinted per mood, so metals, glass, wet tissue and
  // clearcoats get real reflections instead of looking like flat plastic.
  const envTex = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const tex = pm.fromScene(room, 0.04).texture;
    pm.dispose();
    return tex;
  }, [gl]);

  useLayoutEffect(() => {
    scene.environment = envTex;
    scene.environmentIntensity = L.environment?.intensity ?? 0.25;
    scene.environmentRotation.set(0, L.environment?.rotation ?? 0, 0);
    scene.background = new THREE.Color(L.background);
    scene.fog = new THREE.FogExp2(L.fog.color, L.fog.density);
    gl.toneMappingExposure = L.exposure;
    target.position.set(...focus);
    target.updateMatrixWorld();
    for (const [ref, spec, dist] of [[key, L.key, 30], [rim, L.rim, 30], [fill, L.fill, 30]] as const) {
      if (!ref.current) continue;
      ref.current.position.copy(dirVec(spec.dir, dist).add(target.position));
      ref.current.target = target;
    }
    if (key.current) {
      const cam = key.current.shadow.camera as THREE.OrthographicCamera;
      cam.left = -shadowSize; cam.right = shadowSize; cam.top = shadowSize; cam.bottom = -shadowSize;
      cam.near = 1; cam.far = 80;
      cam.updateProjectionMatrix();
    }
  }, [L, scene, gl, focus, target, shadowSize]);

  return (
    <>
      <primitive object={target} />
      <hemisphereLight args={[L.hemi.sky, L.hemi.ground, L.hemi.intensity]} />
      <directionalLight ref={key} color={L.key.color} intensity={L.key.intensity} castShadow shadow-mapSize={[shadowMapSize, shadowMapSize]} shadow-bias={-0.0003} shadow-normalBias={0.025} shadow-radius={4} />
      <directionalLight ref={rim} color={L.rim.color} intensity={L.rim.intensity} />
      <directionalLight ref={fill} color={L.fill.color} intensity={L.fill.intensity} />
    </>
  );
}
