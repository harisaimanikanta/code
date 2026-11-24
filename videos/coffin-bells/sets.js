// Sets for "Did Coffin Bells Ever Save Anyone?" - rounded cartoon style, night / candle / eerie moods.
import * as THREE from 'three';
import { soft, roundBox, lathe, tubeR, practical } from '/kit/look.js';
import { tree, plankTexture } from '/kit/props.js';
import { V, at, sph, cyl, tex, candle, parchment } from './lib.js';
export { V };
const rng = (seed = 1) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const SERIF = 'Georgia, "DejaVu Serif", serif';

function grassTex(base = '#2f4a2a', seed = 3) {
  const t = tex(512, 512, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); const r = rng(seed); for (let i = 0; i < 6000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(20,40,15,0.35)' : 'rgba(120,160,90,0.18)'; c.fillRect(r() * w, r() * h, 2, 4); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); return t;
}
function dirtTex(seed = 5) {
  const t = tex(512, 512, (c, w, h) => { c.fillStyle = '#4a3222'; c.fillRect(0, 0, w, h); const r = rng(seed); for (let i = 0; i < 5000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(25,15,8,0.4)' : 'rgba(140,100,60,0.2)'; const s = 1 + r() * 5; c.fillRect(r() * w, r() * h, s, s); }
    for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(120,110,100,0.5)'; c.beginPath(); c.ellipse(r() * w, r() * h, 4 + r() * 10, 3 + r() * 6, r() * 3, 0, 7); c.fill(); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}
/** small brass bell on a wooden post with an arm; returns {group, bell(pivot), top(world-ish local point)} */
export function bellPost(h = 1.2) {
  const g = new THREE.Group(); const wood = soft('#4a3424', 'wood');
  g.add(at(cyl(0.035, 0.04, h, wood, 10), 0, h / 2, 0));
  const arm = roundBox(0.32, 0.05, 0.05, wood, 0.01); arm.position.set(0.14, h - 0.02, 0); g.add(arm);
  const pivot = new THREE.Group(); pivot.position.set(0.27, h - 0.05, 0); g.add(pivot);
  const brass = soft('#c8962e', 'metal', { roughness: 0.28 });
  const bell = lathe([[0.001, 0], [0.025, -0.01], [0.04, -0.05], [0.055, -0.1], [0.075, -0.15], [0.08, -0.16], [0.001, -0.16]], brass); pivot.add(bell);
  const clapper = sph(0.016, soft('#3a3030', 'metal')); clapper.position.y = -0.15; pivot.add(clapper);
  g.add(at(cyl(0.012, 0.012, 0.12, soft('#6a6a6a', 'metal'), 8), 0.27, h - 0.06 + 0.04, 0));
  return { group: g, pivot };
}
export function gravestone({ w = 0.6, h = 0.8, seed = 1, cross = false } = {}) {
  const g = new THREE.Group(); const r = rng(seed); const stone = soft(['#8a8a86', '#7a7670', '#9a968e'][seed % 3], 'clay', { roughness: 0.9 });
  if (cross) { g.add(at(roundBox(0.1, h, 0.1, stone, 0.02), 0, h / 2, 0)); g.add(at(roundBox(0.42, 0.1, 0.1, stone, 0.02), 0, h * 0.72, 0)); }
  else { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 }), stone); m.castShadow = m.receiveShadow = true; m.position.z = -0.06; g.add(m); }
  g.rotation.z = (r() - 0.5) * 0.12; g.rotation.y = (r() - 0.5) * 0.2; return g;
}
function mound(len = 1.8) { const m = sph(0.5, soft('#3a2a1c', 'clay', { roughness: 1 }), 24, 12); m.scale.set(len / 1.0, 0.28, 0.6); return m; }

// ---------------------------------------------------------------- 1. night graveyard with bell graves
export function graveyardSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), soft('#ffffff', 'clay', { map: grassTex() })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  const graves = []; const R = rng(11);
  for (let row = 0; row < 5; row++) for (let col = -2; col <= 2; col++) {
    const x = col * 1.7 + (row % 2) * 0.4, z = -row * 2.2; const gg = new THREE.Group(); gg.position.set(x, 0, z); g.add(gg);
    const st = gravestone({ seed: row * 7 + col + 20, cross: R() < 0.3 }); st.position.set(0, 0, -0.95); gg.add(st);
    const md = mound(1.7); md.rotation.y = Math.PI / 2; md.position.set(0, 0, 0); gg.add(md);
    const bp = bellPost(1.15); bp.group.position.set(0.32, 0, -0.75); gg.add(bp.group); graves.push({ g: gg, bell: bp.pivot });
  }
  // hero grave = graves[2] (centre of front row)
  for (let i = 0; i < 7; i++) { const tr = tree({ h: 3.5 + R() * 2, seed: 30 + i, leaf: '#1a2a1e', trunk: '#2a1e16' }); tr.position.set(-9 + i * 3 + R(), 0, -12 - R() * 4); g.add(tr); }
  // iron fence
  const iron = soft('#1a1a1e', 'metal', { roughness: 0.5 });
  for (let i = -12; i <= 12; i++) { g.add(at(cyl(0.02, 0.02, 1.1, iron, 6), i * 0.35, 0.55, 2.6)); }
  g.add(at(roundBox(8.6, 0.04, 0.04, iron, 0.01), 0, 1.0, 2.6), at(roundBox(8.6, 0.04, 0.04, iron, 0.01), 0, 0.25, 2.6));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshBasicMaterial({ color: '#f4efd8', fog: false })); moon.position.set(6, 9, -30); g.add(moon);
  const lamp = practical('#ffb85a', 2.2, 6, { radius: 0.06 }); lamp.position.set(-1.6, 1.4, -0.2); g.add(lamp);
  const post = cyl(0.03, 0.04, 1.4, soft('#2a2a2a', 'metal'), 8); post.position.set(-1.6, 0.7, -0.2); g.add(post);
  return { group: g, graves, hero: graves[2] };
}

// ---------------------------------------------------------------- coffin (open top unless lid given); along x, foot at +x
export function coffin({ len = 2.0, w = 0.62, h = 0.45, front = true, lining = '#e8dcc8', wood = '#4a2e1e', ornate = false } = {}) {
  const g = new THREE.Group(); const wm = soft(wood, 'wood', { roughness: 0.45, clearcoat: ornate ? 0.6 : 0.2 });
  g.add(at(roundBox(len, 0.06, w, wm, 0.02), 0, 0.03, 0));
  g.add(at(roundBox(len, h, 0.05, wm, 0.015), 0, h / 2, -w / 2 + 0.025));
  if (front) g.add(at(roundBox(len, h, 0.05, wm, 0.015), 0, h / 2, w / 2 - 0.025));
  for (const s of [-1, 1]) g.add(at(roundBox(0.05, h, w, wm, 0.015), s * (len / 2 - 0.025), h / 2, 0));
  const lin = soft(lining, 'fabric', { sheen: 1, sheenColor: new THREE.Color('#ffffff') });
  g.add(at(roundBox(len - 0.1, 0.03, w - 0.1, lin, 0.01), 0, 0.075, 0));
  const pillow = roundBox(0.32, 0.08, w - 0.16, lin, 0.04); pillow.position.set(-len / 2 + 0.22, 0.12, 0); g.add(pillow);
  if (ornate) { const gold = soft('#c8962e', 'metal', { roughness: 0.3 }); for (const s of [-1, 1]) g.add(at(roundBox(len + 0.02, 0.03, 0.03, gold, 0.01), 0, h - 0.02, s * (w / 2 - 0.02)));
    for (const x of [-0.6, 0, 0.6]) for (const s of [-1, 1]) { const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20, Math.PI), gold); hnd.position.set(x, h * 0.55, s * (w / 2 + 0.01)); hnd.rotation.set(0, s > 0 ? 0 : Math.PI, Math.PI); g.add(hnd); } }
  g.userData = { len, w, h }; return g;
}

// ---------------------------------------------------------------- 2. inside a dark coffin (top-down)
export function insideCoffinSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  const c = coffin({ len: 2.0, w: 0.66, h: 0.5, lining: '#d8ccb8' }); g.add(c);
  // darkness above: a lid plane high above with a thin crack of light
  const crack = new THREE.SpotLight('#ffd9a0', 4, 4, 0.12, 0.6, 1.5); crack.position.set(-0.4, 2.0, 0.05); crack.target.position.set(-0.6, 0.2, 0); g.add(crack, crack.target);
  const fill = new THREE.PointLight('#8aa0d0', 0.4, 3, 2); fill.position.set(0.2, 1.2, 0.3); g.add(fill);
  return { group: g, coffin: c, crack };
}

// ---------------------------------------------------------------- 3. candle-lit crypt: escape-plan blueprint + the duke's coffin
export function cryptSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  const stone = tex(512, 512, (c, w, h) => { c.fillStyle = '#6a625a'; c.fillRect(0, 0, w, h); const r = rng(4); for (let y = 0; y < h; y += 64) for (let x = (y / 64) % 2 ? -48 : 0; x < w; x += 96) { c.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.15})`; c.fillRect(x + 3, y + 3, 90, 58); c.strokeStyle = 'rgba(20,15,10,0.6)'; c.lineWidth = 4; c.strokeRect(x + 1, y + 1, 94, 62); } });
  stone.wrapS = stone.wrapT = THREE.RepeatWrapping; stone.repeat.set(3, 2);
  const sm = soft('#ffffff', 'clay', { map: stone });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), sm); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.6), sm); back.position.set(0, 1.8, -2.5); back.receiveShadow = true; g.add(back);
  for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.6), sm); side.position.set(s * 3.5, 1.8, 0); side.rotation.y = -s * Math.PI / 2; g.add(side); }
  // arches on back wall
  for (const x of [-1.8, 1.8]) { const a = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 10, 30, Math.PI), soft('#7a726a', 'clay')); a.position.set(x, 1.9, -2.45); g.add(a); }
  // plinth + the duke's ornate coffin (lid with a glass window, brass air tube, padlock)
  g.add(at(roundBox(2.3, 0.5, 0.9, soft('#5a524a', 'clay'), 0.04), 0.2, 0.25, -0.6));
  const cof = coffin({ len: 2.0, w: 0.64, h: 0.42, ornate: true, wood: '#5a2a1a', lining: '#a82a3a' }); cof.position.set(0.2, 0.5, -0.6); g.add(cof);
  const keys = new THREE.Group(); const brass = soft('#d8a83a', 'metal', { roughness: 0.25 });
  for (const k of [0, 1]) { const kg = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 20), brass); kg.add(ring); kg.add(at(cyl(0.006, 0.006, 0.12, brass, 8), 0, -0.09, 0)); kg.add(at(roundBox(0.03, 0.02, 0.008, brass, 0.003), 0.015, -0.14, 0)); kg.rotation.set(-Math.PI / 2, 0, 0.4 + k * 0.6); kg.position.set(k * 0.05, 0, k * 0.03); keys.add(kg); }
  keys.position.set(-0.42, 0.5 + 0.17, -0.6); g.add(keys);
  const lid = new THREE.Group(); lid.position.set(0.2, 0.5 + 0.42, -0.6); g.add(lid);
  const lm = soft('#5a2a1a', 'wood', { roughness: 0.4, clearcoat: 0.6 });
  // lid as frame around a window at the head end (x -0.95 .. -0.45)
  lid.add(at(roundBox(1.4, 0.05, 0.66, lm, 0.02), 0.3, 0.025, 0));
  lid.add(at(roundBox(0.15, 0.05, 0.66, lm, 0.02), -0.93, 0.025, 0));
  for (const s of [-1, 1]) lid.add(at(roundBox(0.5, 0.05, 0.13, lm, 0.02), -0.62, 0.025, s * 0.265));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.4), new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transmission: 0.9, roughness: 0.05, transparent: true, opacity: 0.25, clearcoat: 1 }));
  glass.rotation.x = -Math.PI / 2; glass.position.set(-0.62, 0.045, 0); lid.add(glass);
  const gold = soft('#c8962e', 'metal', { roughness: 0.3 }); lid.add(at(roundBox(0.5, 0.02, 0.44, gold, 0.01), -0.62, 0.052, 0)).children.at(-1).scale.set(1, 1, 1);
  lid.children.at(-1).visible = false;
  const tube = tubeR([V(0.1, 0.05, 0), V(0.1, 0.45, 0), V(0.18, 0.62, 0), V(0.3, 0.62, 0)], () => 0.035, soft('#b8862e', 'metal', { roughness: 0.3 }), { seg: 20, radial: 12 }); lid.add(tube);
  const lock = new THREE.Group(); lock.add(roundBox(0.12, 0.13, 0.05, gold, 0.02)); const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 8, 16, Math.PI), soft('#9a9a9a', 'metal', { roughness: 0.3 })); shackle.position.y = 0.06; lock.add(shackle);
  lock.position.set(0.2 + 0.55, 0.5 + 0.3, -0.6 + 0.34); g.add(lock);
  const windowGlow = new THREE.PointLight('#ffd890', 0, 1.2, 2); windowGlow.position.set(0.2 - 0.62, 0.5 + 0.35, -0.6); g.add(windowGlow);
  // blueprint easel
  const bpT = tex(512, 640, (c, w, h) => { c.fillStyle = '#1f4f8a'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 1; for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.strokeRect(70, 330, 370, 130); c.strokeRect(100, 345, 110, 60); c.beginPath(); c.moveTo(300, 330); c.lineTo(300, 180); c.lineTo(360, 180); c.stroke(); c.beginPath(); c.arc(395, 200, 30, 0, 7); c.stroke();
    c.fillStyle = '#ffffff'; c.font = `700 52px ${SERIF}`; c.textAlign = 'center'; c.fillText('ESCAPE PLAN', w / 2, 90); c.font = `italic 28px ${SERIF}`; c.fillText('window', 155, 500); c.fillText('air tube', 330, 150); c.fillText('bell', 440, 260); c.fillText('lock', 400, 520); });
  const easel = new THREE.Group(); easel.position.set(-1.9, 0, 0.4); easel.rotation.y = 0.5; g.add(easel);
  const em = soft('#6a4a2a', 'wood'); for (const s of [-1, 1]) { const leg = cyl(0.025, 0.025, 1.8, em, 8); leg.position.set(s * 0.35, 0.9, 0); leg.rotation.z = s * 0.08; easel.add(leg); }
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshStandardMaterial({ map: bpT, roughness: 0.8 })); board.position.set(0, 1.35, 0.04); easel.add(board);
  easel.add(at(roundBox(0.84, 0.04, 0.08, em, 0.01), 0, 0.82, 0.04));
  // candles + candelabra
  const cs = []; for (const [x, y, z, hh] of [[-1.0, 0.5, -0.95, 0.24], [1.45, 0.5, -0.95, 0.2], [-2.6, 0, -2.2, 0.3], [2.6, 0, -2.2, 0.3], [-1.6, 0, 0.9, 0.28]]) { const c = candle(hh); c.position.set(x, y, z); if (y === 0) c.scale.setScalar(2.2); g.add(c); cs.push(c); }
  return { group: g, coffin: cof, lid, keys, lock, tubeTop: V(0.2 + 0.3, 0.5 + 0.42 + 0.62, -0.6), windowGlow, easel, board, candles: cs };
}

// ---------------------------------------------------------------- 4/5. cut-away grave: surface strip on top, soil cross-section, coffin below
export function cutawaySet(scene, { withBell = false, withTube = false, night = true } = {}) {
  const g = new THREE.Group(); scene.add(g);
  const dm = soft('#ffffff', 'clay', { map: dirtTex(night ? 5 : 7), roughness: 1 });
  const D = 2.4, W = 4.4, Dz = 2.0; // depth, width, thickness
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, D), dm); back.position.set(0, -D / 2, -Dz / 2); g.add(back);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, Dz), dm); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -D, 0); g.add(floor);
  for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(Dz, D), dm); side.position.set(s * W / 2, -D / 2, 0); side.rotation.y = -s * Math.PI / 2; g.add(side); }
  // cut face rim (thick edge so the section reads as soil)
  const rimM = soft('#3a2618', 'clay', { roughness: 1 });
  g.add(at(roundBox(W + 0.1, 0.12, 0.12, rimM, 0.03), 0, -0.06, Dz / 2), at(roundBox(0.12, D, 0.12, rimM, 0.03), -W / 2, -D / 2, Dz / 2), at(roundBox(0.12, D, 0.12, rimM, 0.03), W / 2, -D / 2, Dz / 2));
  // grass surface (the top of the section) + ground beyond
  const grass = soft('#ffffff', 'clay', { map: grassTex(night ? '#2f4a2a' : '#4a6a3a') });
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, Dz), grass); top.position.set(0, -0.06, 0); top.receiveShadow = true; g.add(top);
  const beyond = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), grass); beyond.rotation.x = -Math.PI / 2; beyond.position.set(0, 0, -Dz / 2 - 20); g.add(beyond);
  // stones and roots in the soil
  const R = rng(night ? 3 : 9); for (let i = 0; i < 12; i++) { const s = sph(0.05 + R() * 0.08, soft('#6a625a', 'clay'), 12, 8); s.position.set((R() - 0.5) * W * 0.9, -0.3 - R() * 1.9, -Dz / 2 + 0.04); g.add(s); }
  for (let i = 0; i < 4; i++) { const x = -1.8 + i * 1.2; const root = tubeR([V(x, -0.12, -Dz / 2 + 0.05), V(x + 0.2, -0.4, -Dz / 2 + 0.05), V(x - 0.1, -0.7, -Dz / 2 + 0.05)], u => 0.02 * (1 - u) + 0.004, soft('#5a3a22', 'wood'), { seg: 16, radial: 6 }); g.add(root); }
  // the coffin at the bottom, open front (cut-away)
  const cof = coffin({ len: 2.0, w: 0.62, h: 0.42, front: false }); cof.position.set(0, -D + 0.02, 0); g.add(cof);
  const lid = null;
  const out = { group: g, coffin: cof, lid, D, floorY: -D + 0.02 };
  if (withTube) {   // glass feeding tube from the coffin's head end up to a funnel at the surface
    const glassM = new THREE.MeshPhysicalMaterial({ color: '#e8f4ff', transmission: 0.7, roughness: 0.08, transparent: true, opacity: 0.35, clearcoat: 1 });
    const pts = [V(-0.75, -D + 0.47, 0.05), V(-0.75, -D + 0.8, 0.05), V(-0.55, -1.2, 0.05), V(-0.5, 0.02, 0.05)];
    const tubeM = tubeR(pts, () => 0.03, glassM, { seg: 40, radial: 12 }); g.add(tubeM);
    const funnel = lathe([[0.03, 0], [0.04, 0.05], [0.16, 0.22], [0.17, 0.24], [0.155, 0.24], [0.03, 0.06]], soft('#c8ccd4', 'metal', { roughness: 0.25 })); funnel.position.set(-0.5, 0.02, 0.05); g.add(funnel);
    out.tubeCurve = new THREE.CatmullRomCurve3(pts.slice().reverse().concat([]).map(p => p.clone()));
    const sausage = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.08, 6, 12), soft('#a8502e', 'clay', { roughness: 0.5 })); g.add(sausage); out.sausage = sausage;
    const soup = cyl(0.026, 0.026, 0.12, soft('#c8782e', 'plastic', { roughness: 0.2, transparent: true, opacity: 0.85 }), 10); g.add(soup); out.soup = soup;
  }
  if (withBell) {   // pipe from the coffin's hand position up to a bell post; string inside
    const pipeM = soft('#7a7a80', 'metal', { roughness: 0.4 });
    const px = 0.15; const pipe = cyl(0.035, 0.035, D - 0.45, pipeM, 12); pipe.position.set(px, -(D - 0.45) / 2 + 0.0, -0.18); g.add(pipe);
    const bp = bellPost(1.15); bp.group.position.set(px - 0.27, 0, -0.18); g.add(bp.group); out.bell = bp.pivot; out.pipeX = px;
    const strM = new THREE.MeshStandardMaterial({ color: '#e8dcc0', roughness: 0.8 });
    out.makeString = () => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V(0, 0, 0), V(0, 1, 0)), 1, 0.006, 6), strM); g.add(m); return m; };
    out.strM = strM;
  }
  return out;
}

// ---------------------------------------------------------------- 7. boxing ring
export function boxingSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), soft('#1a1a20', 'clay')); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const ringH = 0.9, S = 4.2;
  g.add(at(roundBox(S + 0.4, ringH, S + 0.4, soft('#2a3a6a', 'fabric'), 0.04), 0, ringH / 2, 0));
  const canvasT = tex(512, 512, (c, w, h) => { c.fillStyle = '#e8e2d4'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(180,40,40,0.8)'; c.font = '900 80px Inter, Arial'; c.textAlign = 'center'; c.fillText('1890s', w / 2, h / 2 + 30); });
  const mat = new THREE.Mesh(new THREE.BoxGeometry(S, 0.05, S), soft('#ffffff', 'fabric', { map: canvasT })); mat.position.y = ringH + 0.025; mat.receiveShadow = true; g.add(mat);
  const top = ringH + 0.05; const posts = [];
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = cyl(0.06, 0.06, 1.4, soft('#c8c8c8', 'metal', { roughness: 0.3 }), 12); p.position.set(x * S / 2, top + 0.7, z * S / 2); g.add(p); posts.push(p); const pad = roundBox(0.16, 0.4, 0.16, soft('#c83a2a', 'plastic'), 0.04); pad.position.set(x * S / 2, top + 0.85, z * S / 2); g.add(pad); }
  const ropeM = soft('#f2f2ee', 'rubber', { roughness: 0.5 }); const ropeR = soft('#c83a2a', 'rubber', { roughness: 0.5 });
  for (const [i, y] of [0.45, 0.85, 1.25].entries()) for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[-1, -1], [-1, 1]]]) {
    const A = V(a[0] * S / 2, top + y, a[1] * S / 2), B = V(b[0] * S / 2, top + y, b[1] * S / 2); const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(A, B), 1, 0.025, 8), i === 1 ? ropeR : ropeM); m.castShadow = true; g.add(m); }
  // ringside table with the bell (front-left, outside the ring)
  const table = new THREE.Group(); table.position.set(-1.2, 0, S / 2 + 0.8); g.add(table);
  table.add(at(roundBox(1.0, 0.05, 0.55, soft('#6a4a2a', 'wood'), 0.01), 0, 0.76, 0));
  for (const [x, z] of [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]]) table.add(at(cyl(0.025, 0.025, 0.76, soft('#4a3020', 'wood'), 8), x, 0.38, z));
  const brass = soft('#d0a030', 'metal', { roughness: 0.22 });
  const gong = lathe([[0.001, 0.0], [0.12, 0.0], [0.13, 0.03], [0.12, 0.08], [0.08, 0.12], [0.03, 0.135], [0.001, 0.135]], brass); gong.position.set(0.15, 0.79, 0); table.add(gong);
  table.add(at(cyl(0.02, 0.02, 0.06, brass, 8), 0.15, 0.94, 0));
  const hammer = new THREE.Group(); hammer.add(at(cyl(0.01, 0.01, 0.22, soft('#5a3a22', 'wood'), 8), 0, 0.11, 0)); hammer.add(at(cyl(0.03, 0.03, 0.06, soft('#3a3a3a', 'rubber'), 12), 0, 0.23, 0)); hammer.children[1].rotation.z = Math.PI / 2; table.add(hammer);
  // crowd silhouettes and spotlights
  const R = rng(5); for (let i = 0; i < 40; i++) { const a = R() * Math.PI * 2, r = 4.6 + R() * 2.5; const h = 1.3 + R() * 0.4; const body = sph(0.28, soft('#14141a', 'clay'), 12, 10); body.scale.set(1, 1.6, 0.9); body.position.set(Math.cos(a) * r, h * 0.45, Math.sin(a) * r - 1); g.add(body); const head = sph(0.15, soft('#14141a', 'clay'), 12, 10); head.position.set(body.position.x, h * 0.85, body.position.z); g.add(head); }
  const spot = new THREE.SpotLight('#fff2d8', 40, 14, 0.5, 0.5, 1.2); spot.position.set(0, 7, 1); spot.target.position.set(0, 1, 0); spot.castShadow = true; g.add(spot, spot.target);
  return { group: g, top, S, table, gong, hammer };
}
