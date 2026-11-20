// Premium cast for "The Phone Call" (stylised cartoon-realism, ~7.3 heads tall).
// Same posing API as kit/toon.js: joints pelvis, chest, neck, head, shoulderL/R, elbowL/R, wristL/R, hipL/R, kneeL/R,
// plus rest() idle() walk() reach() face() look() blink() headTo() handWorld() headWorld() mouthWorld() fingers().
// L = character's left (+x). Character faces +z.
import * as THREE from 'three';
import { canvasTexture, rng } from 'kit';

let _fabricN = null;
function fabricNormal() {                       // woven-cloth normal map (deterministic)
  if (_fabricN) return _fabricN;
  const R = rng(11);
  _fabricN = canvasTexture(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, nx = Math.sin(x * 1.6) * 0.45 + (R() - .5) * 0.3, ny = Math.sin(y * 1.6) * 0.45 + (R() - .5) * 0.3;
      img.data[i] = 128 + nx * 36; img.data[i + 1] = 128 + ny * 36; img.data[i + 2] = 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  _fabricN.colorSpace = THREE.NoColorSpace; _fabricN.wrapS = _fabricN.wrapT = THREE.RepeatWrapping; _fabricN.repeat.set(5, 5);
  return _fabricN;
}
let _hairN = null;
function hairNormal() {                          // strand-direction normal map
  if (_hairN) return _hairN;
  const R = rng(5);
  _hairN = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const x = R() * w, v = 100 + R() * 56; g.strokeStyle = `rgb(${v},128,255)`; g.lineWidth = 1 + R() * 2; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, h * .3, x - 8, h * .6, x + 4, h); g.stroke(); }
  });
  _hairN.colorSpace = THREE.NoColorSpace; _hairN.wrapS = _hairN.wrapT = THREE.RepeatWrapping; _hairN.repeat.set(3, 1);
  return _hairN;
}

const phys = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.6, ...o });
const shadow = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lathe = (prof, m, seg = 40) => shadow(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg), m));
// tapered limb from (0,0,0) down to (0,-len,0)
const limb = (r0, r1, len, m, seg = 20) => { const g = new THREE.CylinderGeometry(r0, r1, len, seg, 4); g.translate(0, -len / 2, 0); return shadow(new THREE.Mesh(g, m)); };
const ball = (r, m, w = 24, h = 16) => shadow(new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m));

/**
 * look: { sex:'f'|'m', height, build, skin, hair, hairColor, hairStyle:'bob'|'ponytail'|'short'|'grey'|'crop',
 *         top:'polo'|'work'|'jacket'|'suit'|'robe', topColor, collarColor, pants, shoes, visor, badge, eye, age (0..1 wrinkle/grey) }
 */
export function makeCast(look = {}) {
  const L = Object.assign({ sex: 'f', height: 1.66, build: 1, skin: '#e7b393', hairColor: '#4a3020', hairStyle: 'bob', top: 'polo', topColor: '#7b1d22',
    collarColor: null, pants: '#1d1f26', shoes: '#18161a', visor: false, badge: true, eye: '#3d2a1c', age: 0.2 }, look);
  const S = L.height / 1.7, f = L.sex === 'f', B = L.build;
  const M = {
    skin: phys(L.skin, { roughness: 0.52, sheen: 0.35, sheenColor: new THREE.Color('#ff9a7a'), sheenRoughness: 0.6, clearcoat: 0.04 }),
    lip: phys(new THREE.Color(L.skin).offsetHSL(-0.03, 0.12, -0.22), { roughness: 0.4, clearcoat: 0.3 }),
    top: phys(L.topColor, { roughness: 0.86, sheen: 0.45, sheenColor: new THREE.Color(L.topColor).offsetHSL(0, -0.1, 0.25), normalMap: fabricNormal(), normalScale: new THREE.Vector2(0.35, 0.35) }),
    collar: phys(L.collarColor || L.topColor, { roughness: 0.8, normalMap: fabricNormal(), normalScale: new THREE.Vector2(0.3, 0.3) }),
    under: phys(L.under || '#d8d4ca', { roughness: 0.85, normalMap: fabricNormal(), normalScale: new THREE.Vector2(0.3, 0.3) }),
    pants: phys(L.pants, { roughness: 0.9, sheen: 0.25, normalMap: fabricNormal(), normalScale: new THREE.Vector2(0.4, 0.4) }),
    shoes: phys(L.shoes, { roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
    hair: phys(L.hairColor, { roughness: 0.5, sheen: 0.9, sheenColor: new THREE.Color(L.hairColor).offsetHSL(0, -0.05, 0.22), sheenRoughness: 0.35, normalMap: hairNormal(), normalScale: new THREE.Vector2(0.6, 0.6) }),
    white: phys('#f3efe8', { roughness: 0.12, clearcoat: 1 }), iris: phys(L.eye, { roughness: 0.25, clearcoat: 1 }), pupil: phys('#0b0b0b', { roughness: 0.2 }),
    dark: phys('#121214', { roughness: 0.35 }), mouthIn: phys('#3a1414', { roughness: 0.6 }), teeth: phys('#efe9dc', { roughness: 0.3 }),
    badge: phys('#d9d3c4', { roughness: 0.3, metalness: 0.2 }), visor: phys(L.visorColor || '#151518', { roughness: 0.55 }),
  };
  const root = new THREE.Group(), J = {};
  const joint = (n, p, x, y, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); J[n] = g; return g; };
  const scaleG = new THREE.Group(); scaleG.scale.setScalar(S); root.add(scaleG);

  const hipH = 0.9, shW = (f ? 0.175 : 0.2) * B, hipW = (f ? 0.17 : 0.155) * B;
  const pelvis = joint('pelvis', scaleG, 0, hipH);
  // hips / seat
  { const h = lathe([[0.001, -0.12], [hipW * 0.75, -0.1], [hipW, -0.02], [hipW * 0.96, 0.06], [hipW * 0.9, 0.1]], M.pants); h.scale.z = 0.72; pelvis.add(h); }
  const chest = joint('chest', pelvis, 0, 0.08);
  // torso (shirt): waist → chest → shoulders
  const torsoProf = [[hipW * 0.9, -0.04], [(f ? 0.135 : 0.15) * B, 0.1], [(f ? 0.15 : 0.165) * B, 0.25], [shW * 0.98, 0.4], [shW * 0.9, 0.46], [0.11, 0.52], [0.06, 0.55]];
  const torso = lathe(torsoProf, M.top, 48); torso.scale.z = 0.66; chest.add(torso);
  if (L.top === 'jacket' || L.top === 'suit') {          // open jacket shell + lapels over an undershirt panel
    const shell = lathe(torsoProf.map(([r, y]) => [r * 1.07, y]).concat([]), M.top, 48);
    shell.geometry = new THREE.LatheGeometry(torsoProf.map(([r, y]) => new THREE.Vector2(r * 1.08, y - 0.06)), 48, Math.PI * 0.12, Math.PI * 1.76);
    shell.material = M.top.clone(); shell.material.side = THREE.DoubleSide; shell.scale.z = 0.7; chest.add(shell);
    torso.material = M.under;
    for (const s of [-1, 1]) { const lap = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.012), M.top)); lap.position.set(s * 0.06, 0.38, 0.125 * B); lap.rotation.set(0.12, 0, s * 0.32); chest.add(lap); }
    if (L.top === 'suit') { const tie = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.032, 0.3, 4), phys(L.tie || '#3b3f5a', { roughness: 0.5, sheen: 0.5 }))); tie.scale.z = 0.3; tie.position.set(0, 0.36, 0.118 * B); tie.rotation.x = -0.1; chest.add(tie); }
  }
  if (L.top === 'polo' || L.top === 'work') {            // collar + placket (+ pockets for the work shirt)
    const col = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.017, 10, 32, Math.PI * 1.7), M.collar)); col.rotation.set(Math.PI / 2 + 0.25, 0, Math.PI * 0.65); col.position.set(0, 0.535, 0.006); col.scale.set(1, 0.85, 1); chest.add(col);
    const pl = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.01), M.collar)); pl.position.set(0, 0.45, 0.11 * B); pl.rotation.x = -0.22; chest.add(pl);
    for (const k of [0, 1]) { const btn = ball(0.005, M.badge, 8, 6); btn.position.set(0, 0.47 - k * 0.05, 0.118 * B); chest.add(btn); }
    if (L.top === 'work') for (const s of [-1, 1]) { const pk = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.006), M.collar)); pk.position.set(s * 0.08, 0.37, 0.113 * B); pk.rotation.x = -0.12; chest.add(pk); }
  }
  if (L.badge) { const b = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.022, 0.006), M.badge)); b.position.set(-0.085, 0.38, 0.122 * B); b.rotation.x = -0.15; chest.add(b); }
  // neck
  const neck = joint('neck', chest, 0, 0.53);
  { const n = limb(0.043, 0.048, 0.1, M.skin); n.position.y = 0.1; neck.add(n); }
  const head = joint('head', neck, 0, 0.055);

  // ---------- head (sculpted sphere: cranium, cheeks, jaw taper, chin) ----------
  const HR = 0.112, H = new THREE.Group(); H.position.set(0, HR * 0.9, 0.012); head.add(H);
  {
    const g = new THREE.SphereGeometry(HR, 64, 48), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), y = P.getY(i), z = P.getZ(i); const ny = y / HR, nz = z / HR;
      if (ny < 0.1) { const k = Math.pow((0.1 - ny) / 1.1, 1.35); x *= 1 - 0.27 * k; z *= 1 - (nz < 0 ? 0.4 : 0.1) * k; if (nz > 0.2) z += HR * 0.05 * k; }   // jaw taper, chin forward
      if (ny > 0.1) { z *= 1 + 0.06 * ny; }                                   // cranium depth
      y *= ny > 0 ? 1.08 : 1.12;                                              // taller oval
      if (nz > 0.55 && Math.abs(ny + 0.1) < 0.35) x *= 1 + 0.04 * (1 - Math.abs(ny + 0.1) / 0.35);   // cheeks
      if (nz > 0.6 && ny > 0.05 && ny < 0.35) z -= HR * 0.035 * Math.sin((ny - 0.05) / 0.3 * Math.PI) * Math.max(0, 1 - Math.abs(x) / (HR * 0.6)) * (Math.abs(x) > HR * 0.12 ? 1 : 0.2);   // eye sockets
      P.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    H.add(shadow(new THREE.Mesh(g, M.skin)));
  }
  for (const s of [-1, 1]) { const e = ball(HR * 0.2, M.skin, 16, 12); e.scale.set(0.42, 1, 0.72); e.position.set(s * HR * 0.97, -HR * 0.02, -HR * 0.06); H.add(e); }
  // nose: bridge + tip + nostrils
  { const br = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(HR * 0.065, HR * 0.2, 6, 12), M.skin)); br.scale.z = 0.8; br.position.set(0, -HR * 0.06, HR * 0.93); br.rotation.x = 0.5; H.add(br);
    const tip = ball(HR * 0.085, M.skin, 20, 14); tip.scale.set(1.1, 0.85, 0.9); tip.position.set(0, -HR * 0.22, HR * 1.01); H.add(tip);
    for (const s of [-1, 1]) { const al = ball(HR * 0.055, M.skin, 14, 10); al.position.set(s * HR * 0.08, -HR * 0.24, HR * 0.92); H.add(al); } }
  // eyes with lids
  const eyes = [], lids = [], brows = [];
  const EY = HR * 0.13, EX = HR * 0.36, EZ = HR * 0.8, ER = HR * 0.15;
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * EX, EY, EZ); H.add(g);
    const w = ball(ER, M.white, 24, 18); g.add(w);
    const ir = new THREE.Group(); g.add(ir);
    const iris = ball(ER * 0.55, M.iris, 20, 14); iris.scale.z = 0.4; iris.position.z = ER * 0.8; ir.add(iris);
    const pu = ball(ER * 0.28, M.pupil, 14, 10); pu.scale.z = 0.4; pu.position.z = ER * 0.9; ir.add(pu);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(ER * 0.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); hl.position.set(ER * 0.18, ER * 0.2, ER * 0.98); ir.add(hl);
    eyes.push(ir);
    // upper + lower lid shells (skin)
    const up = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.08, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), M.skin); up.castShadow = true; g.add(up);
    const lo = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.06, 24, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), M.skin); g.add(lo);
    const lash = new THREE.Mesh(new THREE.TorusGeometry(ER * 1.07, ER * 0.06, 6, 24, Math.PI), M.dark); lash.rotation.y = Math.PI / 2; lash.rotation.order = 'YXZ'; up.add(lash); lash.rotation.set(0, Math.PI / 2, 0);
    lids.push({ up, lo, s });
    const bpts = [V(-HR * 0.17, -HR * 0.02, 0), V(-HR * 0.02, HR * 0.035, HR * 0.01), V(HR * 0.17, HR * 0.0, -HR * 0.01)].map(v => (v.x *= s, v));
    const bg = new THREE.Group(); bg.position.set(s * EX, EY + HR * 0.26, EZ + HR * 0.1); H.add(bg);
    bg.add(shadow(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bpts), 16, HR * (f ? 0.028 : 0.036), 8), M.hair)));
    brows.push({ bg, s });
  }
  // mouth: lips (upper + lower tubes), inner dark, teeth (for open shapes)
  const MY = -HR * 0.47, MZ = HR * 0.87;
  const mouthG = new THREE.Group(); mouthG.position.set(0, MY, MZ); H.add(mouthG);
  const lipCurve = (bend, w) => new THREE.CatmullRomCurve3([V(-HR * w, 0, -HR * 0.06), V(-HR * w * 0.5, bend * 0.5, 0), V(0, bend, HR * 0.015), V(HR * w * 0.5, bend * 0.5, 0), V(HR * w, 0, -HR * 0.06)]);
  const upperLip = shadow(new THREE.Mesh(new THREE.TubeGeometry(lipCurve(-HR * 0.012, 0.2), 20, HR * 0.027, 8), M.lip)); mouthG.add(upperLip);
  const lowerLip = shadow(new THREE.Mesh(new THREE.TubeGeometry(lipCurve(-HR * 0.02, 0.16), 20, HR * 0.032, 8), M.lip)); mouthG.add(lowerLip); lowerLip.position.y = -HR * 0.04;
  const inner = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.15, 16, 10), M.mouthIn); inner.scale.set(1.2, 0.5, 0.35); inner.position.set(0, -HR * 0.035, -HR * 0.02); mouthG.add(inner);
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(HR * 0.26, HR * 0.045, HR * 0.02), M.teeth); teeth.position.set(0, -HR * 0.0, HR * 0.005); mouthG.add(teeth);
  // hair
  const hairG = new THREE.Group(); H.add(hairG);
  const hcap = (thetaLen, sx, sy, sz, rx = -0.35, y = HR * 0.1, z = -HR * 0.06, wob = 0.03) => {
    const g = new THREE.SphereGeometry(HR * 1.08, 56, 32, 0, Math.PI * 2, 0, thetaLen), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const v = V(P.getX(i), P.getY(i), P.getZ(i)); const n = 1 + wob * Math.sin(Math.atan2(v.x, v.z) * 14) * (1 - v.y / HR); const rim = Math.max(0, 1 - (v.y / (HR * 1.08) - Math.cos(thetaLen)) / 0.35); const jag = rim * HR * 0.07 * Math.abs(Math.sin(Math.atan2(v.x, v.z) * 11)); P.setXYZ(i, v.x * n, v.y - jag, v.z * n); }
    g.computeVertexNormals(); const m = shadow(new THREE.Mesh(g, M.hair)); m.scale.set(sx, sy, sz); m.rotation.x = rx; m.position.set(0, y, z); hairG.add(m); return m;
  };
  if (L.hairStyle === 'bob') {           // chin-length bob with side part
    hcap(Math.PI * 0.57, 1.05, 1.08, 1.06, -0.62);
    const back = lathe([[0.001, -HR * 0.62], [HR * 0.92, -HR * 0.55], [HR * 1.08, -HR * 0.2], [HR * 1.1, HR * 0.3], [HR * 0.9, HR * 0.75], [0.001, HR * 1.1]], M.hair, 40);
    back.geometry = new THREE.LatheGeometry([[0.001, -HR * 0.62], [HR * 0.95, -HR * 0.58], [HR * 1.12, -HR * 0.2], [HR * 1.12, HR * 0.3], [HR * 0.92, HR * 0.78], [0.001, HR * 1.12]].map(([r, y]) => new THREE.Vector2(r, y)), 40, Math.PI * 0.62, Math.PI * 0.76);
    back.material = M.hair.clone(); back.material.side = THREE.DoubleSide; back.position.z = -HR * 0.08; hairG.add(back);
    const fr = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(HR * 0.22, HR * 0.5, 6, 12), M.hair)); fr.visible = false; fr.position.set(-HR * 0.3, HR * 0.86, HR * 0.55); fr.rotation.set(0.5, 0, 1.3); fr.scale.set(1, 1, 0.6); hairG.add(fr);
  } else if (L.hairStyle === 'ponytail') {
    hcap(Math.PI * 0.57, 1.03, 1.05, 1.05, -0.62, HR * 0.08, -HR * 0.05, 0.02);
    const tie = shadow(new THREE.Mesh(new THREE.TorusGeometry(HR * 0.12, HR * 0.04, 8, 16), M.dark)); tie.position.set(0, HR * 0.35, -HR * 1.02); hairG.add(tie);
    const tail = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(HR * 0.16, HR * 1.1, 8, 16), M.hair)); tail.position.set(0, -HR * 0.35, -HR * 1.12); tail.rotation.x = 0.18; tail.scale.set(1, 1, 0.8); hairG.add(tail);
    hairG.userData.tail = tail;
  } else if (L.hairStyle === 'short' || L.hairStyle === 'grey') {
    hcap(Math.PI * 0.56, 1.03, 1.04, 1.05, -0.62, HR * 0.07, -HR * 0.07, 0.03);
    for (const s of [-1, 1]) { const sb = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(HR * 0.06, HR * 0.18, 4, 8), M.hair)); sb.position.set(s * HR * 0.93, HR * 0.02, HR * 0.12); H.add(sb); }   // sideburns
  } else if (L.hairStyle === 'crop') {
    hcap(Math.PI * 0.5, 1.0, 0.98, 1.02, -0.72, HR * 0.05, -HR * 0.07, 0.01);
  }
  if (false) {                     // nasolabial folds + forehead line
    for (const s of [-1, 1]) { const fold = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(s * HR * 0.18, -HR * 0.22, HR * 0.95), V(s * HR * 0.3, -HR * 0.45, HR * 0.86), V(s * HR * 0.28, -HR * 0.62, HR * 0.8)]), 10, HR * 0.012, 5), M.lip); H.add(fold); }
  }
  if (L.visor) {
    const band = shadow(new THREE.Mesh(new THREE.TorusGeometry(HR * 1.02, HR * 0.06, 8, 40), M.visor)); band.rotation.x = Math.PI / 2 - 0.3; band.position.set(0, HR * 0.52, -HR * 0.06); band.scale.set(0.93, 0.98, 1); H.add(band);
    const brim = shadow(new THREE.Mesh(new THREE.CylinderGeometry(HR * 0.8, HR * 0.8, HR * 0.03, 40, 1, false, -Math.PI * 0.5, Math.PI), M.visor)); brim.position.set(0, HR * 0.56, HR * 0.8); brim.rotation.x = 0.12; brim.scale.set(1, 1, 0.75); H.add(brim);
  }

  // ---------- arms + hands ----------
  const sleeveLong = L.top !== 'polo';
  const fingers = {};
  for (const [s, n] of [[1, 'L'], [-1, 'R']]) {
    const sh = joint('shoulder' + n, chest, s * shW * 0.92, 0.445);
    { const sb = ball(0.055 * B, M.top, 20, 14); sb.position.x = -s * 0.012; sh.add(sb); }
    const ua = limb(0.06 * B, 0.05, 0.29, M.top); sh.add(ua);
    if (!sleeveLong) { ua.geometry.dispose(); ua.geometry = new THREE.CylinderGeometry(0.06 * B, 0.054, 0.16, 20, 2, true).translate(0, -0.08, 0); ua.material = M.top.clone(); ua.material.side = THREE.DoubleSide;
      const arm = limb(0.045, 0.04, 0.29, M.skin); sh.add(arm); }
    const el = joint('elbow' + n, sh, 0, -0.29);
    el.add(ball(0.043, sleeveLong ? M.top : M.skin, 16, 12));
    el.add(limb(0.042, 0.032, 0.25, sleeveLong ? M.top : M.skin));
    if (sleeveLong) { const cuff = limb(0.036, 0.034, 0.03, M.skin); cuff.position.y = -0.235; el.add(cuff); }
    const wr = joint('wrist' + n, el, 0, -0.26);
    // palm
    const palm = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.035, 6, 12), M.skin)); palm.scale.set(1.15, 1, 0.5); palm.position.y = -0.04; wr.add(palm);
    const F = [];
    for (let k = 0; k < 4; k++) {
      const base = new THREE.Group(); base.position.set(s * (-0.021 + k * 0.014), -0.072, 0); wr.add(base);
      const len = [0.026, 0.03, 0.028, 0.022][k];
      const p1 = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.0075, len, 4, 8), M.skin)); p1.position.y = -len / 2; base.add(p1);
      const mid = new THREE.Group(); mid.position.y = -len; base.add(mid);
      const p2 = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.0068, len * 0.8, 4, 8), M.skin)); p2.position.y = -len * 0.4; mid.add(p2);
      F.push({ base, mid });
    }
    const th = new THREE.Group(); th.position.set(s * 0.028, -0.03, 0.012); wr.add(th);
    const tm = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.03, 4, 8), M.skin)); tm.position.y = -0.02; th.add(tm); th.rotation.z = s * 0.6; th.rotation.x = 0.4;
    fingers[n] = { F, th };
    sh.rotation.z = s * 0.08;
    // legs
    const hip = joint('hip' + n, pelvis, s * hipW * 0.52, -0.04);
    hip.add(limb(0.095 * B * (f ? 1.04 : 1), 0.066, 0.43, M.pants));
    const kn = joint('knee' + n, hip, 0, -0.43);
    kn.add(ball(0.064, M.pants, 16, 12));
    kn.add(limb(0.064, 0.047, 0.42, M.pants));
    const ft = new THREE.Group(); ft.position.y = -0.43; kn.add(ft); J['ankle' + n] = ft;
    const shoe = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.13, 6, 12), M.shoes)); shoe.rotation.x = Math.PI / 2; shoe.scale.set(1, 1, 0.7); shoe.position.set(0, -0.035, 0.05); ft.add(shoe);
  }
  if (L.top === 'robe') { const robe = lathe([[0.2, 0.55], [0.24, 0.3], [0.27, 0], [0.3, -0.5], [0.33, -0.85]], phys('#111116', { roughness: 0.7, sheen: 0.4 })); robe.scale.z = 0.75; chest.add(robe); }

  const all = []; root.traverse(o => { if (o.isMesh) all.push(o); });
  let lastExpr = 'neutral';
  const api = {
    group: root, joints: J, mats: M, head: H, look: L,
    /** neutral | concern | frown | o | tight | smile | sad | firm | talk (talk = open/close with t via api.talk) */
    face(expr = 'neutral', open = 0) {
      lastExpr = expr;
      const sh = { neutral: [0, 0, 0], concern: [0.008, 0.18, -0.003], frown: [-0.006, -0.22, 0.004], o: [0.012, 0.25, 0], tight: [-0.004, -0.12, 0.002], smile: [0.002, 0, -0.006], sad: [0.006, 0.28, 0.006], firm: [-0.008, -0.3, 0] }[expr] || [0, 0, 0];
      const [lift, tilt, corner] = sh;
      for (const b of brows) { b.bg.position.y = EY + HR * 0.26 + lift; b.bg.rotation.z = b.s * tilt * 0.6; }
      let op = expr === 'o' ? 0.9 : open;
      mouthG.scale.set(expr === 'o' ? 0.75 : expr === 'tight' ? 0.85 : 1, 1, 1);
      upperLip.position.y = corner * 0.4; lowerLip.position.y = -HR * 0.04 - op * HR * 0.14 + corner;
      inner.visible = op > 0.05; inner.scale.y = 0.15 + op * 0.9; teeth.visible = op > 0.25;
      mouthG.rotation.z = 0; mouthG.position.y = MY;
    },
    /** lip-flap for dialogue (0..1) */
    talk(k) { api.face(lastExpr, k * 0.45); lastExpr = lastExpr; },
    look(x = 0, y = 0) { for (const e of eyes) e.rotation.set(-y * 0.35, x * 0.45, 0); },
    blink(k = 0) { for (const l of lids) { l.up.rotation.x = -0.55 + k * 1.45; l.lo.rotation.x = -k * 0.15; } },
    fingers(side, curl = 0.4, thumb = 0.4) { const fs = fingers[side]; for (const f of fs.F) { f.base.rotation.x = curl * 1.1; f.mid.rotation.x = curl * 1.4; } fs.th.rotation.x = 0.4 + thumb * 0.8; },
    rest() {
      for (const k in J) J[k].rotation.set(0, 0, 0);
      J.shoulderL.rotation.z = 0.07; J.shoulderR.rotation.z = -0.07; J.elbowL.rotation.x = J.elbowR.rotation.x = -0.12;
      J.pelvis.position.y = hipH; J.pelvis.position.x = 0; J.pelvis.position.z = 0;
      api.fingers('L', 0.35); api.fingers('R', 0.35); api.blink(0); api.look(0, 0);
    },
    idle(t, a = 1, seed = 0) {
      J.chest.rotation.x += 0.012 * Math.sin(t * 1.5 + seed) * a; J.chest.rotation.z += 0.008 * Math.sin(t * 0.7 + seed) * a;
      J.head.rotation.y += 0.05 * Math.sin(t * 0.45 + seed) * a; J.head.rotation.x += 0.02 * Math.sin(t * 0.8 + seed * 2) * a;
      J.pelvis.rotation.y += 0.02 * Math.sin(t * 0.4 + seed) * a;
      const bt = (t + seed * 1.3) % 3.9; api.blink(bt < 0.14 ? Math.sin(bt / 0.14 * Math.PI) : 0);
      api.look(0.12 * Math.sin(t * 0.37 + seed), 0.05 * Math.sin(t * 0.53 + seed));
    },
    walk(t, speed = 5.5, a = 1) {
      const s = Math.sin(t * speed);
      J.hipL.rotation.x = -0.38 * s * a; J.hipR.rotation.x = 0.38 * s * a;
      J.kneeL.rotation.x = 0.55 * Math.max(0, s) * a; J.kneeR.rotation.x = 0.55 * Math.max(0, -s) * a;
      J.shoulderL.rotation.x = 0.28 * s * a; J.shoulderR.rotation.x = -0.28 * s * a;
      J.pelvis.position.y = hipH - 0.012 * a + Math.abs(Math.cos(t * speed)) * 0.016 * a; J.chest.rotation.x += 0.04 * a;
    },
    sit(k = 1) { J.hipL.rotation.x = J.hipR.rotation.x = -1.45 * k; J.kneeL.rotation.x = J.kneeR.rotation.x = 1.5 * k; J.pelvis.position.y = hipH - 0.42 * k; J.pelvis.position.z = -0.08 * k; },
    /** turn head toward a world point (amount 0..1), eyes follow */
    headTo(target, amt = 1) {
      root.updateMatrixWorld(true);
      const hp = J.neck.getWorldPosition(new THREE.Vector3()).add(V(0, 0.15 * S, 0));
      const inv = new THREE.Quaternion().copy(J.neck.getWorldQuaternion(new THREE.Quaternion())).invert();
      const d = target.clone().sub(hp).applyQuaternion(inv).normalize();
      J.head.rotation.y = THREE.MathUtils.clamp(Math.atan2(d.x, d.z), -1.1, 1.1) * amt;
      J.head.rotation.x = THREE.MathUtils.clamp(-Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)), -0.6, 0.6) * amt;
      root.updateMatrixWorld(true);
    },
    reach(side, target, pole = new THREE.Vector3(side === 'R' ? -0.6 : 0.6, -1, -0.4)) {
      const sh = J['shoulder' + side], el = J['elbow' + side];
      root.updateMatrixWorld(true);
      const Sp = sh.getWorldPosition(new THREE.Vector3()), a = 0.29 * S, b = 0.3 * S;
      const d = target.clone().sub(Sp); let Ln = d.length(); Ln = Math.min(Math.max(Ln, 0.05), a + b - 0.002);
      const dir = d.normalize(), x = (a * a - b * b + Ln * Ln) / (2 * Ln), h = Math.sqrt(Math.max(0, a * a - x * x));
      const pn = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
      const E = Sp.clone().add(dir.clone().multiplyScalar(x)).add(pn.multiplyScalar(h)), T = Sp.clone().add(dir.clone().multiplyScalar(Ln));
      const down = new THREE.Vector3(0, -1, 0);
      const parentQ = sh.parent.getWorldQuaternion(new THREE.Quaternion());
      sh.quaternion.copy(parentQ.clone().invert().multiply(new THREE.Quaternion().setFromUnitVectors(down, E.clone().sub(Sp).normalize())));
      sh.updateMatrixWorld(true);
      el.quaternion.copy(sh.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(down, T.clone().sub(E).normalize())));
      root.updateMatrixWorld(true);
    },
    handWorld(side = 'R') { root.updateMatrixWorld(true); return J['wrist' + side].localToWorld(new THREE.Vector3(0, -0.06, 0)); },
    headWorld() { root.updateMatrixWorld(true); return H.localToWorld(new THREE.Vector3(0, 0, 0)); },
    eyesWorld() { root.updateMatrixWorld(true); return H.localToWorld(new THREE.Vector3(0, EY, EZ)); },
    mouthWorld() { root.updateMatrixWorld(true); return H.localToWorld(new THREE.Vector3(0, MY, MZ)); },
    earWorld(side = 'R') { root.updateMatrixWorld(true); return H.localToWorld(new THREE.Vector3(side === 'R' ? -HR * 1.0 : HR * 1.0, -HR * 0.05, 0)); },
    /** silhouette mode: everything one dark material (for the caller / restrained framing) */
    silhouette(color = '#050506') { const m = new THREE.MeshBasicMaterial({ color }); for (const o of all) o.material = m; },
    visible(v) { root.visible = v; },
  };
  api.rest(); api.face('neutral');
  return api;
}

// ---------- the five principal looks (one design each, used for the whole film) ----------
export const LOOKS = {
  manager: { sex: 'f', height: 1.64, build: 1.08, skin: '#e2ae8e', hairColor: '#5a4030', hairStyle: 'bob', top: 'polo', topColor: '#1f2a3d', collarColor: '#2a3852', pants: '#17181d', eye: '#4a3626', age: 0.7, badge: true },
  louise: { sex: 'f', height: 1.63, build: 0.94, skin: '#f0c6a6', hairColor: '#7a5536', hairStyle: 'ponytail', top: 'polo', topColor: '#8c1f24', collarColor: '#a8262c', pants: '#18191e', visor: false, eye: '#3f5a6e', age: 0.1, badge: true },
  walter: { sex: 'm', height: 1.8, build: 1.1, skin: '#dca688', hairColor: '#2e241c', hairStyle: 'crop', top: 'jacket', topColor: '#3a3a36', under: '#7d8a96', pants: '#2c3a52', eye: '#3a2a1e', age: 0.5, badge: false },
  tom: { sex: 'm', height: 1.76, build: 1.05, skin: '#d9a585', hairColor: '#b9b6b0', hairStyle: 'grey', top: 'work', topColor: '#56677a', collarColor: '#4c5c6e', pants: '#2b2d30', shoes: '#3a2a1c', eye: '#4b3a2a', age: 0.9, badge: false },
  coworker: { sex: 'f', height: 1.67, build: 0.98, skin: '#a8714f', hairColor: '#1c1512', hairStyle: 'ponytail', top: 'polo', topColor: '#8c1f24', collarColor: '#a8262c', pants: '#18191e', visor: false, eye: '#2a1c12', age: 0.2 },
  generic: { sex: 'm', height: 1.75, skin: '#d6a383', hairColor: '#3a2c22', hairStyle: 'short', top: 'suit', topColor: '#2a2d36', under: '#e6e3dc', pants: '#262830', badge: false, age: 0.4 },
};
