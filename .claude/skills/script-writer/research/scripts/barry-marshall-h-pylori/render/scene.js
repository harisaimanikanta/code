// "The Doctor Who Drank the Cure" - full render (87.7 s, timed to voiceover.mp3 via word-timings.json).
// Render: node <shorts-renderer>/scripts/render.mjs scene.js out/barry-marshall.mp4 --audio voiceover.mp3
import * as THREE from 'three';
import { makeRenderer, makePost, useHDRI, aim, lerp, clamp, prog, smooth, easeInOut, easeOut, easeIn, captionsFromLines, label } from 'kit';
import { makeHuman } from '/kit/human.js';
import { labSet, flask, deskSet, barnSet, microSet, spiralBug } from './sets.js';
import { citySet, hallSet, boardTexture, studioSet, tunnelSet, slideSet, eyepieceMask, typewriter, barChart, calendar, wallClock, journalTexture, confetti, pill, phys, mesh, boxM, textTex } from './sets2.js';

export const duration = 87.72;
export const fps = 30;
const L = (t, end, text) => ({ t, end, text });
export const captions = captionsFromLines([
  L(0.06, 3.4, 'He drank a broth full of LIVE stomach bacteria?'), L(3.81, 4.9, 'On purpose?'), L(5.23, 6.6, 'To win an argument?'),
  L(7.0, 10.3, "You see, it's the early 1980s in Perth, Australia."), L(10.61, 15.0, 'Barry Marshall is a young doctor with a theory almost nobody takes seriously.'),
  L(15.33, 18.5, 'Doctors are taught that ulcers come from stress and acid...'), L(18.64, 21.0, 'And that NOTHING can live inside a stomach anyway.'),
  L(21.3, 26.3, 'But his colleague, a pathologist named Robin Warren, keeps finding something strange.'), L(26.57, 28.5, 'Tiny spiral bacteria...'),
  L(28.66, 30.6, "Inside sick patients' stomachs."), L(30.87, 34.5, "So they send their findings to Australia's big gut-doctor conference."),
  L(34.93, 35.7, 'Rejected.'), L(35.96, 37.9, 'Ranked in the bottom ten percent.'), L(38.23, 40.5, 'Marshall tries to infect piglets to prove it.'),
  L(40.63, 42.1, "But the piglets won't get sick."), L(42.38, 43.0, 'So...'), L(43.23, 44.7, 'He becomes the piglet.'),
  L(45.02, 47.5, 'A camera down his throat shows a healthy stomach.'), L(47.75, 48.2, 'Then...'), L(48.3, 49.8, 'He drinks the bacteria.'),
  L(50.12, 51.7, "Days later, he's vomiting."), L(51.92, 53.25, 'His breath is foul.'), L(53.51, 54.4, 'Another camera.'),
  L(54.57, 56.2, 'His stomach lining is inflamed...'), L(56.2, 58.95, 'And crawling with the SAME spiral bacteria.'),
  L(59.34, 62.5, "He'd caught the infection the experts said couldn't exist."), L(62.85, 64.1, 'Twenty-one years later...'),
  L(64.21, 66.3, 'He and Warren win the Nobel Prize.'), L(66.59, 68.5, "But here's the really fascinating part."), L(68.69, 69.55, "The bug's trick?"),
  L(69.78, 70.85, 'It makes ammonia.'), L(71.16, 73.52, 'A tiny cloud of antacid around itself...'), L(73.52, 76.15, "And hides in the mucus where acid can't reach."),
  L(76.44, 78.3, 'Antacids only hid the pain.'), L(78.5, 80.6, 'Antibiotics clear the infection.'), L(80.93, 82.3, 'And the paper where he proved it?'),
  L(82.5, 84.0, 'He wrote it in the third person.'), L(84.37, 86.0, 'He was too embarrassed to admit...'), L(86.17, 87.6, 'The patient was HIM.'),
]);

// shot boundaries (cut slightly before each line so the picture leads the word)
const SHOTS = [
  ['hook', 0, 3.6], ['purpose', 3.6, 5.1], ['argument', 5.1, 6.85], ['perth', 6.85, 10.5], ['corridor', 10.5, 15.2], ['lecture', 15.2, 18.5],
  ['acid', 18.5, 21.15], ['warren', 21.15, 26.45], ['slide', 26.45, 30.75], ['send', 30.75, 34.8], ['rejected', 34.8, 35.85], ['chart', 35.85, 38.1],
  ['barn1', 38.1, 40.55], ['barn2', 40.55, 42.25], ['becomes', 42.25, 44.9], ['scope', 44.9, 47.65], ['drink', 47.65, 50.0], ['sick', 50.0, 53.4],
  ['inflamed', 53.4, 59.2], ['caught', 59.2, 62.7], ['nobel', 62.7, 66.45], ['product', 66.45, 69.65], ['ammonia', 69.65, 76.3], ['pills', 76.3, 80.8],
  ['journal', 80.8, 84.25], ['embarrassed', 84.25, 87.73],
].map(([name, start, end]) => ({ name, start, end }));
const shotAt = t => SHOTS.find(s => t >= s.start && t < s.end) || SHOTS[SHOTS.length - 1];

// pose helper (degrees) for mannequin-based humans
function pose(h, o) {
  const M = h.m;
  for (const [k, v] of Object.entries(o)) {
    const [part, prop] = k.split('.');
    if (M[part] && prop in M[part]) M[part][prop] = v;
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const handPos = (h, side = 'r') => { h.group.updateMatrixWorld(true); return h.m[side + '_wrist'].localToWorld(new THREE.Vector3(0, 0, 0)); };

export async function setup({ canvas, width, height }) {
  const renderer = makeRenderer(canvas, width, height);
  const post = makePost(renderer, width, height, { bloom: 0.22, grain: 0.035, vignette: 0.38 });
  const cam = new THREE.PerspectiveCamera(35, width / height, 0.02, 400);
  const S = {};
  const mk = async (name, fn, hdri, opt) => { const s = new THREE.Scene(); const r = await fn(s); if (hdri) await useHDRI(renderer, s, hdri, opt); S[name] = s; return r; };

  // ---------- cast ----------
  const doc = (o = {}) => makeHuman({ coat: '#f3f3ef', shirt: '#7e9fd6', tie: '#8a1f1f', hair: '#5a3a22', hairStyle: 'short', skin: '#dba483', ...o });
  const war = (o = {}) => makeHuman({ coat: '#f3f3ef', shirt: '#d9dfe8', hair: '#c9c9c9', hairStyle: 'side', glasses: true, moustache: true, skin: '#e3b494', trousers: '#5a5f69', ...o });
  const suit = (o = {}) => makeHuman({ shirt: '#3a3d4a', trousers: '#2b2d36', hairStyle: 'bald', hair: '#777', glasses: true, tie: '#1f3f7a', skin: '#d6a07c', ...o });

  // ---------- LAB night (hook / purpose / argument / drink) ----------
  const labN = await mk('labN', s => labSet(s, { night: true }), 'apartment', { intensity: 0.25 });
  const M1 = doc(); M1.group.position.set(0.25, 0, 0.35); S.labN.add(M1.group);
  const W1 = war(); W1.group.position.set(-1.9, 0, -0.9); W1.group.rotation.y = 0.7; S.labN.add(W1.group);
  const F1 = flask(); S.labN.add(F1.group);
  const clockN = wallClock(); clockN.group.position.set(-2.1, 2.5, -1.53); S.labN.add(clockN.group);
  // ---------- LAB day (warren microscope / sick / caught) ----------
  const labD = await mk('labD', s => labSet(s, { night: false }), 'lab', { intensity: 0.75 });
  const W2 = war(); W2.group.position.set(1.3, 0, 0.15); W2.group.rotation.y = Math.PI; S.labD.add(W2.group);
  const M2 = doc(); M2.group.position.set(-0.4, 0, 0.6); S.labD.add(M2.group);
  const cal = calendar(); cal.mesh.position.set(-0.3, 1.6, -1.53); S.labD.add(cal.mesh);
  const bucket = mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.24, 32, 1, true), phys('#8a96a6', { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })); S.labD.add(bucket);
  const printout = mesh(new THREE.PlaneGeometry(0.32, 0.42), phys('#ffffff', { map: textTex(['BIOPSY', 'H. pylori', 'POSITIVE ✓'], { w: 512, h: 680, font: 'bold 64px sans-serif', lineH: 110, color: '#1b4d2b' }), side: THREE.DoubleSide })); S.labD.add(printout);
  const stink = new THREE.Group(); S.labD.add(stink);
  for (let i = 0; i < 4; i++) { const pts = []; for (let k = 0; k <= 20; k++) pts.push(V(Math.sin(k * 0.6 + i) * 0.05, k * 0.025, 0)); const m = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.008, 6), phys('#7fbf3f', { emissive: '#3f6f1f', transparent: true, opacity: 0.8 })); m.position.x = (i - 1.5) * 0.06; stink.add(m); }
  // ---------- city ----------
  await mk('city', s => citySet(s), 'sunset', { intensity: 0.8, background: true, blur: 0.05 });
  // ---------- corridor ----------
  await mk('corridor', s => hallSet(s, 'corridor'), 'lobby', { intensity: 0.6 });
  const M3 = doc(); S.corridor.add(M3.group);
  const D1 = suit({ coat: '#f3f3ef', hairStyle: 'short', hair: '#2a2a2a' }), D2 = suit({ coat: '#f3f3ef', glasses: false });
  S.corridor.add(D1.group, D2.group);
  const cork = boxM(0.9, 0.6, 0.03, phys('#b98a55', { roughness: 1 }), 0, 0, 0); S.corridor.add(cork);
  const note = mesh(new THREE.PlaneGeometry(0.34, 0.24), phys('#fff59a', { map: textTex(['BACTERIA', '→ ULCERS?'], { w: 512, h: 360, bg: '#fff59a', color: '#c0141c', font: 'bold 80px sans-serif', lineH: 100 }), side: THREE.DoubleSide })); S.corridor.add(note);
  // ---------- lecture ----------
  await mk('lecture', s => hallSet(s, 'lecture'), 'hall', { intensity: 0.8 });
  const board = mesh(new THREE.PlaneGeometry(3.2, 2.4), phys('#ffffff', { map: boardTexture(), roughness: 0.9 }), 0, 2.2, -3.85); S.lecture.add(board);
  const P1 = suit(); P1.group.position.set(1.9, 0, -3.1); P1.group.rotation.y = -0.5; S.lecture.add(P1.group);
  const wStress = label('STRESS', { size: 0.45, bg: 'rgba(200,30,30,0.9)' }), wAcid = label('ACID', { size: 0.45, bg: 'rgba(230,160,20,0.9)' }); S.lecture.add(wStress, wAcid);
  const students = []; for (let i = 0; i < 6; i++) { const st = suit({ shirt: ['#6a7a5a', '#8a5a5a', '#5a6a8a'][i % 3], hairStyle: i % 2 ? 'short' : 'side', glasses: i % 3 === 0, hair: '#3a2a1a' });
    st.group.position.set(-1.6 + (i % 3) * 1.1, 0, 0.9 + Math.floor(i / 3) * 1.1); st.group.rotation.y = Math.PI; S.lecture.add(st.group); students.push(st); }
  // ---------- studio (acid bowl / chart / product / pills) ----------
  await mk('studio', s => studioSet(s), 'studio', { intensity: 0.9 });
  const bowlProf = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 0.5; bowlProf.push(new THREE.Vector2(Math.sin(a) * 1.2 + 0.001, -Math.cos(a) * 1.0 + 1.0)); }
  const bowl = mesh(new THREE.LatheGeometry(bowlProf, 64), phys('#f2c4c8', { side: THREE.DoubleSide, roughness: 0.3, clearcoat: 1, transmission: 0.0 })); bowl.position.y = 0.1; S.studio.add(bowl);
  const acidLiquid = mesh(new THREE.CircleGeometry(1.1, 64), phys('#b6e03a', { emissive: '#4a6a08', emissiveIntensity: 0.5, roughness: 0.1, clearcoat: 1 })); acidLiquid.rotation.x = -Math.PI / 2; acidLiquid.position.y = 0.75; S.studio.add(acidLiquid);
  const bubbles = []; for (let i = 0; i < 40; i++) { const b = mesh(new THREE.SphereGeometry(0.03 + (i % 5) * 0.012, 12, 8), phys('#d8ff6a', { transparent: true, opacity: 0.8, roughness: 0.05 })); b.userData = { x: Math.sin(i * 2.3) * 0.8, z: Math.cos(i * 1.7) * 0.6, s: 0.5 + (i % 7) * 0.12 }; S.studio.add(b); bubbles.push(b); }
  const dropBug = spiralBug({ length: 0.5, radius: 0.04 }); S.studio.add(dropBug);
  const chart = barChart(); chart.group.position.set(0, 0, 0); S.studio.add(chart.group);
  const oursTag = label('MARSHALL & WARREN', { size: 0.18, bg: 'rgba(224,36,44,0.95)' }); S.studio.add(oursTag);
  const hero = spiralBug({ length: 1.0, radius: 0.08 }); S.studio.add(hero);
  const antacid = pill('antacid'), capsule = pill('capsule'); S.studio.add(antacid, capsule);
  const gang = []; for (let i = 0; i < 6; i++) { const b = spiralBug({ length: 0.5, radius: 0.045 }); S.studio.add(b); gang.push(b); }
  const fizz = []; for (let i = 0; i < 50; i++) { const f = mesh(new THREE.SphereGeometry(0.02, 8, 6), phys('#ffffff', { transparent: true, opacity: 0.85 })); f.userData = { a: i * 2.4, r: 0.1 + (i % 9) * 0.04, s: 0.6 + (i % 5) * 0.2 }; S.studio.add(f); fizz.push(f); }
  // ---------- micro ----------
  const micro = await mk('micro', s => microSet(s));
  const micro2 = await mk('micro2', s => microSet(s));                 // swarm on inflamed lining
  micro2.cloud.visible = false; micro2.bug.visible = false;
  const swarm = []; for (let i = 0; i < 26; i++) { const b = spiralBug({ length: 0.7, radius: 0.05 }); b.position.set(Math.sin(i * 2.1) * 2.2, 0.7 + (i % 3) * 0.08, Math.cos(i * 1.3) * 1.8 - 0.4); b.rotation.y = i; b.userData.p = i; S.micro2.add(b); swarm.push(b); }
  S.micro2.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHexString() === 'd9536a') { o.material = o.material.clone(); o.material.color.set('#b8202e'); o.material.emissive = new THREE.Color('#5a0008'); o.material.emissiveIntensity = 0.4; } });
  // ---------- slide ----------
  const slide = await mk('slide', s => slideSet(s));
  // ---------- desk (send / rejected / journal / embarrassed) ----------
  const desk = await mk('desk', s => deskSet(s), 'apartment', { intensity: 0.35 });
  const desk2 = await mk('desk2', s => deskSet(s), 'apartment', { intensity: 0.45 });
  desk2.ink.visible = false; desk2.stamp.visible = false; desk2.paper.visible = false;
  const tw = typewriter(); tw.group.position.set(0, 0, -0.1); S.desk2.add(tw.group);
  const journal = mesh(new THREE.PlaneGeometry(0.6, 0.8), phys('#ffffff', { map: journalTexture(0), roughness: 0.85, side: THREE.DoubleSide })); S.desk2.add(journal);
  const M4 = doc(); S.desk2.add(M4.group);
  // ---------- conference ----------
  await mk('conference', s => hallSet(s, 'conference'), 'hall', { intensity: 0.55 });
  const banner = mesh(new THREE.PlaneGeometry(5, 0.9), new THREE.MeshBasicMaterial({ map: textTex(['GASTRO CONFERENCE'], { w: 2048, h: 360, bg: '#1f3a5f', color: '#ffffff', font: 'bold 200px sans-serif' }) }), 0, 3.6, -3.85); S.conference.add(banner);
  S.conference.add(boxM(4.2, 0.08, 1, phys('#4a2e1a', { roughness: 0.3, clearcoat: 0.6 }), 0, 0.95, -1.2), boxM(4.2, 0.9, 0.05, phys('#2a3a52'), 0, 0.5, -0.72));
  const revs = [0, 1, 2].map(i => { const r = suit({ shirt: ['#3a3d4a', '#4a3a3a', '#2f3f4f'][i], hairStyle: ['bald', 'side', 'bald'][i] }); r.group.position.set(-1.3 + i * 1.3, -0.25, -1.75); S.conference.add(r.group); return r; });
  // ---------- barn ----------
  const barn = await mk('barn', s => barnSet(s), 'park', { intensity: 0.45 });
  const M5 = doc(); M5.group.position.set(1.0, 0, -0.3); M5.group.rotation.y = -0.7; S.barn.add(M5.group);
  const pan = mesh(new THREE.LatheGeometry([0, 0.02, 0.05, 0.08, 0.1].map((y, i) => new THREE.Vector2([0.06, 0.1, 0.13, 0.145, 0.15][i], y)), 40), phys('#c9ccd2', { metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide })); S.barn.add(pan);
  const clip = boxM(0.22, 0.3, 0.015, phys('#7a5230'), 0, 0, 0); S.barn.add(clip);
  // ---------- tunnel ----------
  const tun = await mk('tunnel', s => tunnelSet(s));
  // ---------- nobel stage ----------
  await mk('stage', s => hallSet(s, 'stage'), 'lobby', { intensity: 0.25 });
  const M6 = doc({ hair: '#8a8a8a' }), W6 = war({ hair: '#e2e2e2' }); M6.group.position.set(-0.45, 0.6, -1.1); W6.group.position.set(0.45, 0.6, -1.1); S.stage.add(M6.group, W6.group);
  const medals = [M6, W6].map(() => { const md = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.008, 32), phys('#e2b34a', { metalness: 1, roughness: 0.2 })); md.rotation.x = Math.PI / 2; S.stage.add(md); return md; });
  const conf = confetti(); S.stage.add(conf.mesh);
  const yearTex = y => textTex([String(y)], { w: 1024, h: 512, bg: null, color: '#ffd76a', font: 'bold 300px serif' });
  const yearPlane = mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshBasicMaterial({ map: yearTex(1984), transparent: true })); S.stage.add(yearPlane);
  const years = {}; for (let y = 1984; y <= 2005; y++) years[y] = null;

  const rest = (...hs) => hs.forEach(h => { h.rest(); h.face('neutral'); });
  const ccam = cam;

  return {
    render(t) {
      const sh = shotAt(t), lt = t - sh.start, p = prog(t, sh.start, sh.end);
      let scene, focus = null, aperture = 0;
      ccam.up.set(0, 1, 0); ccam.near = 0.02; ccam.updateProjectionMatrix();
      switch (sh.name) {
        case 'hook': {
          scene = S.labN; W1.group.visible = true; rest(M1, W1); M1.idle(t); clockN.set(t);
          if (lt < 1.1) {                                   // flask on bench, push in
            F1.group.position.set(0.5, 0.98, -0.05); F1.group.rotation.set(0, 0, 0);
            aim(ccam, V(lerp(0.85, 0.7, p * 3), 1.2, lerp(0.75, 0.55, lt / 1.1)), V(0.5, 1.07, -0.05), 32); focus = ccam.position.distanceTo(V(0.5, 1.07, -0.05)); aperture = 0.004;
          } else if (lt < 2.5) {                            // picks it up and drinks
            const k = easeInOut(prog(lt, 1.1, 1.9));
            pose(M1, { 'r_arm.raise': lerp(0, 75, k), 'r_arm.straddle': lerp(8, -12, k), 'r_elbow.bend': lerp(15, 128, k), 'head.nod': lerp(0, -22, prog(lt, 1.7, 2.3)) });
            M1.face(lt > 1.8 ? 'o' : 'neutral');
            const hp = handPos(M1); F1.group.position.copy(hp).add(V(0.0, 0.0, 0.05)); F1.group.rotation.set(lerp(0, -2.0, prog(lt, 1.6, 2.3)), 0, 0);
            aim(ccam, V(1.1, 1.15, 1.9), V(0.25, 1.45, 0.35), 34); focus = 1.9; aperture = 0.002;
          } else {                                          // crash zoom into the flask → micro world
            scene = S.micro; micro.update(t); micro.cloud.visible = false;
            const k = easeOut(prog(lt, 2.5, 3.6)); aim(ccam, V(lerp(3.2, 0.9, k), lerp(2.6, 0.9, k), lerp(3.5, 1.1, k)), V(0, 0.55, 0.6), 40);
          }
          break; }
        case 'purpose': {
          scene = S.labN; W1.group.visible = true; rest(M1, W1); M1.idle(t, 0.3); clockN.set(t);
          pose(M1, { 'r_arm.raise': 25, 'r_elbow.bend': 60, 'l_arm.raise': 45, 'l_elbow.bend': 120 });
          const hp = handPos(M1); F1.group.position.copy(hp).add(V(0, -0.05, 0.04)); F1.group.rotation.set(0, 0, 0);
          aim(ccam, V(0.42, 1.62, lerp(1.3, 1.2, p)), V(0.25, 1.6, 0.35), 30); focus = 0.95; aperture = 0.004;
          break; }
        case 'argument': {
          scene = S.labN; W1.group.visible = true; rest(M1, W1); M1.idle(t, 0.3); W1.face('frown'); clockN.set(t);
          const k = easeIn(prog(lt, 0.2, 0.55)); pose(M1, { 'r_arm.raise': lerp(40, 20, k), 'r_elbow.bend': lerp(70, 40, k), 'torso.bend': 8 * k });
          F1.group.position.set(0.55, 0.98, 0.0); F1.group.rotation.set(0, 0, 0);
          const shake = lt > 0.55 && lt < 0.8 ? Math.sin(lt * 90) * 0.01 : 0;
          aim(ccam, V(0.9 + shake, 1.35, 2.6), V(-0.3, 1.2, -0.2), 36); focus = 2.4; aperture = 0.0015;
          break; }
        case 'perth': {
          scene = S.city; const k = easeInOut(p);
          aim(ccam, V(lerp(-45, 2, k), lerp(42, 9, k), lerp(70, 26, k)), V(lerp(-10, 8, k), lerp(4, 6, k), lerp(-10, -2, k)), 42);
          break; }
        case 'corridor': {
          scene = S.corridor; rest(M3, D1, D2);
          const walk = (h, ph) => { const s = Math.sin(t * 6 + ph); pose(h, { 'l_leg.raise': 22 * s, 'r_leg.raise': -22 * s, 'l_knee.bend': 15 + 15 * Math.max(0, -s), 'r_knee.bend': 15 + 15 * Math.max(0, s), 'l_arm.raise': -18 * s, 'r_arm.raise': 18 * s }); };
          if (lt < 2.3) {
            walk(M3, 0); M3.group.position.set(-0.6, 0, lerp(-9, -3.2, lt / 2.3)); M3.group.rotation.y = 0;
            D1.group.position.set(0.8, 0, lerp(-1, -8, lt / 2.3)); D1.group.rotation.y = Math.PI; walk(D1, 1);
            D2.group.position.set(0.5, 0, lerp(-2.0, -7.5, lt / 2.3)); D2.group.rotation.y = Math.PI; walk(D2, 2); D1.face('flat'); D2.face('frown');
            pose(D1, { 'head.turn': 25, 'head.nod': -8 });
            cork.position.set(-1.2, 1.6, -9.2); cork.rotation.y = 0; note.position.set(-1.2, 1.6, -9.18); note.rotation.set(0, 0, 0);
            aim(ccam, V(1.5, 1.55, lerp(-1.2, -1.8, lt / 2.3)), V(-0.6, 1.25, lerp(-7.5, -4.5, lt / 2.3)), 38);
          } else {                                           // the note on the corkboard ... falls off
            cork.position.set(-1.2, 1.6, -9.2); M3.group.position.set(-0.55, 0, -8.6); M3.group.rotation.y = Math.PI + 0.5; pose(M3, { 'r_arm.raise': 75, 'r_elbow.bend': 25 }); M3.face('smile');
            D1.group.position.set(0.7, 0, -8.0); D1.group.rotation.y = Math.PI - 0.6; D1.face('flat'); pose(D1, { 'head.turn': 30 });
            D2.group.position.set(1.2, 0, -12); D2.group.rotation.y = Math.PI;
            const fall = easeIn(prog(lt, 3.9, 4.6));
            note.position.set(-1.2 + fall * 0.05, 1.6 - fall * 1.55, -9.18 + fall * 0.2); note.rotation.set(-fall * 1.3, 0, fall * 0.8);
            aim(ccam, V(0.2, 1.6, -6.3), V(-0.9, 1.45, -9.1), lt < 3.6 ? 34 : 40); focus = 3.0; aperture = 0.002;
          }
          break; }
        case 'lecture': {
          scene = S.lecture; rest(P1, ...students); P1.idle(t); students.forEach((s, i) => pose(s, { 'head.nod': 10 * Math.sin(t * 5 + (lt > 1.5 ? 0 : i)) }));
          pose(P1, { 'r_arm.raise': 70, 'r_arm.straddle': 40, 'r_elbow.bend': 10 }); P1.face('smile');
          const d1 = easeOut(prog(lt, 0.9, 1.3)), d2 = easeOut(prog(lt, 2.3, 2.7));
          wStress.position.set(-0.9, lerp(5, 2.9, d1), -3.7); wStress.visible = lt > 0.9; wAcid.position.set(0.9, lerp(5, 2.9, d2), -3.7); wAcid.visible = lt > 2.3;
          aim(ccam, V(lerp(-0.6, 0, p), lerp(2.0, 2.2, p), lerp(4.5, 2.2, easeInOut(p))), V(0, 2.1, -3.8), 40);
          break; }
        case 'acid': {
          scene = S.studio; [chart.group, oursTag, hero, antacid, capsule, ...gang, ...fizz].forEach(o => o.visible = false);
          [bowl, acidLiquid, ...bubbles, dropBug].forEach(o => o.visible = true);
          bubbles.forEach(b => { const u = b.userData, y = 0.1 + ((t * u.s) % 0.7); b.position.set(u.x, y, u.z); b.visible = y < 0.74; });
          const k = prog(lt, 0.6, 1.4), dis = prog(lt, 1.4, 2.4);
          dropBug.position.set(0, lerp(2.5, 0.78, easeIn(k)), 0); dropBug.rotation.set(t * 2, 0, 0.4); dropBug.scale.setScalar(Math.max(0.001, 1 - dis));
          aim(ccam, V(Math.sin(t * 0.3) * 3.6, 3.4, Math.cos(t * 0.3) * 3.6), V(0, 0.8, 0), 40);
          break; }
        case 'warren': {
          scene = S.labD; rest(W2, M2); M2.group.visible = false;
          W2.group.position.set(1.3, 0, 0.15); W2.group.rotation.y = Math.PI; pose(W2, { 'torso.bend': 22, 'head.nod': 18, 'r_arm.raise': 55, 'r_elbow.bend': 70, 'l_arm.raise': 50, 'l_elbow.bend': 80 });
          W2.face(lt > 4.3 ? 'o' : 'neutral');
          const dusk = prog(lt, 1.5, 4.3); S.labD.environmentIntensity = lerp(0.75, 0.35, dusk); S.labD.background = new THREE.Color().lerpColors(new THREE.Color('#cfe3ee'), new THREE.Color('#e8a36a'), dusk);
          if (lt < 2.5) aim(ccam, V(2.6, 1.6, 1.8), V(1.3, 1.3, -0.2), 36);
          else aim(ccam, V(lerp(2.25, 2.0, prog(lt, 2.5, 5.3)), 1.5, lerp(-0.05, 0.05, prog(lt, 2.5, 5.3))), V(1.3, 1.45, -0.05), 30);
          focus = ccam.position.distanceTo(V(1.3, 1.4, 0.1)); aperture = 0.003;
          break; }
        case 'slide': {
          if (lt < 2.2) {
            scene = S.slide; slide.bugs.forEach(b => { b.rotation.z += 0; b.position.x += Math.sin(t * 2 + b.userData.p) * 0.002; b.children[0].rotation.x = t * 4 + b.userData.p; });
            const irisR = lerp(0.02, 0.42, easeOut(prog(lt, 0, 0.6)));
            aim(ccam, V(0, 0, lerp(2.4, 1.8, p)), V(0, 0, 0), 40);
            if (!S.slide.userData.mask) { const tmp = new THREE.Object3D(); S.slide.userData.mask = eyepieceMask(tmp, 1); tmp.remove(S.slide.userData.mask); S.slide.add(S.slide.userData.mask); }
            const mk = S.slide.userData.mask; ccam.updateMatrixWorld(true); mk.position.copy(ccam.position).add(new THREE.Vector3(0, 0, -1).applyQuaternion(ccam.quaternion)); mk.quaternion.copy(ccam.quaternion); mk.scale.setScalar(irisR);
          } else {
            scene = S.labD; rest(W2, M2); M2.group.visible = true; S.labD.environmentIntensity = 0.4; S.labD.background = new THREE.Color('#e8a36a');
            pose(W2, { 'torso.bend': 5, 'head.turn': 30 }); W2.face('o');
            M2.group.position.set(0.7, 0, 0.75); M2.group.rotation.y = 2.4; pose(M2, { 'torso.bend': 20, 'head.nod': 10 }); M2.face('o');
            aim(ccam, V(lerp(2.6, 2.3, prog(lt, 2.2, 4.3)), 1.55, 2.1), V(1.0, 1.4, 0.35), 34); focus = 2.0; aperture = 0.002;
          }
          break; }
        case 'send': {
          if (lt < 1.5) {
            scene = S.desk2; M4.group.visible = false; journal.visible = false; tw.group.visible = true;
            tw.keys.forEach((k, i) => { k.position.y = 0.13 - (Math.floor(t * 14) % 30 === i ? 0.008 : 0); });
            aim(ccam, V(0.5, 0.55, 0.85), V(0, 0.15, -0.12), 34); focus = 1.05; aperture = 0.004;
          } else {
            scene = S.conference; revs.forEach((r, i) => { rest(r); r.face(['flat', 'frown', 'flat'][i]); pose(r, { 'head.nod': 15, 'l_arm.raise': 40, 'l_elbow.bend': 90, 'r_arm.raise': 40, 'r_elbow.bend': 90 }); });
            aim(ccam, V(lerp(-0.8, 0, prog(lt, 1.5, 4)), 1.8, lerp(4.2, 2.6, easeInOut(prog(lt, 1.5, 4)))), V(0, 1.6, -2), 40);
          }
          break; }
        case 'rejected': {
          scene = S.desk; const k = easeIn(prog(t, 34.75, 34.93));
          desk.stamp.position.set(0.02, lerp(0.7, 0.02, k), 0.05); desk.stamp.rotation.set(0, 0.22, 0); desk.ink.visible = t >= 34.95;
          const up = easeOut(prog(t, 35.1, 35.5)); if (up > 0) desk.stamp.position.set(0.02 + up * 0.3, 0.02 + up * 0.5, 0.05 + up * 0.2);
          const shake = t > 34.93 && t < 35.2 ? Math.sin(t * 120) * 0.012 : 0;
          aim(ccam, V(shake, 1.05, 0.5), V(0, 0, 0.03), 40);
          break; }
        case 'chart': {
          scene = S.studio; [bowl, acidLiquid, ...bubbles, dropBug, hero, antacid, capsule, ...gang, ...fizz].forEach(o => o.visible = false); chart.group.visible = true; oursTag.visible = true;
          const k = easeInOut(prog(lt, 0.2, 1.4));
          chart.bars.forEach((b, i) => { const g = easeOut(prog(lt, i * 0.02, 0.5 + i * 0.02)); const v = b === chart.ours ? lerp(1.4, b.userData.v, k) : b.userData.v; b.scale.y = Math.max(0.01, v * g); b.position.y = b.scale.y / 2; });
          oursTag.position.set(chart.ours.position.x, chart.ours.scale.y + 0.25, 0.1);
          aim(ccam, V(0.2, 1.3, 6.8), V(0.2, 0.75, 0), 40);
          break; }
        case 'barn1': case 'barn2': case 'becomes': {
          scene = S.barn; rest(M5); M5.idle(t, 0.5);
          barn.pigs.forEach((pg, i) => { const bounce = sh.name === 'barn2' ? Math.abs(Math.sin(t * 7 + i)) * 0.12 : 0; pg.position.y = bounce; pg.userData.head.rotation.z = sh.name === 'barn1' ? -0.3 + 0.15 * Math.sin(t * 10 + i) : 0.2 * Math.sin(t * 4 + i); });
          if (sh.name === 'barn1') {
            pose(M5, { 'head.nod': 25, 'r_arm.raise': 60, 'r_elbow.bend': 30, 'l_arm.raise': 55, 'l_elbow.bend': 40 }); M5.face('smile');
            pan.visible = true; pan.position.copy(handPos(M5)).add(V(-0.08, 0, 0.05)); pan.rotation.set(0, 0, lerp(0, 0.9, prog(lt, 0.4, 1.4))); clip.visible = false;
            aim(ccam, V(lerp(-0.1, 0.25, p), 1.05, lerp(2.9, 2.5, p)), V(0.45, 0.55, 0), 42);
          } else if (sh.name === 'barn2') {
            pose(M5, { 'l_arm.raise': 70, 'l_elbow.bend': 90, 'head.nod': 20 }); M5.face('frown'); pan.visible = false; clip.visible = true;
            clip.position.copy(handPos(M5, 'l')).add(V(0.05, 0.1, 0.08)); clip.rotation.set(-0.8, -0.6, 0);
            aim(ccam, V(0.2, 0.9, 2.4), V(0.2, 0.35, 0.2), 40); focus = 2.3; aperture = 0.002;
          } else {
            const dim = prog(lt, 0, 2.0); barn.sun.intensity = lerp(2.6, 0.5, dim); S.barn.environmentIntensity = lerp(0.45, 0.12, dim);
            pan.visible = false; clip.visible = false; M5.face(lt > 1.0 ? 'flat' : 'frown'); pose(M5, { 'head.turn': lerp(0, -25, prog(lt, 1.0, 1.6)) });
            if (lt < 1.8) { aim(ccam, V(lerp(1.4, 1.15, p), 1.62, lerp(0.85, 0.6, p)), V(1.0, 1.6, -0.3), 28); focus = 0.95; aperture = 0.005; }
            else { aim(ccam, V(0.25, 0.45, 1.75), V(-0.05, 0.3, 0.45), 34); barn.pigs[1].userData.head.rotation.y = 0.6; focus = 0.85; aperture = 0.006; }
          }
          if (sh.name !== 'becomes') { barn.sun.intensity = 2.6; S.barn.environmentIntensity = 0.45; barn.pigs[1].userData.head.rotation.y = 0; }
          break; }
        case 'scope': case 'inflamed': {
          const sub = sh.name === 'inflamed' && lt > 2.2;
          if (!sub) {
            scene = S.tunnel; const k = sh.name === 'scope' ? easeInOut(p) : easeIn(prog(lt, 0, 2.2));
            tun.mat.color.set(sh.name === 'scope' ? '#e8838e' : '#c4243a'); tun.mat.emissive = new THREE.Color(sh.name === 'scope' ? '#000000' : '#3a0006');
            const u = clamp(k * 0.96, 0, 0.98), pos = tun.curve.getPointAt(u), ahead = tun.curve.getPointAt(Math.min(1, u + 0.02));
            aim(ccam, pos, ahead, 60); tun.headlamp.position.copy(pos);
          } else {
            scene = S.micro2; micro2.update(t);
            swarm.forEach((b, i) => { b.children[0].rotation.x = t * 5 + i; b.position.y = 0.7 + 0.05 * Math.sin(t * 3 + i); b.rotation.y = i + 0.3 * Math.sin(t + i); });
            const hb = swarm[0]; if (lt > 4.1) { hb.rotation.y = lerp(hb.rotation.y, -Math.PI / 2, easeOut(prog(lt, 4.1, 4.6))); }
            aim(ccam, V(lerp(3.6, 1.2, easeOut(prog(lt, 2.2, 5.8))), lerp(3, 1.3, easeOut(prog(lt, 2.2, 5.8))), lerp(4.2, 2.2, easeOut(prog(lt, 2.2, 5.8)))), V(swarm[0].position.x * 0.3, 0.7, swarm[0].position.z * 0.3), 40);
          }
          break; }
        case 'drink': {
          scene = S.labN; rest(M1, W1); clockN.set(t * 0.2); W1.group.visible = false;
          const k = easeInOut(prog(lt, 0.2, 1.0));
          pose(M1, { 'r_arm.raise': lerp(0, 75, k), 'r_arm.straddle': lerp(8, -12, k), 'r_elbow.bend': lerp(15, 128, k), 'head.nod': lerp(0, -22, prog(lt, 0.8, 1.6)) }); M1.face(lt > 0.9 ? 'o' : 'flat');
          const hp = handPos(M1); F1.group.position.copy(hp).add(V(0, 0, 0.05)); F1.group.rotation.set(lerp(0, -2.0, prog(lt, 0.8, 1.7)), 0, 0);
          aim(ccam, V(-0.5, 1.5, 1.7), V(0.2, 1.5, 0.35), lt < 1.2 ? 32 : 26); focus = 1.75; aperture = 0.003;
          break; }
        case 'sick': {
          scene = S.labD; W1.group.visible = true; rest(M2, W2); S.labD.environmentIntensity = 0.55; S.labD.background = new THREE.Color('#b9c6cc');
          cal.set(Math.floor(prog(lt, 0, 1.1) * 3.99)); M2.group.visible = true;
          M2.group.position.set(-0.4, 0, 0.6); M2.group.rotation.y = 0.3; M2.mats.skin.color.set('#a8c48a'); pose(M2, { 'torso.bend': 25, 'l_arm.raise': 50, 'l_elbow.bend': 60, 'r_arm.raise': 50, 'r_elbow.bend': 60 }); M2.face('frown');
          bucket.visible = true; bucket.position.copy(handPos(M2)).lerp(handPos(M2, 'l'), 0.5).add(V(0, -0.1, 0.08));
          W2.group.position.set(0.7, 0, 0.5); W2.group.rotation.y = -1.2; pose(W2, { 'torso.bend': -15, 'head.turn': 35, 'l_arm.raise': 60, 'l_elbow.bend': 110 }); W2.face('o');
          stink.visible = lt > 1.9; stink.position.set(-0.25, 1.75 + (lt % 1) * 0.1, 0.75);
          if (lt < 1.1) aim(ccam, V(-0.3, 1.6, -0.6), V(-0.3, 1.6, -1.53), 34);
          else aim(ccam, V(0.3, 1.5, 2.6), V(0.1, 1.3, 0.5), 38);
          break; }
        case 'caught': {
          scene = S.labD; rest(M2, W2); M2.mats.skin.color.set('#dba483'); bucket.visible = false; stink.visible = false; W2.group.visible = false;
          S.labD.environmentIntensity = 0.85; S.labD.background = new THREE.Color('#ffd9a8');
          M2.group.position.set(-0.4, 0, 0.6); M2.group.rotation.y = 0.2; M2.face('smile');
          pose(M2, { 'r_arm.raise': 80, 'r_elbow.bend': 40, 'head.tilt': 8 }); printout.visible = true; printout.position.copy(handPos(M2)).add(V(0.02, 0.18, 0.05)); printout.rotation.set(0, 0.2, 0);
          aim(ccam, V(lerp(0.4, 0.15, p), 1.55, lerp(2.2, 1.6, easeInOut(p))), V(-0.3, 1.6, 0.6), 34); focus = ccam.position.distanceTo(V(-0.3, 1.6, 0.6)); aperture = 0.003;
          break; }
        case 'nobel': {
          scene = S.stage; printout.visible = false; conf.update(t);
          if (lt < 1.4) {
            const y = Math.round(lerp(1984, 2005, easeInOut(prog(lt, 0, 1.25))));
            if (yearPlane.userData.y !== y) { yearPlane.material.map = yearTex(y); yearPlane.userData.y = y; }
            yearPlane.visible = true; yearPlane.position.set(0, 2.2, 0.8); conf.mesh.visible = false;
            aim(ccam, V(0, 2.2, 3.0), V(0, 2.2, 0.8), 40);
          } else {
            yearPlane.visible = false; conf.mesh.visible = lt > 2.1; rest(M6, W6); M6.face('smile'); W6.face('smile');
            pose(M6, { 'r_arm.raise': lt > 2.1 ? 150 : 0, 'r_elbow.bend': 20 }); pose(W6, { 'l_arm.raise': lt > 2.3 ? 140 : 0, 'l_elbow.bend': 30 });
            [M6, W6].forEach((h, i) => { h.group.updateMatrixWorld(true); medals[i].position.copy(h.m.torso.localToWorld(new THREE.Vector3(0, 0, 0))).add(V(0, 0.18, 0.16)); });
            const k = easeInOut(prog(lt, 1.4, 3.75)); aim(ccam, V(lerp(-1.2, 0.3, k), lerp(1.4, 2.0, k), lerp(4.4, 3.2, k)), V(0, 1.6, -1.1), 36); focus = 3.6; aperture = 0.0015;
          }
          break; }
        case 'product': {
          scene = S.studio; [bowl, acidLiquid, ...bubbles, dropBug, chart.group, oursTag, antacid, capsule, ...gang, ...fizz].forEach(o => o.visible = false); hero.visible = true;
          hero.position.set(0, 1.0, 0); hero.rotation.set(t * 3, t * 0.8, 0.1); hero.children.forEach(c => { if (c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.parameters.radius < 0.03) c.scale.y = (lt > 2.2 && lt < 2.45) ? 0.1 : 1; });
          aim(ccam, V(Math.sin(t * 0.5) * 2.4, 1.3, Math.cos(t * 0.5) * 2.4), V(0, 1.0, 0), 34); focus = 2.4; aperture = 0.003;
          break; }
        case 'ammonia': {
          scene = S.micro; micro.update(t); micro.bug.visible = true;
          const grow = easeOut(prog(lt, 1.0, 2.0)); micro.cloud.visible = lt > 1.0; micro.cloud.scale.setScalar(Math.max(0.01, grow));
          const dig = easeInOut(prog(lt, 4.2, 6.4)); micro.bug.position.y = lerp(0.55, 0.12, dig) + 0.04 * Math.sin(t * 2); micro.cloud.position.copy(micro.bug.position);
          const k = easeInOut(prog(lt, 0, 6.6));
          aim(ccam, V(lerp(1.4, 2.2, k), lerp(1.1, lerp(1.5, 0.6, dig), k), lerp(2.0, 2.6, k)), V(0, lerp(0.6, 0.3, dig), 0.5), 40);
          break; }
        case 'pills': {
          scene = S.studio; [bowl, acidLiquid, ...bubbles, dropBug, chart.group, oursTag, hero].forEach(o => o.visible = false);
          const phase2 = lt > 2.2; antacid.visible = !phase2; capsule.visible = phase2; gang.forEach((b, i) => {
            const a = i / gang.length * Math.PI * 2; b.visible = !(phase2 && lt > 2.9 + i * 0.08);
            b.position.set(Math.cos(a) * 1.1, 0.45 + (phase2 ? 0 : Math.abs(Math.sin(t * 8 + i)) * 0.15), Math.sin(a) * 1.1); b.rotation.set(t * 4, -a, 0); });
          fizz.forEach(f => { const u = f.userData, y = 0.1 + ((t * u.s) % 1.2); f.visible = !phase2 && lt > 0.8; f.position.set(Math.cos(u.a) * u.r, y, Math.sin(u.a) * u.r); });
          if (!phase2) { antacid.position.set(0, lerp(3, 0.1, easeIn(prog(lt, 0, 0.7))), 0); antacid.rotation.set(0.2, t, 0); }
          else { const k = easeOut(prog(lt, 2.4, 2.9)); capsule.position.set(0, lerp(3, 0.6, easeIn(prog(lt, 2.2, 2.6))), 0);
            capsule.userData.halves[0].position.y = 0.16 + k * 0.6; capsule.userData.halves[1].position.y = -0.16 - k * 0.3; capsule.rotation.z = 0.3; }
          aim(ccam, V(0, 2.4, 3.2), V(0, 0.4, 0), 40);
          break; }
        case 'journal': case 'embarrassed': {
          scene = S.desk2; tw.group.visible = sh.name === 'journal' && lt > 1.6; journal.visible = true; journal.scale.setScalar(1);
          if (sh.name === 'journal') {
            M4.group.visible = false;
            const hl = prog(lt, 1.7, 2.6); if (journal.userData.hl !== Math.round(hl * 10)) { journal.material.map = journalTexture(hl); journal.userData.hl = Math.round(hl * 10); }
            journal.position.set(0, 0.003, 0.15); journal.rotation.set(-Math.PI / 2, 0, 0.05);
            if (lt < 1.6) aim(ccam, V(0.05, lerp(1.0, 0.75, p), 0.35), V(0, 0, 0.1), 34);
            else aim(ccam, V(0.12, 0.42, 0.12), V(0.05, 0, -0.05), 30);
            focus = 0.45; aperture = 0.005;
          } else {
            M4.group.visible = true; rest(M4); M4.group.position.set(0, -0.62, -0.62); M4.face('flat');
            M4.mats.skin.color.lerpColors(new THREE.Color('#dba483'), new THREE.Color('#e88a7a'), prog(lt, 0.3, 1.6));
            const hide = easeInOut(prog(lt, 1.6, 2.6));
            pose(M4, { 'l_arm.raise': 70, 'l_elbow.bend': 95, 'r_arm.raise': 70, 'r_elbow.bend': 95, 'head.nod': lerp(0, 18, hide) });
            journal.scale.setScalar(0.55); journal.position.set(0, lerp(0.62, 0.86, hide), -0.25); journal.rotation.set(-0.15, 0, 0);
            aim(ccam, V(0.05, 0.92, lerp(1.25, 1.05, p)), V(0, 0.82, -0.4), 34); focus = 1.4; aperture = 0.003;
          }
          break; }
      }
      post.render(scene, ccam, t, { focus, aperture });
    },
  };
}
