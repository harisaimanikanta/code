// Sets and props for "The Mummy Medicine Mystery" - polished rounded cartoon style (kit/look.js + kit/props.js).
import * as THREE from 'three';
import { soft, roundBox, lathe, tubeR, practical } from '/kit/look.js';
import { bookshelf, plant, plankTexture, wallTexture, rug } from '/kit/props.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const rng = (seed = 1) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const sph = (r, m, a = 24, b = 16) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, a, b), m); s.castShadow = true; s.receiveShadow = true; return s; };
export const cyl = (r1, r2, h, m, seg = 24) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); c.castShadow = c.receiveShadow = true; return c; };
const FONT = 'Inter, "DejaVu Sans", Arial, sans-serif';
const SERIF = 'Georgia, "DejaVu Serif", serif';
export function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const plane = (w, h, map, o = {}) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.75, transparent: !!o.transparent, ...o }));
function room(g, { w = 6, d = 5, h = 3.2, wall = '#b88a5a', floor = '#7a5236', stripes = null, seed = 1, stone = false } = {}) {
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), soft('#ffffff', 'wood', { map: stone ? stoneTex('#8a7a62', seed) : plankTexture(floor, { seed }) })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const wm = soft('#ffffff', 'clay', { map: stone ? stoneTex(wall, seed + 1) : wallTexture(wall, { stripes }) });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wm); back.position.set(0, h / 2, -d / 2); back.receiveShadow = true; g.add(back);
  for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wm); side.position.set(s * w / 2, h / 2, 0); side.rotation.y = -s * Math.PI / 2; side.receiveShadow = true; g.add(side); }
  return { back };
}
function stoneTex(base, seed = 1) {
  const t = tex(512, 512, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); const r = rng(seed * 7 + 3);
    for (let y = 0; y < h; y += 64) for (let x = (y / 64) % 2 ? -48 : 0; x < w; x += 96) { const l = 0.85 + r() * 0.3; c.fillStyle = `rgba(${l > 1 ? 255 : 0},${l > 1 ? 240 : 0},${l > 1 ? 210 : 0},${Math.abs(l - 1) * 0.6})`; c.fillRect(x + 3, y + 3, 90, 58); c.strokeStyle = 'rgba(40,25,10,0.45)'; c.lineWidth = 4; c.strokeRect(x + 1, y + 1, 94, 62); }
    for (let i = 0; i < 2500; i++) { c.fillStyle = r() < 0.5 ? 'rgba(60,40,20,0.12)' : 'rgba(255,240,210,0.1)'; c.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 4); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t;
}

// ---------------------------------------------------------------- props
/** label texture for jars / crates */
export function labelTex(lines, { bg = '#f3e6c4', fg = '#3a2414', w = 256, h = 160, font = SERIF, border = '#6a4a2a' } = {}) {
  return tex(w, h, (c, W, H) => { c.fillStyle = bg; c.fillRect(0, 0, W, H); c.strokeStyle = border; c.lineWidth = 6; c.strokeRect(8, 8, W - 16, H - 16);
    c.fillStyle = fg; c.textAlign = 'center'; const n = lines.length; lines.forEach((l, i) => { const s = Math.min(54, (W - 30) / Math.max(4, l.length) * 1.7); c.font = `700 ${s}px ${font}`; c.fillText(l, W / 2, H / 2 + (i - (n - 1) / 2) * s * 1.05 + s * 0.35); }); });
}
export function jar({ h = 0.26, r = 0.09, glass = '#c9e0d8', fill = '#8a5a34', level = 0.6, label = null, lid = '#5a3a22' } = {}) {
  const g = new THREE.Group();
  const body = lathe([[0.001, 0], [r, 0.005], [r, h * 0.82], [r * 0.7, h * 0.9], [r * 0.6, h]], soft(glass, 'glass', { transmission: 0.4, roughness: 0.15, transparent: true, opacity: 0.55 }));
  body.castShadow = true; g.add(body);
  const content = cyl(r * 0.93, r * 0.93, h * 0.82 * level, soft(fill, 'clay', { roughness: 0.9 })); content.position.y = h * 0.82 * level / 2 + 0.004; g.add(content);
  const cap = cyl(r * 0.68, r * 0.68, h * 0.12, soft(lid, 'wood')); cap.position.y = h + h * 0.04; g.add(cap);
  if (label) { const lt = labelTex(label); const lb = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, h * 0.42, 32, 1, true, -Math.PI * 0.42, Math.PI * 0.84), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.8 }));
    lb.position.y = h * 0.42; g.add(lb); g.userData.label = lb; }
  return g;
}
export function mortar() {
  const g = new THREE.Group(); const m = soft('#9a8f80', 'ceramic', { roughness: 0.7 });
  g.add(lathe([[0.001, 0], [0.11, 0.0], [0.13, 0.04], [0.14, 0.11], [0.125, 0.13], [0.105, 0.12], [0.1, 0.05], [0.001, 0.04]], m));
  const powder = cyl(0.098, 0.07, 0.03, soft('#7a5434', 'clay', { roughness: 1 })); powder.position.y = 0.085; g.add(powder); g.userData.powder = powder;
  const pestle = new THREE.Group(); const p = lathe([[0.001, 0], [0.028, 0.005], [0.03, 0.04], [0.018, 0.08], [0.02, 0.2], [0.026, 0.23], [0.001, 0.235]], m); pestle.add(p); g.add(pestle); g.userData.pestle = pestle;
  return g;
}
export function bowl({ r = 0.12, color = '#7a5a3a', fill = '#0d0b0a', level = 0.7 } = {}) {
  const g = new THREE.Group(); g.add(lathe([[0.001, 0], [r * 0.6, 0], [r * 0.95, r * 0.35], [r, r * 0.55], [r * 0.9, r * 0.55], [r * 0.55, r * 0.1], [0.001, r * 0.1]], soft(color, 'ceramic', { roughness: 0.5 })));
  const tar = cyl(r * 0.86 * (0.7 + 0.3 * level), r * 0.6, 0.01, soft(fill, 'plastic', { roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 })); tar.position.y = r * 0.12 + r * 0.4 * level; g.add(tar); g.userData.tar = tar;
  return g;
}
/** wrapped mummy lying on its back along +x; resin=true = coated in shiny black resin */
export function mummy({ resin = 0, len = 1.7 } = {}) {
  const g = new THREE.Group();
  const bandT = tex(256, 256, (c, w, h) => { const r = rng(5); c.fillStyle = '#c8b088'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 14) { c.fillStyle = `rgba(${90 + r() * 40},${70 + r() * 30},${40 + r() * 20},0.35)`; c.save(); c.translate(0, y); c.rotate((r() - 0.5) * 0.12); c.fillRect(-10, 0, w + 20, 3); c.restore(); }
    for (let i = 0; i < 900; i++) { c.fillStyle = r() < 0.5 ? 'rgba(80,55,30,0.15)' : 'rgba(255,240,200,0.12)'; c.fillRect(r() * w, r() * h, 3, 2); } });
  bandT.wrapS = bandT.wrapT = THREE.RepeatWrapping; bandT.repeat.set(2, 3);
  if (resin) { const c = bandT.image.getContext('2d'); const r2 = rng(17); c.fillStyle = 'rgba(20,12,6,0.92)';
    for (let i = 0; i < 26; i++) { c.beginPath(); c.ellipse(r2() * 256, r2() * 256, 20 + r2() * 40, 14 + r2() * 26, r2() * 3, 0, 7); c.fill(); }
    for (let i = 0; i < 18; i++) { const x = r2() * 256; c.fillRect(x, r2() * 200, 5 + r2() * 6, 30 + r2() * 50); } bandT.needsUpdate = true; }
  const band = soft('#ffffff', 'fabric', resin ? { map: bandT, roughness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.15 } : { map: bandT });
  const black = soft('#140d08', 'plastic', { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 });
  const body = lathe([[0.001, 0], [0.09, 0.02], [0.12, 0.25], [0.16, 0.55], [0.2, 0.95], [0.19, 1.2], [0.13, 1.3], [0.001, 1.32]].map(([r, y]) => [r, y * len / 1.75]), band);
  body.rotation.z = -Math.PI / 2; body.scale.z = 0.7; body.position.y = 0.16; g.add(body);
  const head = sph(0.13, band, 32, 20); head.scale.set(1.15, 0.85, 0.95); head.position.set(len * 0.83, 0.18, 0); g.add(head);
  const coat = [];
  if (resin) { // glossy black resin patches/drips over the bandages
    const r = rng(9);
    const hc = sph(0.135, black, 32, 20); hc.scale.set(1.1, 0.55, 0.95); hc.position.set(len * 0.83, 0.23, 0); g.add(hc); coat.push(hc);
  }
  g.userData.coat = coat; g.userData.head = head; return g;
}
/** rock outcrop with a crack that oozes tar; returns {group, drips[], pool} */
export function tarRock() {
  const g = new THREE.Group(); const rock = soft('#b0805a', 'clay', { roughness: 0.95 });
  const r = rng(13);
  for (let i = 0; i < 9; i++) { const s = sph(0.5 + r() * 0.6, rock, 20, 14); s.scale.set(1 + r() * 0.6, 0.8 + r() * 0.7, 0.9 + r() * 0.4); s.position.set((r() - 0.5) * 2.2, 0.3 + r() * 0.9, -0.4 - r() * 0.8); s.rotation.set(r(), r(), r()); g.add(s); }
  const big = sph(1.0, rock, 28, 20); big.scale.set(1.3, 1.25, 0.8); big.position.set(0.1, 1.0, -0.25); g.add(big);
  const tarM = soft('#0c0907', 'plastic', { roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 });
  const crack = tubeR([V(-0.05, 1.75, 0.44), V(0.05, 1.45, 0.55), V(-0.02, 1.15, 0.6), V(0.06, 0.85, 0.6), V(0.02, 0.55, 0.56)], u => 0.06 + 0.03 * Math.sin(u * 9), tarM, { seg: 40, radial: 10 });
  g.add(crack);
  const drips = []; for (let i = 0; i < 3; i++) { const d = sph(0.04, tarM, 16, 12); d.scale.set(1, 1.5, 1); d.position.set(0.04 - i * 0.03, 0.5, 0.42); g.add(d); drips.push(d); }
  const pool = cyl(0.32, 0.36, 0.02, tarM, 32); pool.scale.z = 0.7; pool.position.set(0.05, 0.01, 0.8); g.add(pool);
  return { group: g, drips, pool, tarM };
}
export function crate({ w = 0.9, h = 0.5, d = 0.5, label = null } = {}) {
  const g = new THREE.Group(); const m = soft('#a07448', 'wood');
  g.add(at(roundBox(w, h, d, m, 0.02), 0, h / 2, 0));
  for (const y of [0.08, h - 0.08]) g.add(at(roundBox(w + 0.02, 0.06, d + 0.02, soft('#7a5434', 'wood'), 0.01), 0, y, 0));
  if (label) { const p = plane(w * 0.6, h * 0.45, labelTex(label, { bg: '#d8b47c', fg: '#2a1a0c', border: '#2a1a0c' })); p.position.set(0, h / 2, d / 2 + 0.012); g.add(p); }
  return g;
}
export function candle(h = 0.18) {
  const g = new THREE.Group(); g.add(at(cyl(0.025, 0.027, h, soft('#f2e6c8', 'clay')), 0, h / 2, 0));
  g.add(at(cyl(0.05, 0.06, 0.02, soft('#8a6a3a', 'metal')), 0, 0.01, 0));
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffd27a' })); fl.scale.set(1, 1.9, 1); fl.position.y = h + 0.025; g.add(fl);
  const l = new THREE.PointLight('#ffb24a', 1.4, 3.2, 2); l.position.y = h + 0.06; g.add(l); g.userData.light = l; g.userData.flame = fl; return g;
}
export function book({ w = 0.42, d = 0.3, pages = null } = {}) {
  const g = new THREE.Group(); g.add(at(roundBox(w, 0.04, d, soft('#6a2e22', 'fabric'), 0.01), 0, 0.02, 0));
  for (const s of [-1, 1]) { const p = roundBox(w / 2 - 0.01, 0.02, d - 0.02, soft('#f4ead0', 'paper'), 0.004); p.position.set(s * w / 4, 0.05, 0); p.rotation.z = -s * 0.06; g.add(p); }
  if (pages) for (const [i, t] of pages.entries()) { if (!t) continue; const pl = plane(w / 2 - 0.03, d - 0.05, t); pl.rotation.x = -Math.PI / 2; pl.rotation.y = 0; pl.position.set((i ? 1 : -1) * w / 4, 0.062 + (i ? 0 : 0), 0); pl.rotation.z = 0; pl.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -(i ? 1 : -1) * 0.06); g.add(pl); g.userData['page' + i] = pl; }
  return g;
}
export function quill() { const g = new THREE.Group(); g.add(tubeR([V(0, 0, 0), V(0.02, 0.12, 0), V(0.05, 0.28, 0)], u => 0.004 + 0.02 * Math.sin(u * Math.PI) * (u > 0.2 ? 1 : 0.2), soft('#f6f2ea', 'fabric'), { seg: 20, radial: 8 })); return g; }
export function hat({ color = '#2a2420', brim = 0.2, h = 0.16 } = {}) { const g = new THREE.Group(); const m = soft(color, 'fabric'); g.add(at(cyl(0.12, 0.13, h, m), 0, h / 2, 0)); g.add(at(cyl(brim, brim, 0.015, m, 32), 0, 0.01, 0)); g.add(at(cyl(0.131, 0.131, 0.03, soft('#8a6a3a', 'fabric')), 0, 0.03, 0)); return g; }
export function turban(color = '#f2ecdf') { const g = new THREE.Group(); const m = soft(color, 'fabric'); for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.135 - i * 0.012, 0.045, 12, 32), m); t.rotation.x = Math.PI / 2 + (i % 2 ? 0.15 : -0.12); t.position.y = 0.02 + i * 0.045; t.castShadow = true; g.add(t); } g.add(at(sph(0.11, m), 0, 0.12, 0)); return g; }
export function beard(color = '#3a2a22', s = 1) { const b = sph(0.11 * s, soft(color, 'clay', { roughness: 0.8 }), 24, 16); b.scale.set(1.05, 1.15, 0.7); return b; }
export function bandage() { return cyl(0.05, 0.05, 0.16, soft('#f4efe4', 'fabric'), 20); }
export function spoon() { const g = new THREE.Group(), m = soft('#c8ccd4', 'metal'); g.add(at(cyl(0.006, 0.006, 0.16, m, 8), 0, 0.08, 0)); const s = sph(0.022, m); s.scale.set(1, 0.4, 1.4); s.position.set(0, 0.17, 0); g.add(s); const p = sph(0.016, soft('#7a5434', 'clay')); p.scale.set(1, 0.4, 1.3); p.position.set(0, 0.178, 0); g.add(p); g.userData.powder = p; return g; }
export function parchment(textLines, { w = 0.9, h = 0.6, red = null } = {}) {
  const t = tex(768, 512, (c, W, H) => { c.fillStyle = '#ead7aa'; c.fillRect(0, 0, W, H); const r = rng(21); for (let i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? 'rgba(120,80,30,0.12)' : 'rgba(255,250,220,0.15)'; c.fillRect(r() * W, r() * H, 3, 3); }
    const grd = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(90,50,10,0.45)'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    c.fillStyle = '#2a1608'; c.textAlign = 'center'; textLines.forEach(([txt, size, y]) => { c.font = `italic 700 ${size}px ${SERIF}`; c.fillText(txt, W / 2, y); });
    if (red) { c.strokeStyle = '#b3261e'; c.lineWidth = 10; c.beginPath(); c.moveTo(red[0], red[1]); c.lineTo(red[2], red[3]); c.stroke(); } });
  const g = new THREE.Group(); const p = plane(w, h, t, { roughness: 0.9 }); g.add(p); g.userData.plane = p; return g;
}

// ---------------------------------------------------------------- 1. apothecary shop (Europe, 1600s, candle-lit)
export function shopSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  room(g, { w: 6.5, d: 5, h: 3.2, wall: '#6a4a34', floor: '#5a3a24', stripes: 'rgba(255,220,170,0.05)', seed: 3 });
  // counter
  const counter = new THREE.Group(); counter.position.set(0, 0, 0.2); g.add(counter);
  counter.add(at(roundBox(2.6, 0.95, 0.7, soft('#7a4e2e', 'wood'), 0.03), 0, 0.475, 0));
  counter.add(at(roundBox(2.75, 0.06, 0.82, soft('#9a6a42', 'wood'), 0.02), 0, 0.98, 0));
  const top = 1.01;
  // shelves of jars on the back wall
  const shelfM = soft('#5a3a24', 'wood');
  const R = rng(7); const jars = [];
  const colors = ['#8a5a34', '#c8a24a', '#6a8a4a', '#a8442e', '#e0d0b0', '#4a6a8a'];
  for (let row = 0; row < 4; row++) {
    const y = 0.9 + row * 0.5; g.add(at(roundBox(4.6, 0.05, 0.36, shelfM, 0.01), 0, y, -2.3));
    for (let i = 0; i < 12; i++) { const x = -2.1 + i * 0.38 + (R() - 0.5) * 0.06; if (row === 1 && Math.abs(x) < 0.5) continue;
      const j = jar({ h: 0.2 + R() * 0.12, r: 0.06 + R() * 0.03, fill: colors[Math.floor(R() * colors.length)], level: 0.4 + R() * 0.5, glass: R() < 0.3 ? '#3a5a8a' : '#c9e0d8' }); j.position.set(x, y + 0.025, -2.3 + (R() - 0.5) * 0.1); g.add(j); jars.push(j); }
  }
  // the hero jar: MUMMY POWDER (on the counter)
  const hero = jar({ h: 0.34, r: 0.12, fill: '#6a4428', level: 0.75, label: ['MUMMY', 'POWDER'], lid: '#3a2414' }); hero.position.set(0.72, top, 0.18); g.add(hero);
  const mort = mortar(); mort.position.set(-0.25, top, 0.28); g.add(mort);
  const chunk = sph(0.05, soft('#7a5434', 'clay', { roughness: 0.95 })); chunk.scale.set(1.4, 0.8, 1); chunk.position.set(-0.55, top + 0.03, 0.35); g.add(chunk);
  const sp = spoon(); sp.position.set(0.35, top + 0.01, 0.4); sp.rotation.set(Math.PI / 2, 0, 0.4); g.add(sp);
  const scroll = parchment([['Mumia', 64, 120], ['for bruises,', 40, 220], ['coughs, falls', 40, 290]], { w: 0.42, h: 0.28 }); scroll.rotation.x = -Math.PI / 2 + 0.05; scroll.position.set(1.15, top + 0.005, 0.25); scroll.rotation.z = 0.12; g.add(scroll);
  // mummy on a side table (back left)
  const table = new THREE.Group(); table.position.set(-2.1, 0, -1.15); g.add(table);
  table.add(at(roundBox(1.9, 0.08, 0.7, soft('#6a4426', 'wood'), 0.02), 0, 0.78, 0));
  for (const [x, z] of [[-0.85, -0.28], [0.85, -0.28], [-0.85, 0.28], [0.85, 0.28]]) table.add(at(cyl(0.04, 0.04, 0.78, soft('#4a2e18', 'wood'), 12), x, 0.39, z));
  const mum = mummy({ len: 1.7 }); mum.position.set(-0.85, 0.82, 0); table.add(mum);
  // stool + practicals
  const stool = new THREE.Group(); stool.position.set(0.55, 0, 1.05); g.add(stool); stool.add(at(cyl(0.22, 0.22, 0.06, soft('#8a5a34', 'wood')), 0, 0.5, 0)); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; stool.add(at(cyl(0.025, 0.02, 0.5, soft('#5a3a24', 'wood'), 8), Math.cos(a) * 0.15, 0.25, Math.sin(a) * 0.15)); }
  const c1 = candle(0.2); c1.position.set(-0.75, top, -0.1); g.add(c1);
  const c2 = candle(0.14); c2.position.set(1.15, top, -0.05); g.add(c2);
  const lantern = practical('#ffc27a', 3.2, 6, { radius: 0.07 }); lantern.position.set(-0.4, 2.55, -1.0); g.add(lantern);
  const lw = practical('#ffcf8a', 1.8, 4, { radius: 0.05 }); lw.position.set(1.9, 2.2, -2.0); g.add(lw);
  // hanging herbs
  for (let i = 0; i < 6; i++) { const h = sph(0.09, soft(i % 2 ? '#6a7a3a' : '#8a6a3a', 'fabric'), 12, 10); h.scale.set(0.7, 1.4, 0.7); h.position.set(-2.4 + i * 0.25, 2.75, 0.6); g.add(h); }
  g.add(at(rug(1.0, ['#7a2e22', '#c8a24a', '#3a4a6a']), 0.3, 0.005, 1.4));
  const ws = bookshelf({ seed: 5, w: 1.0, h: 1.9 }); ws.position.set(2.8, 0, -1.2); ws.rotation.y = -Math.PI / 2; g.add(ws);
  return { group: g, top, hero, mort, chunk, spoon: sp, mummy: mum, scroll, candles: [c1, c2] };
}

// ---------------------------------------------------------------- 2. Persian hillside: tar seeping from rock (golden hour)
export function rockSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  const sand = tex(512, 512, (c, w, h) => { c.fillStyle = '#d9a96a'; c.fillRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 5000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(150,90,40,0.15)' : 'rgba(255,230,180,0.18)'; c.fillRect(r() * w, r() * h, 2, 2); } });
  sand.wrapS = sand.wrapT = THREE.RepeatWrapping; sand.repeat.set(8, 8);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), soft('#ffffff', 'clay', { map: sand })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  const R = tarRock(); R.group.position.set(0, 0, -1.2); g.add(R.group);
  // distant hills + a small domed town
  const hillM = soft('#c08a5a', 'clay'); const r = rng(8);
  for (let i = 0; i < 9; i++) { const h = sph(4 + r() * 4, hillM, 24, 12); h.scale.set(1.6, 0.45, 1); h.position.set(-24 + i * 6, 0, -22 - r() * 6); g.add(h); }
  const townM = soft('#e8d2b0', 'clay'), domeM = soft('#3a8a9a', 'ceramic');
  for (let i = 0; i < 6; i++) { const x = 6 + i * 1.6, z = -14 - (i % 3); g.add(at(roundBox(1.2, 1 + (i % 2) * 0.6, 1.2, townM, 0.05), x, 0.5, z)); if (i % 2) g.add(at(sph(0.5, domeM), x, 1.6, z)); }
  // a mat with the doctor's things
  const mat = cyl(0.7, 0.7, 0.02, soft('#8a2e22', 'fabric'), 32); mat.scale.z = 0.6; mat.position.set(1.15, 0.01, 0.55); g.add(mat);
  const bw = bowl({ r: 0.11, level: 0 }); bw.position.set(0.6, 0.02, 0.35); g.add(bw);
  const pot = lathe([[0.001, 0], [0.1, 0.0], [0.15, 0.12], [0.12, 0.26], [0.06, 0.3], [0.07, 0.34], [0.001, 0.34]], soft('#b8643a', 'ceramic')); pot.position.set(1.7, 0.02, 0.2); g.add(pot);
  for (let i = 0; i < 5; i++) { const b = sph(0.12 + r() * 0.1, soft('#6a8a3a', 'fabric'), 12, 10); b.scale.y = 0.7; b.position.set(-2.4 + r() * 0.6, 0.08, 0.4 + r() * 1.2); g.add(b); }
  return { group: g, rock: R, bowl: bw };
}

// ---------------------------------------------------------------- 3. scriptorium (translator, candle-lit, ~1100s)
export function scriptoriumSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  room(g, { w: 6, d: 5, h: 3.4, wall: '#8a7a62', stone: true, seed: 2 });
  // arched window with cool light
  const win = new THREE.Group(); win.position.set(1.6, 1.9, -2.48); g.add(win);
  const sh = new THREE.Shape(); sh.moveTo(-0.4, -0.7); sh.lineTo(0.4, -0.7); sh.lineTo(0.4, 0.3); sh.absarc(0, 0.3, 0.4, 0, Math.PI, false); sh.lineTo(-0.4, -0.7);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: '#9ab8e8' })); win.add(glass);
  const wl = new THREE.SpotLight('#a8c4ff', 6, 9, 0.5, 0.7, 1.2); wl.position.set(1.6, 2.4, -2.2); wl.target.position.set(0.2, 0.9, 0.2); wl.castShadow = true; g.add(wl, wl.target);
  // desk
  const desk = new THREE.Group(); desk.position.set(0, 0, 0); g.add(desk);
  desk.add(at(roundBox(1.5, 0.07, 0.8, soft('#6a4426', 'wood'), 0.02), 0, 0.86, 0));
  for (const [x, z] of [[-0.65, -0.32], [0.65, -0.32], [-0.65, 0.32], [0.65, 0.32]]) desk.add(at(cyl(0.045, 0.045, 0.86, soft('#4a2e18', 'wood'), 12), x, 0.43, z));
  const top = 0.895;
  // two-page manuscript: left = Persian book (tar drawing), right = the Latin translation (filled in over time)
  const left = tex(256, 340, (c, w, h) => { c.fillStyle = '#f2e4c0'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a2410'; c.font = `700 30px ${SERIF}`; c.textAlign = 'center'; c.fillText('mūmiyā', w / 2, 50);
    c.fillStyle = '#a8784a'; c.beginPath(); c.moveTo(40, 260); c.quadraticCurveTo(128, 90, 216, 260); c.fill(); c.fillStyle = '#120c08'; c.beginPath(); c.moveTo(122, 120); c.quadraticCurveTo(140, 200, 128, 262); c.lineTo(118, 262); c.quadraticCurveTo(126, 190, 114, 124); c.fill();
    c.beginPath(); c.ellipse(124, 275, 40, 9, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(60,40,20,0.5)'; c.lineWidth = 3; for (let y = 300; y < 330; y += 12) { c.beginPath(); c.moveTo(30, y); c.lineTo(226, y); c.stroke(); } });
  const right = document.createElement('canvas'); right.width = 256; right.height = 340; const rightT = new THREE.CanvasTexture(right); rightT.colorSpace = THREE.SRGBColorSpace;
  const drawRight = p => { const c = right.getContext('2d'), w = 256, h = 340; c.fillStyle = '#f2e4c0'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a2410'; c.textAlign = 'center';
    c.font = `700 30px ${SERIF}`; c.save(); c.beginPath(); c.rect(0, 0, w * Math.min(1, p * 3), 70); c.clip(); c.fillText('mumia', w / 2, 50); c.restore();
    if (p > 0.33) { const k = Math.min(1, (p - 0.33) * 3); c.save(); c.beginPath(); c.rect(0, 70, w * k, 200); c.clip(); // little mummy drawing
      c.fillStyle = '#c8b088'; c.beginPath(); c.ellipse(128, 170, 30, 80, 0, 0, 7); c.fill(); c.beginPath(); c.arc(128, 95, 22, 0, 7); c.fill(); c.strokeStyle = '#6a5034'; c.lineWidth = 3; for (let y = 105; y < 250; y += 12) { c.beginPath(); c.moveTo(100, y); c.lineTo(156, y + 4); c.stroke(); } c.restore(); }
    if (p > 0.66) { const k = Math.min(1, (p - 0.66) * 3); c.save(); c.beginPath(); c.rect(0, 270, w * k, 70); c.clip(); c.font = `italic 700 22px ${SERIF}`; c.fillText('ex corporibus', w / 2, 295); c.fillText('"from bodies"', w / 2, 325); c.restore(); }
    rightT.needsUpdate = true; };
  drawRight(0);
  const bk = book({ w: 0.56, d: 0.38, pages: [left, rightT] }); bk.position.set(0, top, 0.08); g.add(bk);
  const q = quill(); g.add(q);
  const ink = cyl(0.035, 0.04, 0.06, soft('#1a1a22', 'ceramic')); ink.position.set(0.42, top + 0.03, 0.15); g.add(ink);
  const c1 = candle(0.22); c1.position.set(-0.55, top, -0.15); g.add(c1);
  const c2 = candle(0.16); c2.position.set(0.55, top, -0.2); g.add(c2);
  // stacks of books and scrolls; a lectern behind
  const R = rng(3);
  for (let s = 0; s < 3; s++) for (let i = 0; i < 4; i++) { const b = roundBox(0.32 - i * 0.02, 0.06, 0.24, soft(['#6a2e22', '#2e4a6a', '#5a4a2a', '#3a5a3a'][(i + s) % 4], 'fabric'), 0.01); b.position.set(-2.1 + s * 0.4, 0.03 + i * 0.065, -2.0 + s * 0.15); b.rotation.y = (R() - 0.5) * 0.4; g.add(b); }
  for (let i = 0; i < 5; i++) { const sc = cyl(0.04, 0.04, 0.5, soft('#e8d6a8', 'paper'), 12); sc.rotation.z = Math.PI / 2; sc.position.set(2.0, 0.05 + i * 0.08, -1.6 + (i % 2) * 0.08); g.add(sc); }
  const shelf = bookshelf({ seed: 9, w: 1.4, h: 2.2 }); shelf.position.set(-1.6, 0, -2.3); g.add(shelf);
  const stamp = parchment([['MISTAKE', 120, 300]], { w: 0.6, h: 0.4 }); stamp.visible = false; g.add(stamp);
  return { group: g, top, book: bk, quill: q, ink, drawRight, stamp, candles: [c1, c2] };
}

// ---------------------------------------------------------------- 4. Egyptian tomb (torch-lit): resin-coated mummy + crates for Europe
export function tombSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  room(g, { w: 7, d: 7, h: 3.4, wall: '#b8925a', stone: true, seed: 5 });
  // hieroglyph band on the back wall
  const hg = tex(1024, 160, (c, w, h) => { c.fillStyle = '#c8a066'; c.fillRect(0, 0, w, h); c.fillStyle = '#5a3418'; const r = rng(2);
    for (let x = 20; x < w; x += 46) { const k = Math.floor(r() * 4); c.beginPath(); if (k === 0) c.arc(x + 14, 80, 14, 0, 7); else if (k === 1) { c.moveTo(x, 110); c.lineTo(x + 14, 50); c.lineTo(x + 28, 110); } else if (k === 2) c.ellipse(x + 14, 80, 16, 8, 0, 0, 7); else c.rect(x + 4, 55, 20, 50); c.fill(); }
    c.fillStyle = '#2a6a7a'; c.fillRect(0, 0, w, 12); c.fillRect(0, h - 12, w, 12); });
  const band = plane(6.8, 1.0, hg); band.position.set(0, 2.3, -3.48); g.add(band);
  // sarcophagus base with the resin mummy
  const base = roundBox(2.1, 0.7, 0.9, soft('#9a7a4a', 'clay'), 0.05); base.position.set(0, 0.35, -0.4); base.castShadow = base.receiveShadow = true; g.add(base);
  const mum = mummy({ resin: 1, len: 1.75 }); mum.position.set(-0.85, 0.7, -0.4); g.add(mum);
  const lid = roundBox(0.9, 0.12, 2.1, soft('#3a6a8a', 'ceramic'), 0.04); lid.position.set(1.85, 0.75, 0.3); lid.rotation.set(0, 0.3, 0.6); lid.castShadow = true; g.add(lid);
  const face = plane(0.5, 0.6, tex(256, 300, (c, w, h) => { c.fillStyle = '#d8a83a'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a4a8a'; for (let i = 0; i < 8; i++) c.fillRect(0, 40 + i * 30, 40, 14), c.fillRect(w - 40, 40 + i * 30, 40, 14);
    c.fillStyle = '#f0c070'; c.beginPath(); c.ellipse(w / 2, 150, 70, 100, 0, 0, 7); c.fill(); c.fillStyle = '#1a1a1a'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + s * 28, 130, 14, 7, 0, 0, 7); c.fill(); } }));
  face.position.set(1.95, 1.05, 0.15); face.rotation.set(0, 0.3, 0.6); g.add(face);
  // crates being packed for Europe
  const cr1 = crate({ label: ['TO', 'EUROPE'] }); cr1.position.set(-2.2, 0, 0.6); cr1.rotation.y = 0.4; g.add(cr1);
  const cr2 = crate({ w: 0.7, h: 0.45, d: 0.45 }); cr2.position.set(-2.55, 0.5, 0.45); cr2.rotation.y = 0.2; g.add(cr2);
  const open = crate({ w: 1.9, h: 0.45, d: 0.6, label: ['MUMMY'] }); open.position.set(1.4, 0, 1.6); open.rotation.y = -0.2; g.add(open);
  const mum2 = mummy({ len: 1.6 }); mum2.scale.setScalar(0.95); mum2.position.set(0.68, 0.2, 1.72); mum2.rotation.y = -0.2; g.add(mum2);
  // torches
  const torches = [];
  for (const [x, z] of [[-2.6, -3.3], [2.6, -3.3], [-3.3, 1.2]]) { const t = new THREE.Group(); t.position.set(x, 1.7, z); g.add(t); t.add(at(cyl(0.03, 0.04, 0.4, soft('#5a3a22', 'wood'), 8), 0, 0, 0));
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffb84a' })); f.scale.set(1, 1.7, 1); f.position.y = 0.28; t.add(f);
    const l = new THREE.PointLight('#ff9a3a', 3.5, 7, 2); l.position.y = 0.35; t.add(l); torches.push({ g: t, f, l }); }
  // jars and pots on the floor
  for (let i = 0; i < 5; i++) { const p = lathe([[0.001, 0], [0.1, 0.0], [0.16, 0.15], [0.12, 0.35], [0.07, 0.4], [0.001, 0.42]], soft(i % 2 ? '#b8643a' : '#8a6a3a', 'ceramic')); p.position.set(2.6 - i * 0.25, 0, -2.6 + (i % 2) * 0.3); g.add(p); }
  // hook props: a plain mummy (shown in the opening instead of the resin one), a stand with a mortar, broken-off pieces
  const coffin = new THREE.Group(); coffin.position.set(0, 0, -0.4); coffin.visible = false; g.add(coffin);
  const cm = soft('#9a7a4a', 'clay'), cg = soft('#c89a3a', 'metal', { roughness: 0.4 });
  coffin.add(at(roundBox(2.1, 0.32, 0.9, cm, 0.04), 0, 0.16, 0));
  for (const z of [-0.41, 0.41]) coffin.add(at(roundBox(2.1, 0.5, 0.08, cm, 0.02), 0, 0.57, z));
  for (const x of [-1.01, 1.01]) coffin.add(at(roundBox(0.08, 0.5, 0.9, cm, 0.02), x, 0.57, 0));
  for (const z of [-0.45, 0.45]) coffin.add(at(roundBox(2.12, 0.05, 0.02, cg, 0.01), 0, 0.72, z));
  const hiero = plane(1.7, 0.3, tex(512, 90, (c, w, h) => { c.fillStyle = '#b8925a'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a2410'; for (let x = 12; x < w; x += 34) { c.beginPath(); c.arc(x + 10, 45, 9, 0, 7); c.fill(); c.fillRect(x + 4, 62, 14, 6); } }));
  hiero.position.set(0, 0.55, 0.452); coffin.add(hiero);
  const plain = mummy({ len: 1.75 }); plain.position.set(-0.85, 0.3, 0); coffin.add(plain);
  const lidFace = plane(0.55, 0.75, tex(256, 340, (c, w, h) => { c.fillStyle = '#2a4a8a'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8a83a'; for (let i = 0; i < 9; i++) c.fillRect(0, 20 + i * 34, w, 14);
    c.fillStyle = '#f0c070'; c.beginPath(); c.ellipse(w / 2, 150, 80, 110, 0, 0, 7); c.fill(); c.fillStyle = '#1a1a1a'; for (const s2 of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + s2 * 30, 130, 16, 8, 0, 0, 7); c.fill(); } c.fillRect(w / 2 - 4, 150, 8, 30); c.fillRect(w / 2 - 22, 200, 44, 8); }));
  lidFace.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); lidFace.position.set(0, 0.062, 0.62); lid.add(lidFace);
  const stand = crate({ w: 0.5, h: 0.9, d: 0.5 }); stand.position.set(1.0, 0, -0.2); g.add(stand);
  const mort = mortar(); mort.position.set(1.0, 0.9, -0.2); g.add(mort);
  const bits = []; for (let i = 0; i < 4; i++) { const b = sph(0.03 + i * 0.006, soft('#8a6a44', 'clay', { roughness: 0.95 }), 12, 8); b.scale.set(1.3, 0.7, 1); b.position.set(0.82 + i * 0.05, 0.92, -0.02 + (i % 2) * 0.05); g.add(b); bits.push(b); }
  return { group: g, mummy: mum, plain, coffin, base, lid, face, stand, mort, bits, crate: cr1, packMummy: mum2, torches };
}

// ---------------------------------------------------------------- 5. fakers' workshop (dark, menacing)
export function workshopSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  room(g, { w: 5.5, d: 5, h: 3, wall: '#4a3a30', stone: true, seed: 8 });
  const table = new THREE.Group(); g.add(table);
  table.add(at(roundBox(2.0, 0.08, 0.8, soft('#4a3020', 'wood'), 0.02), 0, 0.82, 0));
  for (const [x, z] of [[-0.9, -0.32], [0.9, -0.32], [-0.9, 0.32], [0.9, 0.32]]) table.add(at(cyl(0.045, 0.045, 0.82, soft('#2a1a10', 'wood'), 12), x, 0.41, z));
  // the body being wrapped: covered with a sheet, half bandaged (implied, never shown)
  const sheet = lathe([[0.001, 0], [0.16, 0.02], [0.2, 0.5], [0.22, 1.0], [0.18, 1.35], [0.001, 1.45]], soft('#d8d0c0', 'fabric')); sheet.rotation.z = -Math.PI / 2; sheet.scale.z = 0.6; sheet.position.set(-0.75, 0.98, 0); g.add(sheet);
  const wrapped = mummy({ len: 0.9 }); wrapped.position.set(-0.78, 0.82, 0); wrapped.scale.set(1, 1.05, 1.05); g.add(wrapped);
  const roll = cyl(0.06, 0.06, 0.16, soft('#c8b088', 'fabric'), 20); roll.rotation.x = Math.PI / 2; g.add(roll);
  const tarPot = bowl({ r: 0.14, color: '#3a2a20', level: 0.8 }); tarPot.position.set(0.75, 0.86, 0.15); g.add(tarPot);
  const brush = cyl(0.01, 0.012, 0.3, soft('#7a5434', 'wood'), 8); brush.position.set(0.78, 1.0, 0.1); brush.rotation.z = 0.5; g.add(brush);
  // finished fakes stacked against the wall, a lantern, sacks
  const f1 = mummy({ len: 1.6, resin: 1 }); f1.rotation.z = Math.PI / 2 - 0.15; f1.position.set(-2.2, 0.05, -2.2); g.add(f1);
  const f2 = mummy({ len: 1.6 }); f2.rotation.z = Math.PI / 2 - 0.1; f2.position.set(-1.6, 0.05, -2.25); g.add(f2);
  const lamp = practical('#ff9a4a', 2.6, 5, { radius: 0.06 }); lamp.position.set(0.9, 1.9, -0.9); g.add(lamp);
  const sk = crate({ label: ['GENUINE', 'MUMMY'] }); sk.position.set(1.8, 0, -1.6); sk.rotation.y = -0.4; g.add(sk);
  return { group: g, roll, wrapped };
}

// ---------------------------------------------------------------- 6. 1924 pharmacy office: the price list + jar
export function office1924Set(scene) {
  const g = new THREE.Group(); scene.add(g);
  room(g, { w: 6, d: 5, h: 3.2, wall: '#3f5a4e', floor: '#6a4a30', stripes: 'rgba(255,255,255,0.04)', seed: 6 });
  const counter = new THREE.Group(); g.add(counter);
  counter.add(at(roundBox(2.4, 0.95, 0.65, soft('#5a3a24', 'wood'), 0.03), 0, 0.475, 0.2));
  counter.add(at(roundBox(2.5, 0.05, 0.75, soft('#e8e2d4', 'ceramic', { roughness: 0.25 }), 0.02), 0, 0.975, 0.2));
  const top = 1.0;
  const hero = jar({ h: 0.3, r: 0.1, fill: '#5a3a20', level: 0.7, label: ['MUMIA VERA', 'AEGYPTIACA'], glass: '#b8a070', lid: '#1a1a1a' }); hero.position.set(0.45, top, 0.3); g.add(hero);
  const list = tex(512, 680, (c, w, h) => { c.fillStyle = '#f4ecd8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; c.textAlign = 'center'; c.font = `900 46px ${SERIF}`; c.fillText('E. MERCK', w / 2, 80); c.font = `700 30px ${SERIF}`; c.fillText('DARMSTADT · PREISLISTE 1924', w / 2, 125);
    c.textAlign = 'left'; c.font = `26px ${SERIF}`; const items = ['Morphinum hydrochl.', 'Moschus', 'Mumia vera Aegyptiaca', 'Myrrha', 'Natrium bicarb.']; items.forEach((it, i) => { const y = 210 + i * 70; if (i === 2) { c.fillStyle = 'rgba(255,214,74,0.7)'; c.fillRect(20, y - 36, w - 40, 52); } c.fillStyle = '#1a1a1a'; c.fillText(it, 40, y); c.textAlign = 'right'; c.fillText(i === 2 ? '12 M / kg' : '…', w - 40, y); c.textAlign = 'left'; }); });
  const paper = plane(0.34, 0.45, list, { roughness: 0.85 }); paper.rotation.x = -Math.PI / 2 + 0.25; paper.position.set(-0.2, top + 0.03, 0.35); g.add(paper);
  const shelfM = soft('#3a2618', 'wood'); const R = rng(11);
  for (let row = 0; row < 4; row++) { const y = 0.9 + row * 0.48; g.add(at(roundBox(4.2, 0.05, 0.34, shelfM, 0.01), 0, y, -2.3));
    for (let i = 0; i < 11; i++) { const b = jar({ h: 0.22, r: 0.07, glass: R() < 0.5 ? '#7a5a2a' : '#e8e8e8', fill: ['#e8e0d0', '#8a5a34', '#4a6a8a'][i % 3], level: 0.6, lid: '#1a1a1a' }); b.position.set(-1.9 + i * 0.38, y + 0.025, -2.3); g.add(b); } }
  const lamp = practical('#ffe2a8', 2.4, 5, { radius: 0.08 }); lamp.position.set(0, 2.6, -0.2); g.add(lamp);
  const reg = roundBox(0.4, 0.3, 0.3, soft('#b8943a', 'metal', { roughness: 0.3 }), 0.03); reg.position.set(-0.85, top + 0.15, 0.2); reg.castShadow = true; g.add(reg);
  return { group: g, top, hero, paper };
}

// ---------------------------------------------------------------- 7. finale: the word (shop counter at night, parchment + tar + jar)
export function wordSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  room(g, { w: 6, d: 5, h: 3.2, wall: '#4a3428', floor: '#4a3020', seed: 12 });
  g.add(at(roundBox(2.6, 0.95, 0.9, soft('#6a4026', 'wood'), 0.03), 0, 0.475, 0));
  g.add(at(roundBox(2.7, 0.05, 1.0, soft('#8a5a36', 'wood'), 0.02), 0, 0.975, 0));
  const top = 1.0;
  // big parchment: the word changes MUMIA -> MUMMY via a canvas we redraw
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 640; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const bg = (c, W, H) => { c.fillStyle = '#ead7aa'; c.fillRect(0, 0, W, H); const r = rng(31); for (let i = 0; i < 3500; i++) { c.fillStyle = r() < 0.5 ? 'rgba(120,80,30,0.12)' : 'rgba(255,250,220,0.15)'; c.fillRect(r() * W, r() * H, 3, 3); }
    const grd = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(90,50,10,0.5)'); c.fillStyle = grd; c.fillRect(0, 0, W, H); };
  /** mode: 0 = "mumia" + tar drawing, k = 0..1 morph to "MUMMY = the medicine" */
  const draw = (k, strike = 0) => { const c = cv.getContext('2d'), W = 1024, H = 640; bg(c, W, H); c.textAlign = 'center'; c.fillStyle = '#2a1608';
    c.globalAlpha = 1 - k; c.font = `italic 700 150px ${SERIF}`; c.fillText('mumia', W / 2, 290); c.font = `italic 600 50px ${SERIF}`; c.fillText('= black tar from rocks', W / 2, 400);
    if (strike > 0) { c.strokeStyle = '#b3261e'; c.lineWidth = 16; c.beginPath(); c.moveTo(300, 240); c.lineTo(300 + 430 * strike, 240 + 10 * strike); c.stroke(); }
    c.globalAlpha = k; c.font = `900 150px ${SERIF}`; c.fillText('MUMMY', W / 2, 300); c.font = `italic 600 48px ${SERIF}`; c.fillText('first meant: the medicine', W / 2, 400); c.globalAlpha = 1; t.needsUpdate = true; };
  draw(0);
  const sheet = plane(1.0, 0.625, t, { roughness: 0.9 }); sheet.rotation.x = -Math.PI / 2 + 0.55; sheet.position.set(0, top + 0.2, 0.05); g.add(sheet);
  const stand = roundBox(0.9, 0.36, 0.05, soft('#5a3a22', 'wood'), 0.02); stand.position.set(0, top + 0.17, -0.12); stand.rotation.x = 0.55 - Math.PI / 2 + Math.PI / 2 - 0.0; stand.rotation.x = -1.02; g.add(stand);
  const tarB = bowl({ r: 0.13, level: 0.9 }); tarB.position.set(-0.75, top, 0.25); g.add(tarB);
  const rockChunk = sph(0.12, soft('#a07a52', 'clay', { roughness: 0.95 }), 16, 12); rockChunk.scale.set(1.3, 0.8, 1); rockChunk.position.set(-1.05, top + 0.07, 0.05); g.add(rockChunk);
  const hero = jar({ h: 0.34, r: 0.12, fill: '#6a4428', level: 0.75, label: ['MUMMY', 'POWDER'], lid: '#3a2414' }); hero.position.set(0.8, top, 0.22); g.add(hero);
  const c1 = candle(0.22); c1.position.set(-0.4, top, -0.3); g.add(c1); const c2 = candle(0.15); c2.position.set(1.15, top, -0.2); g.add(c2);
  const drop = sph(0.03, soft('#0c0907', 'plastic', { roughness: 0.05, clearcoat: 1 }), 16, 12); drop.scale.set(1, 1.4, 1); g.add(drop);
  const shelf = bookshelf({ seed: 4, w: 1.6, h: 2.2 }); shelf.position.set(-1.6, 0, -2.3); g.add(shelf);
  const R = rng(17); for (let i = 0; i < 9; i++) { const j = jar({ h: 0.2 + R() * 0.1, r: 0.07, fill: ['#8a5a34', '#c8a24a', '#6a8a4a'][i % 3], level: 0.6 }); j.position.set(0.4 + i * 0.3, 1.35, -2.3); g.add(j); }
  g.add(at(roundBox(3.0, 0.05, 0.34, soft('#3a2618', 'wood'), 0.01), 1.6, 1.33, -2.3));
  return { group: g, top, draw, sheet, tarBowl: tarB, drop, hero };
}
