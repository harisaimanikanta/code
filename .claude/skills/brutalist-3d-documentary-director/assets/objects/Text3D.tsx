// Extruded 3D lettering (Oswald Bold, OFL) — storyboard text panels become physical objects:
// letters cast into concrete walls, a stamped crimson "REJECTED", a gilded plaque, signage on a facade.
// Never use flat text cards in the 3D world; use this.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { getMaterial, type MaterialPresetId } from '../materials/materials';
import { cached, bevelBox } from '../core/geometry';
import { envelope, smoothstep } from '../core/math';
import { useAssetTime } from '../core/time';
import oswald from '../textures/fonts/oswald-bold.typeface.json';

type V3 = [number, number, number];
let FONT: Font | null = null;
const font = () => (FONT ??= new FontLoader().parse(oswald as never));

/** Geometry for a string, centred horizontally (align) and sitting on y=0. Cached. */
export function textGeometry(text: string, size: number, depth: number, bevel = true, align: 'left' | 'center' | 'right' = 'center', letterSpacing = 0): THREE.BufferGeometry {
  return cached(`text|${text}|${size}|${depth}|${bevel}|${align}|${letterSpacing}`, () => {
    let g: THREE.BufferGeometry;
    if (letterSpacing === 0) {
      g = new TextGeometry(text, { font: font(), size, depth, curveSegments: 6, bevelEnabled: bevel, bevelThickness: depth * 0.12, bevelSize: size * 0.012, bevelSegments: 2 });
    } else {
      // manual tracking: one geometry per glyph, merged
      const parts: THREE.BufferGeometry[] = [];
      let x = 0;
      for (const ch of text) {
        if (ch !== ' ') { const gg = new TextGeometry(ch, { font: font(), size, depth, curveSegments: 6, bevelEnabled: bevel, bevelThickness: depth * 0.12, bevelSize: size * 0.012, bevelSegments: 2 }); gg.translate(x, 0, 0); parts.push(gg); }
        const gl = (font().data as unknown as { glyphs: Record<string, { ha: number }>; resolution: number }).glyphs[ch];
        x += ((gl?.ha ?? 300) / 1000) * size + letterSpacing * size;
      }
      g = mergeGeometries(parts);
    }
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    const w = bb.max.x - bb.min.x;
    g.translate(align === 'center' ? -bb.min.x - w / 2 : align === 'right' ? -bb.max.x : -bb.min.x, -bb.min.y, -depth / 2);
    g.computeVertexNormals();
    return g;
  });
}

function mergeGeometries(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const ni = gs.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = ni.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of ni) {
    g.computeVertexNormals();
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

export interface Text3DProps {
  text: string;
  size?: number; // cap height-ish (meters)
  depth?: number;
  material?: MaterialPresetId;
  align?: 'left' | 'center' | 'right';
  letterSpacing?: number; // fraction of size
  position?: V3;
  rotation?: V3;
  /** reveal: letters rise out of the surface between [revealStart, revealEnd] */
  revealStart?: number;
  revealEnd?: number;
  frame?: number;
  castShadow?: boolean;
}

/** Extruded text. With revealStart/End the text pushes out of its backing surface (depth animation). */
export function Text3D({ text, size = 0.5, depth = 0.08, material = 'concrete-rough', align = 'center', letterSpacing = 0.04, position, rotation, revealStart, revealEnd, frame, castShadow = true }: Text3DProps) {
  const { frame: f } = useAssetTime(frame);
  const geo = useMemo(() => textGeometry(text, size, depth, true, align, letterSpacing), [text, size, depth, align, letterSpacing]);
  const k = revealStart !== undefined && revealEnd !== undefined ? smoothstep(revealStart, revealEnd, f) : 1;
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo} material={getMaterial(material)} position={[0, 0, -depth * (1 - k)]} castShadow={castShadow} receiveShadow />
    </group>
  );
}

/** Rubber-stamp impression: crimson bordered word that slams onto paper/desk at `at` (overshoot + settle). */
export function StampMark({ text = 'REJECTED', size = 0.12, at = 0, position, rotation = [-Math.PI / 2, 0, 0.18] as V3, frame }: { text?: string; size?: number; at?: number; position?: V3; rotation?: V3; frame?: number }) {
  const { frame: f } = useAssetTime(frame);
  if (f < at - 2) return null;
  const k = smoothstep(at - 2, at + 2, f);
  const s = 1 + (1 - k) * 0.4 + Math.max(0, Math.sin((f - at) * 0.9)) * 0.04 * envelope(f, at, at + 10, 0, 10);
  const geo = textGeometry(text, size, size * 0.06, false, 'center', 0.06);
  geo.computeBoundingBox();
  const w = geo.boundingBox!.max.x - geo.boundingBox!.min.x + size * 0.6;
  const h = size * 1.6;
  const frameW = size * 0.08;
  return (
    <group position={position} rotation={rotation} scale={s}>
      <mesh geometry={geo} material={getMaterial('red-lacquer')} position={[0, -size * 0.5, 0]} />
      {[[0, h / 2], [0, -h / 2]].map(([x, y], i) => <mesh key={i} geometry={bevelBox(w, frameW, size * 0.05, frameW * 0.3)} material={getMaterial('red-lacquer')} position={[x, y, 0]} />)}
      {[[-w / 2, 0], [w / 2, 0]].map(([x, y], i) => <mesh key={`v${i}`} geometry={bevelBox(frameW, h + frameW, size * 0.05, frameW * 0.3)} material={getMaterial('red-lacquer')} position={[x, y, 0]} />)}
    </group>
  );
}
