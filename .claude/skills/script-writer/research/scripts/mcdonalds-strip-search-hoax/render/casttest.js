import * as THREE from 'three';
import { makeRenderer, makePost, useHDRI } from 'kit';
import { makeCast, LOOKS } from './cast.js';
export const duration = 4, fps = 30, captions = [];
export async function setup({ canvas, width, height }) {
  const r = makeRenderer(canvas, width, height); r.toneMappingExposure = 0.9;
  const post = makePost(r, width, height, { ao: true, bloom: 0, grain: 0.025, vignette: 0.4 });
  const s = new THREE.Scene(); await useHDRI(r, s, 'apartment', { intensity: 0.35 }); s.background = new THREE.Color('#2a2622');
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshPhysicalMaterial({ color: '#8a7b6a', roughness: 0.6 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; s.add(fl);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), new THREE.MeshPhysicalMaterial({ color: '#c9b79a', roughness: 0.9 })); wall.position.set(0, 2, -1.2); wall.receiveShadow = true; s.add(wall);
  const key = new THREE.SpotLight('#ffd9a8', 30, 10, 0.7, 0.6, 1.5); key.position.set(1.5, 3, 2.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); s.add(key);
  const rim = new THREE.DirectionalLight('#9fc0ff', 1.5); rim.position.set(-2, 2.5, -2); s.add(rim);
  const C = ['manager', 'louise', 'walter', 'tom', 'coworker'].map((k, i) => { const c = makeCast(LOOKS[k]); c.group.position.set(-1.2 + i * 0.6, 0, 0); s.add(c.group); return c; });
  C[0].face('concern'); C[1].face('sad'); C[2].face('neutral'); C[3].face('firm'); C[4].face('frown');
  C[0].reach('R', new THREE.Vector3(-1.32, 1.5, 0.1)); C[0].fingers('R', 0.8);
  const cam = new THREE.PerspectiveCamera(35, width / height, 0.05, 50);
  return { render(t) {
    if (t < 1) { cam.position.set(0, 1.1, 6.2); cam.lookAt(0, 0.95, 0); post.render(s, cam, t); }
    else { const c = C[Math.floor(t) - 1]; const h = c.headWorld(); cam.position.copy(h).add(new THREE.Vector3(0.25, 0.03, 0.85)); cam.lookAt(h); cam.fov = 30; cam.updateProjectionMatrix(); post.render(s, cam, t, { focus: 0.6, aperture: 0.004 }); }
  } };
}
