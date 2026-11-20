// Renders the single interconnected world from data/world-layout.json.
// Entities are mounted only when the camera is within their cull radius (and inside their optional
// frame window) — deterministic per frame, so renders are reproducible and fast.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { getComponent } from './registry';
import { activeZonesAt, type WorldEntity, type WorldLayout } from '../data';

const DEFAULT_CULL = { zone: 120, object: 45, actor: 45 } as const;

function visible(e: WorldEntity, kind: keyof typeof DEFAULT_CULL, cam: [number, number, number], frame: number, active: Set<string> | null): boolean {
  if (e.frames && (frame < e.frames[0] || frame > e.frames[1])) return false;
  // zones are gated by the shot plan; entities tagged with a zone follow their zone
  const zoneId = kind === 'zone' ? e.id : e.zone;
  if (active && zoneId) return active.has(zoneId);
  const p = e.position ?? [0, 0, 0];
  const d = Math.hypot(cam[0] - p[0], cam[1] - p[1], cam[2] - p[2]);
  return d <= (e.cullRadius ?? DEFAULT_CULL[kind]);
}

function Entity({ e }: { e: WorldEntity }) {
  const C = getComponent(e.component);
  const extra: Record<string, unknown> = { ...(e.props ?? {}) };
  if (e.actions) extra.actions = e.actions;
  // Figures are positioned by their own root (walk paths are in world space)
  const isFigure = e.component === 'Figure';
  if (isFigure) {
    return <C {...extra} position={e.position} yaw={e.rotation?.[1] ?? 0} scale={e.scale} />;
  }
  return (
    <group position={e.position} rotation={e.rotation} scale={e.scale ?? 1}>
      <C {...extra}>{e.children?.map((c) => <Entity key={c.id} e={c} />)}</C>
    </group>
  );
}

export function World({ layout, cameraPosition }: { layout: WorldLayout; cameraPosition: [number, number, number] }) {
  const frame = useCurrentFrame();
  const active = activeZonesAt(frame);
  return (
    <>
      {(layout.zones ?? []).filter((e) => visible(e, 'zone', cameraPosition, frame, active)).map((e) => <Entity key={e.id} e={e} />)}
      {(layout.objects ?? []).filter((e) => visible(e, 'object', cameraPosition, frame, active)).map((e) => <Entity key={e.id} e={e} />)}
      {(layout.actors ?? []).filter((e) => visible(e, 'actor', cameraPosition, frame, active)).map((e) => <Entity key={e.id} e={e} />)}
    </>
  );
}
