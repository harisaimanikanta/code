// "The Mummy Medicine Mystery" - follows the user's 100-frame storyboard (panels 1-50 carry the narration).
// One continuous take, 7 environments switched inside portal fills at the narrator's pauses; titles carry the key fact.
import * as THREE from 'three';
import { makeRenderer, makePost, lerp, clamp, prog, smooth, easeInOut, captionsFromLines } from 'kit';
import { particles, drift, bell, guardCamera, env, lensProbe, shots } from '/kit/fx.js';
import { makeToon, speech } from '/kit/toon.js';
import { mood, faceRig } from '/kit/look.js';
import { V, shopSet, rockSet, scriptoriumSet, tombSet, workshopSet, office1924Set, wordSet, hat, turban, beard, bandage } from './sets.js';

const LINES = await (await fetch('/scene/lines.json')).json();
const NUM = [['nineteen twenty-four', '1924'], ['nine hundred', '900'], ['STILL', 'still'], ['ONE', 'one']];
export const duration = 61.88;
export const fps = 30;
export const captions = captionsFromLines(LINES.map(([t, end, text]) => ({ t, end, text: NUM.reduce((s, [a, b]) => s.replace(a, b), text.replace(/\.\.\./g, '')) })));
export const captionStyle = { y: 0.8, size: 0.056 };
const T = (t0, t1, text, sub, o = {}) => ({ t0, t1, text, sub, ...o });
export const titles = []; // user: no top titles
const _titlesUnused = [
  T(0.2, 4.25, 'MUMMY MEDICINE', 'ground up + swallowed', { color: '#7a3a1a' }),
  T(4.67, 8.5, 'SOLD IN EUROPE', 'for centuries', { color: '#7a3a1a' }),
  T(8.6, 11.4, 'BRUISES · COUGHS · SEIZURES', '', { size: 0.05, color: '#7a3a1a' }),
  T(11.8, 14.3, 'BUT WAIT…', 'nobody planned to eat the dead', { color: '#3a3a4a' }),
  T(14.73, 17.25, 'MUMIA', 'the medicine they really wanted', { color: '#1a1410' }),
  T(17.57, 20.55, 'BLACK TAR', 'that oozes out of rocks', { color: '#1a1410' }),
  T(20.91, 23.8, 'PERSIAN DOCTORS', 'used it on wounds + broken bones', { size: 0.06, color: '#2a6a6a' }),
  T(24.14, 26.1, '~900 YEARS AGO', '', { color: '#3a4f8a' }),
  T(26.28, 29.55, 'TRANSLATED INTO LATIN', 'and they made a mistake', { size: 0.06, color: '#3a4f8a' }),
  T(29.94, 33.55, '"MUMIA = FROM BODIES"', 'what the books now said', { size: 0.058, color: '#b3261e' }),
  T(33.95, 37.75, 'BLACK, STICKY RESIN', 'on some mummies too', { color: '#1a1410' }),
  T(38.17, 40.82, 'EUROPE ATE THE BODIES', '', { size: 0.06, color: '#7a1e14' }),
  T(41.19, 46.28, 'FAKE MUMMIES', 'made from fresh corpses', { color: '#7a1e14' }),
  T(46.62, 50.05, '1924', 'a German drug company still sold it', { color: '#2a4a3a' }),
  T(50.09, 53.6, 'ONE WRONG WORD', '', { color: '#b3261e' }),
  T(53.97, 57.05, 'IT WAS ROCK TAR', 'all along', { color: '#1a1410' }),
  T(57.41, 58.4, 'MUMMY?', '', { color: '#3a3a4a' }),
  T(58.77, 61.85, 'MUMMY = THE MEDICINE', 'not the body', { size: 0.058, color: '#7a3a1a' }),
];
// portals at pauses: [centre, half-width, fill colour, zoom]
const PORTALS = [[14.53, 0.17, '#1a0e06', 0.35], [23.98, 0.15, '#f2c890', 0.3], [33.77, 0.17, '#0e0a06', 0.3], [41.02, 0.16, '#050302', 0.3], [46.46, 0.15, '#f4ecd8', 0.3], [51.15, 0.2, '#1a0e06', 0.35]];
const SEG = [['shop', 0, 14.53], ['rock', 14.53, 23.98], ['script', 23.98, 33.77], ['tomb', 33.77, 41.02], ['fake', 41.02, 46.46], ['office', 46.46, 51.15], ['word', 51.15, 61.9]].map(([n, s, e]) => ({ n, s, e }));
const segAt = t => SEG.find(x => t >= x.s && t < x.e) || SEG[SEG.length - 1];
const L = (a, b, k) => a.clone().lerp(b, clamp(k));
function emoAt(track, t) { let i = 0; while (i + 1 < track.length && t >= track[i + 1][0]) i++; return { from: track[Math.max(0, i - 1)][1], to: track[i][1], k: i ? smooth((t - track[i][0]) / 0.45) : 1 }; }
function act(c, t, track, { idle = 1, look = null, posture = true } = {}) { const e = emoAt(track, t); c.rest(); if (posture) c.posture(e.to, e.k * 0.5); c.idle(t, idle); c.face(e.to, { from: e.from, k: e.k }); c.look(...(look || [null])); return e; }
const put = (c, scene, x, z, ry = 0) => { if (c.group.parent !== scene) scene.add(c.group); c.group.visible = true; c.group.position.set(x, 0, z); c.group.rotation.set(0, ry, 0); };
const gesture = (c, side, target, w, grip = null) => { if (w <= 0.001) return; c.reach(side, L(c.handWorld(side), target, w)); if (grip != null) c.grip(side, lerp(0.25, grip, w)); };
const sit = (c, h = 0.52, knee = 1.45) => { const J = c.joints; J.pelvis.position.y = h; J.hipL.rotation.x = J.hipR.rotation.x = -1.45; J.kneeL.rotation.x = J.kneeR.rotation.x = knee; };
const wear = (c, obj, y = 0.72, z = -0.05, s = 1.55) => { c.head.add(obj); obj.position.set(0, c.HR * y, c.HR * z); obj.scale.setScalar(s); return obj; };

export async function setup({ canvas, width, height }) {
  const renderer = makeRenderer(canvas, width, height); renderer.toneMappingExposure = 0.95;
  const post = makePost(renderer, width, height, { ao: false, bloom: 0, grain: 0.025, vignette: 0.42 });
  const cam = new THREE.PerspectiveCamera(40, width / height, 0.02, 200);
  const S = {}; const P = [];
  const mk = (n, m, o) => { const s = new THREE.Scene(); S[n] = s; s.userData.mood = mood(s, m, o); return s; };
  const addP = (scene, o) => { const p = particles(o); p.setScale(height); scene.add(p.points); P.push([scene, p]); return p; };

  // ---- cast (normal people act subtly; the faker is menacing by design)
  const apo = makeToon({ acting: 0.5, shirt: '#e8dcc0', coat: '#5a3a22', pants: '#3a2a20', hair: '#3a2618', hairStyle: 'side', moustache: true, eye: '#5a3b20', skin: '#e8b796', build: 1.05 });
  wear(apo, hat({ color: '#241c18' }));
  const patient = makeToon({ acting: 0.5, shirt: '#8aa0b8', pants: '#5a4a3a', hair: '#8a5a30', hairStyle: 'tuft', skin: '#ead0b4', eye: '#4a6a8a' });
  const doctor = makeToon({ acting: 0.5, shirt: '#2a6a6a', coat: '#e8dcc0', pants: '#e8dcc0', hair: '#1a1410', hairStyle: 'none', skin: '#c48a5e', eye: '#3a2a1a', brows: '#1a1410' });
  wear(doctor, turban('#f2ecdf'), 0.55, -0.05, 1.45); const db = beard('#2a1c14', 1); doctor.head.add(db); db.position.set(0, -doctor.HR * 0.62, doctor.HR * 0.42);
  const hurt = makeToon({ acting: 0.5, shirt: '#c8743a', pants: '#e8dcc0', hair: '#1a1410', hairStyle: 'curly', skin: '#b87a50', eye: '#3a2a1a' });
  const monk = makeToon({ acting: 0.45, hood: '#5a4030', skin: '#e8b796', shirt: '#5a4030', pants: '#5a4030', hairStyle: 'none', eye: '#4a5a6a', brows: '#6a4a30' });
  const trader = makeToon({ acting: 0.5, shirt: '#f2ecdf', coat: '#8a6a3a', pants: '#6a5a40', hair: '#6a4a2a', hairStyle: 'side', moustache: true, skin: '#f0c09a', eye: '#4a6a8a' });
  wear(trader, hat({ color: '#d8c8a0', brim: 0.26, h: 0.12 }));
  const faker = makeToon({ acting: 1, catchlights: false, hood: '#16120f', skin: '#2a221c', shirt: '#1a1612', pants: '#1a1612', shoes: '#0c0c0c', hairStyle: 'none', eye: '#2a2a2a', lips: '#2a221c', brows: '#0c0d12', build: 1.1 });
  faker.mats.eye.color.set('#d8d0c0');
  const clerk = makeToon({ acting: 0.5, shirt: '#f4f2ea', coat: '#2a3a4a', tie: '#7a2a2a', pants: '#2a3a4a', hair: '#2a1c12', hairStyle: 'side', glasses: true, skin: '#f0c4a0', eye: '#4a5a3a' });
  const CAST = [apo, patient, doctor, hurt, monk, trader, faker, clerk];
  const sling = bandage();

  // ---- sets
  const shop = mk('shop', 'interior'); const SH = shopSet(shop); shop.userData.mood.focus(V(0, 1, 0), 4);
  addP(shop, { count: 180, center: [0, 1.6, -0.5], box: [4, 2, 3], size: 0.007, color: '#ffe2b0', opacity: 0.5, motion: 'float', speed: 0.12, seed: 3 });
  const rigApo = faceRig(shop, apo), rigPat = faceRig(shop, patient);
  const rock = mk('rock', 'golden'); const RK = rockSet(rock); rock.userData.mood.focus(V(0.5, 0, 0), 5);
  addP(rock, { count: 120, center: [0.5, 1.2, 0], box: [4, 2, 3], size: 0.008, color: '#ffe0a8', opacity: 0.45, motion: 'float', speed: 0.2, seed: 5 });
  const rigDoc = faceRig(rock, doctor), rigHurt = faceRig(rock, hurt); rock.add(sling);
  const scr = mk('script', 'night', { sky: false }); scr.background = new THREE.Color('#120e0c'); const SC = scriptoriumSet(scr); scr.userData.mood.focus(V(0, 1, 0), 4);
  scr.userData.mood.key.intensity = 0.6; scr.userData.mood.hemi.intensity = 0.35;
  addP(scr, { count: 160, center: [0.6, 1.5, -0.6], box: [2.5, 2, 2.5], size: 0.007, color: '#fff2d0', opacity: 0.55, motion: 'float', speed: 0.1, seed: 7 });
  const rigMonk = faceRig(scr, monk, { key: '#ffd8a0' });
  const tomb = mk('tomb', 'drama'); const TB = tombSet(tomb); tomb.userData.mood.focus(V(0, 0.8, 0), 5); tomb.userData.mood.rim.color.set('#ff9a4a');
  addP(tomb, { count: 200, center: [0, 1.3, 0], box: [5, 2.4, 5], size: 0.008, color: '#ffcf90', opacity: 0.5, motion: 'float', speed: 0.1, seed: 9 });
  const rigTrader = faceRig(tomb, trader);
  const fake = mk('fake', 'drama'); const FK = workshopSet(fake); fake.userData.mood.focus(V(0, 1, 0), 4); fake.userData.mood.rim.color.set('#ff3a2a');
  const rigFaker = faceRig(fake, faker, { key: '#ffb080', keyY: -0.35, rim: '#ff3a2a', keyI: 1.2 });
  addP(fake, { count: 120, center: [0, 1.4, 0], box: [3, 2, 3], size: 0.007, color: '#ffb080', opacity: 0.4, motion: 'float', speed: 0.08, seed: 11 });
  const off = mk('office', 'interior'); const OF = office1924Set(off); off.userData.mood.focus(V(0, 1, 0), 4);
  const rigClerk = faceRig(off, clerk);
  const word = mk('word', 'interior'); const WD = wordSet(word); word.userData.mood.focus(V(0, 1, 0), 4); word.userData.mood.key.intensity = 2.0;
  addP(word, { count: 180, center: [0, 1.5, 0], box: [3, 2, 2.5], size: 0.007, color: '#ffe2b0', opacity: 0.5, motion: 'float', speed: 0.1, seed: 13 });
  const rigApo2 = faceRig(word, apo);

  // ---- camera per environment (chained shots: every move starts where the last ended)
  const CAM = {
    shop: shots([
      { t: 0, pos: V(0.6, 1.75, 3.5), at: V(-0.1, 1.35, -0.3), fov: 38 },
      { t: 3.9, pos: V(0.05, 1.62, 1.75), at: V(-0.2, 1.3, -0.25), fov: 36 },
      { t: 5.2, pos: V(0.1, 1.62, 1.8), at: V(0.05, 1.32, -0.2), fov: 36 },
      { t: 8.4, pos: V(1.1, 1.62, 2.75), at: V(0.95, 1.25, 0.05), fov: 40 },
      { t: 11.4, pos: V(1.25, 1.6, 2.7), at: V(1.15, 1.2, 0.2), fov: 40 },
      { t: 14.5, pos: V(-0.6, 1.8, 1.4), at: V(-2.1, 0.95, -1.15), fov: 38 },
    ]),
    rock: shots([
      { t: 14.5, pos: V(0.0, 1.35, 1.5), at: V(0.05, 1.15, -0.65), fov: 40 },
      { t: 17.4, pos: V(0.1, 1.2, 1.0), at: V(0.1, 0.98, -0.6), fov: 40 },
      { t: 20.3, pos: V(0.15, 1.15, 0.85), at: V(0.12, 0.95, -0.6), fov: 40 },
      { t: 21.5, pos: V(0.4, 1.75, 3.4), at: V(1.05, 1.3, 0.3), fov: 38 },
      { t: 24.0, pos: V(0.6, 1.75, 3.6), at: V(1.1, 1.25, 0.3), fov: 38 },
    ]),
    script: shots([
      { t: 23.95, pos: V(1.3, 1.65, 2.3), at: V(0, 1.15, -0.2), fov: 38 },
      { t: 26.6, pos: V(0.35, 1.6, 1.05), at: V(0.05, 1.05, -0.1), fov: 36 },
      { t: 29.6, pos: V(0.25, 1.45, 0.7), at: V(0.12, 0.9, 0.08), fov: 34 },
      { t: 33.8, pos: V(0.2, 1.3, 0.6), at: V(0.14, 0.9, 0.08), fov: 32 },
    ]),
    tomb: shots([
      { t: 33.75, pos: V(-1.5, 1.9, 1.6), at: V(-0.4, 0.8, -0.4), fov: 38 },
      { t: 37.6, pos: V(0.6, 1.8, 1.4), at: V(0.4, 0.8, -0.4), fov: 36 },
      { t: 38.6, pos: V(1.0, 1.7, 3.6), at: V(1.55, 1.1, 1.0), fov: 40 },
      { t: 41.0, pos: V(1.15, 1.65, 3.4), at: V(1.55, 1.1, 1.0), fov: 40 },
    ]),
    fake: shots([
      { t: 41.0, pos: V(1.3, 1.1, 2.2), at: V(-0.1, 1.15, -0.2), fov: 40 },
      { t: 46.5, pos: V(0.55, 1.35, 1.45), at: V(-0.15, 1.2, -0.3), fov: 36 },
    ]),
    office: shots([
      { t: 46.45, pos: V(-0.2, 1.38, 0.78), at: V(-0.2, 1.02, 0.33), fov: 34 },
      { t: 48.4, pos: V(0.4, 1.6, 1.9), at: V(0.2, 1.3, -0.1), fov: 38 },
      { t: 51.2, pos: V(0.55, 1.6, 1.65), at: V(0.25, 1.35, -0.2), fov: 36 },
    ]),
    word: shots([
      { t: 51.1, pos: V(0.0, 1.9, 2.4), at: V(0.0, 1.3, 0.0), fov: 38 },
      { t: 53.7, pos: V(0.0, 1.72, 1.75), at: V(0.0, 1.22, 0.05), fov: 36 },
      { t: 54.6, pos: V(-0.45, 1.5, 1.15), at: V(-0.75, 1.02, 0.25), fov: 34 },
      { t: 57.1, pos: V(-0.4, 1.48, 1.1), at: V(-0.75, 1.02, 0.25), fov: 34 },
      { t: 58.4, pos: V(0.0, 1.85, 2.3), at: V(0.0, 1.25, 0.05), fov: 36 },
      { t: 61.9, pos: V(0.0, 1.8, 2.1), at: V(0.0, 1.25, 0.05), fov: 36 },
    ]),
  };

  return {
    render(t) {
      const seg = segAt(t); let scene, focus = 2, aperture = 0.0015; const rig = []; let exposure = 0.95;
      for (const c of CAST) c.group.visible = false;
      switch (seg.n) {
        case 'shop': {
          scene = shop; put(apo, shop, -0.15, -0.5, 0); put(patient, shop, 1.55, 0.35, -Math.PI / 2 + 0.2);
          act(apo, t, [[0, 'calm'], [4.6, 'proud'], [8.6, 'calm'], [11.8, 'worried'], [12.8, 'thinking']], { idle: 0.6, look: t < 4.4 ? [0.1, -0.6] : t < 8.5 ? [0.3, 0] : t < 11.7 ? [0.7, -0.1] : [-0.8, -0.2] });
          act(patient, t, [[0, 'sick'], [10.4, 'disgust'], [11.6, 'sick']], { idle: 0.8, look: t < 8.6 ? [0, -0.3] : [0.4, 0.05] });
          sit(patient, 0.55); patient.group.position.y = 0;
          const cough = Math.max(0, Math.sin(t * 9)) * (env(t, 1.0, 2.2, 0.3) + env(t, 6.0, 7.0, 0.3)) * 0.18; patient.joints.chest.rotation.x += cough; patient.joints.head.rotation.x += cough * 0.6;
          gesture(patient, 'R', patient.headWorld().add(V(0.0, -0.12, 0.12)), env(t, 0.9, 2.4, 0.35) + env(t, 5.9, 7.2, 0.35), 0.9);   // hand to mouth when coughing
          // grinding: pestle circles in the mortar
          const mp = SH.mort.position, g0 = env(t, 0.0, 4.4, 0.3), ang = t * 5.5;
          const pest = SH.mort.userData.pestle; pest.position.set(Math.cos(ang) * 0.04 * g0, 0.05, Math.sin(ang) * 0.04 * g0); pest.rotation.set(Math.sin(ang) * 0.25 * g0, 0, -0.35 * g0 + Math.cos(ang) * 0.2 * g0);
          gesture(apo, 'L', SH.mort.localToWorld(pest.position.clone().add(V(-0.06, 0.2, 0))), g0, 0.9);
          gesture(apo, 'R', mp.clone().add(V(0.13, 0.12, 0.02)), g0, 0.6);
          // lift the MUMMY POWDER jar (4.6 - 8.4), then spoon a dose to the patient (8.6 - 11.4)
          const lift = env(t, 4.7, 8.5, 0.45), jHome = V(0.6, SH.top, 0.05);
          SH.hero.position.copy(L(jHome, V(0.35, SH.top + 0.3, 0.0), lift)); SH.hero.rotation.z = -0.15 * lift;
          gesture(apo, 'L', SH.hero.position.clone().add(V(0.11, 0.16, 0.02)), lift, 0.9); gesture(apo, 'R', SH.hero.position.clone().add(V(-0.11, 0.16, 0.02)), lift, 0.9);
          const dose = env(t, 8.6, 11.5, 0.5), sHome = V(0.35, SH.top + 0.01, 0.35), sTo = patient.mouthWorld().add(V(-0.12, -0.03, 0.0));
          const sp = L(sHome, sTo, dose); SH.spoon.position.copy(sp); SH.spoon.rotation.set(L(V(Math.PI / 2, 0, 0.4), V(0.2, 0, 1.45), dose).x, 0, lerp(0.4, 1.45, dose));
          gesture(apo, 'L', sp.clone().add(V(-0.12, -0.02, 0)), dose, 0.85);
          // stop + look at the mummy (11.8 - 14.3)
          const stop = env(t, 11.8, 15, 0.5); apo.joints.head.rotation.y += -0.6 * stop; apo.joints.chest.rotation.y += -0.2 * stop;
          SH.candles.forEach((c, i) => { c.userData.light.intensity = 1.4 + 0.25 * Math.sin(t * 13 + i * 2) + 0.15 * Math.sin(t * 29 + i); });
          focus = cam.position.distanceTo(t < 4.4 ? SH.mort.position : t < 8.5 ? SH.hero.position : t < 11.6 ? patient.headWorld() : V(-2.2, 1.0, -1.15)); aperture = 0.002;
          rig.push(rigApo, rigPat); break;
        }
        case 'rock': {
          scene = rock;
          const turn = smooth(prog(t, 20.5, 21.3));
          const wk = smooth(prog(t, 20.4, 21.6)); put(doctor, rock, lerp(0.6, 0.75, wk), lerp(-0.4, 0.05, wk), lerp(-Math.PI / 2 - 0.2, 0.97, turn)); if (wk > 0 && wk < 1) doctor.walkDist(0.45 * wk, 0.6, 0.8);
          put(hurt, rock, 1.55, 0.6, -Math.PI / 2 - 0.4);
          act(doctor, t, [[14.5, 'calm'], [17.6, 'happy'], [20.9, 'calm']], { idle: 0.6, look: t < 20.6 ? [-0.2, -0.3] : [0.3, -0.35] });
          act(hurt, t, [[14.5, 'worried'], [21.8, 'calm']], { idle: 0.6, look: [0.3, -0.2] });
          sit(hurt, 0.2, 0.25);
          // tar oozes: drips slide down the crack and fall into the bowl
          RK.rock.drips.forEach((d, i) => { const ph = ((t * 0.35 + i / 3) % 1); d.position.set(0.04 - i * 0.03, lerp(1.7, 0.55, ph), lerp(0.5, 0.62, ph)); d.scale.set(1, 1.3 + ph, 1); });
          // doctor catches tar in a bowl (14.6-20.7), then dabs it on the man's broken arm (20.9-23.9)
          const hold = env(t, 14.6, 20.8, 0.4), bw = RK.bowl;
          const catchP = V(0.18, 0.92, -0.5), rest = V(0.6, 0.02, 0.35);
          bw.position.copy(L(rest, catchP, hold));
          gesture(doctor, 'R', bw.position.clone().add(V(0.12, 0.04, 0.05)), hold, 0.85); gesture(doctor, 'L', bw.position.clone().add(V(-0.12, 0.04, 0.05)), hold, 0.85);
          const arm = hurt.group.localToWorld(V(0.05, 0.62, 0.42));
          hurt.reach('R', arm); hurt.grip('R', 0.3);
          const ew = new THREE.Vector3(); hurt.joints.elbowR.getWorldPosition(ew); const ww = hurt.handWorld('R');
          sling.position.copy(ew.clone().lerp(ww, 0.5)); sling.quaternion.setFromUnitVectors(V(0, 1, 0), ww.clone().sub(ew).normalize());
          const dab = env(t, 21.0, 23.9, 0.4); gesture(doctor, 'L', sling.position.clone().add(V(Math.sin(t * 6) * 0.03, 0.06, 0.02)), dab, 0.6);
          focus = cam.position.distanceTo(t < 17.4 ? V(0.05, 1.1, -0.75) : t < 20.6 ? bw.position : doctor.headWorld()); aperture = 0.0025;
          rig.push(rigDoc, rigHurt); break;
        }
        case 'script': {
          scene = scr; put(monk, scr, 0.0, -0.62, 0);
          act(monk, t, [[23.9, 'calm'], [26.3, 'thinking'], [29.9, 'calm']], { idle: 0.5, look: [0.1, -0.85] });
          monk.joints.chest.rotation.x += 0.28; monk.joints.head.rotation.x += 0.25;
          const p = clamp(prog(t, 26.4, 33.4)); SC.drawRight(p);
          // quill writes across the right page
          const pageC = SC.book.localToWorld(V(0.14, 0.07, 0)), wob = V(Math.sin(t * 9) * 0.03, 0.06 + Math.abs(Math.sin(t * 14)) * 0.01, Math.cos(t * 4) * 0.04 - 0.02);
          const write = env(t, 26.3, 34, 0.4), qp = L(V(0.42, SC.top + 0.12, 0.12), pageC.clone().add(wob), write);
          SC.quill.position.copy(qp); SC.quill.rotation.set(-0.3, 0, -0.5);
          gesture(monk, 'L', qp.clone().add(V(0.0, 0.03, -0.02)), Math.max(write, 0.2), 0.85);
          gesture(monk, 'R', SC.book.localToWorld(V(-0.15, 0.08, 0.05)), env(t, 24.0, 34, 0.4), 0.3);
          SC.candles.forEach((c, i) => { c.userData.light.intensity = 1.5 + 0.25 * Math.sin(t * 12 + i * 3) + 0.1 * Math.sin(t * 31 + i); });
          focus = cam.position.distanceTo(t < 26.3 ? monk.headWorld() : SC.book.position); aperture = 0.0025;
          rig.push(rigMonk); break;
        }
        case 'tomb': {
          scene = tomb; put(trader, tomb, 1.75, 1.0, -0.35);
          act(trader, t, [[33.7, 'smug'], [38.2, 'happy']], { idle: 0.6, look: t < 38 ? [-0.4, -0.2] : [-0.2, -0.5] });
          const tap = env(t, 38.3, 41.2, 0.4); gesture(trader, 'L', TB.packMummy.localToWorld(V(0.75, 0.3, 0.0)), tap, 0.6);
          gesture(trader, 'R', trader.group.localToWorld(V(-0.18, 1.05, 0.2)), 1, 0.8);
          TB.torches.forEach((o, i) => { const f = 0.85 + 0.15 * Math.sin(t * 11 + i * 2) + 0.07 * Math.sin(t * 23 + i); o.l.intensity = 3.5 * f; o.f.scale.set(1, 1.7 * f, 1); });
          // resin glint travels along the body
          focus = cam.position.distanceTo(t < 38 ? V(lerp(-0.6, 0.45, prog(t, 33.8, 37.9)), 0.85, -0.4) : TB.packMummy.position); aperture = 0.003;
          rig.push(rigTrader); break;
        }
        case 'fake': {
          scene = fake; put(faker, fake, -0.1, -0.62, 0);
          act(faker, t, [[41, 'menacing']], { idle: 0.4, look: [0.1, -0.7], posture: false });
          faker.joints.chest.rotation.x += 0.3; faker.joints.head.rotation.x += 0.2;
          // wrapping: the bandage roll circles the body, moving from feet to head
          const k = prog(t, 41.2, 46.4), x = lerp(0.1, -0.55, k), a = t * 6.5;
          FK.roll.position.set(x, 1.02 + Math.sin(a) * 0.1, Math.cos(a) * 0.14 + 0.02);
          gesture(faker, 'L', FK.roll.position.clone().add(V(0.06, 0.06, 0.06)), env(t, 41.1, 47, 0.35), 0.85);
          gesture(faker, 'R', V(x - 0.2, 1.02, 0.12), env(t, 41.1, 47, 0.35), 0.6);
          focus = cam.position.distanceTo(faker.headWorld()); aperture = 0.0025;
          rig.push(rigFaker); exposure = 0.9; break;
        }
        case 'office': {
          scene = off; put(clerk, off, 0.0, -0.45, 0);
          act(clerk, t, [[46.4, 'calm'], [48.2, 'proud']], { idle: 0.5, look: t < 48.2 ? [-0.3, -0.7] : [0.05, 0.05] });
          const offer = env(t, 48.0, 52, 0.5); OF.hero.position.copy(L(V(0.45, OF.top, 0.3), V(0.15, OF.top + 0.22, 0.32), offer));
          gesture(clerk, 'L', OF.hero.position.clone().add(V(0.11, 0.14, 0.0)), offer, 0.9); gesture(clerk, 'R', OF.hero.position.clone().add(V(-0.11, 0.14, 0.0)), offer, 0.9);
          focus = cam.position.distanceTo(t < 48.2 ? OF.paper.position : clerk.headWorld()); aperture = 0.002;
          rig.push(rigClerk); break;
        }
        case 'word': {
          scene = word; put(apo, word, 0.0, -0.75, 0);
          act(apo, t, [[51.1, 'thinking'], [54.0, 'surprised'], [55.6, 'thinking'], [58.8, 'surprised'], [60.0, 'happy']], { idle: 0.5, look: t < 54 ? [0, -0.6] : t < 57.2 ? [-0.6, -0.6] : [0, -0.6] });
          apo.joints.chest.rotation.x += 0.12;
          const strike = smooth(prog(t, 51.6, 52.6)) * (1 - smooth(prog(t, 58.6, 59.0))); const morph = smooth(prog(t, 58.8, 60.2));
          WD.draw(morph, strike);
          // a drop of tar falls into the bowl on "rock tar"
          const fall = prog(t, 55.2, 56.0); WD.drop.visible = t > 54.6 && t < 56.05; WD.drop.position.set(-0.75, lerp(WD.top + 0.9, WD.top + 0.08, fall * fall), 0.25);
          WD.tarBowl.userData.tar.position.y = 0.0156 + 0.052 + (t > 56 ? 0.004 * Math.exp(-(t - 56) * 3) * Math.sin((t - 56) * 30) : 0);
          gesture(apo, 'R', WD.sheet.position.clone().add(V(0.25, 0.12, 0.05)), env(t, 51.3, 53.8, 0.4), 0.3);
          gesture(apo, 'L', WD.tarBowl.position.clone().add(V(0.12, 0.25, 0.0)), env(t, 54.0, 57.3, 0.4), 0.4);
          focus = cam.position.distanceTo(t > 54.5 && t < 57.2 ? WD.tarBowl.position : WD.sheet.position); aperture = 0.0025;
          rig.push(rigApo2); break;
        }
      }
      const c = CAM[seg.n](t);
      const pos = guardCamera(c.pos.add(drift(t, 0.006, 2)), CAST.filter(x => x.group.parent === scene && x.group.visible), 0.4);
      cam.position.copy(pos); cam.lookAt(c.at); if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
      lensProbe(scene, cam, { min: 0.08 });
      for (const r of rig) r.update(cam);
      for (const [s, p] of P) if (s === scene) p.update(t);
      let fill = 0, fillColor = null, zoom = 0;
      for (const [cc, w, col, z] of PORTALS) { const b = bell(t, cc, w); if (b > fill) { fill = b; fillColor = col; } zoom = Math.max(zoom, b * z); }
      post.render(scene, cam, t, { focus, aperture, zoom, fill: fill * 0.97, fillColor, exposure, sat: 1.15, con: 1.05 });
    },
  };
}
