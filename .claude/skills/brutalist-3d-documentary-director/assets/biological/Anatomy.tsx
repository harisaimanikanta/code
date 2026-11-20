// Stylized anatomy: stomach lining (rugae folds), mucus layer, anatomical tunnel (camera fly-through),
// cell clusters. Geometry is procedural and animated (peristaltic undulation) from frame time.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getMaterial, type MaterialPresetId } from '../materials/materials';
import { rng } from '../core/math';
import { useAssetTime } from '../core/time';

type V3 = [number, number, number];

/** Folded gastric lining surface (rugae), lying in XZ plane. Undulates slowly. */
export function StomachLining({ size = [30, 30] as [number, number], segments = 90, foldHeight = 0.9, folds = 7, undulation = 0.15, material = 'flesh-wall' as MaterialPresetId, position, rotation, frame, seed = 2 }: {
  size?: [number, number]; segments?: number; foldHeight?: number; folds?: number; undulation?: number; material?: MaterialPresetId; position?: V3; rotation?: V3; frame?: number; seed?: number;
}) {
  const { t } = useAssetTime(frame);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size[0], size[1], segments, segments);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [size, segments]);
  const basePos = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const phases = useMemo(() => { const r = rng(seed); return Array.from({ length: 4 }, () => r() * 10); }, [seed]);
  useLayoutEffect(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = basePos[i * 3], z = basePos[i * 3 + 2];
      const meander = Math.sin(z * 0.35 + phases[0]) * 1.2 + Math.sin(z * 0.9 + phases[1]) * 0.35;
      const ridge = Math.pow(Math.abs(Math.sin(((x + meander) / size[0]) * folds * Math.PI)), 3);
      const wobble = Math.sin(x * 0.4 + t * 0.8 + phases[2]) * Math.sin(z * 0.3 + t * 0.6 + phases[3]);
      pos.setY(i, ridge * foldHeight + wobble * undulation);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, [geo, basePos, t, folds, foldHeight, undulation, phases, size]);
  return <mesh geometry={geo} material={getMaterial(material)} position={position} rotation={rotation} receiveShadow castShadow />;
}

/** Translucent mucus blanket floating above the lining; optional pits where bacteria shelter. */
export function MucusLayer({ size = [30, 30] as [number, number], height = 1.6, thickness = 0.5, position, rotation, frame }: {
  size?: [number, number]; height?: number; thickness?: number; position?: V3; rotation?: V3; frame?: number;
}) {
  const { t } = useAssetTime(frame);
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(size[0], size[1], 40, 40); g.rotateX(-Math.PI / 2); return g; }, [size]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useLayoutEffect(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      pos.setY(i, Math.sin(x * 0.5 + t * 0.5) * Math.cos(z * 0.4 + t * 0.4) * thickness * 0.5);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, [geo, base, t, thickness]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo} material={getMaterial('mucus')} position={[0, height, 0]} />
      <mesh geometry={geo} material={getMaterial('mucus', { opacity: 0.18 })} position={[0, height - thickness, 0]} />
    </group>
  );
}

class TunnelPath extends THREE.Curve<THREE.Vector3> {
  constructor(private length: number, private bend: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) {
    return target.set(Math.sin(t * Math.PI * 1.5) * this.bend, Math.sin(t * Math.PI) * this.bend * 0.4, -t * this.length);
  }
}

/** Organic tunnel (esophagus/intestine metaphor). Entry at z=0, exit near z=-length. Camera flies inside.
 * Use `tunnelCenterline(length, bend, u)` to place camera waypoints exactly on the centerline. */
export function AnatomicalTunnel({ length = 40, radius = 3, bend = 3, rings = 18, pulse = 0.08, position, rotation, frame, material = 'flesh-wall' as MaterialPresetId }: {
  length?: number; radius?: number; bend?: number; rings?: number; pulse?: number; position?: V3; rotation?: V3; frame?: number; material?: MaterialPresetId;
}) {
  const { t } = useAssetTime(frame);
  const path = useMemo(() => new TunnelPath(length, bend), [length, bend]);
  const geo = useMemo(() => new THREE.TubeGeometry(path, 120, radius, 14, false), [path, radius]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const centers = useMemo(() => {
    // per-vertex centerline point (TubeGeometry: (tubularSegments+1) rings of (radialSegments+1) verts)
    const out: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) out.push(path.getPoint(i / 120));
    return out;
  }, [path]);
  useLayoutEffect(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / 15);
      const c = centers[Math.min(ring, centers.length - 1)];
      v.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]).sub(c);
      const k = 1 + Math.sin(ring * 0.5 - t * 2.2) * pulse + Math.sin((i % 15) * 1.7 + ring) * 0.06;
      v.multiplyScalar(k).add(c);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, [geo, base, centers, t, pulse]);
  const ringGeo = useMemo(() => new THREE.TorusGeometry(radius * 0.95, radius * 0.08, 5, 16), [radius]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo} material={getMaterial(material, { side: THREE.BackSide })} receiveShadow />
      {Array.from({ length: rings }, (_, i) => {
        const u = (i + 0.5) / rings;
        const p = path.getPoint(u);
        const tan = path.getTangent(u);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan.clone().negate());
        return <mesh key={i} geometry={ringGeo} material={getMaterial('red-dark')} position={p} quaternion={q} />;
      })}
    </group>
  );
}

/** Centerline point of an AnatomicalTunnel (local space) for camera waypoints. */
export function tunnelCenterline(length: number, bend: number, u: number): V3 {
  return [Math.sin(u * Math.PI * 1.5) * bend, Math.sin(u * Math.PI) * bend * 0.4, -u * length];
}

/** Cluster of epithelial-like cells (instanced faceted spheres) on a surface. */
export function CellCluster({ count = 120, radius = 6, cellSize = 0.6, seed = 5, material = 'bio-translucent' as MaterialPresetId, position, rotation, frame }: {
  count?: number; radius?: number; cellSize?: number; seed?: number; material?: MaterialPresetId; position?: V3; rotation?: V3; frame?: number;
}) {
  const { t } = useAssetTime(frame);
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const cells = useMemo(() => { const r = rng(seed); return Array.from({ length: count }, () => { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * radius; return { x: Math.cos(a) * d, z: Math.sin(a) * d, s: cellSize * (0.7 + r() * 0.6), ph: r() * 10 }; }); }, [count, radius, cellSize, seed]);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    cells.forEach((c, i) => {
      const breathe = 1 + Math.sin(t * 1.2 + c.ph) * 0.05;
      m.compose(p.set(c.x, c.s * 0.6, c.z), q, s.set(c.s * breathe, c.s * 0.8 * breathe, c.s * breathe));
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [cells, t]);
  return (
    <group position={position} rotation={rotation}>
      <instancedMesh ref={ref} args={[geo, getMaterial(material), count]} castShadow receiveShadow />
    </group>
  );
}
