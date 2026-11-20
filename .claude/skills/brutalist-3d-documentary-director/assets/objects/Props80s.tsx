// Period prop kit (1970s–80s institutional / medical / laboratory). Dense, bevelled, PBR-textured,
// instanced where repeated. These fill environments so they read as lived-in locations, not empty rooms.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getMaterial, type MaterialPresetId } from '../materials/materials';
import { bevelBox, bevelBoxBase, cylinderBase, lathe, taperedCapsule, tubeAlong, cached } from '../core/geometry';
import { rng, smoothstep } from '../core/math';
import { useAssetTime } from '../core/time';
import { chartTexture, endoscopyTexture, newspaperTexture, slideTexture } from '../textures/canvasTextures';

type V3 = [number, number, number];
type P = { position?: V3; rotation?: V3; scale?: number; frame?: number };

/** Static instanced mesh helper: one draw call for many copies. */
export function Instances({ geometry, material, transforms, castShadow = true, receiveShadow = true, colors }: { geometry: THREE.BufferGeometry; material: THREE.Material; transforms: { p: V3; r?: V3; s?: V3 | number }[]; castShadow?: boolean; receiveShadow?: boolean; colors?: string[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    transforms.forEach((t, i) => {
      e.set(...(t.r ?? [0, 0, 0])); q.setFromEuler(e);
      const sc = t.s ?? 1; if (typeof sc === 'number') s.setScalar(sc); else s.set(...sc);
      m.compose(p.set(...t.p), q, s);
      ref.current!.setMatrixAt(i, m);
      if (colors) ref.current!.setColorAt(i, c.set(colors[i % colors.length]));
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [transforms, colors]);
  return <instancedMesh ref={ref} args={[geometry, material, transforms.length]} castShadow={castShadow} receiveShadow={receiveShadow} />;
}

const bottleGeo = (kind: number) => cached(`bottle${kind}`, () => {
  const prof: [number, number][][] = [
    [[0.001, 0], [0.035, 0], [0.038, 0.005], [0.038, 0.11], [0.03, 0.13], [0.014, 0.145], [0.014, 0.17], [0.016, 0.175], [0.001, 0.175]],
    [[0.001, 0], [0.05, 0], [0.052, 0.006], [0.052, 0.16], [0.045, 0.18], [0.02, 0.19], [0.02, 0.215], [0.001, 0.215]],
    [[0.001, 0], [0.028, 0], [0.03, 0.004], [0.03, 0.08], [0.012, 0.1], [0.012, 0.12], [0.001, 0.12]],
  ];
  return new THREE.LatheGeometry(prof[kind].map(([r, y]) => new THREE.Vector2(r, y)), 18);
});

/** Wall shelving full of reagent bottles (amber / clear / green), instanced. */
export function ReagentShelf({ width = 2.4, shelves = 4, seed = 3, position, rotation }: P & { width?: number; shelves?: number; seed?: number }) {
  const data = useMemo(() => {
    const r = rng(seed);
    const by: Record<string, { p: V3; r?: V3; s?: number }[]> = { amber: [], glass: [], green: [] };
    for (let s = 0; s < shelves; s++) {
      let x = -width / 2 + 0.06;
      while (x < width / 2 - 0.06) {
        const kind = Math.floor(r() * 3);
        const mat = ['amber', 'glass', 'green'][r() < 0.55 ? 0 : r() < 0.7 ? 1 : 2];
        by[mat].push({ p: [x, 0.42 * s + 0.03, -0.04 + r() * 0.08], r: [0, r() * 6, 0], s: 0.85 + r() * 0.35 });
        (by[mat] as { k?: number }[]).at(-1)!.k = kind;
        x += 0.07 + r() * 0.05;
      }
    }
    return by;
  }, [width, shelves, seed]);
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: shelves + 1 }, (_, s) => <mesh key={s} geometry={bevelBox(width, 0.03, 0.3, 0.008)} material={getMaterial('metal-cream')} position={[0, 0.42 * s + 0.015, 0]} castShadow receiveShadow />)}
      {[-1, 1].map((sd) => <mesh key={sd} geometry={bevelBoxBase(0.03, 0.42 * shelves + 0.05, 0.32, 0.008)} material={getMaterial('metal-cream')} position={[sd * width / 2, 0, 0]} castShadow />)}
      {(['amber', 'glass', 'green'] as const).map((m) => [0, 1, 2].map((k) => {
        const list = (data[m] as ({ k?: number } & { p: V3; r?: V3; s?: number })[]).filter((t) => t.k === k);
        return list.length ? <Instances key={`${m}${k}`} geometry={bottleGeo(k)} material={getMaterial(m === 'amber' ? 'glass-amber' : m === 'green' ? 'glass-green' : 'glass')} transforms={list} castShadow={false} /> : null;
      }))}
    </group>
  );
}

/** Ceramic laboratory sink with chrome swan-neck tap and dripping-water-free (static) basin. */
export function LabSink({ position, rotation }: P) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bevelBoxBase(0.7, 0.9, 0.6, 0.02)} material={getMaterial('wood-dark')} castShadow receiveShadow />
      <mesh geometry={bevelBox(0.72, 0.18, 0.62, 0.04)} material={getMaterial('plastic-white')} position={[0, 0.9, 0]} castShadow />
      <mesh geometry={bevelBox(0.56, 0.02, 0.44, 0.01)} material={getMaterial('matte-black')} position={[0, 0.995, 0]} />
      <mesh geometry={tubeAlong([[0, 1.0, -0.26], [0, 1.28, -0.26], [0, 1.33, -0.18], [0, 1.24, -0.08]], 0.012, 32, 10)} material={getMaterial('chrome')} />
      {[-1, 1].map((s) => <mesh key={s} geometry={cylinderBase(0.02, 0.025, 0.05, 12)} material={getMaterial('chrome')} position={[s * 0.1, 1.0, -0.26]} />)}
    </group>
  );
}

/** Fume hood: steel cabinet, glass sash (half raised), internal fluorescent glow. */
export function FumeHood({ width = 1.5, position, rotation }: P & { width?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bevelBoxBase(width, 0.9, 0.8, 0.02)} material={getMaterial('metal-cream')} castShadow receiveShadow />
      <mesh geometry={bevelBox(width, 0.04, 0.82, 0.01)} material={getMaterial('tile-white')} position={[0, 0.92, 0]} />
      {[-1, 1].map((s) => <mesh key={s} geometry={bevelBoxBase(0.06, 1.3, 0.8, 0.015)} material={getMaterial('metal-cream')} position={[s * (width / 2 - 0.03), 0.94, 0]} castShadow />)}
      <mesh geometry={bevelBox(width, 0.5, 0.8, 0.02)} material={getMaterial('metal-cream')} position={[0, 2.49, 0]} castShadow />
      <mesh geometry={bevelBox(width - 0.12, 0.7, 0.012, 0.004)} material={getMaterial('glass')} position={[0, 1.95, 0.36]} />
      <mesh geometry={bevelBox(width - 0.12, 0.05, 0.03, 0.01)} material={getMaterial('metal-brushed')} position={[0, 1.6, 0.37]} />
      <mesh geometry={bevelBox(width - 0.2, 0.02, 0.05, 0.005)} material={getMaterial('emissive-cool', { emissiveIntensity: 1.2 })} position={[0, 2.2, 0.1]} />
      <pointLight position={[0, 2.0, 0.1]} color="#e8f0ff" intensity={1.6} distance={2.5} decay={2} />
    </group>
  );
}

/** Cork pinboard with pinned papers, photos and a red string. */
export function Pinboard({ width = 1.4, height = 0.9, seed = 4, position, rotation }: P & { width?: number; height?: number; seed?: number }) {
  const items = useMemo(() => { const r = rng(seed); return Array.from({ length: 9 }, () => ({ x: (r() - 0.5) * (width - 0.3), y: (r() - 0.5) * (height - 0.3), rot: (r() - 0.5) * 0.25, w: 0.16 + r() * 0.08, h: 0.2 + r() * 0.08 })); }, [seed, width, height]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bevelBox(width + 0.06, height + 0.06, 0.03, 0.01)} material={getMaterial('wood-dark')} />
      <mesh geometry={bevelBox(width, height, 0.035, 0.004)} material={getMaterial('straw', { color: '#b58a5a' })} />
      {items.map((it, i) => (
        <group key={i} position={[it.x, it.y, 0.02]} rotation={[0, 0, it.rot]}>
          <mesh geometry={bevelBox(it.w, it.h, 0.002, 0.0005)} material={getMaterial('paper')} castShadow />
          <mesh geometry={cached('pin', () => new THREE.SphereGeometry(0.008, 10, 8))} material={getMaterial('red-lacquer')} position={[0, it.h / 2 - 0.02, 0.006]} />
        </group>
      ))}
    </group>
  );
}

/** Institutional wall clock; hands show `hour` and advance with frame time. */
export function WallClock({ hour = 9.25, speed = 60, position, rotation, frame }: P & { hour?: number; speed?: number }) {
  const { t } = useAssetTime(frame);
  const minutes = (hour * 60 + (t * speed) / 60) % 720;
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={cylinderBase(0.17, 0.17, 0.05, 40)} material={getMaterial('metal-dark')} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={cylinderBase(0.155, 0.155, 0.004, 40)} material={getMaterial('plastic-white')} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]} />
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} geometry={bevelBox(0.008, 0.028, 0.004, 0.001)} material={getMaterial('matte-black')} position={[Math.sin(i * Math.PI / 6) * 0.13, Math.cos(i * Math.PI / 6) * 0.13, 0.056]} rotation={[0, 0, -i * Math.PI / 6]} />)}
      <group rotation={[0, 0, -(minutes / 720) * Math.PI * 2]}><mesh geometry={bevelBox(0.012, 0.08, 0.004, 0.002)} material={getMaterial('matte-black')} position={[0, 0.04, 0.06]} /></group>
      <group rotation={[0, 0, -((minutes % 60) / 60) * Math.PI * 2]}><mesh geometry={bevelBox(0.008, 0.12, 0.004, 0.002)} material={getMaterial('matte-black')} position={[0, 0.06, 0.064]} /></group>
    </group>
  );
}

/** Steel lab stool (round seat, splayed legs, foot ring). */
export function Stool({ position, rotation }: P) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={cylinderBase(0.17, 0.17, 0.05, 28)} material={getMaterial('leather-dark')} position={[0, 0.62, 0]} castShadow />
      {[0, 1, 2, 3].map((i) => { const a = (i * Math.PI) / 2 + Math.PI / 4; return <mesh key={i} geometry={taperedCapsule(0.012, 0.012, 0.66, 8)} material={getMaterial('chrome')} position={[Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2]} rotation={[Math.sin(a) * -0.2, 0, Math.cos(a) * 0.2]} castShadow />; })}
      <mesh geometry={cached('stoolring', () => new THREE.TorusGeometry(0.16, 0.008, 6, 32))} material={getMaterial('chrome')} position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

/** Mechanical typewriter with paper. */
export function Typewriter({ position, rotation, sheet = true }: P & { sheet?: boolean }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bevelBoxBase(0.42, 0.1, 0.36, 0.03)} material={getMaterial('metal-dark')} castShadow />
      <mesh geometry={bevelBox(0.4, 0.06, 0.14, 0.02)} material={getMaterial('metal-dark')} position={[0, 0.13, -0.08]} rotation={[0.3, 0, 0]} />
      <mesh geometry={cylinderBase(0.03, 0.03, 0.46, 20)} material={getMaterial('rubber-black')} position={[-0.23, 0.17, -0.12]} rotation={[0, 0, -Math.PI / 2]} />
      {Array.from({ length: 4 }, (_, row) => Array.from({ length: 10 }, (_, k) => <mesh key={`${row}-${k}`} geometry={cylinderBase(0.011, 0.011, 0.012, 10)} material={getMaterial('plastic-cream')} position={[-0.16 + k * 0.035 + row * 0.01, 0.1 + row * 0.012, 0.12 - row * 0.035]} />))}
      {sheet && <mesh geometry={bevelBox(0.21, 0.24, 0.001, 0.0004)} material={getMaterial('paper')} position={[0, 0.27, -0.13]} rotation={[-0.25, 0, 0]} />}
    </group>
  );
}

/** Scattered or poured two-tone capsules (antibiotics). `pour` animates them falling between frames. */
export function Capsules({ count = 24, spread = 0.25, seed = 6, colors = ['red-lacquer', 'plastic-white'] as MaterialPresetId[], position, rotation, pourStart, pourEnd, frame }: P & { count?: number; spread?: number; seed?: number; colors?: MaterialPresetId[]; pourStart?: number; pourEnd?: number }) {
  const { frame: f } = useAssetTime(frame);
  const half = cached('caphalf', () => new THREE.CapsuleGeometry(0.0085, 0.012, 4, 12).translate(0, 0.006, 0));
  const items = useMemo(() => { const r = rng(seed); return Array.from({ length: count }, (_, i) => ({ x: (r() - 0.5) * spread, z: (r() - 0.5) * spread, ry: r() * 6, delay: r() })); }, [count, spread, seed]);
  const pour = pourStart !== undefined && pourEnd !== undefined;
  const mk = (top: boolean) => items.map((it) => {
    const k = pour ? smoothstep(pourStart! + it.delay * (pourEnd! - pourStart!) * 0.5, pourStart! + (0.5 + it.delay * 0.5) * (pourEnd! - pourStart!), f) : 1;
    const y = 0.0085 + (1 - k) * 0.6;
    return { p: [it.x, y, it.z] as V3, r: [0, it.ry, Math.PI / 2 + (top ? 0 : Math.PI)] as V3 };
  });
  return (
    <group position={position} rotation={rotation}>
      <Instances geometry={half} material={getMaterial(colors[0])} transforms={mk(true)} />
      <Instances geometry={half} material={getMaterial(colors[1])} transforms={mk(false)} />
    </group>
  );
}

/** Amber pharmacy pill bottle with white cap and label. */
export function PillBottle({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={lathe([[0.001, 0], [0.032, 0], [0.034, 0.004], [0.034, 0.085], [0.03, 0.09], [0.001, 0.09]], 24)} material={getMaterial('glass-amber')} />
      <mesh geometry={cylinderBase(0.036, 0.036, 0.025, 24)} material={getMaterial('plastic-white')} position={[0, 0.088, 0]} />
      <mesh geometry={cylinderBase(0.0345, 0.0345, 0.045, 24, true)} material={getMaterial('paper')} position={[0, 0.02, 0]} />
    </group>
  );
}

/** Generic monitor / CRT showing a canvas texture (endoscopy | chart | slide). */
export function Monitor({ content = 'endoscopy', title, width = 0.48, height = 0.36, position, rotation, glowColor = '#ff6a5a' }: P & { content?: 'endoscopy' | 'chart' | 'slide'; title?: string; width?: number; height?: number; glowColor?: string }) {
  const tex = content === 'endoscopy' ? endoscopyTexture() : content === 'chart' ? chartTexture(title ?? '10%') : slideTexture(title);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.25, roughness: 0.25, toneMapped: false }), [tex]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bevelBox(width + 0.08, height + 0.08, 0.32, 0.03)} material={getMaterial('plastic-cream')} position={[0, 0, -0.14]} castShadow />
      <mesh geometry={cached(`scr${width}${height}`, () => new THREE.PlaneGeometry(width, height))} material={mat} position={[0, 0, 0.022]} />
      <rectAreaLight args={[glowColor, 2.5, width, height]} position={[0, 0, 0.05]} />
    </group>
  );
}

/** Endoscopy tower: rolling cart, monitor with live gastric feed, light source, coiled scope. */
export function EndoscopyTower({ position, rotation }: P) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bevelBoxBase(0.6, 0.06, 0.55, 0.015)} material={getMaterial('metal-cream')} position={[0, 0.12, 0]} />
      <mesh geometry={bevelBoxBase(0.6, 0.06, 0.55, 0.015)} material={getMaterial('metal-cream')} position={[0, 0.8, 0]} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <mesh key={i} geometry={cylinderBase(0.015, 0.015, 1.15, 10)} material={getMaterial('metal-brushed')} position={[x * 0.27, 0.05, z * 0.24]} />)}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <mesh key={`w${i}`} geometry={cached('caster', () => new THREE.CylinderGeometry(0.035, 0.035, 0.025, 14).rotateZ(Math.PI / 2))} material={getMaterial('rubber-black')} position={[x * 0.27, 0.035, z * 0.24]} />)}
      <mesh geometry={bevelBoxBase(0.5, 0.14, 0.4, 0.02)} material={getMaterial('plastic-white')} position={[0, 0.86, 0]} castShadow />
      <mesh geometry={bevelBox(0.04, 0.012, 0.004, 0.002)} material={getMaterial('emissive-toxic')} position={[0.18, 0.93, 0.202]} />
      <Monitor content="endoscopy" position={[0, 1.25, 0.04]} />
      <mesh geometry={tubeAlong([[0.2, 0.93, 0.18], [0.35, 0.8, 0.35], [0.5, 0.95, 0.5], [0.42, 1.1, 0.3], [0.6, 0.9, 0.2], [0.9, 0.95, 0.4]], 0.007, 80, 8)} material={getMaterial('rubber-black')} castShadow />
    </group>
  );
}

/** Pleated curtain on a rail; sways gently. `open` 0..1 bunches it to one side. */
export function Curtain({ width = 2.4, height = 2.4, pleats = 18, open = 0, material = 'fabric-gown' as MaterialPresetId, position, rotation, frame }: P & { width?: number; height?: number; pleats?: number; open?: number; material?: MaterialPresetId }) {
  const { t } = useAssetTime(frame);
  const geo = useMemo(() => new THREE.PlaneGeometry(1, height, pleats * 6, 12), [height, pleats]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useLayoutEffect(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const w = width * (1 - open * 0.75);
    for (let i = 0; i < pos.count; i++) {
      const u = base[i * 3] + 0.5, y = base[i * 3 + 1];
      const fold = Math.sin(u * pleats * Math.PI * 2) * (0.06 + open * 0.05);
      const sway = Math.sin(t * 0.7 + u * 3) * 0.015 * (0.5 - y / height);
      pos.setXYZ(i, -width / 2 + u * w, y, fold + sway);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, [geo, base, t, width, open, pleats, height]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bevelBox(width + 0.1, 0.03, 0.03, 0.01)} material={getMaterial('chrome')} position={[0, height / 2 + 0.03, 0]} />
      <mesh geometry={geo} material={getMaterial(material, { side: THREE.DoubleSide })} castShadow receiveShadow />
    </group>
  );
}

/** Window with frame and venetian blinds; slats let light shafts through (pair with a SpotPool outside). */
export function BlindsWindow({ width = 1.6, height = 1.4, slats = 18, tilt = 0.5, position, rotation }: P & { width?: number; height?: number; slats?: number; tilt?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bevelBox(width + 0.12, 0.08, 0.16, 0.02)} material={getMaterial('metal-painted')} position={[0, -height / 2 - 0.04, 0]} />
      <mesh geometry={bevelBox(width + 0.12, 0.08, 0.16, 0.02)} material={getMaterial('metal-painted')} position={[0, height / 2 + 0.04, 0]} />
      {[-1, 1].map((s) => <mesh key={s} geometry={bevelBox(0.06, height, 0.16, 0.015)} material={getMaterial('metal-painted')} position={[s * (width / 2 + 0.03), 0, 0]} />)}
      <mesh geometry={bevelBox(width, height, 0.01, 0.002)} material={getMaterial('glass')} />
      <Instances geometry={bevelBox(width - 0.04, 0.003, 0.045, 0.001)} material={getMaterial('plastic-cream')} transforms={Array.from({ length: slats }, (_, i) => ({ p: [0, -height / 2 + (i + 0.5) * (height / slats), 0.06] as V3, r: [tilt, 0, 0] as V3 }))} />
    </group>
  );
}

/** Exposed pipe run with brackets and valves along a polyline (ceilings, corridors). */
export function PipeRun({ points = [[-3, 3, 0], [3, 3, 0]] as V3[], radius = 0.05, material = 'metal-painted' as MaterialPresetId, valves = 2 }: { points?: V3[]; radius?: number; material?: MaterialPresetId; valves?: number }) {
  const n = points.length;
  return (
    <group>
      <mesh geometry={tubeAlong(points, radius, 24 * n, 12)} material={getMaterial(material)} castShadow />
      {Array.from({ length: valves }, (_, i) => {
        const a = points[Math.min(n - 2, Math.floor(((i + 1) / (valves + 1)) * (n - 1)))];
        const b = points[Math.min(n - 1, Math.floor(((i + 1) / (valves + 1)) * (n - 1)) + 1)];
        const p: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        return (
          <group key={i} position={p}>
            <mesh geometry={cylinderBase(radius * 1.5, radius * 1.5, radius * 2.5, 16)} material={getMaterial('brass')} position={[0, -radius * 1.25, 0]} />
            <mesh geometry={cached('valvewheel', () => new THREE.TorusGeometry(1, 0.15, 6, 18))} material={getMaterial('red-lacquer')} position={[0, radius * 2.6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={radius * 2} />
          </group>
        );
      })}
    </group>
  );
}

/** Cast-iron column radiator. */
export function Radiator({ fins = 12, position, rotation }: P & { fins?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <Instances geometry={bevelBoxBase(0.05, 0.6, 0.16, 0.02)} material={getMaterial('metal-cream')} transforms={Array.from({ length: fins }, (_, i) => ({ p: [(i - fins / 2) * 0.065, 0.12, 0] as V3 }))} />
      {[0.16, 0.68].map((y) => <mesh key={y} geometry={bevelBox(fins * 0.065, 0.04, 0.05, 0.01)} material={getMaterial('metal-cream')} position={[-0.03, y, 0]} />)}
    </group>
  );
}

/** Raked lecture-theatre seating: instanced timber seats with crimson upholstery + riser steps. */
export function TheatreSeats({ rows = 7, perRow = 12, spacing = [0.62, 0.95] as [number, number], rise = 0.32, position, rotation }: P & { rows?: number; perRow?: number; spacing?: [number, number]; rise?: number }) {
  const seats = useMemo(() => {
    const out: { p: V3 }[] = [];
    for (let r = 0; r < rows; r++) for (let i = 0; i < perRow; i++) out.push({ p: [(i - (perRow - 1) / 2) * spacing[0], r * rise, r * spacing[1]] });
    return out;
  }, [rows, perRow, spacing, rise]);
  const backT = seats.map((s) => ({ p: [s.p[0], s.p[1] + 0.72, s.p[2] + 0.22] as V3, r: [-0.12, 0, 0] as V3 }));
  const seatT = seats.map((s) => ({ p: [s.p[0], s.p[1] + 0.45, s.p[2]] as V3 }));
  const armT = seats.map((s) => ({ p: [s.p[0] + spacing[0] / 2, s.p[1] + 0.3, s.p[2] + 0.05] as V3 }));
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: rows }, (_, r) => <mesh key={r} geometry={bevelBoxBase(perRow * spacing[0] + 1.6, (r + 1) * rise, spacing[1], 0.02, 2)} material={getMaterial('wood-floor')} position={[0, 0, r * spacing[1] + 0.05]} receiveShadow castShadow />)}
      <Instances geometry={bevelBox(spacing[0] * 0.86, 0.5, 0.07, 0.03)} material={getMaterial('velvet-red')} transforms={backT} />
      <Instances geometry={bevelBox(spacing[0] * 0.86, 0.09, 0.46, 0.03)} material={getMaterial('velvet-red')} transforms={seatT} />
      <Instances geometry={bevelBoxBase(0.05, 0.36, 0.5, 0.015)} material={getMaterial('wood-dark')} transforms={armT} />
    </group>
  );
}

/** Projection screen with a slide or chart texture and a projector beam. */
export function ProjectionScreen({ width = 4, height = 2.25, content = 'slide' as 'slide' | 'chart', title, beam = true, position, rotation }: P & { width?: number; height?: number; content?: 'slide' | 'chart'; title?: string; beam?: boolean }) {
  const tex = content === 'chart' ? chartTexture(title ?? '10%') : slideTexture(title);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.0, roughness: 0.9, toneMapped: false }), [tex]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bevelBox(width + 0.12, height + 0.12, 0.05, 0.02)} material={getMaterial('matte-black')} position={[0, 0, -0.03]} />
      <mesh geometry={cached(`proj${width}${height}`, () => new THREE.PlaneGeometry(width, height))} material={mat} />
      <rectAreaLight args={['#ffe8e0', 4, width, height]} position={[0, 0, 0.05]} />
      {beam && <mesh geometry={cached(`beam${width}`, () => new THREE.ConeGeometry(width * 0.62, 9, 4, 1, true).rotateX(-Math.PI / 2).rotateZ(Math.PI / 4).translate(0, 0, 4.5))} material={getMaterial('emissive-white', { emissiveIntensity: 0.06, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })} />}
    </group>
  );
}

/** Folded newspaper / journal with a real headline (canvas-printed), lying on a surface. */
export function Newspaper({ headline = 'THE PATIENT', masthead = 'MEDICAL JOURNAL', position, rotation, scale = 1 }: P & { headline?: string; masthead?: string }) {
  const tex = newspaperTexture(headline, masthead);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, side: THREE.DoubleSide }), [tex]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bevelBox(0.3, 0.4, 0.004, 0.001)} material={getMaterial('paper')} position={[0.003, -0.003, -0.004]} castShadow />
      <mesh geometry={cached('newsplane', () => new THREE.PlaneGeometry(0.3, 0.4))} material={mat} />
    </group>
  );
}
