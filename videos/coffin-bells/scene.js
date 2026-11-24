// "Did Coffin Bells Ever Save Anyone?" - one continuous take, 7 environments, switches inside portal fills at the narrator's pauses.
import * as THREE from 'three';
import { makeRenderer, makePost, lerp, clamp, prog, smooth, easeInOut, captionsFromLines } from 'kit';
import { particles, drift, bell, guardCamera, env, lensProbe, shots, shake } from '/kit/fx.js';
import { makeToon, speech } from '/kit/toon.js';
import { mood, faceRig, soft } from '/kit/look.js';
import { V, graveyardSet, insideCoffinSet, cryptSet, cutawaySet, boxingSet } from './sets.js';
import { hat, beard, cyl, sph, at } from './lib.js';

const LINES = await (await fetch('/scene/lines.json')).json();
export const duration = 57.47;
export const fps = 30;
export const captions = captionsFromLines(LINES.map(([t, end, text]) => ({ t, end, text: text.replace(/\.\.\./g, '') })));
export const captionStyle = { y: 0.8, size: 0.056 };
export const titles = [];
const HZ = 0.1;
/** lying hands: rest on the lower stomach, elbows out to the side (pole = away from the body's centre line) */
function restHands(c, cx, y, tugR = 0) {
  for (const s of ['L', 'R']) { const sh = c.joints['shoulder' + s].getWorldPosition(new THREE.Vector3()); const side = Math.sign(sh.z) || 1;
    const tgt = new THREE.Vector3(cx + (s === 'R' ? -tugR : 0) + (s === 'L' ? -0.06 : 0.02), y + (s === 'R' ? tugR * 0.6 : 0), side * 0.07);
    c.reach(s, tgt, new THREE.Vector3(0, 0.15, side)); c.grip(s, 0.35); } }
const PORTALS = [[4.12, 0.18, '#05070c', 0.35], [8.8, 0.15, '#0a0604', 0.3], [17.29, 0.18, '#f2d8a8', 0.3], [19.84, 0.15, '#2a1a10', 0.3], [25.8, 0.2, '#05070c', 0.35],
  [35.74, 0.17, '#0a1a0a', 0.35], [47.27, 0.2, '#05070c', 0.35], [52.64, 0.17, '#ffffff', 0.4]];
const SEG = [['grave', 0, 4.12], ['inside', 4.12, 8.8], ['crypt', 8.8, 17.29], ['doctor', 17.29, 25.8], ['bells', 25.8, 47.27], ['rows', 47.27, 52.64], ['boxing', 52.64, 57.5]].map(([n, s, e]) => ({ n, s, e }));
const segAt = t => SEG.find(x => t >= x.s && t < x.e) || SEG[SEG.length - 1];
const L = (a, b, k) => a.clone().lerp(b, clamp(k));
function emoAt(track, t) { let i = 0; while (i + 1 < track.length && t >= track[i + 1][0]) i++; return { from: track[Math.max(0, i - 1)][1], to: track[i][1], k: i ? smooth((t - track[i][0]) / 0.45) : 1 }; }
function act(c, t, track, { idle = 1, look = null, posture = true } = {}) { const e = emoAt(track, t); c.rest(); if (posture) c.posture(e.to, e.k * 0.5); c.idle(t, idle); c.face(e.to, { from: e.from, k: e.k }); c.look(...(look || [null])); return e; }
const put = (c, scene, x, z, ry = 0, y = 0) => { if (c.group.parent !== scene) scene.add(c.group); c.group.visible = true; c.group.position.set(x, y, z); c.group.rotation.set(0, ry, 0); };
const gesture = (c, side, target, w, grip = null) => { if (w <= 0.001) return; c.reach(side, L(c.handWorld(side), target, w)); if (grip != null) c.grip(side, lerp(0.25, grip, w)); };
/** lying figure: outer group turns the body along -x (head at -x), inner holder lays it on its back facing up */
function lying(c, parent, x, y, z) { const outer = new THREE.Group(); outer.position.set(x, y, z); outer.rotation.y = Math.PI / 2; const inner = new THREE.Group(); inner.rotation.x = -Math.PI / 2; outer.add(inner); inner.add(c.group); parent.add(outer); return outer; }
const wear = (c, obj, y = 0.72, z = -0.05, s = 1.55) => { c.head.add(obj); obj.position.set(0, c.HR * y, c.HR * z); obj.scale.setScalar(s); return obj; };
/** a unit string (cylinder along y) placed between two world points */
function stringBetween(mesh, a, b) { const d = b.clone().sub(a); mesh.position.copy(a).addScaledVector(d, 0.5); mesh.scale.set(1, d.length(), 1); mesh.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }
const swing = (t, t0, dur = 1.2, amp = 0.6) => (t < t0 || t > t0 + dur ? 0 : Math.sin((t - t0) * 22) * amp * Math.exp(-(t - t0) * 2.4));

export async function setup({ canvas, width, height }) {
  const renderer = makeRenderer(canvas, width, height); renderer.toneMappingExposure = 1.0;
  const post = makePost(renderer, width, height, { ao: false, bloom: 0, grain: 0.025, vignette: 0.45 });
  const cam = new THREE.PerspectiveCamera(40, width / height, 0.02, 200);
  const S = {}; const P = [];
  const mk = (n, m, o) => { const s = new THREE.Scene(); S[n] = s; s.userData.mood = mood(s, m, o); return s; };
  const addP = (scene, o) => { const p = particles(o); p.setScale(height); scene.add(p.points); P.push([scene, p]); return p; };
  const stringM = new THREE.MeshStandardMaterial({ color: '#efe4c8', roughness: 0.8 });
  const unitString = () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 6), stringM); m.castShadow = true; return m; };

  // ---- cast
  const sleeper = makeToon({ acting: 0.6, shirt: '#ece6d8', pants: '#ece6d8', hair: '#5a3a22', hairStyle: 'side', skin: '#f0c4a0', eye: '#4a6a8a' });
  const duke = makeToon({ acting: 0.5, shirt: '#f4efe4', coat: '#6a1a2a', pants: '#2a1a1a', hair: '#ececec', hairStyle: 'curly', skin: '#f2c8a8', eye: '#3a5a8a', build: 1.1, brows: '#cfcfcf' });
  const docLook = { acting: 0.55, shirt: '#f4efe4', coat: '#2f4a3a', tie: '#7a2a2a', pants: '#2a2a2a', hair: '#6a4a2a', hairStyle: 'side', glasses: true, moustache: true, skin: '#f0c09a', eye: '#4a3a2a' };
  const doctor = makeToon(docLook), doctorLie = makeToon(docLook);
  const helper = makeToon({ acting: 0.5, shirt: '#c8b48a', pants: '#5a4a3a', hair: '#2a1c12', hairStyle: 'tuft', skin: '#e8b088', eye: '#3a2a1a' });
  const person = makeToon({ acting: 0.6, shirt: '#ece6d8', pants: '#ece6d8', hair: '#3a2a1a', hairStyle: 'side', skin: '#f0c4a0', eye: '#4a5a6a', moustache: true });
  const guard = makeToon({ acting: 0.6, shirt: '#3a4a6a', pants: '#2a2a3a', coat: '#2a3048', hair: '#4a3a2a', hairStyle: 'none', skin: '#e8b796', eye: '#3a2a1a', build: 1.1 });
  wear(guard, hat({ color: '#1e2230', brim: 0.17, h: 0.1 }));
  const boxer = makeToon({ acting: 0.6, shirt: '#e0a87e', pants: '#b8282a', shoes: '#1a1a1a', hair: '#2a1a12', hairStyle: 'curly', skin: '#e0a87e', eye: '#3a2a1a', build: 1.15 });
  const ref = makeToon({ acting: 0.5, shirt: '#f4f4f4', tie: '#1a1a1a', pants: '#1a1a1a', hair: '#3a3a3a', hairStyle: 'side', skin: '#e8b796', eye: '#3a2a1a' });
  const keeper = makeToon({ acting: 0.5, shirt: '#e8e2d4', coat: '#4a3a2a', pants: '#3a3a3a', hair: '#8a8a8a', hairStyle: 'bald', moustache: true, skin: '#f0c4a0', eye: '#4a4a4a' });
  const gloves = ['L', 'R'].map(s => { const gl = sph(0.085, soft('#c8242a', 'rubber', { roughness: 0.35 }), 20, 14); gl.scale.set(1, 1.15, 1.1); boxer.hold(gl, s, [0, -0.07, 0.02]); return gl; });
  const lantern = new THREE.Group(); lantern.add(at(cyl(0.06, 0.07, 0.16, soft('#2a2a2a', 'metal'), 10), 0, 0, 0)); const lf = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffcf7a' })); lantern.add(lf);
  const ll = new THREE.PointLight('#ffb85a', 2.2, 4, 2); lantern.add(ll); guard.hold(lantern, 'R', [0, -0.14, 0.04]);
  const CAST = [sleeper, duke, doctor, doctorLie, helper, person, guard, boxer, ref, keeper];

  // ---- 1 + 6: graveyard (night)
  const grave = mk('grave', 'night'); const GY = graveyardSet(grave); { const m = grave.userData.mood; m.key.intensity = 3.6; m.hemi.intensity = 1.3; m.rim.intensity = 3.2; } grave.userData.mood.focus(V(0, 0.5, -2), 7);
  addP(grave, { count: 260, center: [0, 0.4, -2], box: [9, 0.8, 9], size: 0.03, color: '#c8d4e8', opacity: 0.18, motion: 'float', speed: 0.05, seed: 2 });   // low fog
  addP(grave, { count: 60, center: [0, 1.5, -1], box: [6, 2, 5], size: 0.008, color: '#fff8d8', opacity: 0.5, motion: 'float', speed: 0.1, seed: 4 });
  // ---- 2: inside the coffin
  const inside = mk('inside', 'night', { sky: false }); inside.background = new THREE.Color('#020304'); inside.fog = null; const IC = insideCoffinSet(inside);
  inside.userData.mood.key.intensity = 0.15; inside.userData.mood.hemi.intensity = 0.2; inside.userData.mood.rim.intensity = 0.6;
  lying(sleeper, inside, 0.82, 0.24, 0); const rigSleep = faceRig(inside, sleeper, { keyI: 0.9 });
  // ---- 3: crypt
  const crypt = mk('crypt', 'interior'); const CR = cryptSet(crypt); crypt.userData.mood.focus(V(0, 1, -0.5), 4); crypt.userData.mood.key.intensity = 1.6;
  addP(crypt, { count: 160, center: [0, 1.5, -0.5], box: [5, 2.5, 4], size: 0.007, color: '#ffe2b0', opacity: 0.5, motion: 'float', speed: 0.1, seed: 6 });
  const rigDuke = faceRig(crypt, duke);
  // ---- 4: doctor (dusk) - surface + cut-away
  const doc = mk('doctor', 'golden'); const DC = cutawaySet(doc, { withTube: true, night: false }); doc.userData.mood.focus(V(0, -0.8, 0), 4);
  const docUnder = new THREE.PointLight('#ffd9a0', 2.2, 4, 2); docUnder.position.set(-0.4, -1.4, 0.9); doc.add(docUnder);
  lying(doctorLie, doc, 0.85, DC.floorY + 0.24, 0); const rigDoc = faceRig(doc, doctor), rigDocLie = faceRig(doc, doctorLie), rigHelper = faceRig(doc, helper);
  const bowlD = new THREE.Group(); bowlD.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), soft('#e8e2d4', 'ceramic'))); bowlD.children[0].material.side = THREE.DoubleSide;
  const soupTop = cyl(0.1, 0.1, 0.01, soft('#c8782e', 'plastic', { roughness: 0.2 }), 20); soupTop.position.y = -0.03; bowlD.add(soupTop); doc.add(bowlD);
  // ---- 5: bells (night cut-away) incl. the creepy part
  const bel = mk('bells', 'night'); const BL = cutawaySet(bel, { withBell: true, night: true }); { const m = bel.userData.mood; m.key.intensity = 3.4; m.hemi.intensity = 1.3; m.rim.intensity = 3.0; } bel.userData.mood.focus(V(0, -0.6, 0), 4);
  const belUnder = new THREE.PointLight('#9fb0ff', 3.2, 5, 2); belUnder.position.set(0.2, -1.3, 1.0); bel.add(belUnder);
  const eerie = new THREE.PointLight('#5aff7a', 0, 4, 2); eerie.position.set(0, -1.4, 0.8); bel.add(eerie);
  lying(person, bel, 0.85, BL.floorY + 0.24, 0); const rigPerson = faceRig(bel, person), rigGuard = faceRig(bel, guard);
  const str = unitString(); bel.add(str);
  addP(bel, { count: 140, center: [0, 0.4, 0], box: [5, 0.8, 3], size: 0.03, color: '#c8d4e8', opacity: 0.15, motion: 'float', speed: 0.05, seed: 8 });
  const pipeBottom = V(BL.pipeX, -1.95, -0.18);
  // ---- 7: boxing
  const box = mk('boxing', 'drama'); const BX = boxingSet(box); box.userData.mood.focus(V(0, 1, 0), 4); box.userData.mood.rim.color.set('#6aa0ff');
  const rigBoxer = faceRig(box, boxer), rigRef = faceRig(box, ref), rigKeeper = faceRig(box, keeper);

  // ---- camera per environment (chained shots)
  const BELLP = GY.hero.bell.getWorldPosition(new THREE.Vector3());
  const CAM = {
    grave: shots([
      { t: 0, pos: V(1.0, 1.4, 3.0), at: V(0.55, 1.0, -0.75), fov: 38 },
      { t: 4.2, pos: V(0.85, 1.18, 0.55), at: V(0.59, 1.0, -0.75), fov: 34 },
    ]),
    inside: shots([
      { t: 4.1, pos: V(-0.35, 1.7, 0.15), at: V(-0.62, 0.3, 0), fov: 40 },
      { t: 8.8, pos: V(-0.5, 1.3, 0.08), at: V(-0.68, 0.3, 0), fov: 40 },
    ]),
    crypt: shots([
      { t: 8.75, pos: V(-0.9, 1.45, 2.0), at: V(-1.9, 1.3, 0.35), fov: 38 },
      { t: 11.0, pos: V(-0.8, 1.45, 1.9), at: V(-1.85, 1.3, 0.4), fov: 36 },
      { t: 12.2, pos: V(0.85, 1.75, 2.8), at: V(0.85, 1.05, -0.3), fov: 40 },
      { t: 13.4, pos: V(0.75, 1.75, 1.3), at: V(0.45, 1.3, -0.6), fov: 36 },
      { t: 14.6, pos: V(1.0, 1.15, 0.6), at: V(0.75, 0.8, -0.26), fov: 34 },
      { t: 15.5, pos: V(0.2, 1.9, 0.8), at: V(-0.3, 0.85, -0.6), fov: 36 },
      { t: 17.3, pos: V(-0.4, 1.75, -0.45), at: V(-0.42, 0.66, -0.6), fov: 34 },
    ]),
    doctor: shots([
      { t: 17.25, pos: V(0.2, 1.6, 3.4), at: V(0.25, 1.25, 0.2), fov: 38 },
      { t: 19.85, pos: V(0.05, 1.6, 2.9), at: V(0.25, 1.28, 0.2), fov: 36 },
      { t: 19.9, pos: V(0.0, -0.5, 5.4), at: V(0.0, -0.75, 0), fov: 40 },
      { t: 21.6, pos: V(-0.4, -1.45, 1.5), at: V(-0.6, -2.05, 0), fov: 38 },
      { t: 23.0, pos: V(-0.4, -1.45, 1.5), at: V(-0.6, -2.05, 0), fov: 38 },
      { t: 24.2, pos: V(-0.5, 0.6, 2.1), at: V(-0.6, 0.3, 0.05), fov: 40 },
      { t: 25.8, pos: V(-0.45, -1.45, 1.45), at: V(-0.65, -2.05, 0), fov: 38 },
    ]),
    bells: shots([
      { t: 25.75, pos: V(0.7, 1.35, 1.5), at: V(0.15, 1.0, -0.18), fov: 36 },
      { t: 28.0, pos: V(0.55, 1.2, 1.2), at: V(0.15, 1.0, -0.18), fov: 34 },
      { t: 29.0, pos: V(0.6, -1.6, 1.5), at: V(0.15, -2.0, -0.05), fov: 38 },
      { t: 32.6, pos: V(0.6, 0.4, 2.2), at: V(0.15, 0.2, -0.18), fov: 40 },
      { t: 33.2, pos: V(-0.4, -1.1, 0.95), at: V(-0.5, -2.05, 0), fov: 40 },
      { t: 34.6, pos: V(-0.4, -1.1, 0.95), at: V(-0.5, -2.05, 0), fov: 40 },
      { t: 35.0, pos: V(0.6, 1.25, 1.1), at: V(0.15, 1.0, -0.18), fov: 34 },
      { t: 35.7, pos: V(0.6, 1.25, 1.1), at: V(0.15, 1.0, -0.18), fov: 34 },
      { t: 35.8, pos: V(-0.3, -0.95, 1.15), at: V(-0.45, -2.05, 0), fov: 40 },
      { t: 41.2, pos: V(-0.1, -0.95, 1.3), at: V(-0.25, -2.05, 0), fov: 40 },
      { t: 43.2, pos: V(0.5, -1.0, 1.8), at: V(0.15, -1.2, -0.15), fov: 38 },
      { t: 44.0, pos: V(0.6, 1.45, 2.6), at: V(-0.2, 1.05, 0.0), fov: 40 },
      { t: 47.3, pos: V(0.45, 1.5, 2.3), at: V(-0.25, 1.1, 0.0), fov: 38 },
    ]),
    rows: shots([
      { t: 47.25, pos: V(0.0, 1.3, 3.0), at: V(0.0, 0.8, -3.0), fov: 40 },
      { t: 50.4, pos: V(0.0, 3.6, 4.2), at: V(0.0, 0.3, -4.0), fov: 40 },
      { t: 52.7, pos: V(0.0, 6.2, 4.6), at: V(0.0, 0.0, -4.4), fov: 40 },
    ]),
    boxing: shots([
      { t: 52.6, pos: V(-0.75, 1.15, 3.6), at: V(-1.05, 0.9, 2.9), fov: 34 },
      { t: 54.3, pos: V(0.1, 2.2, 3.9), at: V(0.1, 1.7, -1.1), fov: 40 },
      { t: 55.0, pos: V(-0.6, 1.4, 4.4), at: V(-1.0, 1.0, 2.9), fov: 36 },
      { t: 56.0, pos: V(0.4, 2.15, 1.4), at: V(0.5, 2.05, -1.7), fov: 36 },
      { t: 57.5, pos: V(0.45, 2.1, 0.9), at: V(0.5, 2.05, -1.7), fov: 34 },
    ]),
  };
  const PUNCH = [3.5, 6.6, 15.6, 20.1, 25.0, 35.0, 36.0, 43.5, 45.5, 50.5, 55.0, 56.5];
  const BOOM = [0.0, 6.6, 35.92, 50.48, 55.0];

  return {
    render(t) {
      const seg = segAt(t); let scene, focus = 2, aperture = 0.0015, exposure = 1.0; const rig = [];
      for (const c of CAST) if (c !== sleeper && c !== doctorLie && c !== person) c.group.visible = false;
      switch (seg.n) {
        case 'grave': case 'rows': {
          exposure = 1.25; scene = grave; GY.graves.forEach((g, i) => { g.bell.rotation.z = 0.025 * Math.sin(t * 1.3 + i); });
          focus = seg.n === 'grave' ? cam.position.distanceTo(BELLP) : 6; aperture = seg.n === 'grave' ? 0.003 : 0.001; break;
        }
        case 'inside': {
          scene = inside; const awake = smooth(prog(t, 5.2, 5.5));
          sleeper.rest(); sleeper.idle(t, 0.3); sleeper.face(awake > 0.5 ? 'scared' : 'neutral', { from: 'neutral', k: awake }); sleeper.look(0, 0.5);
          if (awake < 0.5) sleeper.blink(1);
          inside.updateMatrixWorld(true);
          const face = sleeper.headWorld(); const push = env(t, 6.4, 9, 0.35), jitter = Math.sin(t * 17) * 0.025 * push;
          sleeper.reach('L', L(sleeper.joints.chest.localToWorld(V(0.12, 0.25, 0.18)), face.clone().add(V(0.2, 0.35 + jitter, 0.14)), push));
          sleeper.reach('R', L(sleeper.joints.chest.localToWorld(V(-0.12, 0.25, 0.18)), face.clone().add(V(0.2, 0.35 - jitter, -0.14)), push));
          sleeper.grip('L', 0.1); sleeper.grip('R', 0.1);
          IC.crack.intensity = 4 + 1.5 * Math.sin(t * 3);
          focus = cam.position.distanceTo(face); aperture = 0.002; rig.push(rigSleep); exposure = 1.1; break;
        }
        case 'crypt': {
          scene = crypt; put(duke, crypt, 1.2, 0.12, -0.75);
          act(duke, t, [[8.8, 'proud'], [11.4, 'happy'], [15.5, 'smug']], { idle: 0.5, look: t < 11.3 ? [-0.6, 0] : [-0.5, -0.3] });
          gesture(duke, 'L', duke.group.localToWorld(V(0.32, 1.12, 0.38)), env(t, 11.5, 15.4, 0.4), 0.15);   // open hand presenting the coffin
          CR.windowGlow.intensity = 1.6 * env(t, 11.6, 17.4, 0.4);
          CR.candles.forEach((c, i) => { c.userData.light.intensity = 1.4 + 0.25 * Math.sin(t * 12 + i * 2); });
          focus = cam.position.distanceTo(t < 11.2 ? V(-1.9, 1.35, 0.4) : t < 15.5 ? V(0.4, 1.0, -0.5) : CR.keys.position); aperture = 0.0022; rig.push(rigDuke); break;
        }
        case 'doctor': {
          scene = doc;
          const surface = t < 19.84;
          if (surface) { put(doctor, doc, 0.55, 0.45, -0.35); act(doctor, t, [[17.2, 'proud'], [18.6, 'happy']], { idle: 0.5, look: [-0.3, 0] }); gesture(doctor, 'R', doctor.group.localToWorld(V(-0.05, 1.32, 0.22)), env(t, 17.5, 20, 0.4), 0.6); }
          put(helper, doc, -1.0, 0.3, 0.55);
          act(helper, t, [[17.2, 'worried'], [23.0, 'calm']], { idle: 0.5, look: surface ? [0.6, 0] : [0.3, -0.8] });
          act(doctorLie, t, [[17, 'happy']], { idle: 0.2, posture: false }); doctorLie.look(0, 0.4);
          const chewing = env(t, 24.4, 25.9, 0.2); if (chewing > 0) doctorLie.face('happy', { talk: chewing * (0.35 + 0.35 * Math.abs(Math.sin(t * 9))) });
          doc.updateMatrixWorld(true);
          restHands(doctorLie, -0.08, DC.floorY + 0.4);
          // helper pours soup into the funnel (23.0 - 25.6)
          const pour = env(t, 22.9, 25.7, 0.4); bowlD.visible = true;
          bowlD.position.copy(L(helper.group.localToWorld(V(0.0, 1.0, 0.3)), V(-0.42, 0.42, 0.05), pour)); bowlD.rotation.set(0, 0, -1.1 * smooth(prog(t, 23.2, 23.7)) * pour);
          gesture(helper, 'R', bowlD.position.clone().add(V(-0.13, 0.02, 0.04)), 1, 0.85); gesture(helper, 'L', bowlD.position.clone().add(V(-0.05, -0.06, -0.12)), 1, 0.85);
          const sk = prog(t, 23.6, 25.2); DC.soup.visible = t > 23.5 && t < 25.3; if (DC.soup.visible) { const p = DC.tubeCurve.getPoint(clamp(sk * 1.1)); DC.soup.position.copy(p); DC.soup.quaternion.setFromUnitVectors(V(0, 1, 0), DC.tubeCurve.getTangent(clamp(sk * 1.1))); }
          const sg = prog(t, 24.0, 25.3); DC.sausage.visible = t > 23.95 && t < 25.35; if (DC.sausage.visible) { const p = DC.tubeCurve.getPoint(clamp(sg)); DC.sausage.position.copy(p); DC.sausage.quaternion.setFromUnitVectors(V(0, 1, 0), DC.tubeCurve.getTangent(clamp(sg))); }
          focus = cam.position.distanceTo(surface ? doctor.headWorld() : t < 24.1 || t > 25.2 ? doctorLie.headWorld() : bowlD.position); aperture = surface ? 0.002 : 0.0015;
          rig.push(surface ? rigDoc : rigDocLie, rigHelper); break;
        }
        case 'bells': {
          scene = bel; const creepy = t > 35.74; const k = smooth(prog(t, 35.74, 36.4));
          eerie.intensity = 3.2 * k; belUnder.color.set(creepy ? '#7aff9a' : '#9fb0ff'); belUnder.intensity = creepy ? 1.0 : 1.6;
          // the person: asleep, wakes and tugs (33.0 - 34.7); after the portal, the dead body
          const wake = env(t, 33.0, 35.0, 0.3);
          person.rest(); person.idle(t, creepy ? 0 : 0.2);
          if (!creepy) { person.face(wake > 0.3 ? 'worried' : 'neutral', { k: 1 }); if (wake < 0.3) person.blink(1); person.look(0.3, 0.2); person.skinColor('#f0c4a0'); }
          else { person.face('neutral'); person.blink(1); person.skinColor('#c8c8a8'); }
          const swell = creepy ? smooth(prog(t, 38.1, 41.1)) : 0; person.joints.chest.scale.set(1 + 0.22 * swell, 1, 1 + 0.32 * swell); person.joints.neck.scale.set(1 / (1 + 0.22 * swell), 1, 1 / (1 + 0.32 * swell));
          bel.updateMatrixWorld(true);
          const by = BL.floorY + 0.24 + 0.2 + 0.07 * swell;   // resting on the stomach, world-space
          const tug = creepy ? 0.12 * smooth(prog(t, 41.5, 43.2)) : 0.08 * Math.max(0, Math.sin((t - 33.6) * 9)) * env(t, 33.5, 34.8, 0.15);
          restHands(person, -0.08, by - 0.05, tug);
          const hand = person.handWorld('R'); stringBetween(str, hand, pipeBottom);
          const ring = swing(t, 34.95, 1.0, 0.55) + swing(t, 43.4, 3.6, 0.5);
          BL.bell.rotation.z = ring + 0.02 * Math.sin(t * 1.2);
          // guard runs in with a lantern (44.0 - 45.4), stops shocked
          if (creepy && t > 43.6) { const wk = smooth(prog(t, 44.0, 45.4)); put(guard, bel, lerp(-2.3, -0.5, wk), 0.4, Math.PI / 2 - 0.25); act(guard, t, [[43.6, 'worried'], [45.2, 'scared']], { idle: 0.5, look: [0.3, 0] });
            if (wk > 0 && wk < 1) guard.walkDist(1.8 * wk, 0.6, 1); gesture(guard, 'R', guard.group.localToWorld(V(-0.25, 1.05, 0.25)), 1, 0.9); rig.push(rigGuard); }
          focus = cam.position.distanceTo(t < 28.2 || (t > 34.9 && t < 35.8) || t > 43.6 ? BL.bell.getWorldPosition(new THREE.Vector3()) : hand); aperture = 0.0018;
          rig.push(rigPerson); exposure = creepy ? 1.15 : 1.25; break;
        }
        case 'boxing': {
          scene = box; const top = BX.top;
          const saved = smooth(prog(t, 55.2, 55.9));
          put(boxer, box, 0.5, -1.72, 0, top); act(boxer, t, [[52.6, 'sick'], [55.2, 'surprised'], [55.9, 'joy']], { idle: 0.6, look: t < 55.2 ? [0.2, -0.4] : [0, 0.1] });
          boxer.joints.chest.rotation.x -= 0.4 * (1 - saved); boxer.joints.head.rotation.z += 0.3 * Math.sin(t * 2.2) * (1 - saved); boxer.joints.pelvis.position.y = 0.92 - 0.2 * (1 - saved); boxer.joints.kneeL.rotation.x = boxer.joints.kneeR.rotation.x = 0.5 * (1 - saved); boxer.joints.hipL.rotation.x = boxer.joints.hipR.rotation.x = -0.3 * (1 - saved);
          for (const s of ['L', 'R']) gesture(boxer, s, boxer.group.localToWorld(V(s === 'L' ? 0.3 : -0.3, lerp(0.95, 1.55, saved), lerp(0.05, 0.25, saved))), 1, 0.9);
          put(ref, box, -0.55, -1.05, 0.5, top); act(ref, t, [[52.6, 'determined'], [55.2, 'surprised']], { idle: 0.5, look: [0.6, -0.1] });
          const count = t < 55.0 ? Math.max(0, Math.sin((t - 52.8) * Math.PI / 0.9)) : 0;
          gesture(ref, 'R', ref.group.localToWorld(V(-0.2, lerp(1.35, 1.65, count), 0.4)), env(t, 52.6, 55.2, 0.3), 0.6);
          put(keeper, box, -1.2, BX.S / 2 + 0.25, Math.PI, 0); act(keeper, t, [[52.6, 'determined'], [55.6, 'happy']], { idle: 0.4, look: [0, -0.5] });
          keeper.joints.pelvis.position.y = 0.52; keeper.joints.hipL.rotation.x = keeper.joints.hipR.rotation.x = -1.45; keeper.joints.kneeL.rotation.x = keeper.joints.kneeR.rotation.x = 1.45;
          const hits = [55.0, 55.35, 55.7]; let up = 1; for (const h of hits) if (t > h - 0.18 && t < h + 0.15) up = Math.min(up, Math.abs((t - h) / 0.18)); const hm = BX.hammer;
          const gongW = BX.gong.getWorldPosition(new THREE.Vector3()); hm.position.set(0.15 + 0.06, 0.79 + 0.14 + 0.14 * up, 0.0); hm.rotation.set(0, 0, 1.4);
          box.updateMatrixWorld(true); gesture(keeper, 'L', hm.getWorldPosition(new THREE.Vector3()).add(V(0.08, 0.0, 0.0)), 1, 0.9);
          focus = cam.position.distanceTo(t < 54.0 || (t > 54.8 && t < 55.9) ? gongW : boxer.headWorld()); aperture = 0.0022;
          rig.push(rigBoxer, rigRef, rigKeeper); break;
        }
      }
      const c = CAM[seg.n](t);
      let punch = 0; for (const p0 of PUNCH) punch = Math.max(punch, t < p0 ? smooth(prog(t, p0 - 0.12, p0)) : Math.exp(-(t - p0) * 2.4));
      c.fov *= 1 - 0.08 * punch;
      for (const b0 of BOOM) c.pos.add(shake(t, b0, 0.4, 0.03));
      const pos = guardCamera(c.pos.add(drift(t, 0.005, 2)), CAST.filter(x => x.group.visible && x.group.parent === scene), 0.35);
      cam.position.copy(pos); cam.lookAt(c.at); if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
      lensProbe(scene, cam, { min: 0.06 });
      for (const r of rig) r.update(cam);
      for (const [s, p] of P) if (s === scene) p.update(t);
      let fill = 0, fillColor = null, zoom = 0;
      for (const [cc, w, col, z] of PORTALS) { const b = bell(t, cc, w); if (b > fill) { fill = b; fillColor = col; } zoom = Math.max(zoom, b * z); }
      post.render(scene, cam, t, { focus, aperture, zoom, fill: fill * 0.97, fillColor, exposure, sat: 1.15, con: 1.06 });
    },
  };
}
