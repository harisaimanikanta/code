// Production sets (v2): fully dressed, lit-by-practicals locations. Each set is a zone in world-layout.json
// with named anchors (environments/anchors.json). Lighting inside sets is MOTIVATED: fluorescent area lights,
// window shafts, lamps, screens; the global LightingDirector only adds mood/fill/rim on top.
import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getMaterial, type MaterialPresetId } from '../materials/materials';
import { bevelBox, bevelBoxBase, cylinderBase, lathe, cached } from '../core/geometry';
import { noise1, rng } from '../core/math';
import { useAssetTime } from '../core/time';
import { LabTable, GlassContainer, Microscope, PetriDish, SpecimenRack } from '../objects/LabEquipment';
import { Desk, Chair, Lectern, FilingCabinet } from '../objects/Furniture';
import { Journal, PaperStack } from '../objects/Documents';
import { ReagentShelf, LabSink, FumeHood, Pinboard, WallClock, Stool, Typewriter, PillBottle, EndoscopyTower, Curtain, BlindsWindow, PipeRun, Radiator, TheatreSeats, ProjectionScreen, Instances, Monitor } from '../objects/Props80s';
import { Text3D } from '../objects/Text3D';
import { HospitalBed, IVStand, VitalsMonitor, SurgicalLamp } from '../props/Medical';
import { FluorescentFixture, CageLamp, SpotPool, DeskLamp } from '../lighting/Practicals';
import { DustMotes, LightShaft, HazeVolume } from '../particles/Particles';
import { Crowd } from '../characters/Crowd';
import { PigPen, PigGroup } from '../characters/Animals';
import { AwardPlinth, AwardMedal } from '../objects/Award';
import { australianFlagTexture, skyGradientTexture } from '../textures/canvasTextures';

type V3 = [number, number, number];
type Wall = 'n' | 's' | 'e' | 'w';
export interface Opening { wall: Wall; offset?: number; width: number; height: number; sill?: number }

/**
 * Room shell: floor, 4 walls with openings (doors/windows), skirting, optional tiled dado, cornice,
 * ceiling with downstand beams. Origin = floor centre. Walls are 0.25 m thick, inner faces at ±w/2, ±d/2.
 */
export function RoomShell({ size = [10, 3.4, 8] as V3, wall = 'plaster-wall' as MaterialPresetId, dado = null as MaterialPresetId | null, dadoHeight = 1.3, floor = 'linoleum' as MaterialPresetId, ceiling = 'concrete-light' as MaterialPresetId, beams = 3, openings = [] as Opening[], skipWalls = [] as Wall[], ceilingOn = true }: {
  size?: V3; wall?: MaterialPresetId; dado?: MaterialPresetId | null; dadoHeight?: number; floor?: MaterialPresetId; ceiling?: MaterialPresetId; beams?: number; openings?: Opening[]; skipWalls?: Wall[]; ceilingOn?: boolean;
}) {
  const [w, h, d] = size;
  const T = 0.25;
  const parts: React.ReactNode[] = [];
  const addWall = (side: Wall) => {
    if (skipWalls.includes(side)) return;
    const horiz = side === 'n' || side === 's';
    const len = horiz ? w : d;
    const fixed = side === 'n' ? -d / 2 - T / 2 : side === 's' ? d / 2 + T / 2 : side === 'e' ? w / 2 + T / 2 : -w / 2 - T / 2;
    const inward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? -1 : 1;
    const ops = openings.filter((o) => o.wall === side).sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0));
    const segs: [number, number, number, number][] = []; // [along-centre, along-length, y0, y1]
    let cursor = -len / 2 - T;
    for (const o of ops) {
      const a0 = (o.offset ?? 0) - o.width / 2, a1 = (o.offset ?? 0) + o.width / 2;
      if (a0 > cursor) segs.push([(cursor + a0) / 2, a0 - cursor, 0, h]);
      if ((o.sill ?? 0) > 0) segs.push([(a0 + a1) / 2, o.width, 0, o.sill!]);
      segs.push([(a0 + a1) / 2, o.width, (o.sill ?? 0) + o.height, h]);
      cursor = a1;
    }
    if (cursor < len / 2 + T) segs.push([(cursor + len / 2 + T) / 2, len / 2 + T - cursor, 0, h]);
    segs.forEach(([c, l, y0, y1], i) => {
      if (l <= 0.001 || y1 - y0 <= 0.001) return;
      const pos: V3 = horiz ? [c, (y0 + y1) / 2, fixed] : [fixed, (y0 + y1) / 2, c];
      const geo = horiz ? bevelBox(l, y1 - y0, T, 0.01, 2, 2) : bevelBox(T, y1 - y0, l, 0.01, 2, 2);
      parts.push(<mesh key={`${side}${i}`} geometry={geo} material={getMaterial(wall)} position={pos} receiveShadow castShadow />);
      // dado & skirting on the inner face where the segment reaches the floor
      if (y0 < 0.01) {
        const inset = T / 2 + 0.008;
        const ip = (k: number, y: number): V3 => horiz ? [c, y, fixed + inward * (inset + k)] : [fixed + inward * (inset + k), y, c];
        if (dado) parts.push(<mesh key={`${side}${i}d`} geometry={horiz ? bevelBox(l, Math.min(dadoHeight, y1), 0.016, 0.004) : bevelBox(0.016, Math.min(dadoHeight, y1), l, 0.004)} material={getMaterial(dado)} position={ip(0, Math.min(dadoHeight, y1) / 2)} receiveShadow />);
        parts.push(<mesh key={`${side}${i}s`} geometry={horiz ? bevelBox(l, 0.12, 0.03, 0.008) : bevelBox(0.03, 0.12, l, 0.008)} material={getMaterial('wood-dark')} position={ip(0.012, 0.06)} />);
        if (dado) parts.push(<mesh key={`${side}${i}r`} geometry={horiz ? bevelBox(l, 0.04, 0.035, 0.01) : bevelBox(0.035, 0.04, l, 0.01)} material={getMaterial('plastic-cream')} position={ip(0.015, Math.min(dadoHeight, y1))} />);
      }
    });
  };
  (['n', 's', 'e', 'w'] as Wall[]).forEach(addWall);
  return (
    <group>
      <mesh geometry={bevelBox(w + 0.5, 0.2, d + 0.5, 0.01, 2, 1.2)} material={getMaterial(floor)} position={[0, -0.1, 0]} receiveShadow />
      {parts}
      {ceilingOn && <mesh geometry={bevelBox(w + 0.5, 0.25, d + 0.5, 0.01, 2, 3)} material={getMaterial(ceiling)} position={[0, h + 0.125, 0]} receiveShadow />}
      {ceilingOn && Array.from({ length: beams }, (_, i) => <mesh key={`b${i}`} geometry={bevelBox(w, 0.35, 0.3, 0.02)} material={getMaterial(ceiling)} position={[0, h - 0.17, -d / 2 + ((i + 1) * d) / (beams + 1)]} castShadow receiveShadow />)}
    </group>
  );
}

/** 1980s hospital pathology laboratory (12 × 3.6 × 10 m). Doorways: south (+Z, centre) and east. */
export function PathologyLab({ position, rotation, frame, microscopeGlow = 0.8, windowLight = '#ff3a2a', focusTurn = 0 }: { position?: V3; rotation?: V3; frame?: number; microscopeGlow?: number; windowLight?: string; focusTurn?: number }) {
  const W = 12, H = 3.6, D = 10;
  return (
    <group position={position} rotation={rotation}>
      <RoomShell size={[W, H, D]} wall="plaster-wall" dado="tile-hospital" dadoHeight={1.4} floor="linoleum" ceiling="concrete-light" beams={3}
        openings={[{ wall: 's', offset: 0, width: 2.2, height: 2.6 }, { wall: 'e', offset: 2.5, width: 1.8, height: 2.5 }, { wall: 'w', offset: -2.5, width: 1.8, height: 1.5, sill: 1.0 }, { wall: 'w', offset: 1.2, width: 1.8, height: 1.5, sill: 1.0 }]} />
      {/* central island: the hero bench with the microscope (anchors unchanged from v1 Laboratory) */}
      <LabTable length={3.2} position={[0, 0, 0]} rail={false} />
      <Microscope position={[0.4, 0.92, 0]} lensGlow={microscopeGlow} focusTurn={focusTurn} frame={frame} />
      <GlassContainer kind="flask" position={[-0.6, 0.92, 0.1]} liquid="#a8d63a" glow />
      <GlassContainer kind="beaker" position={[-1.0, 0.92, -0.2]} />
      <GlassContainer kind="jar" position={[-1.25, 0.92, 0.2]} liquid="#7a0a12" fill={0.6} />
      <PetriDish position={[1.05, 0.93, 0.25]} />
      <PetriDish position={[1.22, 0.93, -0.05]} colonies={5} />
      <PetriDish position={[1.0, 0.93, -0.25]} colonies={12} />
      <SpecimenRack position={[-1.35, 0.93, -0.25]} />
      <Journal position={[0.95, 0.92, 0.35]} rotation={[0, -0.3, 0]} open />
      <DeskLamp position={[-0.25, 0.92, -0.35]} rotation={[0, 0.6, 0]} intensity={5} />
      {[[-0.8, 1.0], [0.9, 0.95], [1.6, -0.6]].map(([x, z], i) => <Stool key={i} position={[x, 0, z]} rotation={[0, i, 0]} />)}
      {/* north wall: wet bench, reagent shelving, sink, fume hood */}
      <LabTable length={5} depth={0.8} position={[-1.5, 0, -D / 2 + 0.45]} />
      <ReagentShelf width={4.6} shelves={3} position={[-1.5, 1.45, -D / 2 + 0.17]} seed={3} />
      <LabSink position={[1.6, 0, -D / 2 + 0.35]} />
      <FumeHood width={1.6} position={[3.9, 0, -D / 2 + 0.45]} />
      <GlassContainer kind="cylinder" position={[-2.6, 0.92, -D / 2 + 0.5]} liquid="#7a0a12" fill={0.8} />
      <PaperStack position={[-0.3, 0.92, -D / 2 + 0.55]} sheets={14} />
      {/* west wall: windows with blinds, radiators, red dusk light raking through the slats */}
      {[-2.5, 1.2].map((z, i) => (
        <group key={i}>
          <BlindsWindow position={[-W / 2 - 0.06, 1.75, z]} rotation={[0, Math.PI / 2, 0]} width={1.8} height={1.5} tilt={0.55} />
          <Radiator position={[-W / 2 + 0.2, 0, z]} rotation={[0, Math.PI / 2, 0]} />
          <SpotPool position={[-W / 2 - 3, 4.2, z]} target={[-W / 2 + 3.5, 0, z + 0.6]} color={windowLight} intensity={180} angle={0.28} penumbra={0.4} castShadow />
          <LightShaft position={[-W / 2 + 1.2, 2.0, z + 0.2]} rotation={[0, 0, -1.1]} length={4} radius={0.75} color={windowLight} intensity={0.07} />
        </group>
      ))}
      {/* east wall: records, pinboard, clock, side desk with typewriter */}
      <Pinboard position={[W / 2 - 0.02, 1.7, -1.5]} rotation={[0, -Math.PI / 2, 0]} />
      <WallClock position={[W / 2 - 0.03, 2.75, 0.2]} rotation={[0, -Math.PI / 2, 0]} frame={frame} />
      {[-3.5, -2.9, -2.3].map((z) => <FilingCabinet key={z} position={[W / 2 - 0.4, 0, z]} rotation={[0, -Math.PI / 2, 0]} />)}
      <Desk position={[W / 2 - 0.6, 0, 0.6]} rotation={[0, -Math.PI / 2, 0]} />
      <Typewriter position={[W / 2 - 0.65, 0.77, 0.6]} rotation={[0, -Math.PI / 2, 0]} />
      <PillBottle position={[W / 2 - 0.45, 0.77, 1.15]} />
      <Chair position={[W / 2 - 1.2, 0, 0.6]} rotation={[0, Math.PI / 2, 0]} />
      {/* ceiling services + fluorescent fixtures (soft area lights) */}
      {[-3, 0, 3].map((x) => [-2.5, 1.5].map((z) => <FluorescentFixture key={`${x}${z}`} position={[x, H - 0.02, z]} length={1.4} intensity={4} flicker={x === 3 && z === 1.5 ? 0.6 : 0} seed={x + z} frame={frame} />))}
      <PipeRun points={[[-W / 2 + 0.3, H - 0.25, -D / 2 + 0.3], [W / 2 - 0.3, H - 0.25, -D / 2 + 0.3]]} radius={0.06} material="metal-painted" valves={2} />
      <PipeRun points={[[-W / 2 + 0.3, H - 0.45, -D / 2 + 0.45], [W / 2 - 0.3, H - 0.45, -D / 2 + 0.45]]} radius={0.035} material="metal-brushed" valves={1} />
      <DustMotes bounds={[W - 1, H - 0.4, D - 1]} count={350} color="#ffb8a8" frame={frame} />
    </group>
  );
}

/** Raked lecture theatre (16 × 7 × 18 m). Stage at -Z with lectern + projection screen; seats face -Z.
 *  Doorway at the back (+Z). `attention` controls how much the audience watches the speaker (0 = rejection). */
export function LectureTheatre({ position, rotation, frame, attention = 0.25, slide = 'CAMPYLOBACTER-LIKE ORGANISMS', screen = 'slide' as 'slide' | 'chart', chartTitle = '10%' }: { position?: V3; rotation?: V3; frame?: number; attention?: number; slide?: string; screen?: 'slide' | 'chart'; chartTitle?: string }) {
  const W = 16, H = 7, D = 18;
  return (
    <group position={position} rotation={rotation}>
      <RoomShell size={[W, H, D]} wall="concrete-dark" floor="wood-floor" ceiling="concrete-dark" beams={4} openings={[{ wall: 's', offset: 0, width: 2.4, height: 3 }, { wall: 'n', offset: 5.5, width: 1.6, height: 2.6 }]} />
      {/* acoustic timber slat walls */}
      {[-1, 1].map((sd) => <Instances key={sd} geometry={bevelBox(0.06, 4.5, 0.08, 0.015)} material={getMaterial('wood-dark')} transforms={Array.from({ length: 60 }, (_, i) => ({ p: [sd * (W / 2 - 0.06), 3.3, -D / 2 + 1 + i * 0.27] as V3 }))} />)}
      {/* stage */}
      <mesh geometry={bevelBoxBase(W - 1, 0.8, 5, 0.02, 2)} material={getMaterial('wood-floor')} position={[0, 0, -D / 2 + 2.5]} receiveShadow castShadow />
      <mesh geometry={bevelBox(W - 1, 0.06, 0.1, 0.02)} material={getMaterial('emissive-red', { emissiveIntensity: 1.2 })} position={[0, 0.78, -D / 2 + 5.02]} />
      <Lectern position={[1.8, 0.8, -D / 2 + 3.4]} rotation={[0, -0.2, 0]} />
      <ProjectionScreen position={[-1.5, 3.6, -D / 2 + 0.25]} width={6.4} height={3.6} content={screen} title={screen === 'chart' ? chartTitle : slide} />
      <mesh geometry={bevelBox(1.1, 0.04, 0.6, 0.01)} material={getMaterial('wood-dark')} position={[-5.2, 1.6, -D / 2 + 3.6]} />
      {/* seating + audience */}
      <TheatreSeats rows={8} perRow={14} position={[0, 0, -D / 2 + 7]} />
      <Crowd rows={8} perRow={14} spacing={[0.62, 0.95]} tier={0.32} position={[0, 0, -D / 2 + 7]} rotation={[0, Math.PI, 0]} attention={attention} lookAt={[-1.8, 1.9, 3.6]} emptyRatio={0.22} frame={frame} />
      {/* lighting: stage wash, house lights dimmed, step lights */}
      <SpotPool position={[1.8, 6.6, -D / 2 + 9]} target={[1.8, 1.5, -D / 2 + 3.4]} color="#ffe0cc" intensity={220} angle={0.22} penumbra={0.6} castShadow />
      <SpotPool position={[-4, 6.6, -D / 2 + 9]} target={[-1, 1, -D / 2 + 3]} color="#ff3a2a" intensity={120} angle={0.4} penumbra={0.8} castShadow={false} />
      {Array.from({ length: 8 }, (_, r) => [-1, 1].map((sd) => <mesh key={`${r}${sd}`} geometry={bevelBox(0.15, 0.03, 0.04, 0.01)} material={getMaterial('emissive-red', { emissiveIntensity: 1.5 })} position={[sd * 4.7, r * 0.32 + 0.05, -D / 2 + 7 + r * 0.95 - 0.3]} />))}
      <HazeVolume size={[W - 2, D - 2]} layers={4} height={6} opacity={0.03} />
      <DustMotes bounds={[W - 2, 6, D - 2]} count={300} frame={frame} />
    </group>
  );
}

/** Gastroscopy / endoscopy room (6 × 3.2 × 6 m), tiled, with bed, endoscopy tower, curtain, lamp. */
export function EndoscopyRoom({ position, rotation, frame }: { position?: V3; rotation?: V3; frame?: number }) {
  const W = 6, H = 3.2, D = 6;
  return (
    <group position={position} rotation={rotation}>
      <RoomShell size={[W, H, D]} wall="tile-white" floor="linoleum" ceiling="concrete-light" beams={2} openings={[{ wall: 's', offset: 1.6, width: 1.6, height: 2.3 }, { wall: 'w', offset: 0, width: 1.6, height: 2.3 }]} />
      <HospitalBed position={[0, 0, -0.5]} rotation={[0, Math.PI / 2, 0]} />
      <EndoscopyTower position={[0.4, 0, -1.9]} rotation={[0, 0.2, 0]} />
      <IVStand position={[-1.2, 0, -1.4]} />
      <VitalsMonitor position={[1.9, 1.7, -D / 2 + 0.1]} frame={frame} bpm={96} />
      <Curtain position={[2.2, 0.05, 0.3]} rotation={[0, Math.PI / 2, 0]} width={3.4} height={2.6} open={0.15} frame={frame} />
      <SurgicalLamp position={[0, 2.6, -0.5]} intensity={14} />
      <LabSink position={[-2.6, 0, -D / 2 + 0.35]} />
      <FilingCabinet position={[2.6, 0, -D / 2 + 0.4]} drawers={3} />
      <FluorescentFixture position={[-1.5, H - 0.02, 1.2]} intensity={3.5} frame={frame} />
      <FluorescentFixture position={[1.5, H - 0.02, 1.2]} intensity={3.5} flicker={0.5} seed={4} frame={frame} />
    </group>
  );
}

/** Animal research room (10 × 3.4 × 8 m) with two pens of pigs, feed sacks, hose, cage lamps. */
export function AnimalLab({ position, rotation, frame, pigs = 3 }: { position?: V3; rotation?: V3; frame?: number; pigs?: number }) {
  const W = 10, H = 3.4, D = 8;
  return (
    <group position={position} rotation={rotation}>
      <RoomShell size={[W, H, D]} wall="concrete-light" dado="plaster-red" dadoHeight={1.1} floor="concrete-dark" ceiling="concrete-light" beams={2} openings={[{ wall: 's', offset: -2.5, width: 1.8, height: 2.6 }, { wall: 'e', offset: 0, width: 1.8, height: 2.6 }]} />
      <PigPen position={[-2.2, 0, -1.6]} width={3.2} depth={2.6} />
      <PigGroup position={[-2.2, 0, -1.6]} count={pigs} size={0.75} frame={frame} />
      <PigPen position={[2.2, 0, -1.6]} width={3.2} depth={2.6} />
      <PigGroup position={[2.2, 0, -1.6]} count={2} size={0.7} seed={9} frame={frame} />
      {[[-4, 1.8], [-3.4, 2.1], [-4.1, 2.6]].map(([x, z], i) => <mesh key={i} geometry={bevelBoxBase(0.5, 0.75, 0.32, 0.12)} material={getMaterial('fabric-wool', { color: '#c8b28a' })} position={[x, 0, z]} rotation={[0, i * 0.4, 0]} castShadow />)}
      <Desk position={[3.6, 0, 2.4]} rotation={[0, -Math.PI / 2, 0]} />
      <PaperStack position={[3.6, 0.77, 2.3]} />
      {[-2.2, 2.2].map((x) => <CageLamp key={x} position={[x, H - 0.3, -1.6]} intensity={9} distance={7} color="#ffb070" />)}
      <FluorescentFixture position={[0, H - 0.02, 2]} intensity={3} frame={frame} />
      <DustMotes bounds={[W - 1, 3, D - 1]} count={300} color="#ffd0a0" frame={frame} />
    </group>
  );
}

/** Nobel-style ceremony stage: velvet curtains, gilded plinth with medal, gold light, audience.
 *  Text plaque is generic ("THE NOBEL PRIZE" as narrated) — no real insignia or likeness. */
export function CeremonyStage({ position, rotation, frame, revealStart = 0, plaque = 'THE NOBEL PRIZE', attention = 0.95 }: { position?: V3; rotation?: V3; frame?: number; revealStart?: number; plaque?: string; attention?: number }) {
  const W = 20, D = 18;
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bevelBox(W, 0.2, D, 0.01, 2, 1.5)} material={getMaterial('wood-floor')} position={[0, -0.1, 0]} receiveShadow />
      <mesh geometry={bevelBoxBase(W - 4, 1.0, 6, 0.03)} material={getMaterial('wood-dark')} position={[0, 0, -D / 2 + 3]} receiveShadow castShadow />
      {Array.from({ length: 4 }, (_, i) => <mesh key={i} geometry={bevelBoxBase(4, 0.25 * (i + 1), 0.4, 0.02)} material={getMaterial('velvet-red')} position={[0, 0, -D / 2 + 6 + (3 - i) * 0.4 - 0.2]} castShadow receiveShadow />)}
      {[-1, 1].map((sd) => <Curtain key={sd} position={[sd * 5.2, 1.0, -D / 2 + 0.6]} width={7} height={8} pleats={26} open={0.55} material="velvet-red" frame={frame} />)}
      <Curtain position={[0, 1.0, -D / 2 + 0.3]} width={14} height={8} pleats={40} material="velvet-red" frame={frame} />
      <AwardPlinth position={[0, 1.0, -D / 2 + 3.5]} revealStart={revealStart} revealEnd={1e9} height={1.15}>
        <AwardMedal position={[0, 0.2, 0]} rotation={[0, 0, 0]} scale={2.6} frame={frame} />
      </AwardPlinth>
      <Text3D text={plaque} size={0.55} depth={0.12} material="gold-metal" position={[0, 5.6, -D / 2 + 1.2]} />
      <mesh geometry={bevelBox(7.4, 1.0, 0.1, 0.04)} material={getMaterial('wood-dark')} position={[0, 5.85, -D / 2 + 1.08]} />
      <Crowd rows={6} perRow={16} spacing={[0.7, 1.1]} tier={0.0} position={[0, 0, -D / 2 + 9]} rotation={[0, Math.PI, 0]} attention={attention} lookAt={[0, 2, 5.5]} emptyRatio={0.05} bodyMaterial="fabric-tux" frame={frame} />
      <SpotPool position={[0, 9, -D / 2 + 7]} target={[0, 1.6, -D / 2 + 3.5]} color="#ffc66b" intensity={320} angle={0.2} penumbra={0.5} castShadow />
      <SpotPool position={[-6, 8, -D / 2 + 6]} target={[-2, 1.5, -D / 2 + 3]} color="#ff9a3a" intensity={120} angle={0.3} penumbra={0.8} castShadow={false} />
      <SpotPool position={[6, 8, -D / 2 + 6]} target={[2, 1.5, -D / 2 + 3]} color="#ff9a3a" intensity={120} angle={0.3} penumbra={0.8} castShadow={false} />
      <LightShaft position={[0, 8, -D / 2 + 4.5]} length={9} radius={1.8} color="#ffc060" intensity={0.09} />
      <DustMotes bounds={[12, 8, 10]} position={[0, 0, -D / 2 + 5]} color="#ffd27a" count={500} frame={frame} />
    </group>
  );
}

/** Brutalist research institute exterior at dusk: plaza, monumental facade with lit window bays,
 *  entrance canopy, cast-concrete sign, flag, distant towers, red-sun sky dome. Entrance at (0, 0, -18). */
export function InstituteExterior({ position, rotation, frame, sign = ['PERTH', 'AUSTRALIA'], flag = true, sun = true, entranceOpen = false }: { position?: V3; rotation?: V3; frame?: number; sign?: string[]; flag?: boolean; sun?: boolean; entranceOpen?: boolean }) {
  const { t } = useAssetTime(frame);
  const windows = useMemo(() => {
    const r = rng(17);
    const lit: { p: V3 }[] = [], dark: { p: V3 }[] = [];
    for (let fl = 0; fl < 6; fl++) for (let c = 0; c < 14; c++) {
      const p: V3 = [-13 + c * 2, 4.2 + fl * 2.4, -18.6];
      (r() < 0.3 ? lit : dark).push({ p });
    }
    return { lit, dark };
  }, []);
  const skyMat = useMemo(() => new THREE.MeshBasicMaterial({ map: skyGradientTexture(), side: THREE.BackSide, fog: false, toneMapped: true }), []);
  const flagGeo = useMemo(() => new THREE.PlaneGeometry(2.4, 1.2, 24, 12), []);
  const flagBase = useMemo(() => Float32Array.from(flagGeo.attributes.position.array as Float32Array), [flagGeo]);
  const flagMat = useMemo(() => new THREE.MeshStandardMaterial({ map: australianFlagTexture(), roughness: 0.85, side: THREE.DoubleSide }), []);
  useLayoutEffect(() => {
    const pos = flagGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = flagBase[i * 3] + 1.2, y = flagBase[i * 3 + 1];
      pos.setXYZ(i, x, y - x * 0.04, Math.sin(x * 2.4 - t * 4.5) * 0.12 * x * 0.45 + noise1(3, t + x) * 0.03);
    }
    pos.needsUpdate = true;
    flagGeo.computeVertexNormals();
  }, [flagGeo, flagBase, t]);
  return (
    <group position={position} rotation={rotation}>
      {sun && <mesh geometry={cached('skydome', () => new THREE.SphereGeometry(180, 32, 16))} material={skyMat} />}
      {sun && <mesh geometry={cached('sun', () => new THREE.CircleGeometry(14, 64))} material={getMaterial('emissive-red', { emissive: '#ff2a1a', emissiveIntensity: 2.2, fog: false })} position={[18, 22, -170]} />}
      {/* plaza paving */}
      <Instances geometry={bevelBox(3.9, 0.12, 3.9, 0.03, 2, 4)} material={getMaterial('concrete-light')} transforms={Array.from({ length: 64 }, (_, i) => ({ p: [-14 + (i % 8) * 4, -0.06, -16 + Math.floor(i / 8) * 4] as V3 }))} castShadow={false} />
      {/* facade: plinth floor, cantilevered upper block, piers, deep window bays */}
      {entranceOpen
        ? [-1, 1].map((sd) => <mesh key={sd} geometry={bevelBoxBase(8.5, 3.2, 8, 0.05)} material={getMaterial('concrete-dark')} position={[sd * 10.75, 0, -23]} castShadow receiveShadow />)
        : <mesh geometry={bevelBoxBase(30, 3.2, 8, 0.05)} material={getMaterial('concrete-dark')} position={[0, 0, -23]} castShadow receiveShadow />}
      <mesh geometry={bevelBoxBase(32, 15, 9, 0.08)} material={getMaterial('concrete-rough')} position={[0, 3.2, -24.4]} castShadow receiveShadow />
      {/* window bays: deep reveal, steel frame, mullion + transom, glass; ~1/3 lit with dim warm interiors */}
      <Instances geometry={bevelBox(1.55, 1.75, 0.5, 0.03)} material={getMaterial('matte-black')} transforms={[...windows.dark, ...windows.lit].map((w) => ({ p: [w.p[0], w.p[1], w.p[2] - 0.35] as V3 }))} castShadow={false} />
      <Instances geometry={bevelBox(1.45, 1.6, 0.04, 0.01)} material={getMaterial('emissive-gold', { emissive: '#ff7a48', emissiveIntensity: 0.55 })} transforms={windows.lit.map((w) => ({ p: [w.p[0], w.p[1], w.p[2] - 0.55] as V3 }))} castShadow={false} />
      <Instances geometry={bevelBox(1.5, 1.66, 0.02, 0.005)} material={getMaterial('glass', { opacity: 0.4, color: '#4a3a3a' })} transforms={[...windows.dark, ...windows.lit].map((w) => ({ p: [w.p[0], w.p[1], w.p[2] - 0.1] as V3 }))} castShadow={false} />
      <Instances geometry={bevelBox(0.05, 1.66, 0.08, 0.01)} material={getMaterial('metal-dark')} transforms={[...windows.dark, ...windows.lit].flatMap((w) => [-0.75, 0, 0.75].map((dx) => ({ p: [w.p[0] + dx, w.p[1], w.p[2] - 0.08] as V3 })))} castShadow={false} />
      <Instances geometry={bevelBox(1.55, 0.05, 0.08, 0.01)} material={getMaterial('metal-dark')} transforms={[...windows.dark, ...windows.lit].flatMap((w) => [-0.83, 0.35, 0.83].map((dy) => ({ p: [w.p[0], w.p[1] + dy, w.p[2] - 0.08] as V3 })))} castShadow={false} />
      {/* deep horizontal spandrel fins */}
      <Instances geometry={bevelBox(32.4, 0.45, 1.2, 0.06)} material={getMaterial('concrete-rough')} transforms={Array.from({ length: 7 }, (_, fl) => ({ p: [0, 3.15 + fl * 2.4, -19.6] as V3 }))} />
      {/* entrance: recessed glazing + cantilever canopy */}
      {!entranceOpen && <mesh geometry={bevelBox(6, 2.8, 0.1, 0.02)} material={getMaterial('glass', { opacity: 0.35 })} position={[0, 1.4, -18.9]} />}
      {!entranceOpen && <mesh geometry={bevelBox(6, 2.8, 0.05, 0.02)} material={getMaterial('emissive-gold', { emissive: '#ff8a5a', emissiveIntensity: 0.6 })} position={[0, 1.4, -19.3]} />}
      {entranceOpen && [-1, 1].map((sd) => <mesh key={sd} geometry={bevelBox(1.6, 2.8, 0.08, 0.02)} material={getMaterial('glass', { opacity: 0.3 })} position={[sd * 2.3, 1.4, -18.9]} />)}
      <mesh geometry={bevelBox(9, 0.4, 4, 0.05)} material={getMaterial('concrete-rough')} position={[0, 3.4, -17]} castShadow />
      {[-1, 1].map((sd) => <SpotPool key={sd} position={[sd * 2.5, 3.1, -16.5]} target={[sd * 2.5, 0, -15]} color="#ffb088" intensity={60} angle={0.5} penumbra={0.8} castShadow={false} />)}
      {/* cast concrete sign monolith */}
      <mesh geometry={bevelBoxBase(7.2, 3.2, 1.2, 0.06)} material={getMaterial('concrete-dark')} position={[-8, 0, -11]} rotation={[0, 0.25, 0]} castShadow receiveShadow />
      {sign.map((line, i) => <Text3D key={line} text={line} size={i === 0 ? 1.0 : 0.55} depth={0.12} material="concrete-light" position={[-8 + Math.sin(0.25) * 0.66, i === 0 ? 1.75 : 0.85, -11 + Math.cos(0.25) * 0.66]} rotation={[0, 0.25, 0]} />)}
      <SpotPool position={[-3.5, 0.3, -9.0]} target={[-8, 1.6, -11]} color="#ff5a3a" intensity={420} angle={0.45} penumbra={0.5} castShadow />
      {/* flag */}
      {flag && (
        <group position={[8, 0, -12]}>
          <mesh geometry={cylinderBase(0.07, 0.09, 11, 16)} material={getMaterial('metal-brushed')} castShadow />
          <mesh geometry={flagGeo} material={flagMat} position={[0.08, 10.2, 0]} castShadow />
        </group>
      )}
      {/* distant brutalist towers */}
      <Instances geometry={bevelBoxBase(10, 1, 10, 0.1)} material={getMaterial('concrete-dark')} transforms={[[-60, 34, -90], [-30, 48, -110], [40, 40, -100], [70, 30, -80], [5, 55, -140]].map(([x, h, z]) => ({ p: [x, 0, z] as V3, s: [1, h, 1] as V3 }))} castShadow={false} />
      {/* planters with clipped trees */}
      {[-12, 12].map((x) => (
        <group key={x} position={[x, 0, -8]}>
          <mesh geometry={bevelBoxBase(2.4, 0.7, 2.4, 0.06)} material={getMaterial('concrete-rough')} castShadow receiveShadow />
          <mesh geometry={cylinderBase(0.12, 0.16, 2.2, 10)} material={getMaterial('wood-dark')} position={[0, 0.7, 0]} />
          <mesh geometry={lathe([[0.01, 0], [1.2, 0.4], [1.4, 1.4], [0.9, 2.4], [0.01, 2.9]], 9)} material={getMaterial('red-dark', { color: '#2a1410', roughness: 0.95 })} position={[0, 2.4, 0]} castShadow />
        </group>
      ))}
    </group>
  );
}


/** Publication desk set: a dim study wall with cast lettering, desk, lamp, typewriter, newspaper/journal
 *  with a real headline. The wall lettering rises out of the concrete between revealStart..revealEnd. */
export function PublicationDesk({ position, rotation, frame, headline = 'THE PATIENT', masthead = 'MEDICAL JOURNAL', wallText = ['THE PATIENT', 'WAS HIM.'], revealStart = 0, revealEnd = 30 }: { position?: V3; rotation?: V3; frame?: number; headline?: string; masthead?: string; wallText?: string | string[]; revealStart?: number; revealEnd?: number }) {
  const lines = Array.isArray(wallText) ? wallText : [wallText];
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bevelBox(12, 0.2, 8, 0.01, 2, 1.2)} material={getMaterial('wood-floor')} position={[0, -0.1, 0]} receiveShadow />
      <mesh geometry={bevelBoxBase(9, 4.2, 0.4, 0.04)} material={getMaterial('concrete-rough')} position={[0, 0, -2.2]} receiveShadow castShadow />
      {lines.map((ln, i) => <Text3D key={ln} text={ln} size={0.4} depth={0.14} material="concrete-light" position={[0, 3.05 - i * 0.62, -1.95]} revealStart={revealStart + i * 12} revealEnd={revealEnd + i * 12} frame={frame} />)}
      <Desk position={[0, 0, -0.6]} width={2.0} />
      <Typewriter position={[-0.5, 0.77, -0.75]} rotation={[0, 0.25, 0]} />
      <PaperStack position={[0.55, 0.77, -0.5]} sheets={10} />
      <DeskLamp position={[0.75, 0.77, -0.85]} rotation={[0, -0.6, 0]} intensity={7} />
      <Chair position={[0, 0, 0.2]} rotation={[0, Math.PI, 0]} />
      <Monitor content="chart" title="1985" position={[-3.2, 1.3, -1.7]} rotation={[0, 0.4, 0]} />
      <SpotPool position={[1.5, 4.5, 2]} target={[0, 2.6, -2]} color="#ff3a2a" intensity={110} angle={0.4} penumbra={0.7} castShadow />
      <SpotPool position={[0, 3.8, 0.5]} target={[0, 0.8, -0.6]} color="#ffd8b8" intensity={60} angle={0.35} penumbra={0.6} castShadow />
      <DustMotes bounds={[7, 4, 5]} count={250} frame={frame} />
      <group position={[0.2, 0.775, -0.35]} rotation={[-Math.PI / 2, 0, -0.18]}>
        <NewspaperFlat headline={headline} masthead={masthead} />
      </group>
    </group>
  );
}

function NewspaperFlat({ headline, masthead }: { headline: string; masthead: string }) {
  return <NewspaperImpl headline={headline} masthead={masthead} />;
}
import { Newspaper as NewspaperImpl } from '../objects/Props80s';

/** Final horizon: monumental brutalist slabs against a huge low red sun, sky dome, ground haze.
 *  Place a silhouetted Figure at 'standpoint'. Sun sits on the -Z horizon. */
export function RedSunHorizon({ position, rotation, frame }: { position?: V3; rotation?: V3; frame?: number }) {
  const skyMat = useMemo(() => new THREE.MeshBasicMaterial({ map: skyGradientTexture('#020001', '#2a0306', '#e0141e'), side: THREE.BackSide, fog: false }), []);
  // slabs frame the sun: none within ±12 m of the centre line so the disc stays visible behind a silhouette
  const slabs = useMemo(() => { const r = rng(31); return Array.from({ length: 10 }, (_, i) => ({ x: (i < 5 ? -1 : 1) * (14 + (i % 5) * 9 + r() * 3), h: 10 + r() * 22, w: 3 + r() * 5, z: -40 - r() * 30 })); }, []);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={cached('skydome2', () => new THREE.SphereGeometry(200, 32, 16))} material={skyMat} />
      <mesh geometry={cached('sun2', () => new THREE.CircleGeometry(38, 96))} material={getMaterial('emissive-red', { emissive: '#ff1408', emissiveIntensity: 1.25, fog: false })} position={[0, 9, -190]} />
      <mesh geometry={bevelBox(160, 0.4, 160, 0.02, 2, 4)} material={getMaterial('concrete-dark')} position={[0, -0.2, -40]} receiveShadow />
      {slabs.map((sl, i) => <mesh key={i} geometry={bevelBoxBase(sl.w, sl.h, 3, 0.08)} material={getMaterial('concrete-dark')} position={[sl.x, 0, sl.z]} castShadow receiveShadow />)}
      <mesh geometry={bevelBoxBase(6, 2.4, 6, 0.06)} material={getMaterial('concrete-rough')} position={[0, 0, -8]} castShadow receiveShadow />
      <Staircase steps={10} rise={0.24} run={0.5} width={3} position={[0, 0, -2]} walls={false} />
      <HazeVolume size={[120, 120]} layers={4} height={8} color="#7a0a12" opacity={0.04} position={[0, 0, -40]} />
      <DustMotes bounds={[30, 12, 30]} position={[0, 0, -10]} color="#ff5a3a" count={400} frame={frame} />
    </group>
  );
}
import { Staircase } from '../architecture/Structural';
