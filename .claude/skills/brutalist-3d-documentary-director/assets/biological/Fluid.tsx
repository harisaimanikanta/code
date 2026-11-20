// Fluid effects: animated liquid surface (acid pool / culture broth / drink) and rising bubbles.
// Liquid surface is a real plane the camera can dive through (liquid transition).
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getMaterial } from '../materials/materials';
import { rng } from '../core/math';
import { useAssetTime } from '../core/time';

type V3 = [number, number, number];

/** Rippling liquid surface in XZ plane. `color` tints; `glow` makes it emissive (toxic / acid). */
export function FluidSurface({ size = [12, 12] as [number, number], color = '#5a0a10', glow = false, waveHeight = 0.12, position, rotation, frame, opacity = 0.85 }: {
  size?: [number, number]; color?: string; glow?: boolean; waveHeight?: number; position?: V3; rotation?: V3; frame?: number; opacity?: number;
}) {
  const { t } = useAssetTime(frame);
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(size[0], size[1], 48, 48); g.rotateX(-Math.PI / 2); return g; }, [size]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useLayoutEffect(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      const r = Math.hypot(x, z);
      pos.setY(i, (Math.sin(r * 1.6 - t * 2.4) * 0.6 + Math.sin(x * 0.8 + t) * 0.4) * waveHeight);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, [geo, base, t, waveHeight]);
  const mat = glow
    ? getMaterial('emissive-toxic', { transparent: true, opacity, emissiveIntensity: 0.6, side: THREE.DoubleSide })
    : getMaterial('glass', { color, opacity, roughness: 0.1, side: THREE.DoubleSide });
  return <mesh geometry={geo} material={mat} position={position} rotation={rotation} />;
}

/** Rising bubbles inside a cylinder volume (radius, height). */
export function Bubbles({ count = 60, radius = 2, height = 6, speed = 0.8, seed = 8, position, frame, glow = false }: {
  count?: number; radius?: number; height?: number; speed?: number; seed?: number; position?: V3; frame?: number; glow?: boolean;
}) {
  const { t } = useAssetTime(frame);
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const items = useMemo(() => { const r = rng(seed); return Array.from({ length: count }, () => ({ a: r() * Math.PI * 2, d: Math.sqrt(r()) * radius, y: r() * height, s: 0.03 + r() * 0.08, v: 0.6 + r() * 0.8 })); }, [count, radius, height, seed]);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    items.forEach((b, i) => {
      const y = (b.y + t * speed * b.v) % height;
      m.compose(p.set(Math.cos(b.a + y) * b.d, y, Math.sin(b.a + y) * b.d), q, s.setScalar(b.s));
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items, t, speed, height]);
  return (
    <group position={position}>
      <instancedMesh ref={ref} args={[geo, glow ? getMaterial('emissive-toxic', { emissiveIntensity: 0.9 }) : getMaterial('glass', { opacity: 0.5 }), count]} />
    </group>
  );
}
