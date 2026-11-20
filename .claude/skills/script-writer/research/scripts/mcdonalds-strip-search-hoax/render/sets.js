// Sets for "The Phone Call" (McDonald's strip-search hoax, 2004). Premium look: PBR materials with procedural maps,
// practical lights (area panels, lamps, sodium poles), HDRI reflections, no glow tricks.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { canvasTexture, rng } from 'kit';
RectAreaLightUniformsLib.init();

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const phys = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.6, ...o });
export const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
export const box = (w, h, d, m, x = 0, y = 0, z = 0, r = 0) => { const g = r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d); const o = sh(new THREE.Mesh(g, m)); o.position.set(x, y, z); return o; };
export const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 24) => { const o = sh(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m)); o.position.set(x, y, z); return o; };
const rep = (t, x, y) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
const nrm = t => { t.colorSpace = THREE.NoColorSpace; return t; };

// ---------- procedural textures ----------
export function textTex(lines, { w = 1024, h = 512, bg = '#f5f1e6', color = '#222', font = 'bold 72px Caption, sans-serif', lineH = 90, align = 'center' } = {}) {
  return canvasTexture(w, h, g => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } g.fillStyle = color; g.font = font; g.textAlign = align; g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, align === 'center' ? w / 2 : 40, h / 2 + (i - (lines.length - 1) / 2) * lineH)); });
}
function tileTex(c1, c2, grout, n = 8, seed = 3, jitter = 10) {
  const R = rng(seed);
  return canvasTexture(1024, 1024, (g, w) => { g.fillStyle = grout; g.fillRect(0, 0, w, w); const s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const base = new THREE.Color((i + j) % 2 ? c1 : c2); const k = (R() - .5) * jitter / 255;
      g.fillStyle = '#' + base.clone().offsetHSL(0, 0, k).getHexString(); g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      for (let q = 0; q < 30; q++) { g.fillStyle = `rgba(0,0,0,${R() * 0.05})`; g.fillRect(i * s + R() * s, j * s + R() * s, 2 + R() * 10, 2 + R() * 10); } } });
}
function tileNormal(n = 8) {
  return nrm(canvasTexture(512, 512, (g, w) => { g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, w); const s = w / n;
    for (let i = 0; i <= n; i++) { g.fillStyle = 'rgb(100,128,255)'; g.fillRect(i * s - 2, 0, 2, w); g.fillStyle = 'rgb(156,128,255)'; g.fillRect(i * s, 0, 2, w);
      g.fillStyle = 'rgb(128,100,255)'; g.fillRect(0, i * s - 2, w, 2); g.fillStyle = 'rgb(128,156,255)'; g.fillRect(0, i * s, w, 2); } }));
}
function noiseTex(base, amt = 14, seed = 1, w = 512, streak = false) {
  const R = rng(seed); const c = new THREE.Color(base);
  return canvasTexture(w, w, g => { g.fillStyle = base; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 6000; i++) { const k = (R() - .5) * amt / 255; g.fillStyle = '#' + c.clone().offsetHSL(0, 0, k).getHexString(); if (streak) g.fillRect(R() * w, R() * w, 1 + R() * 2, 20 + R() * 80); else g.fillRect(R() * w, R() * w, 2 + R() * 6, 2 + R() * 6); } });
}
function woodTex(base = '#6b4429', seed = 4) {
  const R = rng(seed), c = new THREE.Color(base);
  return canvasTexture(1024, 1024, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const y = R() * h, k = (R() - .5) * 0.12; g.strokeStyle = '#' + c.clone().offsetHSL(0, 0.02, k).getHexString(); g.lineWidth = 1 + R() * 5; g.globalAlpha = 0.5 + R() * 0.5;
      g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6 + (R() - .5) * 2); g.stroke(); } g.globalAlpha = 1; });
}
function brushedNormal() {
  const R = rng(9);
  return nrm(canvasTexture(256, 256, (g, w) => { g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, w); for (let i = 0; i < 700; i++) { const v = 110 + R() * 36; g.fillStyle = `rgb(128,${v},255)`; g.fillRect(0, R() * w, w, 1); } }));
}
const steel = () => phys('#c9ccd0', { metalness: 1, roughness: 0.32, normalMap: rep(brushedNormal(), 2, 2), normalScale: new THREE.Vector2(0.25, 0.25) });

// ---------- the telephone (beige 2000s office desk phone, coiled cord) ----------
export function makePhone() {
  const g = new THREE.Group();
  const beige = phys('#d6ccb6', { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const dark = phys('#2a2724', { roughness: 0.5 });
  const base = sh(new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.06, 0.22, 4, 0.018), beige)); base.position.y = 0.03; g.add(base);
  const wedge = sh(new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.04, 0.12, 4, 0.015), beige)); wedge.position.set(0, 0.07, -0.045); wedge.rotation.x = -0.22; g.add(wedge);
  // keypad panel with printed digits
  const keyTex = canvasTexture(256, 320, (c, w, h) => { c.fillStyle = '#cfc5ae'; c.fillRect(0, 0, w, h); const lab = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    lab.forEach((l, i) => { const x = 40 + (i % 3) * 88, y = 30 + Math.floor(i / 3) * 76; c.fillStyle = '#efe9dc'; c.beginPath(); c.roundRect(x - 30, y - 22, 60, 44, 10); c.fill(); c.fillStyle = '#3a342c'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(l, x, y); }); });
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.094), phys('#ffffff', { map: keyTex, roughness: 0.35 })); pad.rotation.x = -Math.PI / 2 + 0.1; pad.position.set(0.045, 0.062, 0.045); g.add(pad);
  const keys = [];
  for (let i = 0; i < 12; i++) { const k = sh(new THREE.Mesh(new RoundedBoxGeometry(0.016, 0.006, 0.012, 2, 0.002), phys('#efe9dc', { roughness: 0.3 }))); k.position.set(0.045 - 0.026 + (i % 3) * 0.026, 0.065, 0.045 - 0.034 + Math.floor(i / 3) * 0.022); g.add(k); keys.push(k); }
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.02), phys('#6f7a64', { roughness: 0.2, clearcoat: 1 })); lcd.rotation.x = -Math.PI / 2 + 0.1; lcd.position.set(-0.05, 0.062, 0.07); g.add(lcd);
  const ledM = phys('#5a1010', { emissive: '#ff2a1a', emissiveIntensity: 0 }); const led = sh(new THREE.Mesh(new THREE.SphereGeometry(0.004, 10, 8), ledM)); led.position.set(-0.07, 0.065, 0.09); g.add(led);
  for (const s of [-1, 1]) { const prong = box(0.03, 0.02, 0.02, beige, s * 0.075, 0.1, -0.075, 0.006); g.add(prong); }
  // receiver: local +x along its length; earpiece at -x, mouthpiece at +x; grip at centre
  const rec = new THREE.Group();
  const handle = sh(new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.03, 0.045, 4, 0.013), beige)); rec.add(handle);
  for (const s of [-1, 1]) { const cup = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.035, 24), beige)); cup.position.set(s * 0.085, -0.02, 0); rec.add(cup);
    const grill = new THREE.Mesh(new THREE.CircleGeometry(0.02, 20), dark); grill.rotation.x = Math.PI / 2; grill.position.set(s * 0.085, -0.038, 0); rec.add(grill); }
  g.add(rec);
  const restPos = V(0, 0.115, -0.075), restRot = new THREE.Euler(0, 0, 0);
  rec.position.copy(restPos);
  // coiled cord: base left side → receiver mouthpiece end; rebuilt when the receiver moves
  const cordM = phys('#cfc5ae', { roughness: 0.45 }); let cord = null;
  const cordFrom = V(-0.1, 0.03, 0.02);
  function updateCord(world = false) {
    g.updateMatrixWorld(true);
    const a = cordFrom.clone(), b = g.worldToLocal(rec.localToWorld(V(0.1, -0.012, 0)));
    const mid = a.clone().lerp(b, 0.5); mid.y = Math.min(a.y, b.y) - 0.05 - a.distanceTo(b) * 0.25; mid.x -= 0.04;
    const spine = new THREE.QuadraticBezierCurve3(a, mid, b);
    const L = spine.getLength(), turns = Math.max(10, Math.floor(L / 0.008)), pts = [];
    const up = V(0, 1, 0);
    for (let i = 0; i <= turns * 8; i++) { const u = i / (turns * 8), p = spine.getPointAt(u), tg = spine.getTangentAt(u).normalize();
      const n1 = new THREE.Vector3().crossVectors(tg, Math.abs(tg.y) > 0.9 ? V(1, 0, 0) : up).normalize(), n2 = new THREE.Vector3().crossVectors(tg, n1);
      const ang = u * turns * Math.PI * 2; pts.push(p.add(n1.multiplyScalar(Math.cos(ang) * 0.007)).add(n2.multiplyScalar(Math.sin(ang) * 0.007))); }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length, 0.0022, 5, false);
    if (cord) { cord.geometry.dispose(); cord.geometry = geo; } else { cord = sh(new THREE.Mesh(geo, cordM)); g.add(cord); }
  }
  updateCord();
  let lastKey = '';
  return {
    group: g, receiver: rec, keys, led: ledM,
    /** receiver on cradle */
    rest() { if (rec.parent !== g) g.add(rec); rec.position.copy(restPos); rec.rotation.copy(restRot); },
    /** place receiver in WORLD space (pos, quaternion) — e.g. at a character's ear */
    setWorld(pos, quat) { if (rec.parent !== g) g.add(rec); g.updateMatrixWorld(true); rec.position.copy(g.worldToLocal(pos.clone()));
      const pq = g.getWorldQuaternion(new THREE.Quaternion()).invert(); rec.quaternion.copy(pq.multiply(quat)); },
    ring(t, on) { const k = on ? Math.sin(t * 70) * 0.004 * (Math.sin(t * 6) > 0 ? 1 : 0) : 0; if (rec.parent === g && rec.position.distanceTo(restPos) < 0.01) rec.position.y = restPos.y + Math.abs(k); base.rotation.z = k * 1.5; ledM.emissiveIntensity = on && Math.sin(t * 6) > 0 ? 2.5 : 0.1; },
    press(i, k) { keys.forEach((kk, j) => kk.position.y = 0.065 - (j === i ? 0.003 * k : 0)); },
    updateCord(force = false) { const key = rec.position.toArray().map(v => v.toFixed(3)).join() + rec.quaternion.toArray().map(v => v.toFixed(2)).join(); if (force || key !== lastKey) { lastKey = key; updateCord(); } },
  };
}
/** world-space receiver transform for a character holding it to the right ear */
export function receiverAtEar(c, side = 'R') {
  c.group.updateMatrixWorld(true);
  const H = c.head, hr = 0.112;
  const pos = H.localToWorld(V(side === 'R' ? -hr * 0.95 : hr * 0.95, -hr * 0.55, hr * 0.35));
  const q = H.getWorldQuaternion(new THREE.Quaternion());
  // receiver +x points from ear (top) down toward mouth: rotate so +x ≈ head-down/forward
  const local = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, side === 'R' ? 0.25 : -0.25, -Math.PI / 2 + (side === 'R' ? 0.35 : -0.35)));
  return { pos, quat: q.multiply(local) };
}

// ---------- caller shadow decal (silhouette with a police-style cap, or bare) ----------
export function shadowDecal(w = 1.6, h = 1.6) {
  const draw = cap => canvasTexture(512, 512, (g, W) => {
    g.clearRect(0, 0, W, W); g.filter = 'blur(3px)'; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(256, 520, 210, 150, 0, Math.PI, 0); g.fill();                  // shoulders
    g.fillRect(222, 300, 70, 110);                                                             // neck
    g.beginPath(); g.ellipse(258, 255, 78, 95, 0, 0, Math.PI * 2); g.fill();                  // head
    g.beginPath(); g.ellipse(200, 270, 26, 70, 0.35, 0, Math.PI * 2); g.fill();               // receiver at the ear
    if (cap) { g.beginPath(); g.moveTo(170, 190); g.lineTo(350, 190); g.lineTo(372, 120); g.quadraticCurveTo(262, 70, 150, 122); g.closePath(); g.fill();   // crown
      g.beginPath(); g.ellipse(268, 196, 120, 22, -0.05, 0, Math.PI * 2); g.fill(); }        // brim
  });
  const tCap = draw(true), tBare = draw(false);
  const mk = t => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, color: '#000000' }));
  const g = new THREE.Group(), a = mk(tCap), b = mk(tBare); b.position.z = 0.001; g.add(a, b);
  return { group: g, set(capA, bareA) { a.material.opacity = capA; b.material.opacity = bareA; } };
}

// ---------- the restaurant: dining/counter + kitchen + corridor + manager's office (one connected set) ----------
export function restaurant(scene) {
  const K = {};
  const tile = phys('#ffffff', { map: rep(tileTex('#8a3b2a', '#7a3324', '#4a3a30', 8, 3), 3, 3), normalMap: rep(tileNormal(8), 3, 3), normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.38, clearcoat: 0.25, clearcoatRoughness: 0.3 });
  const floor = sh(new THREE.Mesh(new THREE.PlaneGeometry(14, 14), tile)); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -0.6); scene.add(floor);
  const offFloor = sh(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.4), phys('#ffffff', { map: rep(tileTex('#b9b2a2', '#aea796', '#8e877a', 6, 8, 8), 2, 2), normalMap: rep(tileNormal(6), 2, 2), roughness: 0.45, clearcoat: 0.15 })));
  offFloor.rotation.x = -Math.PI / 2; offFloor.position.set(3.4, 0.003, -4.9); scene.add(offFloor);
  const paint = c => phys('#ffffff', { map: noiseTex(c, 10, 2), roughness: 0.9 });
  const wallM = paint('#d9cbb2'), offWall = paint('#cfc6b4'), kitchenWall = phys('#ffffff', { map: rep(tileTex('#eeeae2', '#e8e4dc', '#bdb7ab', 10, 5, 6), 3, 1.5), normalMap: rep(tileNormal(10), 3, 1.5), normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.25, clearcoat: 0.3 });
  const W = (w, h, x, y, z, ry = 0, m = wallM, t = 0.12) => { const o = box(w, h, t, m, x, y, z); o.rotation.y = ry; scene.add(o); return o; };
  // ceilings
  const ceilM = phys('#ffffff', { map: rep(tileTex('#e9e6df', '#e4e1da', '#b8b3a8', 6, 12, 4), 4, 4), roughness: 0.95 });
  const ceil = sh(new THREE.Mesh(new THREE.PlaneGeometry(14, 14), ceilM)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.0, -0.6); scene.add(ceil);
  const offCeil = sh(new THREE.Mesh(new THREE.PlaneGeometry(5, 4), ceilM)); offCeil.rotation.x = Math.PI / 2; offCeil.position.set(2.9, 2.7, -4.9); scene.add(offCeil);
  // ---- outer shell: dining front windows (z=5.6) with night outside, side walls
  const night = canvasTexture(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#05070d'); gr.addColorStop(0.62, '#0d1526'); gr.addColorStop(0.66, '#1a1a1e'); gr.addColorStop(1, '#0c0c0e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const R = rng(4); for (let i = 0; i < 14; i++) { const x = R() * w; g.fillStyle = 'rgba(255,190,110,0.85)'; g.beginPath(); g.arc(x, h * 0.6 - R() * 30, 2 + R() * 3, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,170,90,0.5)'; for (let i = 0; i < 6; i++) g.fillRect(R() * w, h * 0.66, 40 + R() * 60, 3); });
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshBasicMaterial({ map: night })); outside.position.set(0, 2, 7.5); outside.rotation.y = Math.PI; scene.add(outside);
  const mull = phys('#2b2b2e', { roughness: 0.4, metalness: 0.6 });
  for (let i = 0; i <= 6; i++) scene.add(box(0.08, 2.4, 0.1, mull, -6 + i * 2, 1.9, 5.6));
  scene.add(box(12.2, 0.7, 0.2, wallM, 0, 0.35, 5.6)); scene.add(box(12.2, 0.12, 0.12, mull, 0, 0.7, 5.6)); scene.add(box(12.2, 0.1, 0.12, mull, 0, 3.1 - 0.05, 5.6));
  const glass = phys('#9fb4c4', { roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1 });
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.4), glass); gl.position.set(0, 1.9, 5.62); scene.add(gl);
  W(9, 3, -6.05, 1.5, 1.2, Math.PI / 2); W(9, 3, 6.05, 1.5, 1.2, Math.PI / 2);
  // ---- dining: booths + tables
  const vinyl = phys('#7a2a22', { roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.3 }), tableTop = phys('#ffffff', { map: noiseTex('#d8cfbf', 12, 6), roughness: 0.3, clearcoat: 0.6 });
  for (const [x, z] of [[-4.2, 2.4], [-4.2, 4.3], [4.2, 2.4], [4.2, 4.3], [-1.5, 3.6], [1.5, 3.6]]) {
    scene.add(box(1.1, 0.04, 0.75, tableTop, x, 0.76, z, 0.015)); scene.add(cyl(0.05, 0.08, 0.74, steel(), x, 0.37, z, 12));
    for (const s of [-1, 1]) { scene.add(box(1.1, 0.45, 0.5, vinyl, x, 0.22, z + s * 0.7, 0.05)); scene.add(box(1.1, 0.7, 0.14, vinyl, x, 0.75, z + s * 0.97, 0.05)); }
  }
  // ---- counter (z ≈ 0): front panel, top, registers, napkin/straw dispensers, tray stack
  const ctrFront = phys('#ffffff', { map: rep(woodTex('#7a4a2b', 8), 4, 1), roughness: 0.5, clearcoat: 0.4 });
  scene.add(box(5.6, 1.0, 0.7, ctrFront, -0.3, 0.5, 0.0, 0.02));
  scene.add(box(5.8, 0.05, 0.84, phys('#ffffff', { map: noiseTex('#b8b0a2', 18, 7), roughness: 0.22, clearcoat: 0.8 }), -0.3, 1.025, 0.0, 0.01));
  scene.add(box(5.6, 0.12, 0.08, phys('#d9a427', { roughness: 0.35, metalness: 0.3 }), -0.3, 0.88, 0.36));
  const regM = phys('#2c2c30', { roughness: 0.45 }), scrM = phys('#1a2a22', { emissive: '#3fae7a', emissiveIntensity: 0.6, roughness: 0.2 });
  K.registers = [];
  for (const x of [-1.9, 0.2]) { const r = new THREE.Group(); r.add(box(0.36, 0.1, 0.3, regM, 0, 0.05, 0, 0.02)); const scr = box(0.26, 0.17, 0.03, regM, 0, 0.22, -0.05, 0.01); scr.rotation.x = -0.35; r.add(scr);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.13), scrM); s.position.set(0, 0.225, -0.032); s.rotation.x = -0.35; r.add(s); r.position.set(x, 1.05, -0.12); r.rotation.y = Math.PI; scene.add(r); K.registers.push(r); }
  for (let i = 0; i < 8; i++) scene.add(box(0.42, 0.012, 0.32, phys(['#a32a22', '#8c2a24'][i % 2], { roughness: 0.3, clearcoat: 0.6 }), 2.0, 1.06 + i * 0.013, 0.1));
  scene.add(box(0.14, 0.2, 0.12, steel(), -1.1, 1.15, 0.2, 0.01)); scene.add(box(0.14, 0.2, 0.12, steel(), 1.2, 1.15, 0.2, 0.01));
  // ---- menu boards above the kitchen front (facing customers)
  const menu = (title, items, seed) => canvasTexture(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d1d22'); gr.addColorStop(1, '#121216'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9a427'; g.fillRect(0, 0, w, 70); g.fillStyle = '#2a1414'; g.font = 'bold 48px Caption, sans-serif'; g.textAlign = 'center'; g.fillText(title, w / 2, 50);
    const R = rng(seed); items.forEach((it, i) => { const x = 60 + (i % 2) * 480, y = 120 + Math.floor(i / 2) * 120;
      const c = g.createRadialGradient(x + 60, y + 40, 4, x + 60, y + 40, 60); c.addColorStop(0, ['#e0a050', '#c97a35', '#d9b070'][i % 3]); c.addColorStop(1, '#5a3418'); g.fillStyle = c; g.beginPath(); g.ellipse(x + 60, y + 45, 58, 36, 0, 0, 7); g.fill();
      g.fillStyle = '#f2ece0'; g.font = 'bold 34px Caption, sans-serif'; g.textAlign = 'left'; g.fillText(it, x + 140, y + 40); g.fillStyle = '#d9a427'; g.font = 'bold 30px sans-serif'; g.fillText('$' + (1 + R() * 4).toFixed(2), x + 140, y + 80); }); });
  [['BURGERS', ['Double Stack', 'Classic', 'Deluxe', 'Fish Fillet', 'Chicken', 'Value Meal'], 1], ['BREAKFAST', ['Hotcakes', 'Biscuit', 'Muffin', 'Hash Brown', 'Coffee', 'Juice'], 2], ['DRINKS & SIDES', ['Fries', 'Shake', 'Soda', 'Pie', 'Sundae', 'Salad'], 3]].forEach(([t, it, sd], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), phys('#ffffff', { map: menu(t, it, sd), emissive: '#ffffff', emissiveMap: menu(t, it, sd), emissiveIntensity: 0.55, roughness: 0.25, clearcoat: 1 }));
    m.position.set(-2.1 + i * 1.8, 2.45, -0.9); scene.add(m); scene.add(box(1.78, 0.93, 0.06, phys('#111114', { roughness: 0.4, metalness: 0.5 }), -2.1 + i * 1.8, 2.45, -0.94)); });
  scene.add(box(5.8, 0.5, 0.12, phys('#7a1e1e', { roughness: 0.5 }), -0.3, 2.85, -0.9));
  // ---- kitchen: back wall (z=-3.2) with corridor opening (x 0.4..1.6) and office front wall (x 1.6..5.2) with interior window
  W(6.4, 3, -2.8, 1.5, -3.2, 0, kitchenWall);                              // x -6..0.4
  W(0.8, 3, 5.6, 1.5, -3.2, 0, kitchenWall);                               // x 5.2..6
  W(1.2, 0.6, 1.0, 2.7, -3.2, 0, kitchenWall);                              // header over corridor opening
  // office front wall with window opening x 2.3..4.3, y 1.0..1.9
  W(0.7, 2.7, 1.95, 1.35, -3.2, 0, offWall, 0.14); W(0.9, 2.7, 4.75, 1.35, -3.2, 0, offWall, 0.14);
  W(2.0, 1.0, 3.3, 0.5, -3.2, 0, offWall, 0.14); W(2.0, 0.8, 3.3, 2.3, -3.2, 0, offWall, 0.14);
  W(3.6, 0.3, 3.4, 2.85, -3.2, 0, kitchenWall, 0.14);
  const frameM = phys('#3a3a3e', { roughness: 0.4, metalness: 0.5 });
  scene.add(box(2.06, 0.05, 0.18, frameM, 3.3, 1.0, -3.2)); scene.add(box(2.06, 0.05, 0.18, frameM, 3.3, 1.9, -3.2)); scene.add(box(0.05, 0.95, 0.18, frameM, 2.3, 1.45, -3.2)); scene.add(box(0.05, 0.95, 0.18, frameM, 4.3, 1.45, -3.2));
  const owin = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.9), phys('#a8bccb', { roughness: 0.04, transparent: true, opacity: 0.1, clearcoat: 1 })); owin.position.set(3.3, 1.45, -3.2); scene.add(owin);
  // blinds (half raised) on the office window
  for (let i = 0; i < 9; i++) { const sl = box(2.0, 0.008, 0.05, phys('#e7e1d2', { roughness: 0.5 }), 3.3, 1.88 - i * 0.022, -3.28); sl.rotation.x = 0.6; scene.add(sl); }
  // fryers, grill, prep, heat-lamp pass
  for (let i = 0; i < 3; i++) { const x = -4.6 + i * 0.75; scene.add(box(0.7, 0.95, 0.75, steel(), x, 0.475, -2.75, 0.01)); const oil = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), phys('#5a3a10', { roughness: 0.05, clearcoat: 1, metalness: 0.2 })); oil.rotation.x = -Math.PI / 2; oil.position.set(x, 0.951, -2.75); scene.add(oil);
    const bask = box(0.36, 0.12, 0.3, phys('#9a9a9a', { metalness: 1, roughness: 0.5, wireframe: false }), x, 1.03, -2.62); scene.add(bask); }
  scene.add(box(1.6, 0.92, 0.8, steel(), -1.6, 0.46, -2.75, 0.01)); scene.add(box(1.6, 0.02, 0.7, phys('#1c1c1c', { metalness: 0.8, roughness: 0.6 }), -1.6, 0.93, -2.75));
  scene.add(box(1.4, 1.6, 0.6, steel(), -1.6, 2.3, -2.9, 0.01));                                      // hood
  scene.add(box(3.0, 0.9, 0.6, steel(), -2.5, 0.45, -1.2, 0.01)); scene.add(box(3.0, 0.04, 0.5, steel(), -2.5, 1.45, -1.2)); // prep + pass shelf
  for (let i = 0; i < 4; i++) { const lamp = box(0.6, 0.06, 0.3, steel(), -3.6 + i * 0.75, 1.75, -1.2); scene.add(lamp); const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.22), new THREE.MeshBasicMaterial({ color: '#ff9a4a' })); hl.rotation.x = Math.PI / 2; hl.position.set(-3.6 + i * 0.75, 1.715, -1.2); scene.add(hl); }
  for (let i = 0; i < 6; i++) { const w = box(0.14, 0.09, 0.12, phys(['#e6c27a', '#d9b26a'][i % 2], { roughness: 0.6 }), -3.7 + i * 0.4, 1.52, -1.2, 0.02); scene.add(w); }
  scene.add(box(0.9, 1.9, 0.7, steel(), 5.45, 0.95, -2.75, 0.01));                                       // walk-in fridge door-ish unit
  scene.add(box(1.2, 0.9, 0.6, steel(), 2.0, 0.45, -1.2, 0.01)); scene.add(box(0.5, 0.5, 0.45, phys('#2a2a2e', { roughness: 0.3, metalness: 0.4 }), 1.8, 1.15, -1.2, 0.02));    // drinks station
  // ---- corridor (x 0.4..1.6, z -3.2..-6.6): west wall, back exit door, clock
  W(3.4, 2.7, 0.4, 1.35, -4.9, Math.PI / 2, offWall); W(1.3, 2.7, 1.0, 1.35, -6.6, 0, offWall);
  const ccl = sh(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.4), ceilM)); ccl.rotation.x = Math.PI / 2; ccl.position.set(1.0, 2.7, -4.9); scene.add(ccl);
  const doorM = phys('#5d6a76', { roughness: 0.45, metalness: 0.3, clearcoat: 0.3 });
  const exitDoor = new THREE.Group(); exitDoor.position.set(0.6, 0, -6.55); scene.add(exitDoor);
  exitDoor.add(box(0.85, 2.05, 0.05, doorM, 0.425, 1.025, 0)); exitDoor.add(box(0.7, 0.04, 0.05, steel(), 0.43, 1.0, 0.05)); K.exitDoor = exitDoor;
  const exitOut = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.3), new THREE.MeshBasicMaterial({ map: night })); exitOut.position.set(1.0, 1.1, -6.75); scene.add(exitOut);
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.13), new THREE.MeshBasicMaterial({ map: textTex(['EXIT'], { w: 256, h: 96, bg: '#1a0606', color: '#ff3a2a', font: 'bold 70px sans-serif' }) })); exitSign.position.set(1.0, 2.35, -6.53); scene.add(exitSign);
  K.exitLight = new THREE.PointLight('#ff3a2a', 0.35, 2.5, 2); K.exitLight.position.set(1.0, 2.25, -6.3); scene.add(K.exitLight);
  // clock on the corridor wall (facing +x), opposite the office door
  const clock = new THREE.Group(); clock.position.set(0.47, 2.15, -4.45); clock.rotation.y = Math.PI / 2; scene.add(clock);
  clock.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 40), phys('#1d1d20', { roughness: 0.4 }))).rotateX(Math.PI / 2));
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.15, 40), phys('#ffffff', { map: canvasTexture(256, 256, (g, w) => { g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, w); g.fillStyle = '#222'; for (let i = 0; i < 12; i++) { g.save(); g.translate(128, 128); g.rotate(i * Math.PI / 6); g.fillRect(-3, -118, 6, i % 3 ? 14 : 24); g.restore(); } }), roughness: 0.3, clearcoat: 1 }));
  face.position.z = 0.021; clock.add(face);
  const hand = (len, w, c) => { const h = new THREE.Group(); const m = box(w, len, 0.004, phys(c, { roughness: 0.4 }), 0, len * 0.4, 0); h.add(m); h.position.z = 0.026; clock.add(h); return h; };
  K.clockH = hand(0.08, 0.012, '#151515'); K.clockM = hand(0.12, 0.008, '#151515'); K.clockS = hand(0.13, 0.003, '#b02020');
  // ---- office (x 1.6..5.2, z -6.6..-3.2)
  W(3.6, 2.7, 3.4, 1.35, -6.6, 0, offWall, 0.14); W(3.4, 2.7, 5.2, 1.35, -4.9, Math.PI / 2, offWall, 0.14);
  // west wall with door opening z -4.0..-4.9
  W(0.8, 2.7, 1.6, 1.35, -3.6, Math.PI / 2, offWall, 0.14); W(1.7, 2.7, 1.6, 1.35, -5.75, Math.PI / 2, offWall, 0.14); W(0.9, 0.6, 1.6, 2.4, -4.45, Math.PI / 2, offWall, 0.14);
  const oDoor = new THREE.Group(); oDoor.position.set(1.62, 0, -4.0); scene.add(oDoor);     // hinge at z=-4.0; door spans -z when closed; open = rotation.y -1.45 (into the office, against the front wall)
  const leaf = box(0.05, 2.08, 0.88, phys('#ffffff', { map: woodTex('#8a6a48', 12), roughness: 0.45, clearcoat: 0.3 }), 0, 1.04, -0.44); oDoor.add(leaf);
  oDoor.add(box(0.1, 0.03, 0.03, steel(), -0.06, 1.0, -0.8)); oDoor.add(box(0.1, 0.03, 0.03, steel(), 0.06, 1.0, -0.8));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), new THREE.MeshBasicMaterial({ map: textTex(['OFFICE'], { w: 256, h: 96, bg: '#e7e1d2', color: '#333', font: 'bold 54px sans-serif' }) })); sign.rotation.y = -Math.PI / 2; sign.position.set(-0.03, 1.6, -0.44); oDoor.add(sign);
  K.officeDoor = oDoor;   // rotation.y: 0 = closed, ~ -1.6 = open into the office
  scene.add(box(0.06, 0.04, 0.95, phys('#2a2016', { roughness: 0.6 }), 1.6, 0.02, -4.45));           // threshold
  // desk, chair, phone, lamp, bag, paperwork
  const deskWood = phys('#ffffff', { map: rep(woodTex('#6a4a32', 21), 1, 1), roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.25 });
  const desk = new THREE.Group(); desk.position.set(3.4, 0, -5.6); scene.add(desk);
  desk.add(box(1.5, 0.04, 0.78, deskWood, 0, 0.76, 0, 0.01)); desk.add(box(0.04, 0.74, 0.74, deskWood, -0.72, 0.37, 0)); desk.add(box(0.45, 0.74, 0.74, deskWood, 0.5, 0.37, 0, 0.01)); desk.add(box(1.4, 0.5, 0.03, deskWood, 0, 0.45, 0.3));
  for (let i = 0; i < 3; i++) desk.add(box(0.012, 0.012, 0.12, steel(), 0.5, 0.18 + i * 0.22, 0.38));
  K.deskTop = 0.78;
  const phone = makePhone(); phone.group.position.set(3.0, 0.78, -5.42); phone.group.rotation.y = 0.15; scene.add(phone.group); K.phone = phone;
  const chair = new THREE.Group(); chair.position.set(3.4, 0, -6.2); scene.add(chair);
  const fabric = phys('#2a2c33', { roughness: 0.9, sheen: 0.4 });
  chair.add(box(0.48, 0.08, 0.46, fabric, 0, 0.48, 0, 0.03)); chair.add(box(0.46, 0.55, 0.07, fabric, 0, 0.82, -0.22, 0.03)); chair.add(cyl(0.025, 0.025, 0.4, steel(), 0, 0.25, 0, 10));
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const l = box(0.3, 0.025, 0.04, steel(), Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15); l.rotation.y = -a; chair.add(l); }
  K.chair = chair;
  const lamp = new THREE.Group(); lamp.position.set(4.0, 0.78, -5.85); scene.add(lamp);
  lamp.add(cyl(0.07, 0.08, 0.02, phys('#1f2a1f', { roughness: 0.3, metalness: 0.5 }), 0, 0.01, 0)); const arm = cyl(0.008, 0.008, 0.42, steel(), 0, 0.22, 0, 8); lamp.add(arm);
  const shade = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 0.12, 24, 1, true), phys('#1e4a2a', { roughness: 0.3, metalness: 0.4, side: THREE.DoubleSide }))); shade.position.set(-0.06, 0.42, 0.06); shade.rotation.set(0.5, 0, 0.4); lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff1d0' })); bulb.position.set(-0.07, 0.39, 0.07); lamp.add(bulb);
  const lampL = new THREE.SpotLight('#ffcf94', 6, 4, 0.95, 0.7, 1.6); lampL.position.set(3.93, 1.16, -5.78); lampL.target.position.set(3.4, 0.6, -5.2); lampL.castShadow = true; lampL.shadow.mapSize.set(1024, 1024); lampL.shadow.bias = -0.0004; scene.add(lampL, lampL.target); K.lampL = lampL;
  // papers, mug, schedule clipboard, paper bag
  const paperM = phys('#f2efe6', { roughness: 0.8 });
  for (let i = 0; i < 5; i++) { const p = box(0.21, 0.003, 0.29, paperM, 3.55 + i * 0.01, 0.785 + i * 0.003, -5.55 + i * 0.008); p.rotation.y = 0.1 * i - 0.2; scene.add(p); }
  const mug = cyl(0.04, 0.036, 0.1, phys('#7a1e1e', { roughness: 0.3, clearcoat: 0.8 }), 3.85, 0.83, -5.35, 20); scene.add(mug);
  const bagM = phys('#a8885e', { roughness: 0.95, normalMap: rep(brushedNormal(), 1, 1), normalScale: new THREE.Vector2(0.4, 0.4) });
  const bag = new THREE.Group(); bag.position.set(2.75, 0.78, -5.75); scene.add(bag); bag.add(box(0.26, 0.32, 0.16, bagM, 0, 0.16, 0, 0.005)); K.bag = bag;
  const folded = new THREE.Group(); scene.add(folded); K.folded = folded;          // folded uniform shirt + visor, lowered into the bag
  folded.add(box(0.22, 0.04, 0.18, phys('#8c1f24', { roughness: 0.85, sheen: 0.4 }), 0, 0.02, 0, 0.015)); folded.add(box(0.06, 0.02, 0.05, phys('#a8262c', { roughness: 0.85 }), 0, 0.05, -0.05, 0.01));
  const visor = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 24, 1, false, -Math.PI / 2, Math.PI), phys('#151518', { roughness: 0.55 }))); visor.position.set(0.02, 0.07, 0.02); folded.add(visor);
  // filing cabinets, safe, shelves with boxes, cork board, calendar, coat hook
  const cabM = phys('#7d8580', { roughness: 0.4, metalness: 0.5, clearcoat: 0.2 });
  for (let i = 0; i < 2; i++) { scene.add(box(0.5, 1.3, 0.6, cabM, 4.85 - i * 0.55, 0.65, -6.25, 0.01)); for (let j = 0; j < 4; j++) scene.add(box(0.16, 0.03, 0.02, steel(), 4.85 - i * 0.55, 0.3 + j * 0.3, -5.94)); }
  scene.add(box(0.6, 0.7, 0.55, phys('#2c2f33', { roughness: 0.35, metalness: 0.7 }), 4.85, 0.35, -3.65, 0.02));
  const dial = cyl(0.06, 0.06, 0.02, steel(), 4.56, 0.42, -3.65, 24); dial.rotation.z = Math.PI / 2; scene.add(dial);
  const shelf = phys('#ffffff', { map: woodTex('#9a7a58', 33), roughness: 0.55 });
  for (let j = 0; j < 3; j++) { scene.add(box(0.35, 0.03, 1.4, shelf, 5.0, 1.3 + j * 0.4, -4.7)); for (let k = 0; k < 4; k++) scene.add(box(0.3, 0.25, 0.28, phys(['#a8885e', '#9b7b52', '#b39468'][(j + k) % 3], { roughness: 0.95 }), 5.0, 1.44 + j * 0.4, -5.2 + k * 0.33, 0.01)); }
  const cork = box(0.9, 0.6, 0.03, phys('#ffffff', { map: noiseTex('#a87a4a', 40, 13), roughness: 0.95 }), 2.3, 1.65, -6.52); scene.add(cork);
  for (let i = 0; i < 6; i++) { const n = box(0.14, 0.18, 0.004, phys(['#f3eed8', '#f6e48a', '#dfe9f5'][i % 3], { roughness: 0.8 }), 2.0 + (i % 3) * 0.28, 1.78 - Math.floor(i / 3) * 0.26, -6.5); n.rotation.z = (i * 0.37 % 0.3) - 0.15; scene.add(n); }
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.46), phys('#ffffff', { map: canvasTexture(256, 340, (g, w, h) => { g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, w, h); g.fillStyle = '#8c1f24'; g.fillRect(0, 0, w, 60); g.fillStyle = '#fff'; g.font = 'bold 36px sans-serif'; g.textAlign = 'center'; g.fillText('APRIL', w / 2, 44);
    g.fillStyle = '#333'; g.font = '20px sans-serif'; for (let d = 1; d <= 30; d++) { const x = 22 + ((d + 3) % 7) * 35, y = 100 + Math.floor((d + 3) / 7) * 46; g.fillText(String(d), x + 8, y); } }), roughness: 0.8 }));
  cal.position.set(4.6, 1.7, -6.52); scene.add(cal);
  // shadow decal on the back wall, behind whoever stands at the desk
  const dec = shadowDecal(1.7, 1.7); dec.group.position.set(3.25, 1.75, -6.52); scene.add(dec.group); K.decal = dec;
  // ---- lighting: fluorescent area panels (front, kitchen, office, corridor) + shadow key spots
  const panel = (x, y, z, w, d, int, col = '#f2f5ff') => { const l = new THREE.RectAreaLight(col, int, w, d); l.position.set(x, y, z); l.lookAt(x, 0, z); scene.add(l);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: col })); f.rotation.x = Math.PI / 2; f.position.set(x, y - 0.005, z); scene.add(f); return { l, f }; };
  K.front = [panel(-2, 2.99, 2.5, 1.2, 0.6, 6, '#fff3e0'), panel(2, 2.99, 2.5, 1.2, 0.6, 6, '#fff3e0'), panel(0, 2.99, 0.9, 1.2, 0.6, 6, '#fff3e0')];
  K.kitchen = [panel(-2.5, 2.99, -2.0, 1.2, 0.6, 7), panel(1.5, 2.99, -2.0, 1.2, 0.6, 7)];
  K.office = panel(3.4, 2.69, -4.8, 1.2, 0.6, 7, '#eef3ff');
  K.corr = panel(1.0, 2.69, -4.7, 0.6, 0.3, 4, '#eef3ff');
  const key = new THREE.SpotLight('#fff0dc', 18, 14, 0.75, 0.8, 1.4); key.position.set(0.5, 2.9, 1.8); key.target.position.set(0, 0.8, -0.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; scene.add(key, key.target); K.frontKey = key;
  const okey = new THREE.SpotLight('#eef3ff', 14, 6, 0.95, 0.8, 1.4); okey.position.set(3.0, 2.65, -4.4); okey.target.position.set(3.3, 0.5, -5.8); okey.castShadow = true; okey.shadow.mapSize.set(1024, 1024); okey.shadow.bias = -0.0004; scene.add(okey, okey.target); K.officeKey = okey;
  // under-door light strip (seen from the corridor when the door is shut)
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.012), new THREE.MeshBasicMaterial({ color: '#ffe0b0', transparent: true, opacity: 0 })); strip.rotation.y = -Math.PI / 2; strip.position.set(1.585, 0.008, -4.45); scene.add(strip); K.strip = strip;
  return K;
}

// ---------- exterior: the restaurant at dusk (retro mansard roof, brick, warm windows), parking lot, sodium lights ----------
export function exterior(scene) {
  const K = {};
  const sky = canvasTexture(1024, 1024, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#14213d'); gr.addColorStop(0.45, '#33476e'); gr.addColorStop(0.62, '#7a6070'); gr.addColorStop(0.72, '#e08a52'); gr.addColorStop(0.78, '#3a2a2a'); gr.addColorStop(1, '#121214'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  sky.mapping = THREE.EquirectangularReflectionMapping; scene.background = sky; scene.fog = new THREE.Fog('#2a2a38', 25, 90);
  const asph = phys('#ffffff', { map: rep(noiseTex('#2c2c30', 26, 17), 8, 8), roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.5 });
  const ground = sh(new THREE.Mesh(new THREE.PlaneGeometry(200, 200), asph)); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  for (let i = 0; i < 9; i++) { const l = box(0.1, 0.005, 4.5, phys('#d8d4c8', { roughness: 0.7 }), -10 + i * 2.6, 0.005, 12); scene.add(l); }
  const grass = sh(new THREE.Mesh(new THREE.PlaneGeometry(200, 60), phys('#ffffff', { map: rep(noiseTex('#2a3420', 30, 3), 20, 6), roughness: 1 }))); grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0.01, -45); scene.add(grass);
  // building (x -8..8, z -5..5)
  const brick = phys('#ffffff', { map: rep(canvasTexture(512, 512, (g, w) => { const R = rng(8); g.fillStyle = '#4a3a30'; g.fillRect(0, 0, w, w); for (let y = 0; y < 32; y++) for (let x = 0; x < 9; x++) { const v = 0.85 + R() * 0.3; g.fillStyle = `rgb(${150 * v | 0},${78 * v | 0},${56 * v | 0})`; g.fillRect(x * 60 + (y % 2) * 30 - 30, y * 16 + 1, 57, 14); } }), 6, 2), roughness: 0.85 });
  scene.add(box(16, 3.2, 10, brick, 0, 1.6, 0));
  const roof = phys('#7a1f1c', { roughness: 0.55, clearcoat: 0.3 });
  const mans = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 8.6, 1.6, 4, 1), roof); mans.rotation.y = Math.PI / 4; mans.scale.set(1.32, 1, 0.85); mans.position.y = 4.0; sh(mans); scene.add(mans);
  scene.add(box(16.4, 0.3, 10.4, phys('#d9a427', { roughness: 0.4, metalness: 0.3 }), 0, 3.25, 0));
  // warm windows with an interior painted behind (counter, menu glow, booths)
  const interior = canvasTexture(2048, 512, (g, w, h) => { const R2 = rng(77); let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#efe3c8'); gr.addColorStop(0.18, '#e6cfa2'); gr.addColorStop(0.6, '#c99a64'); gr.addColorStop(1, '#7a4a2c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fffaf0'; for (let i = 0; i < 9; i++) { g.fillRect(60 + i * 225, 14, 120, 16); }
    for (let i = 0; i < 5; i++) { const x = 140 + i * 380; g.fillStyle = '#1e1a1c'; g.fillRect(x, 70, 300, 120); g.fillStyle = '#d9a427'; g.fillRect(x, 70, 300, 22); g.fillStyle = 'rgba(240,200,140,0.6)'; for (let k = 0; k < 6; k++) g.fillRect(x + 20 + (k % 3) * 95, 110 + Math.floor(k / 3) * 40, 70, 22); }
    g.fillStyle = '#5a3420'; g.fillRect(0, 300, w, 46); g.fillStyle = '#d9a427'; g.fillRect(0, 300, w, 6);
    for (let i = 0; i < 10; i++) { const x = 30 + i * 205; g.fillStyle = '#6e2420'; g.beginPath(); g.roundRect(x, 360, 150, 150, 18); g.fill(); g.fillStyle = '#d8cfbf'; g.fillRect(x + 20, 392, 110, 12); }
    for (let i = 0; i < 6; i++) { const x = 200 + R2() * 1600; g.fillStyle = 'rgba(40,24,20,0.85)'; g.beginPath(); g.ellipse(x, 300, 26, 34, 0, 0, 7); g.fill(); g.fillRect(x - 34, 330, 68, 110); }
    gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,0.08)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshBasicMaterial({ map: interior })); win.position.set(0, 1.75, 5.02); scene.add(win); K.win = win;
  for (let i = 0; i <= 7; i++) scene.add(box(0.1, 2.3, 0.1, phys('#2b2b2e', { roughness: 0.4, metalness: 0.6 }), -7 + i * 2, 1.75, 5.06));
  const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.0), new THREE.MeshBasicMaterial({ map: interior })); sideWin.rotation.y = Math.PI / 2; sideWin.position.set(8.02, 1.7, 0); scene.add(sideWin);
  // door + warm spill
  const spill = new THREE.PointLight('#ffc98a', 10, 12, 1.6); spill.position.set(0, 2, 6.5); scene.add(spill);
  // pylon sign (generic, no brand marks)
  const sign = new THREE.Group(); sign.position.set(-11, 0, 9); scene.add(sign);
  sign.add(cyl(0.18, 0.22, 8, phys('#8a8d90', { metalness: 0.8, roughness: 0.35 }), 0, 4, 0));
  const face = textTex(['BURGERS', 'OPEN 24 HRS'], { w: 1024, h: 512, bg: '#b3221d', color: '#f6c63a', font: 'bold 150px Caption, sans-serif', lineH: 190 });
  const board = new THREE.Mesh(new RoundedBoxGeometry(3.4, 1.7, 0.4, 3, 0.1), [phys('#8a1a16'), phys('#8a1a16'), phys('#8a1a16'), phys('#8a1a16'), phys('#ffffff', { map: face, emissive: '#ffffff', emissiveMap: face, emissiveIntensity: 0.7 }), phys('#8a1a16')]);
  board.position.y = 8.2; sign.add(board);
  // parked cars (simple rounded bodies, glass, wheels)
  const car = (x, z, col, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); const paintM = phys(col, { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08, metalness: 0.5 });
    g.add(box(1.8, 0.6, 4.3, paintM, 0, 0.6, 0, 0.18)); const cab = box(1.6, 0.55, 2.2, phys('#0d1218', { roughness: 0.05, metalness: 0.4, clearcoat: 1 }), 0, 1.15, -0.2, 0.18); g.add(cab);
    for (const [a, b] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) { const w = cyl(0.34, 0.34, 0.24, phys('#111', { roughness: 0.7 }), a, 0.34, b, 20); w.rotation.z = Math.PI / 2; g.add(w); } };
  car(-6.1, 12, '#5a6470', 0.02); car(-3.5, 12.3, '#7a1e1e', -0.03); car(4.3, 11.8, '#c8c2b4', 0.04); car(9.5, 12.2, '#1f2c44', 0);
  // sodium light poles (shadow-casting key + rim)
  const pole = (x, z, cast) => { scene.add(cyl(0.08, 0.1, 7, phys('#5a5e62', { metalness: 0.8, roughness: 0.4 }), x, 3.5, z)); const head = box(0.9, 0.12, 0.35, phys('#2a2a2e'), x, 7, z); scene.add(head);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.28), new THREE.MeshBasicMaterial({ color: '#ffcf8a' })); lens.rotation.x = Math.PI / 2; lens.position.set(x, 6.93, z); scene.add(lens);
    const l = new THREE.SpotLight('#ffb766', 120, 22, 0.9, 0.6, 1.5); l.position.set(x, 6.9, z); l.target.position.set(x, 0, z - 1); l.castShadow = cast; if (cast) { l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0004; } scene.add(l, l.target); };
  pole(-8, 15, true); pole(8, 15, false);
  // tree line + telephone poles along the road (ties to the "line" set)
  const R = rng(31);
  for (let i = 0; i < 40; i++) { const x = -60 + i * 3 + R() * 2, z = -28 - R() * 8, hh = 4 + R() * 5; const t = sh(new THREE.Mesh(new THREE.ConeGeometry(1.6 + R(), hh, 7), phys('#141a14', { roughness: 1 }))); t.position.set(x, hh / 2, z); scene.add(t); }
  const road = sh(new THREE.Mesh(new THREE.PlaneGeometry(200, 8), phys('#ffffff', { map: rep(noiseTex('#232326', 20, 5), 30, 1), roughness: 0.5, clearcoat: 0.3 }))); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 22); scene.add(road);
  for (let i = 0; i < 9; i++) { const x = -48 + i * 12; scene.add(cyl(0.12, 0.14, 9, phys('#3a2c22', { roughness: 0.9 }), x, 4.5, 27)); scene.add(box(1.6, 0.1, 0.1, phys('#3a2c22'), x, 8.4, 27)); }
  for (let k = 0; k < 2; k++) { const pts = []; for (let i = 0; i <= 96; i++) { const x = -48 + i; const u = (x + 48) % 12 / 12; pts.push(V(x, 8.5 - Math.sin(u * Math.PI) * 0.6, 27 + (k ? 0.6 : -0.6))); } scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.02, 4), phys('#111'))); }
  scene.add(new THREE.HemisphereLight('#7a8ab8', '#1a1410', 0.9));
  const dusk = new THREE.DirectionalLight('#ffb27a', 1.6); dusk.position.set(-20, 10, 30); scene.add(dusk);
  return K;
}

// ---------- the line: night countryside, telephone poles and wire, ending at a lone window where the caller stands ----------
export function lineSet(scene) {
  const K = {};
  const sky = canvasTexture(1024, 1024, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1122'); gr.addColorStop(0.42, '#1c2a48'); gr.addColorStop(0.5, '#3a4664'); gr.addColorStop(0.53, '#1a2030'); gr.addColorStop(1, '#0a0c10'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  sky.mapping = THREE.EquirectangularReflectionMapping; scene.background = sky; scene.fog = new THREE.FogExp2('#1a2236', 0.009);
  const ground = sh(new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 80, 80), phys('#ffffff', { map: rep(noiseTex('#2a3426', 24, 21), 30, 30), roughness: 1 })));
  { const P = ground.geometry.attributes.position, R = rng(2); for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, Math.sin(x * 0.03) * 2 + Math.cos(y * 0.025) * 2.5 + (Math.abs(y + 0) < 6 ? -1.5 : 0)); } ground.geometry.computeVertexNormals(); }
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const moon = new THREE.DirectionalLight('#9fb4ff', 3.2); moon.position.set(-30, 40, -60); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 200 }); scene.add(moon);
  scene.add(new THREE.HemisphereLight('#5a6a98', '#0a0a08', 0.9));
  const moonD = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshBasicMaterial({ color: '#e8ecf6', fog: false })); moonD.position.set(-80, 60, -170); moonD.lookAt(0, 0, 0); scene.add(moonD);
  // poles along +x… the line runs from x=0 (restaurant end) to x=180 (caller end)
  const wood = phys('#ffffff', { map: rep(woodTex('#3e3026', 41), 1, 6), roughness: 0.9 });
  const poles = []; const R = rng(9);
  for (let i = 0; i <= 15; i++) { const x = i * 12, z = Math.sin(i * 0.5) * 2; poles.push(V(x, 0, z));
    scene.add(cyl(0.13, 0.17, 9, wood, x, 4.5, z, 10)); const arm = box(0.12, 0.12, 2.0, wood, x, 8.4, z); scene.add(arm);
    for (const s of [-0.8, 0.8]) scene.add(cyl(0.05, 0.05, 0.14, phys('#4a6a5a', { roughness: 0.2, clearcoat: 1 }), x, 8.55, z + s, 10)); }
  const wires = [];
  for (const s of [-0.8, 0.8]) { const pts = []; for (let i = 0; i < poles.length - 1; i++) for (let k = 0; k < 12; k++) { const u = k / 12, a = poles[i], b = poles[i + 1]; pts.push(V(a.x + (b.x - a.x) * u, 8.62 - Math.sin(u * Math.PI) * 0.7, a.z + (b.z - a.z) * u + s)); }
    pts.push(V(poles[poles.length - 1].x, 8.62, poles[poles.length - 1].z + s)); const c = new THREE.CatmullRomCurve3(pts); wires.push(c);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(c, 800, 0.022, 5), phys('#0e0e10', { roughness: 0.4 }))); }
  K.wire = wires[1];
  // farmhouses with lit windows scattered in the dark
  for (let i = 0; i < 9; i++) { const x = 15 + R() * 150, z = (R() < 0.5 ? -1 : 1) * (20 + R() * 40); const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = R() * 3; scene.add(h);
    h.add(box(6, 3, 5, phys('#3a3634', { roughness: 0.9 }), 0, 1.5, 0)); const rf = sh(new THREE.Mesh(new THREE.ConeGeometry(4.6, 2, 4), phys('#1e1a18'))); rf.rotation.y = Math.PI / 4; rf.position.y = 4; h.add(rf);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: '#ffc77a' })); w.position.set(1.2, 1.6, 2.51); h.add(w); }
  for (let i = 0; i < 70; i++) { const x = R() * 200 - 10, z = (R() < 0.5 ? -1 : 1) * (12 + R() * 70), hh = 5 + R() * 7; const t = sh(new THREE.Mesh(new THREE.ConeGeometry(1.5 + R() * 1.5, hh, 7), phys('#0f140f', { roughness: 1 }))); t.position.set(x, hh / 2 - 1, z); scene.add(t); }
  // caller's room at the far end: a small dark building with one window; inside, a cold lamp behind the silhouette
  const room = new THREE.Group(); room.position.set(186, 0, 0); scene.add(room); K.room = room;
  const rw = phys('#ffffff', { map: noiseTex('#7a746a', 16, 44), roughness: 0.95 });
  room.add(box(0.2, 4, 6, rw, -2, 2, 0)); room.add(box(4, 4, 0.2, rw, 0, 2, -3)); room.add(box(4, 4, 0.2, rw, 0, 2, 3)); room.add(box(0.2, 4, 6, rw, 2, 2, 0)); room.add(box(4.4, 0.2, 6.4, rw, 0, 4.1, 0));
  // window hole in the west wall (x=-2): rebuild as frame pieces so the camera can fly in
  room.children[0].visible = false;
  room.add(box(0.2, 4, 2.0, rw, -2, 2, -2.0)); room.add(box(0.2, 4, 2.0, rw, -2, 2, 2.0)); room.add(box(0.2, 1.2, 2.0, rw, -2, 0.6, 0)); room.add(box(0.2, 1.2, 2.0, rw, -2, 3.4, 0));
  room.add(box(0.06, 1.6, 0.06, phys('#1a1a1a'), -2.05, 2.0, 0)); room.add(box(0.06, 0.06, 2.0, phys('#1a1a1a'), -2.05, 2.0, 0));
  const back = new THREE.SpotLight('#b8ccff', 30, 8, 0.8, 0.5, 1.5); back.position.set(1.7, 2.6, 0.2); back.target.position.set(-1.5, 1.4, 0); back.castShadow = true; back.shadow.mapSize.set(1024, 1024); room.add(back, back.target); K.back = back;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: '#dfe8ff' })); bulb.position.set(1.75, 2.62, 0.2); room.add(bulb);
  const floorIn = sh(new THREE.Mesh(new THREE.PlaneGeometry(4, 6), phys('#1d1b19', { roughness: 0.8 }))); floorIn.rotation.x = -Math.PI / 2; floorIn.position.y = 0.01; room.add(floorIn);
  const wallphone = makePhone(); wallphone.group.position.set(1.2, 0.95, -1.3); wallphone.group.rotation.y = -1.2; room.add(wallphone.group); K.phone = wallphone;
  room.add(box(0.8, 0.04, 0.6, phys('#2a2420', { roughness: 0.6 }), 1.3, 0.93, -1.3)); room.add(box(0.05, 0.9, 0.05, phys('#2a2420'), 1.0, 0.46, -1.1));
  // wall where the caller's shadow falls (inside, south wall)
  const dec = shadowDecal(2.2, 2.2); dec.group.position.set(0.4, 2.0, 2.88); dec.group.rotation.y = Math.PI; room.add(dec.group); K.decal = dec;
  return K;
}

// ---------- the map: contiguous US, dark, with 32 call markers and a Florida focus ----------
export async function mapSet(scene, loadWorld) {
  const K = {};
  scene.background = new THREE.Color('#06080d');
  const world = await loadWorld('50m');
  const lon0 = -128, lon1 = -64, lat0 = 22, lat1 = 52, w = 2048, h = Math.round(2048 * (lat1 - lat0) / (lon1 - lon0) / Math.cos(37 * Math.PI / 180));
  const X = lo => (lo - lon0) / (lon1 - lon0) * w, Y = la => (lat1 - la) / (lat1 - lat0) * h;
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h; const g = cvs.getContext('2d');
  g.fillStyle = '#0a0e16'; g.fillRect(0, 0, w, h);
  const ring = (r) => { let prev = null; for (const [lo, la] of r) { if (!prev || Math.abs(lo - prev) > 180) g.moveTo(X(lo), Y(la)); else g.lineTo(X(lo), Y(la)); prev = lo; } g.closePath(); };
  for (const f of world.land.features) { const us = f.id === '840'; g.fillStyle = us ? '#3a4352' : '#1a1f28'; g.beginPath(); const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; for (const p of polys) for (const r of p) ring(r); g.fill('evenodd'); }
  g.strokeStyle = 'rgba(160,175,200,0.35)'; g.lineWidth = 2; g.beginPath(); for (const l of world.borders.coordinates) ring(l); g.stroke();
  const tex = new THREE.CanvasTexture(cvs); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const MW = 8, MH = MW * h / w;
  const map = sh(new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), phys('#ffffff', { map: tex, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.4 }))); map.rotation.x = -Math.PI / 2; scene.add(map);
  const LL = (lo, la, y = 0) => V((X(lo) / w - 0.5) * MW, y, (Y(la) / h - 0.5) * MH);
  K.LL = LL;
  // 32 markers: sample points inside the US polygon (illustrative spread, not specific incident sites)
  const R = rng(32), pts = []; const px = g.getImageData(0, 0, w, h).data;
  while (pts.length < 32) { const lo = -122 + R() * 52, la = 27 + R() * 21; const i = (Math.floor(Y(la)) * w + Math.floor(X(lo))) * 4; if (px[i] === 0x3a && px[i + 1] === 0x43 && !(lo > -84 && la < 30.5)) { if (pts.every(p => Math.hypot(p[0] - lo, (p[1] - la) * 1.3) > 3.2)) pts.push([lo, la]); } }
  const markM = phys('#e04a3a', { roughness: 0.3, clearcoat: 1, emissive: '#e04a3a', emissiveIntensity: 0.35 });
  K.marks = pts.map(([lo, la]) => { const m = new THREE.Group(); m.position.copy(LL(lo, la)); scene.add(m);
    const pin = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 16), markM)); pin.position.y = 0.04; m.add(pin);
    const ringM = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.065, 32), new THREE.MeshBasicMaterial({ color: '#ff6a52', transparent: true, opacity: 0, depthWrite: false })); ringM.rotation.x = -Math.PI / 2; ringM.position.y = 0.005; m.add(ringM);
    m.userData.ring = ringM; m.scale.setScalar(0.001); return m; });
  K.florida = LL(-81.6, 28.3);
  const fl = new THREE.Group(); fl.position.copy(K.florida); scene.add(fl); K.fl = fl;
  const fpin = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 20), phys('#f2c14a', { roughness: 0.3, clearcoat: 1, emissive: '#f2c14a', emissiveIntensity: 0.3 }))); fpin.position.y = 0.07; fl.add(fpin);
  const key = new THREE.SpotLight('#cfd8ff', 60, 20, 0.8, 0.7, 1.5); key.position.set(-2, 6, 3); key.target.position.set(0, 0, 0); key.castShadow = true; scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight('#4a5a7a', '#050505', 0.4));
  return K;
}

// ---------- courtroom (Florida): wood panelling, bench, jury box, defence table; daylight through tall windows ----------
export function courtSet(scene, makeCast, LOOKS) {
  const K = {};
  const wood = phys('#ffffff', { map: rep(woodTex('#5a3a24', 51), 2, 1), roughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  const woodL = phys('#ffffff', { map: rep(woodTex('#7a5636', 52), 2, 1), roughness: 0.45, clearcoat: 0.3 });
  const carpet = phys('#ffffff', { map: rep(noiseTex('#3a2a4a', 18, 61), 6, 6), roughness: 1, sheen: 0.4 });
  const floor = sh(new THREE.Mesh(new THREE.PlaneGeometry(14, 16), carpet)); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const wallM = phys('#ffffff', { map: noiseTex('#d8cdb8', 10, 62), roughness: 0.9 });
  const W = (w, h, x, y, z, ry = 0, m = wallM) => { const o = box(w, h, 0.2, m, x, y, z); o.rotation.y = ry; scene.add(o); return o; };
  W(14, 6, 0, 3, -6); W(16, 6, -7, 3, 0, Math.PI / 2); W(16, 6, 7, 3, 0, Math.PI / 2); W(14, 6, 0, 3, 8);
  scene.add(box(14, 1.2, 0.1, wood, 0, 0.6, -5.88)); for (const x of [-7, 7]) { const o = box(16, 1.2, 0.1, wood, x * 0.985, 0.6, 0); o.rotation.y = Math.PI / 2; scene.add(o); }
  const ceil = sh(new THREE.Mesh(new THREE.PlaneGeometry(14, 16), phys('#e8e2d6', { roughness: 0.9 }))); ceil.rotation.x = Math.PI / 2; ceil.position.y = 6; scene.add(ceil);
  // bench (raised), seal, flags
  scene.add(box(4.2, 0.4, 2.4, wood, 0, 0.2, -4.6)); scene.add(box(4.0, 1.3, 0.6, wood, 0, 1.05, -3.6, 0.02)); scene.add(box(4.2, 0.08, 0.9, woodL, 0, 1.74, -3.75, 0.02));
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.8, 64), phys('#ffffff', { map: canvasTexture(512, 512, (g, w) => { g.fillStyle = '#c9a44a'; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill(); g.fillStyle = '#1f2a4a'; g.beginPath(); g.arc(256, 256, 210, 0, 7); g.fill();
    g.fillStyle = '#c9a44a'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 60 : 140, a = i / 10 * Math.PI * 2 - Math.PI / 2; g.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); } g.fill(); }), roughness: 0.3, metalness: 0.5 }));
  seal.position.set(0, 3.6, -5.88); scene.add(seal);
  const flag = (x, tex) => { scene.add(cyl(0.03, 0.03, 2.8, phys('#c9a44a', { metalness: 1, roughness: 0.3 }), x, 1.4, -5.4)); const f = sh(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4, 12, 12), phys('#ffffff', { map: tex, side: THREE.DoubleSide, roughness: 0.8, sheen: 0.5 })));
    const P = f.geometry.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, Math.sin(P.getY(i) * 5) * 0.04); f.geometry.computeVertexNormals(); f.position.set(x + 0.47, 2.0, -5.4); scene.add(f); };
  flag(-2.8, canvasTexture(256, 400, (g, w, h) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f2efe6' : '#a3222a'; g.fillRect(0, i * h / 13, w, h / 13 + 1); } g.fillStyle = '#1f2f5a'; g.fillRect(0, 0, w * 0.55, h * 0.42); }));
  flag(2.4, canvasTexture(256, 400, (g, w, h) => { g.fillStyle = '#f2efe6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a3222a'; g.lineWidth = 40; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); }));
  // judge
  const judge = makeCast({ ...LOOKS.generic, top: 'robe', topColor: '#111116', hairStyle: 'grey', hairColor: '#9a9590', age: 0.8, sex: 'm' }); judge.group.position.set(0, 0.4, -4.4); scene.add(judge.group); K.judge = judge;
  // gavel + block + verdict form on the bench
  const gav = new THREE.Group(); scene.add(gav); K.gavel = gav;
  const head = cyl(0.045, 0.045, 0.16, phys('#3a2414', { roughness: 0.3, clearcoat: 0.8 }), 0, 0, 0, 20); head.rotation.z = Math.PI / 2; gav.add(head); const handle = cyl(0.012, 0.014, 0.26, phys('#4a2e1a', { roughness: 0.3, clearcoat: 0.8 }), 0, -0.13, 0, 10); gav.add(handle);
  scene.add(cyl(0.08, 0.09, 0.03, phys('#3a2414', { roughness: 0.3, clearcoat: 0.8 }), 0.55, 1.795, -3.55, 24));
  const verdict = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), phys('#ffffff', { map: textTex(['VERDICT', '', 'NOT GUILTY'], { w: 384, h: 512, bg: '#f4f1e8', color: '#1a1a1a', font: 'bold 52px serif', lineH: 70 }), roughness: 0.8 }));
  verdict.rotation.x = -Math.PI / 2; verdict.position.set(-0.4, 1.785, -3.6); verdict.rotation.z = 0.1; scene.add(verdict); K.verdict = verdict;
  // jury box (stage left) with 12 jurors on two tiers
  scene.add(box(1.8, 0.3, 4.6, wood, 5.6, 0.15, -1.4)); scene.add(box(0.9, 0.3, 4.6, wood, 6.1, 0.45, -1.4)); scene.add(box(0.1, 0.9, 4.6, woodL, 4.65, 0.75, -1.4));
  const juryLooks = [['#7a8aa0', '#3a2c22', 'f'], ['#a05a4a', '#1c1512', 'm'], ['#4a6a5a', '#8a6a4a', 'f'], ['#d8d0c0', '#5a4030', 'm'], ['#5a4a6a', '#2a2018', 'f'], ['#8a7a5a', '#b0aca4', 'm']];
  K.jurors = [];
  for (let i = 0; i < 12; i++) { const L = juryLooks[i % 6]; const j = makeCast({ sex: L[2], height: 1.68, top: 'polo', topColor: L[0], hairColor: L[1], hairStyle: L[2] === 'f' ? 'bob' : 'short', skin: ['#e2ae8e', '#b07a58', '#f0c6a6', '#8a5a3a'][i % 4], badge: false, pants: '#2a2a30' });
    const tier = i < 6 ? 0 : 1; j.sit(1); j.group.position.set(5.3 + tier * 0.6, 0.3 + tier * 0.3, -3.3 + (i % 6) * 0.75); j.group.rotation.y = -Math.PI / 2; scene.add(j.group); K.jurors.push(j); }
  // tables, defendant (seen from behind only), counsel
  scene.add(box(2.2, 0.06, 1.0, woodL, -2.0, 0.78, 0.6, 0.01)); scene.add(box(2.2, 0.06, 1.0, woodL, 2.0, 0.78, 0.6, 0.01));
  for (const x of [-3.0, -1.0, 1.0, 3.0]) scene.add(box(0.06, 0.76, 0.9, woodL, x, 0.38, 0.6));
  const def = makeCast({ ...LOOKS.generic, hairColor: '#3a3026', topColor: '#30343e' }); def.sit(1); def.group.position.set(-1.6, 0, 1.45); def.group.rotation.y = Math.PI; scene.add(def.group); K.def = def;
  const law = makeCast({ ...LOOKS.generic, hairColor: '#6a5a4a', topColor: '#1e2026', hairStyle: 'short' }); law.sit(1); law.group.position.set(-2.5, 0, 1.45); law.group.rotation.y = Math.PI; scene.add(law.group);
  const pro = makeCast({ ...LOOKS.generic, sex: 'f', hairStyle: 'bob', hairColor: '#2a2018', topColor: '#3a2a3a' }); pro.sit(1); pro.group.position.set(2.0, 0, 1.45); pro.group.rotation.y = Math.PI; scene.add(pro.group);
  for (let r = 0; r < 3; r++) { scene.add(box(5, 0.08, 0.5, woodL, -3.5, 0.48, 3.5 + r * 1.2)); scene.add(box(5, 0.6, 0.08, woodL, -3.5, 0.8, 3.75 + r * 1.2)); scene.add(box(5, 0.08, 0.5, woodL, 3.5, 0.48, 3.5 + r * 1.2)); scene.add(box(5, 0.6, 0.08, woodL, 3.5, 0.8, 3.75 + r * 1.2)); }
  scene.add(box(10, 0.9, 0.08, wood, 0, 0.45, 2.6));   // bar rail
  // tall windows (west wall) with daylight shafts
  for (let i = 0; i < 3; i++) { const z = -3 + i * 3.5; const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.2), new THREE.MeshBasicMaterial({ color: '#eaf2ff' })); win.rotation.y = Math.PI / 2; win.position.set(-6.88, 3.2, z); scene.add(win); }
  const sun = new THREE.DirectionalLight('#fff1d8', 5); sun.position.set(-14, 9, -2); sun.target.position.set(0, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, far: 40 }); sun.shadow.bias = -0.0004; scene.add(sun, sun.target);
  const fill = new THREE.RectAreaLight('#fff6ea', 3, 6, 6); fill.position.set(0, 5.9, 0); fill.lookAt(0, 0, 0); scene.add(fill);
  return K;
}

// ---------- the void: the phone in a pool of light, an empty doorway, an empty chair, and a line of growing dominoes ----------
export function voidSet(scene) {
  const K = {};
  scene.background = new THREE.Color('#060607'); scene.fog = new THREE.Fog('#060607', 6, 22);
  const floor = sh(new THREE.Mesh(new THREE.PlaneGeometry(80, 80), phys('#141416', { roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2, normalMap: rep(tileNormal(2), 20, 20), normalScale: new THREE.Vector2(0.05, 0.05) })));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  // the same desk + phone as the office (consistency): desk at origin, phone on it
  const deskWood = phys('#ffffff', { map: rep(woodTex('#6a4a32', 21), 1, 1), roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.25 });
  scene.add(box(1.5, 0.04, 0.78, deskWood, 0, 0.76, 0, 0.01)); scene.add(box(0.04, 0.74, 0.74, deskWood, -0.72, 0.37, 0)); scene.add(box(0.45, 0.74, 0.74, deskWood, 0.5, 0.37, 0, 0.01));
  const phone = makePhone(); phone.group.position.set(-0.25, 0.78, 0.12); phone.group.rotation.y = 0.15; scene.add(phone.group); K.phone = phone;
  const pool = new THREE.SpotLight('#ffe2b8', 40, 8, 0.42, 0.75, 1.4); pool.position.set(0.3, 4.2, 0.8); pool.target.position.set(-0.1, 0.78, 0.1); pool.castShadow = true; pool.shadow.mapSize.set(2048, 2048); pool.shadow.bias = -0.0003; scene.add(pool, pool.target); K.pool = pool;
  const rim = new THREE.SpotLight('#8fb0ff', 14, 10, 0.5, 0.6, 1.5); rim.position.set(-2.5, 2.5, -3); rim.target.position.set(0, 0.8, 0); scene.add(rim, rim.target); K.rim = rim;
  // empty doorway (left) and empty chair (right)
  const frameM = phys('#3a2c22', { roughness: 0.5, clearcoat: 0.3 });
  const door = new THREE.Group(); door.position.set(-3.2, 0, -1.2); door.rotation.y = 0.5; scene.add(door); K.door = door;
  door.add(box(0.12, 2.2, 0.16, frameM, -0.5, 1.1, 0)); door.add(box(0.12, 2.2, 0.16, frameM, 0.5, 1.1, 0)); door.add(box(1.12, 0.12, 0.16, frameM, 0, 2.2, 0));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 2.1), new THREE.MeshBasicMaterial({ map: canvasTexture(128, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a2234'); gr.addColorStop(0.7, '#5a6a8a'); gr.addColorStop(1, '#c8d4ea'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) })); glow.position.set(0, 1.05, -0.05); door.add(glow);
  const dl = new THREE.SpotLight('#9fb6ff', 16, 7, 0.6, 0.6, 1.5); dl.position.set(-3.4, 2.4, -2.6); dl.target.position.set(-2.8, 0, 0.2); scene.add(dl, dl.target); K.doorLight = dl;
  const chair = new THREE.Group(); chair.position.set(2.6, 0, -0.6); chair.rotation.y = -0.6; scene.add(chair); K.chair = chair;
  const fab = phys('#2a2c33', { roughness: 0.9, sheen: 0.4 }), st = phys('#c9ccd0', { metalness: 1, roughness: 0.3 });
  chair.add(box(0.48, 0.08, 0.46, fab, 0, 0.48, 0, 0.03)); chair.add(box(0.46, 0.55, 0.07, fab, 0, 0.82, -0.22, 0.03)); chair.add(cyl(0.025, 0.025, 0.4, st, 0, 0.25, 0, 10));
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const l = box(0.3, 0.025, 0.04, st, Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15); l.rotation.y = -a; chair.add(l); }
  const cl = new THREE.SpotLight('#ffe2b8', 14, 6, 0.4, 0.7, 1.5); cl.position.set(2.8, 3.6, 0.4); cl.target.position.set(2.6, 0, -0.6); cl.castShadow = true; scene.add(cl, cl.target); K.chairLight = cl;
  // dominoes: start beside the phone on the desk, then on the floor, each bigger, running away into the dark (−z)
  const labels = ['BRING HER IN', 'SEARCH HER', 'TAKE HER CLOTHES', 'WATCH HER'];
  const dom = []; let z = 0.05, sc = 0.09;
  const domM = (i) => phys('#ffffff', { map: textTex(i < labels.length ? [labels[i]] : [''], { w: 256, h: 512, bg: '#e9e4d8', color: '#2a1a1a', font: 'bold 44px Caption, sans-serif' }), roughness: 0.35, clearcoat: 0.6 });
  const darkM = phys('#1b1b1e', { roughness: 0.35, clearcoat: 0.6 });
  for (let i = 0; i < 10; i++) {
    const h = sc, w = h * 0.5, d = h * 0.14;
    const onDesk = i === 0;
    const pivot = new THREE.Group(); scene.add(pivot);
    const y0 = onDesk ? 0.78 : 0, x = onDesk ? 0.35 : 0.35;
    pivot.position.set(x, y0, onDesk ? 0.05 : z);
    const m = sh(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(d * 0.3, 0.02)), [darkM, darkM, darkM, darkM, domM(i), darkM]));
    m.position.set(0, h / 2, -d / 2); pivot.add(m);   // pivot at the far bottom edge so it topples toward −z
    dom.push({ pivot, h, d, z: pivot.position.z, y0 });
    if (i === 0) { z = -0.7; sc = 0.22; } else { z -= sc * 0.62 + 0.12; sc *= 1.42; }
  }
  // contact angle for each domino resting on the next
  for (let i = 0; i < dom.length; i++) { const a = dom[i], b = dom[i + 1]; if (!b || a.y0 !== b.y0) { a.rest = Math.PI / 2 * 0.98; continue; } const gap = Math.abs(a.z - a.d - b.z) + 0.001; a.rest = Math.min(Math.PI / 2, Math.asin(Math.min(1, (gap + b.d * 0.2) / a.h)) + 0.08); }
  dom[0].rest = 1.3;
  K.dom = dom;
  const dk = new THREE.SpotLight('#ffd7a8', 60, 30, 0.5, 0.7, 1.4); dk.position.set(3, 7, -3); dk.target.position.set(0.3, 0, -5); dk.castShadow = true; dk.shadow.mapSize.set(2048, 2048); scene.add(dk, dk.target); K.domLight = dk;
  scene.add(new THREE.HemisphereLight('#3a4258', '#050505', 0.25));
  return K;
}
