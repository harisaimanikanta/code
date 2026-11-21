// "The Phone Call" V2: McDonald's strip-search hoax (2004), synced to voiceover.mp3 (141.17 s).
// Edited film: one shot per voiceover line, slow single-move cameras, cuts between lines, fades only on location changes,
// and short split screens (caller | manager) whenever the caller is speaking. See STORYBOARD-v2.md.
import * as THREE from 'three';
import { makeRenderer, makePost, useHDRI, lerp, clamp, prog, smooth, easeInOut, easeOut, easeIn, captionsFromLines, label, loadWorld } from 'kit';
import { particles, lightBeam, drift, bell, cameraRail } from '/kit/fx.js';
import { makeCast, LOOKS } from './cast.js';
import { restaurant, exterior, mapSet, courtSet, voidSet, villainSet, V, phys } from './sets.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const duration = 141.17;
export const fps = 30;
const LINES = await (await fetch('/scene/analysis/lines.json')).json();
const fix = s => s.replace('eighteen-year-old', '18-year-old').replace('fifty-eight-year-old', '58-year-old').replace('April ninth, two thousand four', 'April 9, 2004').replace('thirty-two', '32');
export const captions = captionsFromLines(LINES.map(([a, b, txt]) => ({ t: a, end: b + 0.12, text: fix(txt) })));
export const captionStyle = { y: 0.775, size: 0.056 };

// fades only where the location (or time) changes
const PORTALS = [[14.25, 0.2, '#0b0d12'], [17.56, 0.16, '#f2dcb0'], [32.56, 0.16, '#14110e'], [48.35, 0.16, '#14110e'], [66.74, 0.2, '#08080a'],
  [94.06, 0.18, '#050507'], [99.7, 0.12, '#050507'], [106.06, 0.17, '#f4efe4'], [112.38, 0.2, '#060607'], [131.0, 0.17, '#060607']];

const R = keys => cameraRail(keys.map(([t, pos, at, fov]) => ({ t, pos, at, fov })));
const ease = p => lerp(p, smooth(p), 0.55);                               // near-constant speed, soft ends
const mv = (p, P0, A0, P1, A1, F0 = 38, F1 = F0) => { const k = ease(p); return { pos: V(...P0).lerp(V(...P1), k), at: V(...A0).lerp(V(...A1), k), fov: lerp(F0, F1, k) }; };
const orbit = (c, r, h, a, atY, fov) => ({ pos: V(c[0] + Math.sin(a) * r, h, c[2] + Math.cos(a) * r), at: V(c[0], atY, c[2]), fov });
const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

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

// staging (one place per beat, kept identical across shots)
const HOME = [3.25, -6.05];            // behind the desk, facing the office window (+z); the cap shadow is on the wall behind
const M2 = [2.35, -4.7], L2 = [3.05, -4.7];   // the office floor: manager faces +x, Louise faces -x
const MSIDE = [4.3, -6.05];          // manager beside the desk during Tom's call
const CHAIR = [1.98, -6.22];          // Louise's chair (back-left corner) once she is in the apron

export async function setup({ canvas, width: W, height: H }) {
  const renderer = makeRenderer(canvas, W, H); renderer.toneMappingExposure = 0.9; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const mkPost = (w, h) => { const p = makePost(renderer, w, h, { ao: true, bloom: 0, grain: 0.028, vignette: 0.32 });
    p.grade.uSplit.value = 0.06; p.grade.uCA.value = 0.0006; p.grade.uShadow.value.set('#20323d'); p.grade.uHigh.value.set('#ffcf9a'); return p; };
  const HH = Math.round(H / 2), HW = Math.round(W / 2);
  const postF = mkPost(W, H), postTB = mkPost(W, HH), postLR = mkPost(HW, H);
  const cam = new THREE.PerspectiveCamera(38, W / H, 0.02, 400);
  const scn = async (hdri, opt) => { const s = new THREE.Scene(); if (hdri) await useHDRI(renderer, s, hdri, opt); return s; };
  const P = []; const addP = (scene, opts) => { const p = particles(opts); p.setScale(H); scene.add(p.points); P.push([scene, p]); return p; };

  // ===== RESTAURANT =====
  const rest = await scn('lobby', { intensity: 0.22 }); rest.background = new THREE.Color('#0c0c0e');
  const K = restaurant(rest);
  const mgr = makeCast(LOOKS.manager), lou = makeCast(LOOKS.louise), cow = makeCast(LOOKS.coworker), wal = makeCast(LOOKS.walter), tom = makeCast(LOOKS.tom);
  const CAST = [mgr, lou, cow, wal, tom]; for (const c of CAST) rest.add(c.group);
  K.folded.children[2].visible = false;                                   // no visor in this version
  addP(rest, { count: 140, center: [3.3, 1.3, -5.0], box: [2.2, 1.4, 1.8], size: 0.006, color: '#fff1d8', opacity: 0.3, additive: true, motion: 'float', speed: 0.15, seed: 3 });
  // the purse the caller claimed was stolen (seen only as his claim, then gone)
  const purseM = phys('#6b3b24', { roughness: 0.45, clearcoat: 0.5, transparent: true }), purse = new THREE.Group(); purse.position.set(0.85, 1.05, -0.02); purse.rotation.y = 0.5; rest.add(purse);
  { const b = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.2, 0.11, 4, 0.03), purseM); b.position.y = 0.1; b.castShadow = true; purse.add(b);
    const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.009, 8, 24, Math.PI), purseM); hnd.position.y = 0.2; purse.add(hnd);
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.01), phys('#c9a24a', { metalness: 0.8, roughness: 0.3, transparent: true })); clasp.position.set(0, 0.17, 0.058); purse.add(clasp); }
  const purseMats = []; purse.traverse(o => { if (o.isMesh) purseMats.push(o.material); });
  // ===== THE CALLER =====
  const vil = await scn('night', { intensity: 0.05 }); const VL = villainSet(vil);
  const caller = makeCast(LOOKS.caller); caller.villain(); vil.add(caller.group);
  addP(vil, { count: 90, center: [0, 1.6, 0], box: [3, 2.5, 3], size: 0.006, color: '#c7d4ff', opacity: 0.25, additive: true, motion: 'float', speed: 0.12, seed: 9 });
  // ===== EXTERIOR / MAP / COURT / VOID (as V1) =====
  const ext = await scn('night', { intensity: 0.25 }); exterior(ext);
  const mp = await scn('studio', { intensity: 0.15 }); const MK = await mapSet(mp, loadWorld);
  const lbl32 = label('32 STATES', { size: 0.3, color: '#ffffff', bg: 'rgba(12,14,20,0.78)' }); lbl32.position.set(0.2, 0.6, -0.2); mp.add(lbl32);
  const lblFl = label('FLORIDA', { size: 0.09, color: '#f2c14a', bg: 'rgba(12,14,20,0.8)' }); lblFl.position.copy(MK.florida).add(V(0.05, 0.28, -0.05)); mp.add(lblFl);
  const court = await scn('hall', { intensity: 0.35 }); const CK = courtSet(court, makeCast, LOOKS);
  for (let i = 0; i < 3; i++) court.add(lightBeam(V(-6.9, 4.4, -3 + i * 3.5), V(-1, 0, -2 + i * 3.5), { radius: 1.3, opacity: 0.045, color: '#fff3dc' }));
  addP(court, { count: 160, center: [-3, 2.5, 0.5], box: [6, 4, 9], size: 0.008, color: '#fff3dc', opacity: 0.3, motion: 'float', speed: 0.1, seed: 8 });
  const vd = await scn('studio', { intensity: 0.06 }); const VK = voidSet(vd);
  { let z = 0.62, sc = 0.12; VK.dom.forEach(d => { const k = sc / d.h; d.pivot.scale.setScalar(k); d.h = sc; d.d *= k; d.y0 = 0; d.pivot.position.set(1.3, 0, z); d.z = z; z -= sc * 0.58 + 0.1; sc *= 1.42; });
    for (let i = 0; i < VK.dom.length; i++) { const a = VK.dom[i], b = VK.dom[i + 1]; if (!b) { a.rest = Math.PI / 2 * 0.985; continue; } const gap = a.z - a.d - b.z; a.rest = Math.min(Math.PI / 2, Math.asin(Math.min(1, (gap + b.d * 0.5) / a.h))); } }
  const FALL = [121.2, 121.9, 122.6, 123.3, 124.05, 124.85, 125.65, 126.5, 127.35, 128.3];
  addP(vd, { count: 260, center: [1.3, 0.05, -6.5], box: [0.6, 0.1, 0.4], size: 0.03, color: '#9a9590', opacity: 0.35, additive: false, motion: 'burst', burstAt: 128.95, burstSpeed: 2.2, life: 2.2, seed: 5 });
  const small = new THREE.Group(); small.position.set(0.32, 0.78, 0.2); vd.add(small);
  small.add(Object.assign(new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.07, 0.01, 2, 0.003), phys('#e9e4d8', { roughness: 0.35, clearcoat: 0.6 })), { castShadow: true }).translateY(0.035));
  const domKeys = [[120.6, [2.25, 0.5, 1.45], [1.3, 0.12, 0.45], 36]];
  VK.dom.forEach((d, i) => { if (i === 0 || i >= 9) return; const h = d.h; domKeys.push([FALL[i], [1.3 + 0.7 + h * 0.9, 0.25 + h * 0.75, d.z + 0.6 + h * 1.1], [1.3, h * 0.45, d.z - h * 0.6], 38]); });
  domKeys.push([128.3, [5.2, 2.0, -2.2], [1.3, 1.3, -4.8], 42], [129.4, [5.3, 2.6, -2.4], [1.3, 0.6, -5.4], 44], [130.9, [6.8, 6.2, 2.4], [1.0, 0.1, -2.6], 40]);
  const CAMV = { ext: R([[14.1, [-4.5, 2.6, 31], [-1.5, 3.4, 0], 46], [15.9, [-1.8, 2.0, 19], [0, 2.3, 0], 44], [17.7, [0.3, 1.75, 7.0], [0.3, 1.7, 4.9], 42]]),
    map: R([[99.6, [0, 8.6, 3.0], [0, 0, -0.1], 44], [102, [0.25, 7.2, 2.6], [0.15, 0, -0.05], 44], [105, [0.6, 6.0, 2.3], [0.4, 0, 0.0], 42]]),
    court: R([[105.9, [0, 1.7, 7.2], [-0.5, 1.3, 0], 40], [108.5, [-0.6, 1.5, 4.3], [-1.6, 1.1, 1.45], 40], [110.6, [-0.8, 1.5, 3.4], [-1.6, 1.15, 1.45], 38], [111.4, [-0.1, 2.1, -2.4], [-0.4, 1.78, -3.6], 34], [112.5, [-0.2, 2.05, -2.75], [-0.4, 1.78, -3.6], 32]]),
    dom: R(domKeys),
    v3: R([[130.8, [1.15, 1.35, 1.55], [-0.25, 0.85, 0.12], 34], [136.5, [0.38, 1.05, 0.75], [-0.25, 0.86, 0.12], 30], [139.0, [0.08, 1.06, 0.5], [-0.25, 0.85, 0.12], 29], [141.3, [-0.04, 1.12, 0.36], [-0.25, 0.84, 0.11], 28]]) };

  // ---------- restaurant state helpers ----------
  const ph = K.phone;
  const lights = (front, kitchen, office, corr, lamp, okey) => { K.front.forEach(p => { p.l.intensity = front; p.f.material.color.setScalar(front > 1 ? 1 : 0.25); }); K.kitchen.forEach(p => { p.l.intensity = kitchen; p.f.material.color.setScalar(kitchen > 1 ? 1 : 0.25); });
    K.office.l.intensity = office; K.office.f.material.color.setScalar(office > 1 ? 1 : 0.2); K.corr.l.intensity = corr; K.lampL.intensity = lamp; K.officeKey.intensity = okey; K.frontKey.intensity = front * 3; };
  const place = (c, xz, rot, t, seed = 0, a = 0.5) => { c.group.visible = true; c.group.position.set(xz[0], 0, xz[1]); c.group.rotation.y = rot; c.idle(t, a, seed); };
  const holdPhone = (c, side = 'L') => { const r = receiverAtEar(c, side); ph.setWorld(r.pos, r.quat); ph.receiver.updateMatrixWorld(true); c.reach(side, ph.receiver.localToWorld(V(0, 0.025, 0)), poleFor(c, side)); c.fingers(side, 0.75, 0.6); };
  const fpole = (c, s) => V(s === 'L' ? 1 : -1, -0.45, 0.7).applyQuaternion(c.group.quaternion);
  const folded = (c, k = 1) => { const g = c.group; c.reach('L', g.localToWorld(V(-0.07, 1.08, 0.2)), fpole(c, 'L')); c.reach('R', g.localToWorld(V(0.07, 1.04, 0.22)), fpole(c, 'R')); c.fingers('L', 0.5); c.fingers('R', 0.5); };
  const wardrobe = (c, mode) => { c.bare(mode !== 'uniform'); c.apron(mode === 'apron'); c.shirtLift(null); };
  function R0(t) {                                                       // reset the restaurant to a neutral state
    for (const c of CAST) { c.rest(); c.face('neutral'); c.group.visible = false; }
    wardrobe(lou, 'uniform');
    K.decal.set(0, 0); K.decal.group.scale.setScalar(1); K.decal.group.position.y = 1.75; K.decal.group.position.x = 3.25; K.strip.material.opacity = 0; K.folded.visible = false;
    K.officeDoor.rotation.y = -1.45; K.exitDoor.rotation.y = 0; K.exitLight.intensity = 0.35; ph.rest(); ph.ring(t, false); ph.press(-1, 0);
    K.bag.position.set(2.75, 0.78, -5.75); K.chair.position.set(3.4, 0, -6.2); K.chair.rotation.y = 0; purse.visible = false;
    const mins = 5 * 60 + 12 + (t > 62.0 ? lerp(0, 215, easeInOut(prog(t, 62.0, 66.4))) : 0) + t / 60;
    K.clockM.rotation.z = -(mins % 60) / 60 * Math.PI * 2; K.clockH.rotation.z = -(mins / 60 % 12) / 12 * Math.PI * 2; K.clockS.rotation.z = -(t % 60) / 60 * Math.PI * 2 * (t > 62.0 && t < 66.4 ? 40 : 1);
    lights(6, 7, 7, 4, 6, 14);
  }
  const done = (v, extra = {}) => { ph.updateCord(); return Object.assign({ scene: rest, exposure: 0.9, sat: 1.04, aperture: 0.004 }, v, extra); };

  // the strip-search staging: manager on the phone at M2 facing Louise at L2
  function stripStage(t, louMode, polo = null) {
    place(mgr, M2, Math.PI / 2, t, 1, 0.4); holdPhone(mgr, 'L'); mgr.face('tight'); mgr.headTo(lou.headWorld ? V(L2[0], 1.52, L2[1]) : V(3, 1.5, -4.7), 0.7);
    place(lou, L2, -Math.PI / 2, t, 2, 0.35); wardrobe(lou, louMode); lou.face('sad'); lou.headTo(V(M2[0], 1.45, M2[1]), 0.5); lou.look(0, -0.2);
    if (polo) { K.folded.visible = true; K.folded.position.copy(polo); K.folded.rotation.set(0, 0.2, 0); }
  }

  // ---------- the caller (black figure, red eyes) ----------
  function villain(t, { talk = true, wall = false, cap = 0, bare = 0 } = {}) {
    caller.rest(); caller.group.position.set(0, 0, 0); caller.group.rotation.y = 0; caller.idle(t, 0.5, 5);
    if (talk) { caller.joints.head.rotation.x += 0.025 * Math.sin(t * 5.3); caller.joints.head.rotation.y += 0.03 * Math.sin(t * 2.1); }
    const r = receiverAtEar(caller, 'L'); VL.phone.setWorld(r.pos, r.quat); VL.phone.receiver.updateMatrixWorld(true);
    caller.reach('L', VL.phone.receiver.localToWorld(V(0, 0.025, 0)), poleFor(caller, 'L')); caller.fingers('L', 0.75, 0.6); VL.phone.updateCord();
    caller.reach('R', caller.group.localToWorld(V(-0.1, 0.98, 0.06)), poleFor(caller, 'R'));
    VL.wall.visible = wall; VL.decal.group.visible = wall; VL.decal.set(cap, bare); VL.wash.intensity = wall ? 26 : 0;
    return { scene: vil, exposure: 1.0, sat: 1.0, aperture: 0.003 };
  }

  // ======================= SHOT LIST (t0, t1, layout, view A [, view B]) =======================
  const SHOTS = [];
  const S = (t0, t1, layout, A, B) => SHOTS.push({ t0, t1, layout, A, B });

  // 1–2  HOOK split: caller (top) | the office (bottom)
  const hookOffice = (t) => {
    R0(t); lights(1.6, 1.2, 2.5, 1.2, 7, 7);
    const handK = easeInOut(prog(t, 1.4, 3.2)), lowerK = easeInOut(prog(t, 3.4, 4.6));
    const Pmid = V(2.72, 1.08, -4.62), Pout = V(2.55, 0.92, -4.38);
    stripStage(t, 'bare', Pmid.clone().lerp(Pout, lowerK));
    if (lowerK <= 0) lou.reach('R', Pmid.clone().add(V(0.05, 0.02, -0.04)), poleFor(lou, 'R')); else folded(lou);
    if (lowerK <= 0) lou.reach('L', lou.group.localToWorld(V(0.07, 1.06, 0.2)), fpole(lou, 'L'));
    mgr.reach('R', K.folded.position.clone().add(V(-0.03, 0.04, 0.03)).lerp(mgr.group.localToWorld(V(-0.2, 0.95, 0.25)), 1 - handK), poleFor(mgr, 'R')); mgr.fingers('R', 0.55);
    if (handK <= 0) K.folded.visible = true;
    return K;
  };
  S(0, 8.48, 'tb',
    (t, p) => Object.assign(villain(t), orbit([0, 0, 0], 1.55, 1.72, 0.35 + p * Math.PI * 2, 1.52, 34)),
    (t, p) => { hookOffice(t); const a = lerp(0.45, 1.1, ease(p)); return done({ pos: V(L2[0] + Math.cos(a) * 1.42, 1.5, L2[1] + Math.sin(a) * 1.42), at: V(2.45, 1.4, -4.75), fov: 42 }, { aperture: 0.0035, exposure: 0.88 }); });
  S(8.48, 12.2, 'tb',
    (t, p) => Object.assign(villain(t), orbit([0, 0, 0], lerp(1.55, 3.4, ease(p)), lerp(1.72, 2.3, ease(p)), 0.35 + Math.PI * 2 + p * 0.5, 1.4, 34)),
    (t, p) => { hookOffice(t); const r = 1.42, a = 1.1; return done({ pos: V(L2[0] + Math.cos(a) * r, lerp(1.5, 2.35, ease(p)), L2[1] + Math.sin(a) * r), at: V(2.55, lerp(1.4, 1.0, ease(p)), -4.75), fov: lerp(42, 48, p) }, { exposure: 0.88 }); });
  // 3  "With one phone call."
  S(12.2, 14.25, 'full', (t, p) => { hookOffice(t); return done(mv(p, [3.5, 1.2, -4.85], [2.95, 0.9, -5.3], [3.4, 1.12, -4.98], [2.95, 0.88, -5.3], 36, 34), { aperture: 0.005, exposure: 0.85 }); });
  // 4  exterior, April 9 2004, Kentucky
  S(14.25, 17.56, 'full', (t) => { const c = CAMV.ext.at(t); return { scene: ext, ...c, exposure: 1.0, aperture: 0 }; });
  // 5  the phone rings; her hand lifts the receiver
  S(17.56, 18.95, 'full', (t, p) => { R0(t); place(mgr, HOME, 0, t, 1); ph.ring(t, t < 18.25);
    const k = easeIn(prog(t, 18.45, 18.95)); ph.group.updateMatrixWorld(true);
    if (k > 0) { ph.rest(); ph.group.updateMatrixWorld(true); const p0 = ph.receiver.getWorldPosition(new THREE.Vector3()), q0 = ph.receiver.getWorldQuaternion(new THREE.Quaternion()); ph.setWorld(p0.add(V(0, 0.5 * k, 0.05 * k)), q0); ph.receiver.updateMatrixWorld(true); }
    mgr.group.visible = false;
    return done(mv(p, [3.4, 1.2, -4.75], [3.1, 0.95, -5.45], [3.36, 1.22, -4.85], [3.1, 1.0, -5.45], 38, 36), { aperture: 0.004 }); });
  // 6  "An assistant manager answers the restaurant phone."
  S(18.95, 20.3, 'full', (t, p) => { R0(t); place(mgr, HOME, 0, t, 1); holdPhone(mgr); mgr.face('neutral'); mgr.headTo(V(3.3, 1.5, -4.0), 0.6);
    return done(mv(p, [3.42, 1.5, -4.15], [3.25, 1.42, -6.0], [3.38, 1.52, -4.42], [3.25, 1.45, -6.0], 38, 36)); });
  // 7  "A man introduces himself as Officer Scott."  split: caller | manager (the cap shadow rises)
  S(20.3, 24.05, 'lr',
    (t, p) => Object.assign(villain(t), mv(p, [0.3, 1.66, 1.45], [0, 1.6, 0], [0.22, 1.66, 1.2], [0, 1.62, 0], 46, 44)),
    (t, p) => { R0(t); place(mgr, HOME, 0, t, 1); holdPhone(mgr); mgr.face(t < 22 ? 'neutral' : 'concern'); mgr.headTo(V(3.3, 1.5, -4.0), 0.6); K.decal.set(0.6 * smooth(prog(t, 21.2, 23.2)), 0);
      return done(mv(p, [3.4, 1.45, -4.3], [3.25, 1.62, -6.3], [3.36, 1.47, -4.55], [3.25, 1.65, -6.3], 50, 48)); });
  // 8  "He claims an employee has stolen a customer's purse."  (his claim: a purse on the counter)
  S(24.05, 27.3, 'full', (t, p) => { R0(t); purse.visible = true; purseMats.forEach(m => m.opacity = 1); place(lou, [0.2, -0.75], 0, t, 2); lou.reach('R', V(0.12, 1.22, -0.3), poleFor(lou, 'R'));
    return done(mv(p, [1.55, 1.42, 0.95], [0.85, 1.12, -0.02], [1.3, 1.33, 0.7], [0.85, 1.12, -0.02], 36, 32), { aperture: 0.006, sat: 0.92 }); });
  // 9  "The manager recognizes the girl immediately."  (her view through the office window)
  S(27.3, 30.45, 'full', (t, p) => { R0(t); place(lou, [0.2, -0.75], 0, t, 2); lou.reach('R', V(0.12 + 0.03 * Math.sin(t * 7), 1.22, -0.3), poleFor(lou, 'R')); lou.fingers('R', 0.3);
    place(cow, [-1.9, -0.75], 0, t, 4); cow.reach('R', V(-1.9, 1.22, -0.3), poleFor(cow, 'R'));
    return done(mv(p, [3.95, 1.56, -4.05], [0.25, 1.45, -0.75], [3.75, 1.56, -3.75], [0.22, 1.5, -0.75], 30, 22), { aperture: 0.002 }); });
  // 10  "18-year-old Louise Ogborn."
  S(30.45, 32.56, 'full', (t, p) => { R0(t); place(lou, [0.2, -0.75], 0, t, 2); lou.reach('R', V(0.12, 1.22, -0.3), poleFor(lou, 'R')); lou.face('smile'); lou.headTo(V(0.5, 1.55, 0.8), 0.6);
    return done(mv(p, [0.48, 1.58, 0.9], [0.2, 1.55, -0.75], [0.42, 1.57, 0.62], [0.2, 1.55, -0.75], 30, 28)); });
  // 11  "He asks the manager to bring her into the office."
  S(32.56, 35.4, 'full', (t, p) => { R0(t); place(mgr, M2, Math.PI / 2, t, 1, 0.4); holdPhone(mgr); mgr.face('tight'); mgr.headTo(V(1.6, 1.5, -4.45), 0.7);
    const wave = smooth(prog(t, 32.7, 33.1)) * (1 - smooth(prog(t, 33.9, 34.3))); mgr.reach('R', mgr.group.localToWorld(V(-0.25, 1.15 + 0.06 * Math.sin(t * 9), 0.3)).lerp(mgr.group.localToWorld(V(-0.18, 0.85, 0.05)), 1 - wave), poleFor(mgr, 'R'));
    lou.group.visible = true; walkPath(lou, [[1.0, -4.45], [1.9, -4.3], [2.75, -4.45], [L2[0], L2[1]]], 32.6, 34.9, t, 5);
    if (t > 34.9) { lou.group.position.set(L2[0], 0, L2[1]); lou.group.rotation.y = angLerp(lou.group.rotation.y, -Math.PI / 2, smooth(prog(t, 34.9, 35.35))); }
    lou.face('concern'); folded(lou);
    return done(mv(p, [4.85, 1.72, -3.45], [2.4, 1.2, -4.75], [4.7, 1.66, -3.62], [2.6, 1.25, -4.75], 48, 46), { aperture: 0.002 }); });
  // 12  "Then the instructions begin."  split: caller | the receiver at her ear
  S(35.4, 37.65, 'lr',
    (t, p) => Object.assign(villain(t), mv(p, [-0.35, 1.7, 1.35], [0, 1.62, 0], [-0.28, 1.68, 1.1], [0, 1.62, 0], 44, 42)),
    (t, p) => { R0(t); stripStage(t, 'uniform'); folded(lou);
      return done(mv(p, [3.0, 1.62, -5.55], [2.35, 1.55, -4.72], [2.95, 1.6, -5.45], [2.35, 1.55, -4.72], 40, 38), { aperture: 0.004 }); });
  // 13  "Search her."
  S(37.65, 38.72, 'full', (t, p) => { R0(t); stripStage(t, 'uniform'); lou.reach('L', lou.group.localToWorld(V(0.3, 1.0, 0.0)), poleFor(lou, 'L')); lou.reach('R', lou.group.localToWorld(V(-0.3, 1.0, 0.0)), poleFor(lou, 'R'));
    const pat = Math.sin(t * 14) * 0.03; mgr.reach('R', lou.group.localToWorld(V(-0.15, 0.95 + pat, 0.02)), poleFor(mgr, 'R')); mgr.fingers('R', 0.3);
    return done(mv(p, [4.45, 1.75, -3.5], [2.7, 1.12, -4.75], [4.38, 1.72, -3.55], [2.7, 1.1, -4.75], 46, 44)); });
  // 14  "Make her remove her clothes."  from behind, shoulder height: the polo comes off over her head
  S(38.72, 39.95, 'full', (t, p) => { R0(t); stripStage(t, 'bare'); const k = easeInOut(prog(t, 38.8, 39.85)); lou.shirtLift(k);
    for (const [sd, x] of [['L', 0.13], ['R', -0.13]]) lou.reach(sd, lou.group.localToWorld(V(x * (1 - 0.4 * k), 0.95 + 1.0 * k, 0.12 - 0.1 * k)), poleFor(lou, sd));
    lou.headTo(V(M2[0], 1.3, M2[1]), 0.6 * (1 - k));
    return done(mv(p, [4.3, 1.42, -4.62], [3.05, 1.45, -4.72], [4.25, 1.42, -4.64], [3.05, 1.5, -4.72], 44, 44)); });
  // 15  the manager puts the folded uniform into the paper bag
  S(39.95, 40.6, 'full', (t, p) => { R0(t); stripStage(t, 'bare'); folded(lou); K.bag.position.set(2.82, 0.78, -5.38);
    mgr.group.position.set(2.62, 0, -4.92); mgr.group.rotation.y = 2.6; holdPhone(mgr);
    const k = easeIn(prog(t, 39.95, 40.5)); K.folded.visible = true; K.folded.position.set(2.82, 1.22 - 0.32 * k, -5.38); K.folded.rotation.set(0, 0.2, 0);
    mgr.reach('R', K.folded.position.clone().add(V(0.02, 0.045, 0.03)), poleFor(mgr, 'R')); mgr.fingers('R', 0.55);
    return done(mv(p, [3.25, 1.4, -4.95], [2.82, 1.0, -5.38], [3.22, 1.38, -4.98], [2.82, 0.98, -5.38], 38, 37), { aperture: 0.006 }); });
  // 16  "Find someone to watch her."
  S(40.6, 42.45, 'full', (t, p) => { R0(t); stripStage(t, 'bare'); folded(lou); mgr.headTo(V(1.6, 1.5, -4.45), smooth(prog(t, 40.9, 41.5)) * 0.85);
    return done(mv(p, [3.95, 1.58, -5.35], [2.35, 1.5, -4.62], [3.88, 1.58, -5.3], [2.35, 1.5, -4.6], 40, 38), { aperture: 0.004 }); });
  // 17  "Each order goes a little further…"  the cap shadow grows over both of them
  S(42.45, 48.35, 'full', (t, p) => { R0(t); stripStage(t, 'apron'); folded(lou); const g = smooth(prog(t, 42.6, 48.0));
    K.decal.set(0.55 + 0.3 * g, 0); K.decal.group.scale.setScalar(1 + 0.6 * g); K.decal.group.position.y = 1.75 + 0.35 * g; K.decal.group.position.x = 2.7; lights(6, 7, 7, 4, lerp(6, 8, g), lerp(14, 9, g));
    return done(mv(p, [2.7, 1.0, -3.35], [2.65, 1.75, -6.4], [2.7, 0.92, -3.28], [2.65, 1.85, -6.4], 52, 56), { aperture: 0.002 }); });
  // 18  "One employee is so disturbed… she walks out."  (the co-worker: blonde, older, grey crew shirt)
  const officeBG = (t) => { place(mgr, M2, Math.PI / 2, t, 1, 0.4); holdPhone(mgr); mgr.face('tight'); place(lou, L2, -Math.PI / 2, t, 2, 0.3); wardrobe(lou, 'apron'); folded(lou); lou.face('sad'); };
  S(48.35, 52.2, 'full', (t, p) => { R0(t); officeBG(t); K.decal.set(0.85, 0); K.decal.group.scale.setScalar(1.6); K.decal.group.position.y = 2.1;
    cow.group.visible = true; cow.face('concern');
    if (t < 51.0) { place(cow, [1.25, -4.45], angLerp(Math.PI / 2, Math.PI, smooth(prog(t, 50.75, 51.0))), t, 4); if (t > 50.0 && t < 50.7) cow.joints.head.rotation.y += Math.sin((t - 50.0) * 18) * 0.25; cow.face(t > 49.6 ? 'frown' : 'concern'); folded(cow); }
    else walkPath(cow, [[1.25, -4.45], [1.05, -5.4], [1.0, -6.85]], 51.0, 52.7, t, 6);
    K.exitDoor.rotation.y = 1.3 * smooth(prog(t, 51.5, 52.0));
    return done(mv(p, [0.95, 1.62, -2.75], [1.25, 1.35, -4.7], [0.98, 1.58, -3.05], [1.05, 1.3, -6.0], 44, 44), { aperture: 0.002 }); });
  // 19  "But the manager doesn't stop."
  S(52.2, 54.15, 'full', (t, p) => { R0(t); officeBG(t); mgr.headTo(V(3.3, 1.5, -5.3), 0.4);
    return done(mv(p, [2.98, 1.6, -5.2], [2.35, 1.56, -4.72], [2.9, 1.6, -5.12], [2.35, 1.56, -4.72], 40, 38), { aperture: 0.005 }); });
  // 20  "She brings in her own fiancé, Walter Nix, to watch Louise."
  S(54.15, 58.4, 'full', (t, p) => { R0(t); officeBG(t); wal.face('neutral');
    if (t < 57.0) walkPath(wal, [[1.0, -6.75], [1.02, -5.6], [1.05, -4.55]], 54.4, 57.0, t, 5.2);
    else if (t < 57.5) { place(wal, [1.05, -4.55], angLerp(0, Math.PI / 2, smooth(prog(t, 57.0, 57.5))), t); }
    else { wal.group.visible = true; walkPath(wal, [[1.05, -4.5], [2.1, -4.4]], 57.5, 58.45, t, 5.2); }
    wal.group.visible = true; K.exitDoor.rotation.y = 1.3 * smooth(prog(t, 54.2, 54.6)) * (1 - smooth(prog(t, 55.4, 56.1)));
    return done(mv(p, [0.95, 1.62, -2.8], [1.0, 1.4, -6.2], [0.98, 1.55, -3.1], [1.2, 1.35, -4.6], 44, 42), { aperture: 0.002 }); });
  // 21  "And the situation turns into a sexual assault."  the door closes; light under it; the corridor dims
  S(58.4, 61.95, 'full', (t, p) => { R0(t); K.officeDoor.rotation.y = -1.45 * (1 - smooth(prog(t, 58.5, 59.4))); K.strip.material.opacity = smooth(prog(t, 59.1, 59.5));
    if (t < 59.0) { place(wal, [2.2, -4.42], Math.PI / 2, t); }
    const dim = smooth(prog(t, 59.0, 60.6)); lights(lerp(6, 3, dim), lerp(7, 3, dim), 7, lerp(4, 1.2, dim), 6, 14); K.exitLight.intensity = lerp(0.35, 0.8, dim);
    return done(mv(p, [0.55, 1.35, -2.55], [1.55, 0.9, -4.45], [0.62, 1.2, -2.85], [1.55, 0.85, -4.45], 50, 48), { exposure: lerp(0.9, 0.82, dim), sat: lerp(1.0, 0.9, dim), aperture: 0.003 }); });
  const corridorDim = () => { K.officeDoor.rotation.y = 0; K.strip.material.opacity = 1; lights(3, 3, 7, 1.2, 6, 14); K.exitLight.intensity = 0.8; };
  // 22  "For more than three hours…"  the clock
  S(61.95, 64.4, 'full', (t, p) => { R0(t); corridorDim(); return done(mv(p, [1.15, 2.02, -4.38], [0.47, 2.15, -4.45], [1.02, 2.08, -4.42], [0.47, 2.15, -4.45], 34, 30), { exposure: 0.84, sat: 0.92, aperture: 0.004 }); });
  // 23  "…the stranger on the phone continues giving orders."  split: caller | the clock
  S(64.4, 66.74, 'lr',
    (t, p) => Object.assign(villain(t), mv(p, [0.35, 1.72, 1.3], [0, 1.6, 0], [0.28, 1.7, 1.1], [0, 1.62, 0], 46, 44)),
    (t, p) => { R0(t); corridorDim(); return done(mv(p, [1.05, 2.1, -4.42], [0.47, 2.15, -4.45], [0.98, 2.12, -4.44], [0.47, 2.15, -4.45], 40, 38), { exposure: 0.84, sat: 0.92, aperture: 0.004 }); });
  // ---- Tom ----
  const tomStage = (t, louOn = true) => { place(mgr, MSIDE, -Math.PI / 2, t, 1, 0.4); mgr.face('concern');
    if (louOn) { K.chair.position.set(CHAIR[0], 0, CHAIR[1]); K.chair.rotation.y = 0.9; place(lou, CHAIR, 0.9, t, 2, 0.25); lou.sit(1); wardrobe(lou, 'apron'); folded(lou); lou.face('sad'); lou.headTo(V(2.6, 0.9, -4.6), 0.4); } };
  const tomHome = (t) => { place(tom, HOME, 0, t, 3, 0.45); tom.reach('R', V(3.05, 0.84, -5.55), poleFor(tom, 'R')); };
  // 24  "Then a 58-year-old maintenance worker named Tom Simms…"
  S(66.74, 69.0, 'full', (t, p) => { R0(t); tomStage(t); holdPhone(mgr); tom.group.visible = true; walkPath(tom, [[1.4, -4.45], [2.2, -4.75], [2.45, -5.5], [2.6, -6.1], [3.25, -6.08]], 66.8, 68.9, t, 5.2);
    if (t >= 68.9) { tom.group.rotation.y = 0; }
    mgr.headTo(tom.headWorld(), 0.7);
    return done(mv(p, [4.95, 1.75, -3.42], [2.6, 1.15, -5.3], [4.85, 1.7, -3.55], [2.8, 1.2, -5.4], 50, 48), { aperture: 0.002 }); });
  // 25  "…takes the phone."  the hand-over
  const MID = V(3.85, 1.22, -5.98);
  S(69.0, 71.15, 'full', (t, p) => { R0(t); tomStage(t); tomHome(t); tom.face('neutral'); mgr.headTo(tom.headWorld(), 0.8); tom.headTo(MID, 0.5);
    const k = easeInOut(prog(t, 69.1, 70.0)), rm = receiverAtEar(mgr, 'L');
    const q = rm.quat.clone().slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.6, 0.0)), k); ph.setWorld(rm.pos.clone().lerp(MID, k), q); ph.receiver.updateMatrixWorld(true);
    const grip = ph.receiver.localToWorld(V(0, 0.025, 0)); mgr.reach('L', grip, poleFor(mgr, 'L')); mgr.fingers('L', 0.75, 0.6);
    const tk = smooth(prog(t, 69.9, 70.6)); tom.reach('L', grip.clone().add(V(-0.05, 0.02, 0)).lerp(tom.group.localToWorld(V(0.25, 0.95, 0.15)), 1 - tk), poleFor(tom, 'L')); tom.fingers('L', 0.4 + 0.35 * tk);
    return done(mv(p, [3.25, 1.58, -4.5], [3.85, 1.25, -6.0], [3.28, 1.56, -4.62], [3.85, 1.25, -6.0], 46, 44), { aperture: 0.003 }); });
  const tomOnPhone = (t) => { tomHome(t); holdPhone(tom, 'L'); };
  // 26  "He listens."
  S(71.15, 72.2, 'full', (t, p) => { R0(t); tomStage(t); tomOnPhone(t); tom.face('concern'); tom.look(0, -0.15); K.decal.set(0.75, 0); K.decal.group.scale.setScalar(1.5); K.decal.group.position.y = 2.0;
    return done(mv(p, [3.32, 1.64, -4.95], [3.25, 1.66, -6.05], [3.3, 1.64, -5.08], [3.25, 1.66, -6.05], 36, 34), { aperture: 0.005 }); });
  // 27  "He questions what's happening."  over Louise's shoulder (apron, from behind)
  S(72.2, 73.8, 'full', (t, p) => { R0(t); tomStage(t); tomOnPhone(t); tom.face('frown'); if (t > 72.4 && t < 73.5) tom.talk(0.5 + 0.5 * Math.sin(t * 22)); tom.headTo(lou.headWorld(), smooth(prog(t, 72.3, 72.8)) * 0.6);
    K.decal.set(0.75, 0); K.decal.group.scale.setScalar(1.5); K.decal.group.position.y = 2.0;
    return done(mv(p, [2.55, 1.56, -5.0], [3.25, 1.62, -6.05], [2.6, 1.56, -5.08], [3.25, 1.63, -6.05], 36, 34), { aperture: 0.004 }); });
  // 28  "…when the caller gives him instructions, Tom refuses."  split: caller | Tom
  S(73.8, 77.3, 'lr',
    (t, p) => Object.assign(villain(t), mv(p, [0.3, 1.66, 1.4], [0, 1.6, 0], [0.2, 1.66, 1.15], [0, 1.62, 0], 46, 44)),
    (t, p) => { R0(t); tomStage(t, false); tomOnPhone(t); tom.face(t < 75.4 ? 'frown' : 'firm'); if (t > 75.6 && t < 77.0) { tom.talk(0.4 + 0.4 * Math.sin(t * 20)); tom.joints.head.rotation.y += Math.sin((t - 75.6) * 9) * 0.12; }
      const loom = smooth(prog(t, 73.9, 77.0)); K.decal.set(lerp(0.75, 0.95, loom), 0); K.decal.group.scale.setScalar(lerp(1.5, 1.8, loom)); K.decal.group.position.y = 2.0;
      return done(mv(p, [3.32, 1.55, -4.85], [3.25, 1.75, -6.3], [3.3, 1.5, -5.0], [3.25, 1.78, -6.3], 52, 50), { aperture: 0.003 }); });
  // 29  "He says NO."  locked close-up, the light warms
  S(77.3, 78.95, 'full', (t, p) => { R0(t); tomStage(t, false); tomOnPhone(t); tom.face('firm'); if (t > 78.04 && t < 78.75) tom.talk(Math.sin(prog(t, 78.04, 78.75) * Math.PI) * 0.9);
    K.decal.set(0.95, 0); K.decal.group.scale.setScalar(1.8); K.decal.group.position.y = 2.0; const warm = smooth(prog(t, 77.6, 78.9)); lights(6, 7, 7, 4, lerp(6, 11, warm), lerp(12, 8, warm));
    return done(mv(p, [3.29, 1.56, -5.06], [3.25, 1.66, -6.05], [3.29, 1.56, -5.1], [3.25, 1.66, -6.05], 32, 31), { aperture: 0.005, sat: lerp(0.96, 1.05, warm) }); });
  // 30  "…the authority the caller had over everyone starts to collapse."
  S(78.95, 83.45, 'full', (t, p) => { R0(t); tomStage(t); tomHome(t); tom.face('firm');
    const low = easeInOut(prog(t, 79.6, 80.8)), r = receiverAtEar(tom, 'L'), down = tom.group.localToWorld(V(0.24, 1.05, 0.22));
    ph.setWorld(r.pos.clone().lerp(down, low), r.quat.clone().slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.2, -1.2)), low)); ph.receiver.updateMatrixWorld(true);
    tom.reach('L', ph.receiver.localToWorld(V(0, 0.025, 0)), poleFor(tom, 'L')); tom.fingers('L', 0.75, 0.6);
    const gone = smooth(prog(t, 79.2, 82.6)); K.decal.set(0.95 * (1 - gone), 0); K.decal.group.scale.setScalar(1.8 * (1 - 0.35 * gone)); K.decal.group.position.y = 2.0 - 0.3 * gone;
    lights(6, 7, 7, 4, 11, 8); mgr.headTo(tom.headWorld(), 0.8);
    return done(mv(p, [3.42, 1.58, -4.75], [3.25, 1.62, -6.3], [3.75, 1.65, -3.6], [3.25, 1.55, -6.3], 40, 48), { aperture: 0.002, sat: 1.05 }); });
  // 31  "The manager contacts her supervisor."  her finger on the keypad
  const dialStage = (t) => { place(mgr, [3.1, -4.82], Math.PI, t, 1, 0.3); mgr.joints.chest.rotation.x = 0.22; holdPhone(mgr, 'L'); lights(6, 7, 7, 4, 11, 8); };
  S(83.45, 85.75, 'full', (t, p) => { R0(t); dialStage(t);
    const n = Math.floor((t - 83.6) / 0.17), f = ((t - 83.6) / 0.17) - n; const idx = [0, 3, 7, 4, 1, 8, 2, 6, 5, 10, 9, 11, 0][Math.max(0, n) % 13];
    ph.group.updateMatrixWorld(true); const kp = ph.keys[idx].getWorldPosition(new THREE.Vector3()), press = t > 83.6 && t < 85.6 ? Math.sin(f * Math.PI) : 0;
    mgr.reach('R', kp.clone().add(V(0, 0.015 + 0.014 * (1 - press), 0.045)), poleFor(mgr, 'R')); mgr.fingers('R', 0.85, 0.8); ph.press(idx, press);
    return done(mv(p, [2.68, 1.32, -5.42], [3.04, 0.86, -5.38], [2.7, 1.28, -5.44], [3.04, 0.85, -5.38], 36, 34), { aperture: 0.008 }); });
  // 32  "The answer? Nobody from the police had called."
  S(85.75, 89.1, 'full', (t, p) => { R0(t); dialStage(t); mgr.joints.chest.rotation.x = 0.05; mgr.reach('R', mgr.group.localToWorld(V(-0.15, 0.9, 0.12)), poleFor(mgr, 'R'));
    mgr.face(t < 86.9 ? 'concern' : t < 88.6 ? 'o' : 'sad'); mgr.headTo(V(3.15, 1.45, -5.8), 0.4); if (t > 86.9) mgr.look(0, 0.1);
    return done(mv(p, [3.2, 1.56, -5.78], [3.1, 1.58, -4.85], [3.18, 1.57, -5.62], [3.1, 1.58, -4.85], 36, 34), { aperture: 0.005 }); });
  // 33  "There was no Officer Scott."  the empty wall
  S(89.1, 91.05, 'full', (t, p) => { R0(t); K.chair.position.set(4.7, 0, -4.0); lights(6, 7, 7, 4, 11, 8); return done(mv(p, [3.25, 1.5, -4.5], [3.2, 1.25, -6.5], [3.25, 1.52, -4.75], [3.2, 1.3, -6.5], 50, 48), { aperture: 0.002, sat: 0.95 }); });
  // 34  "No investigation."  the bag with her uniform
  S(91.05, 92.5, 'full', (t, p) => { R0(t); lights(6, 7, 7, 4, 11, 8); K.bag.position.set(3.0, 0.78, -5.7); K.folded.visible = true; K.folded.position.set(3.38, 0.8, -5.5); K.folded.rotation.set(0, 0.4, 0);
    return done(mv(p, [3.75, 1.4, -4.75], [3.2, 0.92, -5.6], [3.68, 1.36, -4.85], [3.2, 0.92, -5.6], 40, 38), { aperture: 0.006 }); });
  // 35  "No stolen purse."  the same counter, the purse fades: it never existed
  S(92.5, 94.06, 'full', (t, p) => { R0(t); purse.visible = true; const f = 1 - smooth(prog(t, 92.7, 93.6)); purseMats.forEach(m => m.opacity = f); purse.visible = f > 0.01; lights(lerp(6, 2, smooth(prog(t, 92.6, 94))), 4, 7, 4, 6, 14);
    return done(mv(p, [1.42, 1.38, 0.85], [0.85, 1.12, -0.02], [1.32, 1.34, 0.72], [0.85, 1.12, -0.02], 34, 33), { aperture: 0.005, sat: 0.92 }); });
  // 36  "…a stranger pretending to be a police officer."  his shadow loses the cap
  S(94.06, 99.7, 'full', (t, p) => { const capK = 1 - smooth(prog(t, 96.2, 98.4));
    return Object.assign(villain(t, { wall: true, cap: 0.8 * capK, bare: 0.8 * (1 - capK) }), mv(p, [1.7, 1.55, 2.9], [-0.15, 1.6, -0.6], [1.25, 1.58, 2.25], [-0.15, 1.62, -0.6], 42, 40)); });
  // 37  the map: 32 states, Florida
  S(99.7, 106.06, 'full', (t) => { let rail = CAMV.map;
    MK.marks.forEach((m, i) => { const t0 = 102.1 + i * 0.085, k = easeOut(prog(t, t0, t0 + 0.3)); m.scale.setScalar(Math.max(0.001, k)); const rp = prog(t, t0, t0 + 1.2); m.userData.ring.scale.setScalar(1 + rp * 3); m.userData.ring.material.opacity = (1 - rp) * 0.8 * (rp > 0 ? 1 : 0); });
    lbl32.material.opacity = smooth(prog(t, 104.2, 104.7)); lbl32.visible = t > 104.2; lblFl.material.opacity = smooth(prog(t, 105.2, 105.6)); lblFl.visible = t > 105.2; MK.fl.scale.setScalar(Math.max(0.001, 0.6 * easeOut(prog(t, 105.0, 105.4))));
    let c = rail.at(t); if (t > 105.0) { const k = easeInOut(prog(t, 105.0, 106.1)), b = CAMV.map.at(105.0), fp = MK.florida; c = { pos: b.pos.clone().lerp(fp.clone().add(V(0.35, 1.3, 1.1)), k), at: b.at.clone().lerp(fp, k), fov: 40 }; }
    return { scene: mp, ...c, aperture: 0.0025, exposure: 0.95 }; });
  // 38  the court: David Stewart (from behind) … NOT GUILTY
  S(106.06, 112.38, 'full', (t) => { const J = CK.judge; J.rest(); J.idle(t, 0.3); J.face('neutral'); J.headTo(V(0, 1.2, 1.4), 0.6);
    const g = t < 111.62 ? 0 : t < 111.82 ? -easeIn(prog(t, 111.62, 111.82)) : -1 + easeOut(prog(t, 111.95, 112.4)), lift = t < 111.62 ? smooth(prog(t, 111.2, 111.62)) : 1 + g;
    CK.gavel.position.set(0.55, 1.83 + 0.2 * lift, -3.55 - 0.05 * lift); CK.gavel.rotation.set(-0.6 * lift, 0.3, 0); J.reach('L', CK.gavel.position.clone().add(V(0, -0.2, 0.02)), poleFor(J, 'L'));
    CK.jurors.forEach((j, i) => { j.rest(); j.sit(1); j.idle(t, 0.4, i); j.face('neutral'); }); CK.def.rest(); CK.def.sit(1); CK.def.idle(t, 0.3, 7);
    const c = t < 110.64 ? CAMV.court.at(t) : mv(prog(t, 110.64, 112.38), [-0.1, 2.2, -2.45], [-0.4, 1.78, -3.6], [-0.22, 2.1, -2.8], [-0.4, 1.78, -3.6], 40, 36);
    return { scene: court, ...c, aperture: 0.003, exposure: 0.95 }; });
  // 39–45  the symbolic void: the phone, the empty doorway, the cord, the dominoes, the last small domino
  const voidState = (t) => { VK.phone.rest(); VK.phone.ring(t, t > 139.85 && t < 140.6); VK.phone.updateCord();
    VK.dom.forEach((d, i) => { const dur = 0.32 + 0.22 * Math.sqrt(d.h); d.pivot.rotation.x = -d.rest * easeIn(prog(t, FALL[i], FALL[i] + dur)); });
    small.visible = t > 131.0; const shrink = smooth(prog(t, 131.2, 140.8)); VK.pool.angle = lerp(0.42, 0.22, shrink); VK.pool.intensity = lerp(40, 55, shrink); VK.rim.intensity = lerp(14, 4, shrink);
    VK.domLight.intensity = 60 * smooth(prog(t, 120.2, 121.0)); VK.doorLight.intensity = t > 114.83 && t < 120.9 ? 16 : 0; VK.chairLight.intensity = 0;
    return { scene: vd, exposure: 0.95, sat: 0.98, aperture: 0.004 }; };
  S(112.38, 114.95, 'full', (t, p) => Object.assign(voidState(t), mv(p, [1.5, 1.5, 2.0], [-0.2, 0.85, 0.1], [1.05, 1.38, 1.6], [-0.22, 0.85, 0.1], 36, 34)));
  S(114.95, 117.85, 'full', (t, p) => Object.assign(voidState(t), mv(p, [-0.6, 1.5, 1.9], [-3.1, 1.15, -1.25], [-0.85, 1.48, 1.6], [-3.1, 1.15, -1.25], 40, 38), { aperture: 0.002 }));
  S(117.85, 120.85, 'full', (t, p) => Object.assign(voidState(t), mv(p, [0.3, 1.02, 0.62], [-0.25, 0.83, 0.12], [0.18, 0.98, 0.48], [-0.25, 0.83, 0.12], 32, 30), { aperture: 0.007 }));
  S(120.85, 131.0, 'full', (t) => Object.assign(voidState(t), CAMV.dom.at(t)));
  S(131.0, 141.2, 'full', (t) => Object.assign(voidState(t), CAMV.v3.at(t), { aperture: 0.006 }));

  // ---------- drawing ----------
  const clearStrip = (x, y, w, h) => { renderer.setRenderTarget(null); renderer.setScissor(x, y, w, h); renderer.setScissorTest(true); const c = renderer.getClearColor(new THREE.Color()), a = renderer.getClearAlpha();
    renderer.setClearColor('#050505', 1); renderer.clear(true, false, false); renderer.setClearColor(c, a); };
  function draw(post, v, rect, t, fx) {
    const [x, y, w, h] = rect; renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h); renderer.setScissorTest(true);
    cam.aspect = w / h; cam.fov = v.fov; cam.updateProjectionMatrix();
    cam.position.copy(v.pos).add(drift(t, 0.004, 1)); cam.lookAt(v.at);
    for (const [s, p] of P) if (s === v.scene) p.update(t);
    post.render(v.scene, cam, t, { focus: v.focus ?? cam.position.distanceTo(v.at), aperture: v.aperture ?? 0.003, zoom: 0, fill: fx.fill, fillColor: fx.fillColor, exposure: v.exposure ?? 0.9, sat: v.sat ?? 1.04, con: 1.07, warm: 0.012 });
  }
  return {
    async render(t) {
      const sh = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
      const p = clamp((t - sh.t0) / (sh.t1 - sh.t0));
      let fill = 0, fillColor = '#000000';
      for (const [cc, w, col] of PORTALS) { const b = bell(t, cc, w); if (b > fill) { fill = b; fillColor = col; } }
      const end = smooth(prog(t, 140.55, 141.15)); if (end > fill) { fill = end; fillColor = '#000000'; }
      const fx = { fill: fill * 0.97, fillColor };
      if (sh.layout === 'full') draw(postF, sh.A(t, p), [0, 0, W, H], t, fx);
      else if (sh.layout === 'tb') { draw(postTB, sh.A(t, p), [0, H - HH, W, HH], t, fx); draw(postTB, sh.B(t, p), [0, 0, W, H - HH], t, fx); clearStrip(0, H - HH - 2, W, 4); }
      else { draw(postLR, sh.A(t, p), [0, 0, HW, H], t, fx); draw(postLR, sh.B(t, p), [HW, 0, W - HW, H], t, fx); clearStrip(HW - 2, 0, 4, H); }
      renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
    },
  };
}
