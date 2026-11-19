import * as THREE from 'three';
import { makeRenderer, aim, useHDRI, makePost } from 'kit';
import { makeHuman } from '/kit/human.js';
import { labSet, flask } from './sets.js';
export const duration = 3, fps = 1, captions = [{ t0: 0, t1: 3, text: 'On purpose.' }];
export async function setup({ canvas, width, height }) {
  const r = makeRenderer(canvas, width, height);
  const post = makePost(r, width, height);
  const cam = new THREE.PerspectiveCamera(35, width / height, 0.05, 60);
  const s = new THREE.Scene(); labSet(s); await useHDRI(r, s, 'lab', { intensity: 0.6 });
  const h = makeHuman({ coat: '#f2f2ee', shirt: '#6f8fc7', tie: '#8a1f1f', hair: '#5a3a22', hairStyle: 'short' });
  h.group.position.set(0.2, 0, 0.35); s.add(h.group); h.rest(); h.face('neutral');
  const f = flask(); f.group.position.set(-0.1, 0.98, -0.25); s.add(f.group);
  return { render(t) {
    if (t < 1) aim(cam, new THREE.Vector3(0.5, 1.45, 2.6), new THREE.Vector3(0.2, 1.1, 0.3), 35);
    else if (t < 2) aim(cam, new THREE.Vector3(0.35, 1.62, 1.15), new THREE.Vector3(0.2, 1.58, 0.3), 30);
    else { h.face('o'); aim(cam, new THREE.Vector3(-0.7, 1.4, 1.6), new THREE.Vector3(0.1, 1.3, 0.3), 32); }
    post.render(s, cam, t, { focus: cam.position.distanceTo(new THREE.Vector3(0.2, 1.4, 0.35)), aperture: 0.0025 });
  } };
}
