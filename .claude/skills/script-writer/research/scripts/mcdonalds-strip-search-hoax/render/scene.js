// "The Phone Call" — McDonald's strip-search hoax (2004). One continuous take, synced to voiceover.mp3 (141.17 s).
// Premium pass: physically lit sets, area lights + shadows, AO + DOF, restrained grade, no bloom. See TREATMENT.md.
import * as THREE from 'three';
import { makeRenderer, makePost, useHDRI, lerp, clamp, prog, smooth, easeInOut, easeOut, easeIn, captionsFromLines, label, loadWorld } from 'kit';
import { particles, lightBeam, drift, bell, cameraRail } from '/kit/fx.js';
import { makeCast, LOOKS } from './cast.js';
import { restaurant, exterior, lineSet, mapSet, courtSet, voidSet, V, box, phys } from './sets.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const duration = 141.17;
export const fps = 30;
const LINES = await (await fetch('/scene/analysis/lines.json')).json();
const fix = s => s.replace('eighteen-year-old', '18-year-old').replace('fifty-eight-year-old', '58-year-old').replace('April ninth, two thousand four', 'April 9, 2004').replace('thirty-two', '32');
export const captions = captionsFromLines(LINES.map(([a, b, txt]) => ({ t: a, end: b + 0.12, text: fix(txt) })));
export const captionStyle = { y: 0.775, size: 0.056 };

// environment segments (switch only inside a portal fill, at the narrator's pauses)
const SEG = [['hook', 0, 8.48], ['line', 8.48, 14.25], ['ext', 14.25, 17.56], ['rest', 17.56, 94.06], ['caller', 94.06, 99.7], ['map', 99.7, 106.06], ['court', 106.06, 112.38], ['void', 112.38, 141.2]]
  .map(([n, s, e]) => ({ n, s, e }));
const PORTALS = [[8.48, 0.26, '#05070d', 0.2], [14.25, 0.2, '#0b0d12', 0.15], [17.56, 0.16, '#f2dcb0', 0.15], [32.56, 0.2, '#14110e', 0.15], [48.35, 0.19, '#14110e', 0.1],
  [66.74, 0.17, '#08080a', 0.1], [94.06, 0.17, '#050507', 0.15], [99.7, 0.12, '#050507', 0.1], [106.06, 0.17, '#f4efe4', 0.15], [112.38, 0.2, '#060607', 0.1], [131.0, 0.17, '#060607', 0.1]];

const R = (keys) => cameraRail(keys.map(([t, pos, at, fov]) => ({ t, pos, at, fov })));
// ----- camera rails per continuous stretch -----
const CAM = {
  hook: R([[0, [3.22, 0.9, -5.2], [3.0, 0.85, -5.43], 30], [3, [3.45, 1.0, -5.0], [3.0, 0.88, -5.45], 31], [5.6, [3.7, 1.25, -4.65], [3.15, 1.1, -5.7], 34], [7.1, [3.8, 1.52, -4.75], [3.28, 1.56, -6.0], 36], [8.6, [3.62, 1.58, -5.25], [3.38, 1.57, -6.0], 34]]),
  ext: R([[14.1, [-4.5, 2.6, 31], [-1.5, 3.4, 0], 46], [15.9, [-1.8, 2.0, 19], [0, 2.3, 0], 44], [17.7, [0.3, 1.75, 7.0], [0.3, 1.7, 4.9], 42]]),
  r1: R([[17.4, [3.95, 1.5, -3.5], [3.3, 1.25, -5.6], 38], [20, [3.75, 1.52, -4.3], [3.25, 1.4, -5.9], 37], [22.5, [3.57, 1.6, -4.95], [3.25, 1.6, -6.05], 34], [24.2, [3.85, 1.62, -5.55], [3.1, 1.55, -5.9], 36],
    [25.3, [3.72, 1.7, -6.33], [2.0, 1.3, -1.0], 40], [26.4, [2.95, 1.55, -3.75], [0.5, 1.4, -0.8], 40], [27.4, [2.4, 1.5, -2.6], [0.3, 1.45, -0.8], 40], [28.7, [1.25, 1.52, -1.6], [0.2, 1.5, -0.75], 38],
    [29.9, [1.0, 1.55, -0.1], [0.2, 1.52, -0.7], 36], [31.0, [0.72, 1.56, 0.95], [0.2, 1.55, -0.7], 33], [32.7, [0.46, 1.57, 0.55], [0.2, 1.57, -0.7], 30]]),
  r2: R([[32.4, [4.6, 1.55, -4.6], [1.8, 1.3, -4.3], 40], [34.8, [4.35, 1.55, -4.9], [2.6, 1.35, -4.4], 40], [35.8, [3.75, 1.56, -4.6], [3.25, 1.5, -5.95], 37], [37.5, [3.45, 1.6, -5.22], [3.22, 1.6, -6.05], 34],
    [38.05, [3.25, 1.58, -5.25], [2.55, 1.58, -4.32], 34], [38.7, [3.18, 1.57, -5.18], [2.55, 1.58, -4.32], 33], [39.5, [3.35, 1.5, -4.7], [2.8, 0.95, -5.65], 40], [40.4, [3.38, 1.48, -4.72], [2.8, 0.93, -5.68], 40],
    [41.2, [3.65, 1.6, -5.12], [3.25, 1.6, -6.05], 34], [43.5, [3.55, 1.32, -4.6], [3.25, 1.75, -6.2], 38], [46.0, [3.35, 1.02, -3.78], [3.25, 1.85, -6.3], 40], [48.5, [3.12, 0.95, -3.52], [3.25, 1.9, -6.3], 41]]),
  r3: R([[48.2, [0.7, 1.55, -2.85], [1.3, 1.35, -4.6], 44], [50.5, [0.68, 1.55, -2.9], [1.2, 1.35, -4.9], 44], [52.2, [0.92, 1.5, -3.5], [1.0, 1.3, -6.2], 40], [53.5, [1.12, 1.5, -3.75], [3.2, 1.45, -5.95], 36],
    [54.6, [0.92, 1.38, -3.42], [1.0, 1.4, -6.2], 40], [57.0, [0.86, 1.2, -3.45], [1.05, 1.6, -4.9], 38], [58.3, [0.55, 1.35, -2.75], [1.45, 1.05, -4.45], 50], [60.6, [0.6, 1.25, -3.0], [1.45, 0.85, -4.45], 50],
    [62.6, [1.2, 1.5, -4.1], [0.47, 1.9, -4.45], 36], [65.4, [1.15, 1.85, -4.35], [0.47, 2.15, -4.45], 32], [66.9, [1.02, 2.0, -4.42], [0.47, 2.15, -4.45], 28]]),
  r4: R([[66.6, [2.6, 1.45, -3.6], [3.4, 1.4, -5.7], 40], [69.0, [2.85, 1.5, -4.0], [3.4, 1.5, -5.7], 38], [71.0, [3.1, 1.6, -4.45], [3.25, 1.62, -6.0], 36], [72.4, [3.3, 1.66, -4.75], [3.25, 1.66, -6.05], 34],
    [74.0, [3.42, 1.6, -4.8], [3.25, 1.66, -6.05], 34], [76.8, [3.38, 1.38, -4.85], [3.25, 1.68, -6.05], 34], [78.8, [3.35, 1.36, -4.92], [3.25, 1.68, -6.05], 33], [81.0, [2.55, 1.55, -4.0], [3.25, 1.4, -5.9], 38],
    [82.9, [2.8, 1.4, -4.3], [3.05, 0.95, -5.4], 38], [83.55, [3.75, 1.55, -4.55], [3.05, 0.9, -5.4], 38], [84.2, [3.6, 1.4, -5.15], [3.04, 0.85, -5.38], 36], [85.3, [3.58, 1.42, -5.2], [3.04, 0.86, -5.38], 36], [86.4, [3.2, 1.55, -5.75], [3.1, 1.58, -4.85], 36],
    [88.8, [3.16, 1.6, -5.6], [3.1, 1.6, -4.85], 34], [90.0, [3.9, 1.6, -4.95], [2.9, 1.6, -6.5], 42], [91.8, [3.9, 1.3, -5.15], [3.5, 0.8, -5.6], 38], [93.3, [3.45, 1.55, -4.2], [2.5, 1.4, -1.0], 38], [94.2, [3.25, 1.5, -3.65], [2.0, 1.4, -0.5], 38]]),
  caller: R([[93.9, [184.6, 1.75, -0.5], [187.2, 1.6, 0.4], 38], [97, [185.0, 1.65, -0.75], [187.2, 1.7, 0.4], 36], [99.85, [185.3, 1.7, -0.6], [187.3, 1.8, 0.35], 34]]),
  map: R([[99.6, [0, 8.6, 3.0], [0, 0, -0.1], 44], [102, [0.25, 7.2, 2.6], [0.15, 0, -0.05], 44], [105, [0.6, 6.0, 2.3], [0.4, 0, 0.0], 42]]),
  court: R([[105.9, [0, 1.7, 7.2], [-0.5, 1.3, 0], 40], [108.5, [-0.6, 1.5, 4.3], [-1.6, 1.1, 1.45], 40], [110.6, [-0.8, 1.5, 3.4], [-1.6, 1.15, 1.45], 38], [111.4, [0.6, 1.9, 1.2], [5.4, 1.3, -1.4], 38], [112.5, [1.2, 2.2, -1.6], [0.55, 1.8, -3.55], 36]]),
  v1: R([[112.2, [1.45, 1.5, 1.95], [-0.2, 0.85, 0.1], 36], [114.8, [0.6, 1.35, 2.2], [-0.25, 0.85, 0.1], 36], [117.0, [0.1, 1.6, 3.4], [-3.0, 1.1, -1.2], 46], [118.4, [2.0, 1.4, 2.4], [2.4, 0.8, -0.4], 40], [119.8, [3.7, 1.2, 1.0], [2.6, 0.6, -0.6], 38], [121.0, [2.4, 0.5, 1.4], [1.3, 0.1, 0.45], 36]]),
  v3: R([[130.8, [1.15, 1.35, 1.55], [-0.25, 0.85, 0.12], 34], [136.5, [0.38, 1.05, 0.75], [-0.25, 0.86, 0.12], 30], [139.0, [0.08, 1.06, 0.5], [-0.25, 0.85, 0.12], 29], [141.3, [-0.04, 1.12, 0.36], [-0.25, 0.84, 0.11], 28]]),
};

// receiver at a character's ear: earpiece on the ear, mouthpiece toward the chin
function receiverAtEar(c, side = 'L') {
  c.group.updateMatrixWorld(true);
  const H = c.head, hr = 0.112, s = side === 'L' ? 1 : -1;
  const ear = H.localToWorld(V(s * hr * 1.02, -hr * 0.05, -hr * 0.02)), chin = H.localToWorld(V(s * hr * 0.5, -hr * 1.05, hr * 0.62));
  const X = chin.clone().sub(ear).normalize(), out = H.localToWorld(V(s, 0, 0)).sub(H.localToWorld(V(0, 0, 0))).normalize();
  const Z = new THREE.Vector3().crossVectors(X, out).normalize(), Y = new THREE.Vector3().crossVectors(Z, X).normalize();
  const quat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  return { pos: ear.clone().add(X.clone().multiplyScalar(0.085)).add(Y.clone().multiplyScalar(0.04)), quat };
}
const poleFor = (c, side) => V(side === 'L' ? 1 : -1, -1, -0.15).applyQuaternion(c.group.quaternion);
function walkPath(c, pts, t0, t1, t, speed = 5.6) {
  const k = clamp((t - t0) / (t1 - t0)); const P = pts.map(p => V(p[0], 0, p[1]));
  let total = 0; const L = []; for (let i = 0; i < P.length - 1; i++) { L.push(P[i].distanceTo(P[i + 1])); total += L[L.length - 1]; }
  let d = k * total, i = 0; while (i < L.length - 1 && d > L[i]) { d -= L[i]; i++; }
  const a = P[i], b = P[i + 1], pos = a.clone().lerp(b, Math.min(1, d / L[i]));
  c.group.position.copy(pos); c.group.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  if (k > 0 && k < 1) c.walk(t, speed, smooth(Math.min(k, 1 - k) * 8));
}
const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

export async function setup({ canvas, width, height }) {
  const renderer = makeRenderer(canvas, width, height); renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const post = makePost(renderer, width, height, { ao: true, bloom: 0, grain: 0.028, vignette: 0.38 });
  Object.assign(post.grade, {}); post.grade.uSplit.value = 0.06; post.grade.uCA.value = 0.0006; post.grade.uShadow.value.set('#20323d'); post.grade.uHigh.value.set('#ffcf9a');
  const cam = new THREE.PerspectiveCamera(38, width / height, 0.02, 400);
  const S = {}; const scn = async (n, hdri, opt) => { const s = new THREE.Scene(); S[n] = s; if (hdri) await useHDRI(renderer, s, hdri, opt); return s; };
  const P = []; const addP = (scene, opts) => { const p = particles(opts); p.setScale(height); scene.add(p.points); P.push([scene, p]); return p; };

  // ===== RESTAURANT (one connected set) =====
  const rest = await scn('rest', 'lobby', { intensity: 0.22 }); rest.background = new THREE.Color('#0c0c0e');
  const K = restaurant(rest);
  K.chair.position.set(4.0, 0, -6.15); K.chair.rotation.y = -0.5;
  const mgr = makeCast(LOOKS.manager), lou = makeCast(LOOKS.louise), cow = makeCast(LOOKS.coworker), wal = makeCast(LOOKS.walter), tom = makeCast(LOOKS.tom);
  for (const c of [mgr, lou, cow, wal, tom]) rest.add(c.group);
  const dust = addP(rest, { count: 140, center: [3.6, 1.3, -5.4], box: [1.6, 1.4, 1.2], size: 0.006, color: '#fff1d8', opacity: 0.35, additive: true, motion: 'float', speed: 0.15, seed: 3 });
  // ===== LINE + CALLER ROOM =====
  const line = await scn('line', 'night', { intensity: 0.12 }); const LK = lineSet(line);
  const caller = makeCast({ ...LOOKS.generic, top: 'jacket', topColor: '#1a1a1a', hairStyle: 'short' }); caller.silhouette('#040405');
  caller.group.position.set(186.6, 0, 0.3); caller.group.rotation.y = -Math.PI / 2; line.add(caller.group);
  LK.phone.group.position.set(1.25, 0.95, -0.55); LK.phone.group.rotation.y = -1.6;
  LK.room.children.filter(o => o.isMesh && o.geometry.parameters && (o.geometry.parameters.width === 0.06)).forEach(o => o.visible = false);   // drop window mullions (fly-through)
  LK.decal.group.position.set(1.86, 2.0, 0.45); LK.decal.group.rotation.y = -Math.PI / 2; LK.decal.group.scale.setScalar(1.25);
  const wash = new THREE.SpotLight('#9fb6e8', 110, 8, 0.8, 0.6, 1.4); wash.position.set(-1.0, 3.6, 0.3); wash.target.position.set(1.9, 1.6, 0.4); LK.room.add(wash, wash.target);
  // ===== EXTERIOR =====
  const ext = await scn('ext', 'night', { intensity: 0.25 }); exterior(ext);
  // ===== MAP =====
  const mp = await scn('map', 'studio', { intensity: 0.15 }); const MK = await mapSet(mp, loadWorld);
  const lbl32 = label('32 STATES', { size: 0.3, color: '#ffffff', bg: 'rgba(12,14,20,0.78)' }); lbl32.position.set(0.2, 0.6, -0.2); mp.add(lbl32);
  const lblFl = label('FLORIDA', { size: 0.09, color: '#f2c14a', bg: 'rgba(12,14,20,0.8)' }); lblFl.position.copy(MK.florida).add(V(0.05, 0.28, -0.05)); mp.add(lblFl);
  // ===== COURT =====
  const court = await scn('court', 'hall', { intensity: 0.35 }); const CK = courtSet(court, makeCast, LOOKS);
  for (let i = 0; i < 3; i++) court.add(lightBeam(V(-6.9, 4.4, -3 + i * 3.5), V(-1, 0, -2 + i * 3.5), { radius: 1.3, opacity: 0.045, color: '#fff3dc' }));
  addP(court, { count: 160, center: [-3, 2.5, 0.5], box: [6, 4, 9], size: 0.008, color: '#fff3dc', opacity: 0.3, motion: 'float', speed: 0.1, seed: 8 });
  // ===== VOID =====
  const vd = await scn('void', 'studio', { intensity: 0.06 }); const VK = voidSet(vd);
  // re-lay the dominoes on the floor beside the desk, running away from the camera (−z)
  { let z = 0.62, sc = 0.12; VK.dom.forEach((d, i) => { const k = sc / d.h; d.pivot.scale.setScalar(k); d.h = sc; d.d *= k; d.y0 = 0; d.pivot.position.set(1.3, 0, z); d.z = z; z -= sc * 0.58 + 0.1; sc *= 1.42; });
    for (let i = 0; i < VK.dom.length; i++) { const a = VK.dom[i], b = VK.dom[i + 1]; if (!b) { a.rest = Math.PI / 2 * 0.985; continue; } const gap = a.z - a.d - b.z; a.rest = Math.min(Math.PI / 2, Math.asin(Math.min(1, (gap + b.d * 0.5) / a.h))); } }
  const FALL = [121.2, 121.9, 122.6, 123.3, 124.05, 124.85, 125.65, 126.5, 127.35, 128.3];
  const domDust = addP(vd, { count: 260, center: [1.3, 0.05, -6.5], box: [0.6, 0.1, 0.4], size: 0.03, color: '#9a9590', opacity: 0.35, additive: false, motion: 'burst', burstAt: 128.95, burstSpeed: 2.2, life: 2.2, seed: 5 });
  const small = new THREE.Group(); small.position.set(0.32, 0.78, 0.2); vd.add(small);
  small.add(Object.assign(new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.07, 0.01, 2, 0.003), phys('#e9e4d8', { roughness: 0.35, clearcoat: 0.6 })), { castShadow: true }).translateY(0.035));
  // camera rail for the domino run, keyed to each fall
  const domKeys = [[120.6, [2.25, 0.5, 1.45], [1.3, 0.12, 0.45], 36]];
  VK.dom.forEach((d, i) => { if (i === 0 || i >= 9) return; const h = d.h; domKeys.push([FALL[i], [1.3 + 0.7 + h * 0.9, 0.25 + h * 0.75, d.z + 0.6 + h * 1.1], [1.3, h * 0.45, d.z - h * 0.6], 38]); });
  domKeys.push([128.3, [5.2, 2.0, -2.2], [1.3, 1.3, -4.8], 42], [129.4, [5.3, 2.6, -2.4], [1.3, 0.6, -5.4], 44], [130.9, [6.8, 6.2, 2.4], [1.0, 0.1, -2.6], 40]);
  CAM.v2 = R(domKeys);

  let lastT = -1;
  return {
    async render(t) {
      const seg = SEG.find(x => t >= x.s && t < x.e) || SEG[SEG.length - 1];
      let scene, rail, focus = null, aperture = 0, exposure = 0.9, sat = 1.04, con = 1.07;
      const ph = K.phone;
      const restPose = () => { for (const c of [mgr, lou, cow, wal, tom]) { c.rest(); c.face('neutral'); c.group.visible = false; } };
      const holdPhone = (c, side = 'L') => { const r = receiverAtEar(c, side); ph.setWorld(r.pos, r.quat); ph.receiver.updateMatrixWorld(true); c.reach(side, ph.receiver.localToWorld(V(0, 0.025, 0)), poleFor(c, side)); c.fingers(side, 0.75, 0.6); };
      const lights = (front, kitchen, office, corr, lamp, okey) => { K.front.forEach(p => { p.l.intensity = front; p.f.material.color.setScalar(front > 1 ? 1 : 0.25); }); K.kitchen.forEach(p => { p.l.intensity = kitchen; p.f.material.color.setScalar(kitchen > 1 ? 1 : 0.25); });
        K.office.l.intensity = office; K.office.f.material.color.setScalar(office > 1 ? 1 : 0.2); K.corr.l.intensity = corr; K.lampL.intensity = lamp; K.officeKey.intensity = okey; K.frontKey.intensity = front * 3; };

      if (seg.n === 'hook' || seg.n === 'rest') {
        scene = rest; restPose(); K.decal.set(0, 0); K.decal.group.scale.setScalar(1); K.strip.material.opacity = 0; K.folded.visible = false;
        K.officeDoor.rotation.y = -1.45; K.exitDoor.rotation.y = 0; ph.rest(); ph.ring(t, false); ph.press(-1, 0);
        const ck = 5 * 60 + 12; const mins = ck + (t > 62.3 ? lerp(0, 215, easeInOut(prog(t, 62.3, 66.4))) : 0) + t / 60;
        K.clockM.rotation.z = -(mins % 60) / 60 * Math.PI * 2; K.clockH.rotation.z = -(mins / 60 % 12) / 12 * Math.PI * 2; K.clockS.rotation.z = -(t % 60) / 60 * Math.PI * 2 * (t > 62.3 && t < 66.4 ? 40 : 1);
        mgr.group.visible = true; mgr.group.position.set(3.25, 0, -6.05); mgr.group.rotation.y = 0; mgr.idle(t, 0.6, 1);
        if (seg.n === 'hook') {
          lights(0.6, 0.4, 0, 0.8, 7, 0); exposure = 0.85;
          ph.ring(t, t < 5.8);
          mgr.face('concern');
          const k = easeInOut(prog(t, 5.8, 6.6));
          if (k <= 0) { mgr.reach('L', V(3.55, 0.95, -5.75), poleFor(mgr, 'L')); }
          else { const r = receiverAtEar(mgr, 'L'); ph.receiver.position.set(0, 0.115, -0.075); ph.receiver.rotation.set(0, 0, 0); ph.group.updateMatrixWorld(true);
            const p0 = ph.receiver.getWorldPosition(new THREE.Vector3()), q0 = ph.receiver.getWorldQuaternion(new THREE.Quaternion());
            const mid = p0.clone().lerp(r.pos, k).add(V(0, Math.sin(k * Math.PI) * 0.12, 0)); ph.setWorld(mid, q0.slerp(r.quat, k)); ph.receiver.updateMatrixWorld(true);
            mgr.reach('L', ph.receiver.localToWorld(V(0, 0.025, 0)), poleFor(mgr, 'L')); mgr.fingers('L', 0.75, 0.6); }
          mgr.headTo(t < 5.8 ? V(3.0, 0.8, -5.4) : V(3.6, 1.5, -4.0), 0.8);
          rail = CAM.hook; const a = rail.at(t); focus = a.pos.distanceTo(a.at); aperture = t < 5 ? 0.006 : 0.004;
        } else {
          // ---------- the restaurant, lit (17.56 → 94.06) ----------
          let front = 6, kitchen = 7, office = 7, corr = 4, lamp = 6, okey = 14;
          if (t < 32.56) {                 // R1: answer, "Officer Scott", out through the window to the counter
            lou.group.visible = cow.group.visible = true;
            lou.group.position.set(0.2, 0, -0.75); lou.group.rotation.y = 0; lou.idle(t, 0.6, 2); lou.face(t > 30.4 ? 'smile' : 'neutral');
            if (t > 30.2) lou.headTo(V(0.6, 1.55, 0.8), smooth(prog(t, 30.2, 30.9)) * 0.7);
            lou.reach('R', V(0.12 + 0.03 * Math.sin(t * 7), 1.22, -0.3), poleFor(lou, 'R')); lou.fingers('R', 0.3);
            cow.group.position.set(-4.2, 0, -2.25); cow.group.rotation.y = Math.PI; cow.idle(t, 0.7, 4); cow.reach('R', V(-4.25 + 0.04 * Math.sin(t * 3), 1.05, -2.62), poleFor(cow, 'R'));
            ph.ring(t, t < 18.3);
            const k = easeInOut(prog(t, 18.3, 19.3));
            if (k <= 0) { mgr.reach('L', V(3.55, 0.95, -5.75), poleFor(mgr, 'L')); }
            else { const r = receiverAtEar(mgr, 'L'); ph.group.updateMatrixWorld(true); const p0 = ph.receiver.getWorldPosition(new THREE.Vector3()), q0 = ph.receiver.getWorldQuaternion(new THREE.Quaternion());
              ph.setWorld(p0.clone().lerp(r.pos, k).add(V(0, Math.sin(k * Math.PI) * 0.12, 0)), q0.slerp(r.quat, k)); ph.receiver.updateMatrixWorld(true); mgr.reach('L', ph.receiver.localToWorld(V(0, 0.025, 0)), poleFor(mgr, 'L')); mgr.fingers('L', 0.75, 0.6); }
            mgr.face(t < 21 ? 'neutral' : t < 24 ? 'concern' : 'frown');
            mgr.headTo(t < 24.3 ? V(3.4, 1.5, -4.0) : V(1.0, 1.4, -0.8), 0.75);
            if (t > 24.3) mgr.look(-0.4, -0.1);
            K.decal.set(0.55 * smooth(prog(t, 21.8, 23.6)), 0);
            rail = CAM.r1; const a = rail.at(t); focus = a.pos.distanceTo(a.at); aperture = t < 24.4 ? 0.004 : t < 27.4 ? 0.0015 : 0.004;
          } else if (t < 48.35) {          // R2: Louise in the office, the instructions
            lou.group.visible = t < 38.86;
            if (t < 34.4) walkPath(lou, [[1.15, -4.45], [1.9, -4.4], [2.55, -4.3]], 32.6, 34.4, t, 5);
            else { lou.group.position.set(2.55, 0, -4.3); lou.group.rotation.y = angLerp(Math.PI / 2, 2.76, smooth(prog(t, 34.4, 35.0))); }
            lou.idle(t, 0.4, 2); lou.face(t < 36 ? 'concern' : 'sad'); if (t > 37.7) { lou.headTo(V(3.0, 1.56, -5.05), 0.6); lou.look(0.15, 0); }
            lou.reach('L', lou.group.localToWorld(V(-0.05, 1.05, 0.12)), poleFor(lou, 'L')); lou.reach('R', lou.group.localToWorld(V(0.05, 1.05, 0.14)), poleFor(lou, 'R'));   // arms folded
            holdPhone(mgr, 'L'); mgr.face(t < 38.8 ? 'tight' : 'concern');
            mgr.headTo(t < 35.4 ? V(2.55, 1.5, -4.3) : t < 37.8 ? V(3.3, 1.4, -4.4) : t < 38.86 ? V(2.55, 1.55, -4.3) : t < 40.6 ? V(2.76, 0.9, -5.7) : t < 42.5 ? V(1.6, 1.5, -4.45) : V(3.3, 1.5, -3.8), 0.75);
            // "make her remove her clothes": folded uniform + visor lowered into the paper bag (no figure shown)
            K.folded.visible = t > 38.86 && t < 40.6;
            if (K.folded.visible) { const k1 = easeInOut(prog(t, 39.0, 39.9)), k2 = easeIn(prog(t, 39.9, 40.5)); K.folded.position.copy(V(2.95, 0.8, -5.3).lerp(V(2.75, 1.16, -5.75), k1)).add(V(0, -0.34 * k2, 0)); K.folded.rotation.set(0, 0.3 - k1 * 0.3, 0);
              mgr.reach('R', K.folded.position.clone().add(V(0.03, 0.05, 0.02)), poleFor(mgr, 'R')); mgr.fingers('R', 0.55); }
            const g = smooth(prog(t, 42.6, 48.0)); K.decal.set(0.55 + 0.3 * g, 0); K.decal.group.scale.setScalar(1 + 0.6 * g); K.decal.group.position.y = 1.75 + 0.35 * g;
            okey = lerp(14, 9, g); lamp = lerp(6, 8, g);
            rail = CAM.r2; const a = rail.at(t); focus = a.pos.distanceTo(a.at); aperture = t > 42.6 ? 0.002 : 0.0045;
          } else if (t < 66.74) {          // R3: corridor — the co-worker leaves, Walter arrives, the door closes, the clock
            holdPhone(mgr, 'L'); mgr.face('tight'); mgr.headTo(V(3.3, 1.5, -3.8), 0.6);
            K.decal.set(0.85, 0); K.decal.group.scale.setScalar(1.6); K.decal.group.position.y = 2.1;
            if (t < 52.7) { cow.group.visible = true; cow.face('concern');
              if (t < 51.0) { cow.group.position.set(1.25, 0, -4.45); cow.group.rotation.y = angLerp(Math.PI / 2, Math.PI, smooth(prog(t, 50.75, 51.0))); cow.idle(t, 0.5, 4);
                if (t > 50.2 && t < 50.8) cow.joints.head.rotation.y += Math.sin((t - 50.2) * 18) * 0.25; cow.face(t > 49.6 ? 'frown' : 'concern');
                cow.reach('L', cow.group.localToWorld(V(0.05, 1.0, 0.12)), poleFor(cow, 'L')); cow.reach('R', cow.group.localToWorld(V(-0.05, 1.0, 0.13)), poleFor(cow, 'R')); }
              else walkPath(cow, [[1.25, -4.45], [1.05, -5.4], [1.0, -6.85]], 51.0, 52.7, t, 6); }
            K.exitDoor.rotation.y = 1.3 * (smooth(prog(t, 51.5, 52.0)) * (1 - smooth(prog(t, 52.7, 53.3))) + smooth(prog(t, 54.3, 54.9)) * (1 - smooth(prog(t, 55.6, 56.3))));
            if (t > 54.3 && t < 58.45) { wal.group.visible = true; wal.face('neutral');
              if (t < 57.0) walkPath(wal, [[1.0, -6.75], [1.02, -5.6], [1.05, -4.7]], 54.6, 57.0, t, 5.2);
              else if (t < 57.5) { wal.group.position.set(1.05, 0, -4.7); wal.group.rotation.y = angLerp(0, Math.PI / 2, smooth(prog(t, 57.0, 57.5))); wal.idle(t, 0.5); }
              else walkPath(wal, [[1.05, -4.55], [2.2, -4.45]], 57.5, 58.45, t, 5.2); }
            K.officeDoor.rotation.y = -1.45 * (1 - smooth(prog(t, 58.4, 59.3)));
            K.strip.material.opacity = smooth(prog(t, 59.0, 59.4));
            const dim = smooth(prog(t, 58.8, 60.5)); corr = lerp(4, 1.2, dim); front = lerp(6, 3, dim); kitchen = lerp(7, 3, dim); K.exitLight.intensity = lerp(0.35, 0.8, dim);
            rail = CAM.r3; const a = rail.at(t); focus = a.pos.distanceTo(a.at); aperture = 0.0035; exposure = lerp(0.9, 0.82, dim); sat = lerp(1.04, 0.92, dim);
          } else {                         // R4: Tom takes the phone, refuses, the call collapses; the supervisor; the truth
            tom.group.visible = t < 83.4;
            tom.group.position.set(3.25, 0, -6.05); tom.group.rotation.y = 0; tom.idle(t, 0.5, 3);
            const tk = easeInOut(prog(t, 68.6, 69.7)), hang = easeInOut(prog(t, 79.4, 80.6));
            // manager position: beside the desk (front-right), later steps to the front to dial
            if (t < 81.0) { mgr.group.position.set(3.95, 0, -4.95); mgr.group.rotation.y = -2.57; mgr.idle(t, 0.5, 1); }
            else if (t < 83.0) { walkPath(mgr, [[3.95, -4.95], [3.5, -4.75], [3.1, -4.82]], 81.0, 82.6, t, 5); if (t > 82.6) mgr.group.rotation.y = angLerp(mgr.group.rotation.y, Math.PI, smooth(prog(t, 82.6, 83.0))); }
            else { mgr.group.position.set(3.1, 0, -4.82); mgr.group.rotation.y = Math.PI; mgr.idle(t, 0.4, 1); mgr.joints.chest.rotation.x = 0.28 * smooth(prog(t, 83.0, 83.6)) * (1 - smooth(prog(t, 85.6, 86.4))); }
            if (t < 68.6) { holdPhone(mgr, 'L'); }
            else if (t < 79.4) {             // handover → Tom
              const rm = receiverAtEar(mgr, 'L'), rt = receiverAtEar(tom, 'L');
              ph.setWorld(rm.pos.clone().lerp(rt.pos, tk).add(V(0, Math.sin(tk * Math.PI) * 0.08, 0)), rm.quat.clone().slerp(rt.quat, tk)); ph.receiver.updateMatrixWorld(true);
              const grip = ph.receiver.localToWorld(V(0, 0.025, 0));
              if (tk < 0.85) { mgr.reach('L', grip, poleFor(mgr, 'L')); mgr.fingers('L', 0.75); }
              if (tk > 0.3) { tom.reach('L', grip, poleFor(tom, 'L')); tom.fingers('L', 0.75, 0.6); }
            } else if (t < 83.5) {           // Tom hangs up on the cradle
              const rt = receiverAtEar(tom, 'L'); ph.rest(); ph.group.updateMatrixWorld(true); const p1 = ph.receiver.getWorldPosition(new THREE.Vector3()), q1 = ph.receiver.getWorldQuaternion(new THREE.Quaternion());
              ph.setWorld(rt.pos.clone().lerp(p1, hang).add(V(0, Math.sin(hang * Math.PI) * 0.1, 0)), rt.quat.clone().slerp(q1, hang)); ph.receiver.updateMatrixWorld(true);
              if (hang < 1) { tom.reach('L', ph.receiver.localToWorld(V(0, 0.025, 0)), poleFor(tom, 'L')); tom.fingers('L', 0.75); } else ph.rest();
            } else {                         // manager lifts the receiver, dials her supervisor
              const lift = easeInOut(prog(t, 83.5, 84.1)); ph.rest(); ph.group.updateMatrixWorld(true);
              const p1 = ph.receiver.getWorldPosition(new THREE.Vector3()), q1 = ph.receiver.getWorldQuaternion(new THREE.Quaternion()), r = receiverAtEar(mgr, 'L');
              ph.setWorld(p1.clone().lerp(r.pos, lift).add(V(0, Math.sin(lift * Math.PI) * 0.1, 0)), q1.clone().slerp(r.quat, lift)); ph.receiver.updateMatrixWorld(true);
              mgr.reach('L', ph.receiver.localToWorld(V(0, 0.025, 0)), poleFor(mgr, 'L')); mgr.fingers('L', 0.75);
              if (t > 84.0 && t < 85.5) { const n = Math.floor((t - 84.0) / 0.16), f = (t - 84.0) / 0.16 - n; const idx = [0, 3, 7, 4, 1, 8, 2, 6, 5, 10][n % 10];
                ph.group.updateMatrixWorld(true); const kp = ph.keys[idx].getWorldPosition(new THREE.Vector3()); const press = Math.sin(f * Math.PI);
                mgr.reach('R', kp.clone().add(V(0, 0.015 + 0.012 * (1 - press), 0.045)), poleFor(mgr, 'R')); mgr.fingers('R', 0.85, 0.8); ph.press(idx, press); }
              else if (t <= 84.0) mgr.reach('R', V(3.15, 0.95, -5.1), poleFor(mgr, 'R'));
            }
            // faces + gaze
            tom.face(t < 71.3 ? 'neutral' : t < 73.9 ? 'concern' : t < 77.4 ? 'frown' : 'firm');
            if (t > 72.6 && t < 73.5) tom.talk(0.5 + 0.5 * Math.sin(t * 22)); if (t > 75.6 && t < 77.0) tom.talk(0.4 + 0.4 * Math.sin(t * 20));
            if (t > 78.04 && t < 78.75) tom.talk(Math.sin(prog(t, 78.04, 78.75) * Math.PI) * 0.9);
            tom.headTo(t < 68.4 ? V(3.95, 1.55, -4.95) : t < 71.3 ? V(3.95, 1.55, -4.95) : V(3.35, 1.6, -4.8), 0.7);
            if (t > 71.3 && t < 79) { tom.look(0, -0.15); tom.joints.head.rotation.z = t > 72.3 && t < 73.7 ? 0.08 : 0; }
            if (t > 76.8 && t < 79.2) tom.joints.chest.rotation.x -= 0.04;
            if (t < 83.4) tom.reach('R', V(3.05, 0.84, -5.55), poleFor(tom, 'R'));
            mgr.face(t < 79 ? 'concern' : t < 86.9 ? 'neutral' : t < 88.9 ? 'o' : 'sad');
            if (t < 81.0) mgr.headTo(tom.headWorld(), 0.8); else if (t > 85.6) mgr.headTo(V(3.15, 1.55, -5.6), 0.5);
            if (t > 86.9 && t < 88.9) mgr.look(0, 0.1);
            // the wall shadow: looms while Tom is told what to do, then breaks apart after "NO"
            const loom = smooth(prog(t, 73.9, 77.0)), gone = smooth(prog(t, 79.0, 82.6));
            K.decal.set(lerp(0.75, 0.95, loom) * (1 - gone), 0); K.decal.group.scale.setScalar(lerp(1.5, 1.8, loom) * (1 - 0.35 * gone)); K.decal.group.position.y = 2.0 - 0.3 * gone;
            const warm = smooth(prog(t, 77.6, 79.4)); lamp = lerp(6, 11, warm); okey = lerp(12, 8, warm) * (1 - 0.0 * warm);
            if (t > 88.9) { const d = smooth(prog(t, 88.9, 93.5)); front = lerp(6, 1.0, d); kitchen = lerp(7, 1.5, d); }
            rail = CAM.r4; const a = rail.at(t); focus = a.pos.distanceTo(a.at); aperture = t > 83.3 && t < 85.5 ? 0.008 : 0.004;
            sat = lerp(0.96, 1.05, warm); exposure = 0.9;
          }
          lights(front, kitchen, office, corr, lamp, okey);
        }
        ph.updateCord();
      } else if (seg.n === 'line' || seg.n === 'caller') {
        scene = line;
        caller.rest(); caller.idle(t, 0.4); const r = receiverAtEar(caller, 'L'); LK.phone.setWorld(r.pos, r.quat); LK.phone.receiver.updateMatrixWorld(true);
        caller.reach('L', LK.phone.receiver.localToWorld(V(0, 0.025, 0)), poleFor(caller, 'L')); LK.phone.updateCord();
        caller.reach('R', caller.group.localToWorld(V(-0.12, 0.95, 0.05)), poleFor(caller, 'R'));
        const capK = seg.n === 'caller' ? 1 - smooth(prog(t, 96.4, 98.6)) : 1; LK.decal.set(0.8 * capK, 0.8 * (1 - capK));
        if (seg.n === 'line') {
          if (t < 12.4) { const u = easeInOut(prog(t, 8.3, 12.6)) * 0.985; const p = LK.wire.getPointAt(u), q = LK.wire.getPointAt(Math.min(1, u + 0.06));
            rail = { at: () => ({ pos: p.clone().add(V(-1.0, 0.6, 1.9)), at: q.clone().add(V(0, -0.4, 0)), fov: 46 }) }; }
          else { const k = easeInOut(prog(t, 12.0, 14.4)); const p0 = LK.wire.getPointAt(0.985).add(V(-1.0, 0.6, 1.9));
            const c1 = V(181.5, 3.2, 0.9), c2 = V(184.6, 1.75, -0.5);
            const pos = k < 0.6 ? p0.clone().lerp(c1, easeInOut(k / 0.6)) : c1.clone().lerp(c2, easeOut((k - 0.6) / 0.4));
            const at = V(lerp(186, 187.2, k), lerp(2.5, 1.6, k), lerp(0.2, 0.4, k)); rail = { at: () => ({ pos, at, fov: lerp(46, 38, k) }) }; }
          exposure = 0.95;
        } else { rail = CAM.caller; exposure = 0.95; }
        const a = rail.at(t); focus = a.pos.distanceTo(a.at); aperture = seg.n === 'caller' ? 0.003 : 0;
      } else if (seg.n === 'ext') {
        scene = ext; rail = CAM.ext; exposure = 1.0;
      } else if (seg.n === 'map') {
        scene = mp; rail = CAM.map;
        MK.marks.forEach((m, i) => { const t0 = 102.1 + i * 0.085, k = easeOut(prog(t, t0, t0 + 0.3)); m.scale.setScalar(Math.max(0.001, k)); const rp = prog(t, t0, t0 + 1.2); m.userData.ring.scale.setScalar(1 + rp * 3); m.userData.ring.material.opacity = (1 - rp) * 0.8 * (rp > 0 ? 1 : 0); });
        lbl32.material.opacity = smooth(prog(t, 104.2, 104.7)); lbl32.visible = t > 104.2;
        lblFl.material.opacity = smooth(prog(t, 105.2, 105.6)); lblFl.visible = t > 105.2; MK.fl.scale.setScalar(Math.max(0.001, 0.6 * easeOut(prog(t, 105.0, 105.4))));
        if (t > 105.0) { const k = easeInOut(prog(t, 105.0, 106.1)); const b = CAM.map.at(105.0); const fp = MK.florida;
          rail = { at: () => ({ pos: b.pos.clone().lerp(fp.clone().add(V(0.35, 1.3, 1.1)), k), at: b.at.clone().lerp(fp, k), fov: 40 }) }; }
        const a = rail.at(t); focus = a.pos.distanceTo(a.at); aperture = 0.0025; exposure = 0.95;
      } else if (seg.n === 'court') {
        scene = court; rail = CAM.court;
        const J = CK.judge; J.rest(); J.idle(t, 0.3); J.face('neutral'); J.headTo(V(0, 1.2, 1.4), 0.6);
        const g = t < 111.62 ? 0 : t < 111.82 ? -easeIn(prog(t, 111.62, 111.82)) : -1 + easeOut(prog(t, 111.95, 112.4));
        const lift = t < 111.62 ? smooth(prog(t, 111.2, 111.62)) : 1 + g;
        CK.gavel.position.set(0.55, 1.83 + 0.2 * lift, -3.55 - 0.05 * lift); CK.gavel.rotation.set(-0.6 * lift, 0.3, 0);
        J.reach('L', CK.gavel.position.clone().add(V(0, -0.2, 0.02)), poleFor(J, 'L'));
        CK.jurors.forEach((j, i) => { j.rest(); j.sit(1); j.idle(t, 0.4, i); j.face('neutral'); });
        CK.def.rest(); CK.def.sit(1); CK.def.idle(t, 0.3, 7);
        const a = rail.at(t); focus = a.pos.distanceTo(a.at); aperture = 0.003; exposure = 0.95;
      } else {
        scene = vd;
        VK.phone.rest(); VK.phone.ring(t, t > 139.85 && t < 140.6); VK.phone.updateCord();
        VK.dom.forEach((d, i) => { const dur = 0.32 + 0.22 * Math.sqrt(d.h); d.pivot.rotation.x = -d.rest * easeIn(prog(t, FALL[i], FALL[i] + dur)); });
        small.visible = t > 131.0;
        const shrink = smooth(prog(t, 131.2, 140.8)); VK.pool.angle = lerp(0.42, 0.22, shrink); VK.pool.intensity = lerp(40, 55, shrink); VK.rim.intensity = lerp(14, 4, shrink);
        VK.domLight.intensity = 60 * smooth(prog(t, 120.2, 121.0)); VK.doorLight.intensity = 16 * (1 - smooth(prog(t, 120.0, 121.0))) * smooth(prog(t, 114.6, 115.4)); VK.chairLight.intensity = 14 * smooth(prog(t, 117.4, 118.2)) * (1 - smooth(prog(t, 121, 122)));
        rail = t < 121.0 ? CAM.v1 : t < 131.0 ? CAM.v2 : CAM.v3;
        const a = rail.at(t); focus = a.pos.distanceTo(a.at); aperture = t > 131 ? 0.006 : 0.004; exposure = 0.95; sat = 0.98;
      }

      // camera (always moving: rail + gentle drift)
      const c = rail.at(t);
      const pos = c.pos.clone().add(drift(t, 0.006, 1)); cam.position.copy(pos); cam.lookAt(c.at);
      if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
      for (const [s, p] of P) if (s === scene) p.update(t);
      let fill = 0, fillColor = null, zoom = 0;
      for (const [cc, w, col, z] of PORTALS) { const b = bell(t, cc, w); if (b > fill) { fill = b; fillColor = col; } zoom = Math.max(zoom, b * z); }
      const end = smooth(prog(t, 140.55, 141.15)); if (end > fill) { fill = end; fillColor = '#000000'; }
      post.render(scene, cam, t, { focus, aperture, zoom, fill: fill * 0.97, fillColor, exposure, sat, con, warm: 0.012 });
      lastT = t;
    },
  };
}
