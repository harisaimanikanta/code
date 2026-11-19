// Style frames for review: t=0 lab hook · t=1 REJECTED · t=2 piglets · t=3 micro world
import * as THREE from 'three';
import { makeRenderer, aim, lerp } from 'kit';
import { labSet, flask, marshall, deskSet, barnSet, microSet, warren } from './sets.js';

export const duration = 4;
export const fps = 1;
export const captions = [
  { t0: 0, t1: 1, text: 'LIVE stomach' }, { t0: 1, t1: 2, text: 'Rejected.' }, { t0: 2, t1: 3, text: 'won’t get sick' }, { t0: 3, t1: 4, text: 'acid can’t reach' },
];

export async function setup({ canvas, width, height }) {
  const renderer = makeRenderer(canvas, width, height);
  const cam = new THREE.PerspectiveCamera(40, width / height, 0.01, 100);
  // 0: lab hook
  const s0 = new THREE.Scene(); labSet(s0);
  const doc = marshall(); doc.group.position.set(0.2, 0, 0.35); s0.add(doc.group);
  const fl = flask(); s0.add(fl.group);
  const col = warren(); col.group.position.set(-1.6, 0, -0.6); col.group.rotation.y = 0.5; s0.add(col.group);
  // 1: desk + stamp
  const s1 = new THREE.Scene(); const desk = deskSet(s1); desk.stamp.position.set(0.05, 0.02, 0.4);
  // 2: barn
  const s2 = new THREE.Scene(); const barn = barnSet(s2);
  const doc2 = marshall(); doc2.group.position.set(0.9, 0, -0.4); doc2.group.rotation.y = -0.6; s2.add(doc2.group);
  // 3: micro
  const s3 = new THREE.Scene(); const micro = microSet(s3);
  return {
    render(t) {
      const f = Math.floor(t);
      if (f === 0) {
        doc.idle(1.3); col.idle(2); col.face('frown');
        // drinking pose: right forearm raised to mouth, flask in hand, head tilted back
        // drinking: upper arm forward, forearm folded up to the mouth, head back, flask tipped at the lips
        doc.joints.shoulderR.rotation.set(-1.15, 0.25, 0.15); doc.joints.elbowR.rotation.x = -1.75; doc.joints.head.rotation.x = -0.4; doc.face('o');
        doc.group.updateMatrixWorld(true);
        const mouth = doc.joints.head.localToWorld(new THREE.Vector3(0, 0.1, 0.2));
        fl.group.position.copy(mouth).add(new THREE.Vector3(0.0, -0.02, 0.12)); fl.group.rotation.set(-2.1, 0, 0.0);
        aim(cam, new THREE.Vector3(1.3, 1.55, 2.9), new THREE.Vector3(0.1, 1.25, 0.2), 40);
        renderer.render(s0, cam);
      } else if (f === 1) {
        desk.stamp.position.set(0.35, 0.55, 0.15); desk.stamp.rotation.z = -0.4;
        aim(cam, new THREE.Vector3(0.0, 1.05, 0.55), new THREE.Vector3(0.0, 0, 0.02), 40);
        renderer.render(s1, cam);
      } else if (f === 2) {
        barn.pigs.forEach((p, i) => { p.position.y = 0.04 * Math.abs(Math.sin(2 + i)); p.userData.head.rotation.z = 0.2 * Math.sin(i * 2); });
        doc2.idle(1); doc2.face('frown'); doc2.joints.shoulderL.rotation.set(-0.9, 0, 0.3); doc2.joints.elbowL.rotation.x = -1.2;
        aim(cam, new THREE.Vector3(0.35, 1.6, 3.4), new THREE.Vector3(0.35, 0.55, 0), 44);
        renderer.render(s2, cam);
      } else {
        micro.update(2.2);
        aim(cam, new THREE.Vector3(1.6, 1.4, 2.4), new THREE.Vector3(0, 0.6, 0.4), 40);
        renderer.render(s3, cam);
      }
    },
  };
}
