// Compiles data/shot-plan.json + data/world-layout.json into src/generated/camera-track.json.
// Run: node scripts/bake-camera.ts   (Node >= 22.18, native TypeScript type stripping)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileCameraTrack } from '../src/library/camera-rigs/engine/compile.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const config = readJson('data/production-config.json');
const plan = readJson('data/shot-plan.json');
const layout = readJson('data/world-layout.json');
const anchorsPath = 'src/library/environments/anchors.json';
const presetsPath = 'src/library/camera-rigs/move-presets.json';
const componentAnchors = existsSync(join(root, anchorsPath)) ? readJson(anchorsPath).components : {};
const movePresets = existsSync(join(root, presetsPath)) ? readJson(presetsPath).presets : {};

const cam = config.camera ?? {};
const track = compileCameraTrack(plan.shots, layout, {
  fps: config.fps,
  durationFrames: config.durationFrames,
  initial: cam.initial ?? { position: [0, 1.7, 8], target: [0, 1.5, 0], fov: 38 },
  smoothingSeconds: cam.smoothingSeconds,
  handheld: cam.handheld,
  movePresets,
  componentAnchors,
});

const out = join(root, 'src/generated/camera-track.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(track));
const orbital = track.shots.filter((s) => s.orbital).reduce((a, s) => a + (s.endFrame - s.startFrame), 0);
console.log(`camera-track: ${track.frames} frames @ ${track.fps}fps, ${track.shots.length} moves, orbital ${(100 * orbital / track.frames).toFixed(1)}% (planned)`);
for (const s of track.shots) if (s.peakSpeed > (cam.maxSpeed ?? 20)) console.warn(`  ! ${s.id} (${s.move}) peak speed ${s.peakSpeed} m/s`);
for (const w of track.warnings) console.warn(`  ! ${w}`);
console.log(`wrote ${out}`);
