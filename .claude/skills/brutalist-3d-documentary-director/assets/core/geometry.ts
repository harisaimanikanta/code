// Production geometry kit. Replaces "scaled unit cube" modelling with real-dimension, bevelled, UV-correct
// geometry so edges catch light and textures keep a constant world scale (no stretching).
// Everything is cached by parameters: never allocate geometry per render.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const cache = new Map<string, THREE.BufferGeometry>();
const k = (...a: (number | string | boolean)[]) => a.map((x) => (typeof x === 'number' ? x.toFixed(4) : String(x))).join('|');
export function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key) as T | undefined;
  if (!g) { g = make(); cache.set(key, g); }
  return g;
}

/** Box-projected UVs in world units (1 UV unit = `tile` meters) — constant texel density on any size. */
export function boxUV(geo: THREE.BufferGeometry, tile = 2): THREE.BufferGeometry {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let u: number, v: number;
    if (ax >= ay && ax >= az) { u = z; v = y; } else if (ay >= az) { u = x; v = z; } else { u = x; v = y; }
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Bevelled box with real dimensions, centred at origin. radius defaults to ~2 % of the smallest side. */
export function bevelBox(w: number, h: number, d: number, radius?: number, segments = 2, tile = 2): THREE.BufferGeometry {
  const r = Math.min(radius ?? Math.min(w, h, d) * 0.04, Math.min(w, h, d) * 0.49);
  return cached(k('bevel', w, h, d, r, segments, tile), () => boxUV(new RoundedBoxGeometry(w, h, d, segments, r), tile));
}

/** Bevelled box whose origin is at the bottom centre (sits on y=0). */
export function bevelBoxBase(w: number, h: number, d: number, radius?: number, tile = 2): THREE.BufferGeometry {
  return cached(k('bevelBase', w, h, d, radius ?? -1, tile), () => bevelBox(w, h, d, radius, 2, tile).clone().translate(0, h / 2, 0));
}

/** Lathe from a [radius, y] profile (y ascending). Smooth shaded. */
export function lathe(profile: [number, number][], segments = 24, phiStart = 0, phiLength = Math.PI * 2): THREE.BufferGeometry {
  return cached(k('lathe', JSON.stringify(profile), segments, phiStart, phiLength), () => {
    const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), segments, phiStart, phiLength);
    g.computeVertexNormals();
    return g;
  });
}

/** Tapered capsule along +Y from y=0 to y=length (r0 at bottom, r1 at top) — limbs, fingers, cables. */
export function taperedCapsule(r0: number, r1: number, length: number, radial = 14): THREE.BufferGeometry {
  const steps = 6;
  const prof: [number, number][] = [];
  for (let i = 0; i <= steps; i++) { const a = (-Math.PI / 2) + (i / steps) * (Math.PI / 2); prof.push([Math.cos(a) * r0, Math.sin(a) * r0 + r0 * 0.1]); }
  for (let i = 0; i <= steps; i++) { const a = (i / steps) * (Math.PI / 2); prof.push([Math.cos(a) * r1, length - r1 * 0.1 + Math.sin(a) * r1]); }
  return lathe(prof, radial);
}

/** Cylinder with real dimensions sitting on y=0 (optionally open). */
export function cylinderBase(rTop: number, rBottom: number, h: number, radial = 24, open = false): THREE.BufferGeometry {
  return cached(k('cylBase', rTop, rBottom, h, radial, open), () => new THREE.CylinderGeometry(rTop, rBottom, h, radial, 1, open).translate(0, h / 2, 0));
}

/** Tube along points (Catmull-Rom) with constant or per-point-interpolated radius. */
export function tubeAlong(points: [number, number, number][], radius: number | ((u: number) => number), tubular = 64, radial = 12, closed = false): THREE.BufferGeometry {
  const key = k('tube', JSON.stringify(points), typeof radius === 'number' ? radius : radius.toString(), tubular, radial, closed);
  return cached(key, () => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'centripetal');
    if (typeof radius === 'number') return new THREE.TubeGeometry(curve, tubular, radius, radial, closed);
    // variable radius: build a TubeGeometry then rescale each ring around the curve
    const g = new THREE.TubeGeometry(curve, tubular, 1, radial, closed);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const frames = curve.computeFrenetFrames(tubular, closed);
    for (let i = 0; i <= tubular; i++) {
      const u = i / tubular;
      const c = curve.getPointAt(u);
      const r = radius(u);
      for (let j = 0; j <= radial; j++) {
        const idx = i * (radial + 1) + j;
        const v = new THREE.Vector3(pos.getX(idx), pos.getY(idx), pos.getZ(idx)).sub(c).multiplyScalar(r).add(c);
        pos.setXYZ(idx, v.x, v.y, v.z);
      }
      void frames;
    }
    g.computeVertexNormals();
    return g;
  });
}

/** Sphere deformed by a displacement function (unit-sphere direction → radius multiplier). */
export function deformedSphere(key: string, radius: number, fn: (x: number, y: number, z: number) => [number, number, number], w = 32, h = 24): THREE.BufferGeometry {
  return cached(k('dsphere', key, radius, w, h), () => {
    const g = new THREE.SphereGeometry(radius, w, h);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const [x, y, z] = fn(pos.getX(i) / radius, pos.getY(i) / radius, pos.getZ(i) / radius);
      pos.setXYZ(i, x * radius, y * radius, z * radius);
    }
    g.computeVertexNormals();
    return g;
  });
}

/** Extruded 2D shape (outline points in XY, extruded along +Z by depth, bevelled). */
export function extrudeOutline(key: string, outline: [number, number][], depth: number, bevel = 0.01, holes: [number, number][][] = []): THREE.BufferGeometry {
  return cached(k('extrude', key, depth, bevel), () => {
    const s = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
    g.computeVertexNormals();
    return boxUV(g, 1);
  });
}
