// Turntable-style preview of a single library/project component (used by render-asset-previews.py and for
// quick look-dev in Remotion Studio). The camera auto-frames the component's bounding box at a 3/4 angle.
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LightingDirector } from './library/lighting/LightingDirector';
import { getComponent } from './world/registry';
import { PostFX } from './library/rendering/PostFX';

export interface AssetPreviewProps { component: string; props?: Record<string, unknown>; preset?: string; label?: string; camera?: { position: [number, number, number]; target: [number, number, number]; fov?: number }; dof?: number; [key: string]: unknown }

function FixedCam({ position, target, fov = 30 }: { position: [number, number, number]; target: [number, number, number]; fov?: number }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(...position);
    (camera as THREE.PerspectiveCamera).fov = fov;
    camera.near = 0.01;
    camera.lookAt(...target);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, position, target, fov]);
  return null;
}

function AutoFrame({ children, orbitDeg }: { children: React.ReactNode; orbitDeg: number }) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(ref.current);
    if (box.isEmpty()) box.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1));
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 0.05);
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const dist = (radius / Math.sin(fov / 2)) * 1.05;
    const a = THREE.MathUtils.degToRad(35 + orbitDeg);
    camera.position.set(center.x + Math.sin(a) * dist * 0.85, center.y + dist * 0.42, center.z + Math.cos(a) * dist * 0.85);
    camera.near = Math.max(0.001, dist / 200);
    camera.far = dist * 20;
    camera.lookAt(center);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, orbitDeg]);
  return <group ref={ref}>{children}</group>;
}

export const AssetPreview: React.FC<AssetPreviewProps> = ({ component, props = {}, preset = 'high-contrast-character', label, camera, dof = 0 }) => {
  const frame = useCurrentFrame();
  const C = getComponent(component);
  return (
    <AbsoluteFill style={{ backgroundColor: '#050304' }}>
      <ThreeCanvas width={800} height={800} flat shadows={{ type: THREE.PCFSoftShadowMap }} camera={{ fov: 30, position: [3, 2, 3] }}>
        <LightingDirector schedule={[{ start: 0, end: 1e9, preset }]} focus={[0, 0, 0]} />
        {camera ? (<><FixedCam {...camera} /><C {...props} /></>) : (
          <AutoFrame orbitDeg={frame * 0.5}>
            <C {...props} />
          </AutoFrame>
        )}
        <PostFX quality="final" dof={dof} ao={1.5} focusDistance={camera ? Math.hypot(camera.position[0] - camera.target[0], camera.position[1] - camera.target[1], camera.position[2] - camera.target[2]) : 3} />
      </ThreeCanvas>
      {label && <div style={{ position: 'absolute', left: 24, bottom: 18, color: '#fff', fontFamily: "'Oswald','Arial Narrow',sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>}
    </AbsoluteFill>
  );
};
