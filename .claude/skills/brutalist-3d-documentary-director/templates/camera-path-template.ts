// TEMPLATE — author camera moves in TypeScript (typed, computed) instead of hand-editing JSON.
// Copy to <project>/scripts/camera-paths.ts and run:  node scripts/camera-paths.ts && npm run bake
// It merges the `camera` block of each listed shot into data/shot-plan.json (other fields untouched).
// Useful for procedural choreography (e.g. alternating orbit directions, waypoints computed from geometry).
import { readFileSync, writeFileSync } from 'node:fs';
import type { CameraSpec } from '../src/library/camera-rigs/engine/compile.ts';

type V3 = [number, number, number];

// Helpers -------------------------------------------------------------------------------------------
const orbit = (target: string, radius: number, sweepDeg: number, extra: Partial<CameraSpec> = {}): CameraSpec => ({ move: 'orbit', target, radius, sweepDeg, ...extra });
const through = (via: (string | V3)[], to: string | V3, extra: Partial<CameraSpec> = {}): CameraSpec => ({ move: 'through', via, to, lookAlongPath: true, ...extra });
/** Waypoints along an AnatomicalTunnel centreline (mirror of tunnelCenterline in biological/Anatomy.tsx). */
const tunnelPoints = (origin: V3, length: number, bend: number, n = 4): V3[] =>
  Array.from({ length: n }, (_, i) => {
    const u = (i + 1) / (n + 1);
    return [origin[0] + Math.sin(u * Math.PI * 1.5) * bend, origin[1] + Math.sin(u * Math.PI) * bend * 0.4, origin[2] - u * length];
  });

// Choreography ---------------------------------------------------------------------------------------
let dir = 1; // alternate orbit direction for rhythm
const alt = (deg: number) => (dir *= -1) * deg;

export const cameraByShot: Record<string, CameraSpec> = {
  S001: { move: 'crane', distance: -4, forward: 5, target: 'doctor.head', fov: 38 },
  S002: orbit('doctor.head', 4.5, alt(60), { height: 0.2, fov: 34 }),
  S003: through(['hall.door', [0, 2, -20]], 'lab.door', { fov: 44 }),
  S004: { move: 'travel', via: tunnelPoints([0, 1.6, -60], 40, 3), to: [0, 1.6, -100], lookAlongPath: true, fov: 55 },
};

// Merge ------------------------------------------------------------------------------------------------
const path = new URL('../data/shot-plan.json', import.meta.url);
const plan = JSON.parse(readFileSync(path, 'utf8'));
let n = 0;
for (const s of plan.shots) if (cameraByShot[s.id]) { s.camera = cameraByShot[s.id]; n++; }
writeFileSync(path, JSON.stringify(plan, null, 1));
console.log(`merged ${n} camera specs into data/shot-plan.json — now run: npm run bake`);
