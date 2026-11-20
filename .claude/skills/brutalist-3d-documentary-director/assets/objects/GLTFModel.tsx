// External model support (asset-first workflow). Loads a .glb/.gltf from the project's public/ folder,
// blocks the Remotion frame until loaded (delayRender), optionally re-materials it with studio presets,
// and plays skeletal/morph animation clips DETERMINISTICALLY from the frame number (mixer.setTime),
// so parallel render workers produce identical frames. Use for hero characters/props when a properly
// licensed model is available (record its licence in docs/asset-plan.md); otherwise use procedural assets.
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useThree } from '@react-three/fiber';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { continueRender, delayRender, staticFile } from 'remotion';
import { getMaterial, type MaterialPresetId } from '../materials/materials';
import { useAssetTime } from '../core/time';

type V3 = [number, number, number];
const loaded = new Map<string, Promise<GLTF>>();

function load(url: string): Promise<GLTF> {
  let p = loaded.get(url);
  if (!p) { p = new GLTFLoader().loadAsync(url); loaded.set(url, p); }
  return p;
}

export interface ClipCue { clip: string; start: number; end?: number; offset?: number; loop?: boolean; speed?: number; fade?: number }

export interface GLTFModelProps {
  /** path inside public/, e.g. "models/doctor.glb" */
  src: string;
  position?: V3;
  rotation?: V3;
  scale?: number | V3;
  /** replace all materials with a studio preset, or map original material names → presets */
  materialOverride?: MaterialPresetId | Record<string, MaterialPresetId>;
  /** animation timeline: clips by name with frame ranges; overlapping cues cross-fade over `fade` frames */
  clips?: ClipCue[];
  castShadow?: boolean;
  frame?: number;
}

export function GLTFModel({ src, position, rotation, scale = 1, materialOverride, clips = [], castShadow = true, frame }: GLTFModelProps) {
  const { frame: f, fps } = useAssetTime(frame);
  const { advance } = useThree();
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [handle] = useState(() => delayRender(`Loading model ${src}`));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    load(staticFile(src))
      .then((g) => setGltf(g))
      .catch((e) => { console.error(`GLTFModel: failed to load ${src}`, e); setFailed(true); });
  }, [src]);

  const scene = useMemo(() => {
    if (!gltf) return null;
    const s = SkeletonUtils.clone(gltf.scene) as THREE.Object3D;
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = castShadow;
      m.receiveShadow = true;
      if (materialOverride) {
        const name = (Array.isArray(m.material) ? m.material[0] : m.material)?.name ?? '';
        const preset = typeof materialOverride === 'string' ? materialOverride : materialOverride[name];
        if (preset) m.material = getMaterial(preset);
      }
    });
    return s;
  }, [gltf, materialOverride, castShadow]);

  const mixer = useMemo(() => (scene ? new THREE.AnimationMixer(scene) : null), [scene]);

  useLayoutEffect(() => {
    if (!gltf || !mixer) return;
    mixer.stopAllAction();
    const t = f / fps;
    for (const cue of clips) {
      const clip = THREE.AnimationClip.findByName(gltf.animations, cue.clip);
      if (!clip) { console.warn(`GLTFModel ${src}: no clip "${cue.clip}" (have: ${gltf.animations.map((a) => a.name).join(', ')})`); continue; }
      const end = cue.end ?? 1e9;
      const fade = cue.fade ?? 8;
      if (f < cue.start - fade || f > end + fade) continue;
      const w = Math.min(1, (f - (cue.start - fade)) / Math.max(1, fade), (end + fade - f) / Math.max(1, fade));
      const action = mixer.clipAction(clip);
      action.reset();
      action.setLoop(cue.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = true;
      action.setEffectiveWeight(Math.max(0, w));
      action.play();
      const local = ((f - cue.start) / fps) * (cue.speed ?? 1) + (cue.offset ?? 0);
      action.time = cue.loop === false ? Math.min(Math.max(0, local), clip.duration) : ((local % clip.duration) + clip.duration) % clip.duration;
    }
    mixer.update(0); // evaluate at the exact times set above (no wall-clock dependency)
    void t;
  }, [gltf, mixer, f, fps, clips, src]);

  // release the frame only once the model is actually in the scene graph and posed for this frame
  // Remotion's ThreeCanvas only draws when the frame changes; an asynchronously loaded model mounts after that
  // draw, so request one more render of the current frame before releasing it.
  useLayoutEffect(() => {
    if (!scene && !failed) return;
    if (scene) advance(performance.now());
    continueRender(handle);
  }, [scene, failed, handle, advance]);

  if (!scene) return null;
  return <primitive object={scene} position={position} rotation={rotation} scale={scale} />;
}
