// Procedurally painted canvas textures for in-world screens and printed matter (browser canvas; deterministic).
// Used by screens (charts, endoscopy feed, slides) and print (newspaper front pages, journal covers).
import * as THREE from 'three';
import { rng } from '../core/math';

const cache = new Map<string, THREE.CanvasTexture>();
function make(key: string, w: number, h: number, paint: (c: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  paint(c, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  cache.set(key, t);
  return t;
}
const FONT = "'Oswald', 'Arial Narrow', 'Liberation Sans Narrow', Impact, sans-serif";

/** Declining line chart on a dark screen (data/statistics beats). */
export function chartTexture(title = '10%', seed = 3, color = '#ff2a35'): THREE.CanvasTexture {
  return make(`chart|${title}|${seed}|${color}`, 1024, 576, (c, w, h) => {
    const r = rng(seed);
    c.fillStyle = '#0b0607'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 2;
    for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(80, (h * i) / 8); c.lineTo(w - 40, (h * i) / 8); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(80, 40); c.lineTo(80, h - 60); c.lineTo(w - 40, h - 60); c.stroke();
    c.strokeStyle = color; c.lineWidth = 7; c.shadowColor = color; c.shadowBlur = 18; c.beginPath();
    let y = 120;
    for (let i = 0; i <= 12; i++) { const x = 80 + ((w - 140) * i) / 12; y = Math.min(h - 80, y + r() * 50 - 8); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke(); c.shadowBlur = 0;
    c.fillStyle = color; c.font = `700 150px ${FONT}`; c.textAlign = 'right'; c.fillText(title, w - 70, 190);
  });
}

/** Endoscopy monitor feed: inflamed gastric lumen with folds, vignette and specular highlights. */
export function endoscopyTexture(seed = 7, inflamed = 1): THREE.CanvasTexture {
  return make(`endo|${seed}|${inflamed}`, 768, 576, (c, w, h) => {
    const r = rng(seed);
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const g = c.createRadialGradient(cx, cy, 10, cx, cy, h * 0.55);
    g.addColorStop(0, '#1a0204'); g.addColorStop(0.25, inflamed ? '#7a0c12' : '#7a3a30'); g.addColorStop(0.7, inflamed ? '#d2433a' : '#c8826a'); g.addColorStop(1, '#2a0405');
    c.save(); c.beginPath(); c.arc(cx, cy, h * 0.48, 0, Math.PI * 2); c.clip();
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { // rugae folds
      const a = (i / 9) * Math.PI * 2 + r() * 0.3;
      c.strokeStyle = `rgba(60,0,4,${0.35 + r() * 0.3})`; c.lineWidth = 10 + r() * 14;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40);
      c.quadraticCurveTo(cx + Math.cos(a + 0.4) * 160, cy + Math.sin(a + 0.4) * 160, cx + Math.cos(a + 0.2) * h * 0.5, cy + Math.sin(a + 0.2) * h * 0.5); c.stroke();
    }
    for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 60 + r() * 180; c.fillStyle = `rgba(255,${200 + r() * 55},${200 + r() * 55},${0.5 + r() * 0.5})`; c.beginPath(); c.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2 + r() * 6, 1 + r() * 3, a, 0, Math.PI * 2); c.fill(); }
    if (inflamed) for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 50 + r() * 190; c.fillStyle = 'rgba(150,0,10,0.55)'; c.beginPath(); c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4 + r() * 10, 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = `500 22px monospace`; c.fillText('GASTROSCOPY  1984', 24, 36); c.fillText('ANTRUM', 24, h - 24);
  });
}

/** Newspaper / journal front page with a real headline and column filler. */
export function newspaperTexture(headline = 'THE PATIENT', masthead = 'MEDICAL JOURNAL', seed = 5): THREE.CanvasTexture {
  return make(`news|${headline}|${masthead}|${seed}`, 768, 1024, (c, w, h) => {
    const r = rng(seed);
    c.fillStyle = '#e8e0cf'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1716'; c.font = `700 64px ${FONT}`; c.textAlign = 'center'; c.fillText(masthead, w / 2, 90);
    c.fillRect(40, 110, w - 80, 4); c.fillRect(40, 120, w - 80, 1.5);
    c.font = `700 ${headline.length > 14 ? 92 : 120}px ${FONT}`; c.fillText(headline, w / 2, 270);
    c.fillStyle = '#3a3532';
    for (let col = 0; col < 3; col++) for (let ln = 0; ln < 30; ln++) {
      const x = 44 + col * ((w - 88) / 3), y = 330 + ln * 21;
      if (col === 1 && ln > 2 && ln < 13) continue;
      c.fillRect(x, y, ((w - 88) / 3 - 20) * (ln % 9 === 8 ? 0.5 : 0.85 + r() * 0.15), 7);
    }
    c.fillStyle = '#2a2524'; c.fillRect(44 + (w - 88) / 3, 390, (w - 88) / 3 - 20, 200); // photo block
    c.fillStyle = '#5a4f48'; c.beginPath(); c.arc(44 + (w - 88) / 2 - 10, 470, 46, 0, Math.PI * 2); c.fill(); c.fillRect(44 + (w - 88) / 2 - 70, 520, 120, 70);
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(120,90,40,0.12)'); g.addColorStop(1, 'rgba(60,40,20,0.2)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
}

/** Lecture slide / poster with a title and a schematic of spiral bacteria. */
export function slideTexture(title = 'CAMPYLOBACTER-LIKE ORGANISMS', seed = 2): THREE.CanvasTexture {
  return make(`slide|${title}|${seed}`, 1024, 576, (c, w, h) => {
    const r = rng(seed);
    c.fillStyle = '#120a0a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f0e8dc'; c.font = `700 52px ${FONT}`; c.textAlign = 'left'; c.fillText(title, 60, 90);
    c.fillStyle = '#b3121f'; c.fillRect(60, 110, 300, 6);
    for (let i = 0; i < 14; i++) {
      const x = 120 + r() * (w - 240), y = 200 + r() * (h - 260), a = r() * Math.PI;
      c.strokeStyle = '#a8d63a'; c.lineWidth = 6; c.beginPath();
      for (let k = 0; k <= 30; k++) { const s = k / 30; const px = x + Math.cos(a) * s * 90 + Math.cos(a + Math.PI / 2) * Math.sin(s * Math.PI * 5) * 10; const py = y + Math.sin(a) * s * 90 + Math.sin(a + Math.PI / 2) * Math.sin(s * Math.PI * 5) * 10; if (k) c.lineTo(px, py); else c.moveTo(px, py); }
      c.stroke();
    }
  });
}

/** Australian national flag (blue ensign: Union Jack canton, Commonwealth Star, Southern Cross), 2:1. */
export function australianFlagTexture(): THREE.CanvasTexture {
  return make('flag-au', 1024, 512, (c, w, h) => {
    c.fillStyle = '#012169'; c.fillRect(0, 0, w, h);
    const cw = w / 2, ch = h / 2;
    c.save(); c.beginPath(); c.rect(0, 0, cw, ch); c.clip();
    c.strokeStyle = '#fff'; c.lineWidth = ch * 0.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(cw, ch); c.moveTo(cw, 0); c.lineTo(0, ch); c.stroke();
    c.strokeStyle = '#C8102E'; c.lineWidth = ch * 0.067; c.beginPath(); c.moveTo(0, 0); c.lineTo(cw, ch); c.moveTo(cw, 0); c.lineTo(0, ch); c.stroke();
    c.fillStyle = '#fff'; c.fillRect(cw / 2 - ch * 0.1667, 0, ch * 0.333, ch); c.fillRect(0, ch / 2 - ch * 0.1667, cw, ch * 0.333);
    c.fillStyle = '#C8102E'; c.fillRect(cw / 2 - ch * 0.1, 0, ch * 0.2, ch); c.fillRect(0, ch / 2 - ch * 0.1, cw, ch * 0.2);
    c.restore();
    const star = (x: number, y: number, r: number, n = 7) => {
      c.beginPath();
      for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n; const rr = i % 2 ? r * 0.44 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      c.closePath(); c.fill();
    };
    c.fillStyle = '#fff';
    star(cw / 2, h * 0.75, h * 0.15);
    star(w * 0.75, h * 0.833, h * 0.0667); star(w * 0.625, h * 0.4583, h * 0.0667); star(w * 0.75, h * 0.1667, h * 0.0667); star(w * 0.8667, h * 0.4083, h * 0.0667); star(w * 0.8, h * 0.5625, h * 0.0333, 5);
  });
}

/** Dusk sky gradient for a sky dome: black zenith → burgundy → crimson horizon glow. */
export function skyGradientTexture(top = '#050102', mid = '#3a0508', horizon = '#c0121c'): THREE.CanvasTexture {
  return make(`sky|${top}|${mid}|${horizon}`, 16, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(0.42, mid); g.addColorStop(0.5, horizon); g.addColorStop(0.53, '#2a0306'); g.addColorStop(1, '#050102');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
}
