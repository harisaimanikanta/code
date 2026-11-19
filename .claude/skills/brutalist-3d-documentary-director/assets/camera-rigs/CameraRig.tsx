// Applies a baked continuous camera track (see project src/camera/compile.ts) to the R3F camera.
// The track is the single source of truth: position, orientation quaternion, fov per frame.
// Sub-frame values are interpolated (lerp / slerp) so motion blur or time-remapping stays smooth.
import { useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useCurrentFrame } from 'remotion';

export interface BakedTrack {
  fps: number;
  frames: number;
  p: number[][]; // [x,y,z]
  q: number[][]; // [x,y,z,w]
  fov: number[];
  t: number[][]; // look target
}

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();

export function sampleTrack(track: BakedTrack, frame: number) {
  const f = Math.max(0, Math.min(track.frames - 1, frame));
  const i = Math.floor(f);
  const j = Math.min(track.frames - 1, i + 1);
  const k = f - i;
  const p = track.p[i].map((v, n) => v + (track.p[j][n] - v) * k) as [number, number, number];
  const tg = track.t[i].map((v, n) => v + (track.t[j][n] - v) * k) as [number, number, number];
  qa.fromArray(track.q[i]);
  qb.fromArray(track.q[j]);
  const q = qa.clone().slerp(qb, k);
  const fov = track.fov[i] + (track.fov[j] - track.fov[i]) * k;
  return { p, q, fov, target: tg };
}

/** Mount inside the canvas. `frameOffset` lets previews start mid-track. */
export function CameraRig({ track, frameOffset = 0, near = 0.02, far = 400 }: { track: BakedTrack; frameOffset?: number; near?: number; far?: number }) {
  const frame = useCurrentFrame() + frameOffset;
  const { camera } = useThree();
  useLayoutEffect(() => {
    const s = sampleTrack(track, frame);
    camera.position.set(...s.p);
    camera.quaternion.copy(s.q);
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pc = camera as THREE.PerspectiveCamera;
      pc.fov = s.fov;
      pc.near = near;
      pc.far = far;
      pc.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  }, [frame, track, camera, near, far]);
  return null;
}
