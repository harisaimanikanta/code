// Screen-space occlusion for camera-through-object transitions.
// An occluder is a sphere/box in world space. When the camera enters it, the frame is filled
// with the occluder's colour (e.g. the dark fabric of a shoulder, the black of a lens barrel).
// Coverage ramps smoothly with penetration depth — never a hard cut.

export type Vec3 = [number, number, number];
export interface Occluder {
  id: string;
  shape: 'sphere' | 'box';
  center: Vec3;
  /** sphere: radius; box: half-extents */
  radius?: number;
  halfSize?: Vec3;
  color: string;
  /** distance outside the surface where coverage starts (soft edge), meters */
  feather?: number;
  /** optional frame window when the occluder is active */
  frames?: [number, number];
}

/** Returns {coverage 0..1, color} for the strongest occluder containing the camera. */
export function occlusionAt(cam: Vec3, occluders: Occluder[], frame?: number): { coverage: number; color: string } {
  let best = { coverage: 0, color: '#000000' };
  for (const o of occluders) {
    if (o.frames && frame !== undefined && (frame < o.frames[0] || frame > o.frames[1])) continue;
    const feather = o.feather ?? 0.3;
    let signed: number; // negative inside
    if (o.shape === 'sphere') {
      const d = Math.hypot(cam[0] - o.center[0], cam[1] - o.center[1], cam[2] - o.center[2]);
      signed = d - (o.radius ?? 1);
    } else {
      const h = o.halfSize ?? [1, 1, 1];
      const q = [Math.abs(cam[0] - o.center[0]) - h[0], Math.abs(cam[1] - o.center[1]) - h[1], Math.abs(cam[2] - o.center[2]) - h[2]];
      const outside = Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0));
      signed = outside + Math.min(Math.max(q[0], q[1], q[2]), 0);
    }
    const x = Math.min(1, Math.max(0, (feather - signed) / (feather * 2)));
    const coverage = x * x * (3 - 2 * x);
    if (coverage > best.coverage) best = { coverage, color: o.color };
  }
  return best;
}
