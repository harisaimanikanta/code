// Composed environment presets. Each is a self-contained zone built from library parts and exposes
// named anchor points (ENV_ANCHORS) in zone-local space so camera moves can target them.
// Place them in world-layout.json; never rebuild these from scratch in a project.
import React from 'react';
import { BrutalistCorridor, ConcreteRoom, MonumentalRoom } from '../architecture/Spaces';
import { Pillar, Platform, SlotLight, Monolith } from '../architecture/Structural';
import { LabTable, GlassContainer, Microscope, PetriDish, SpecimenRack } from '../objects/LabEquipment';
import { Chair, Desk, Lectern, Screen, FilingCabinet } from '../objects/Furniture';
import { PaperStack, Journal } from '../objects/Documents';
import { HangingLamp, SpotPool, DeskLamp } from '../lighting/Practicals';
import { DustMotes, HazeVolume, LightShaft } from '../particles/Particles';
import { Crowd } from '../characters/Crowd';
import { StomachLining, MucusLayer, CellCluster } from '../biological/Anatomy';
import { MicrobeSwarm } from '../biological/Microbes';

type V3 = [number, number, number];
type Z = { position?: V3; rotation?: V3; frame?: number };

/** Zone-local anchors for each environment preset (add zone position for world space). */
export const ENV_ANCHORS: Record<string, Record<string, V3>> = {
  Laboratory: { center: [0, 1.2, 0], bench: [0, 0.95, 0], microscope: [0.4, 0.95, 0], microscopeEyepiece: [0.4, 1.47, 0.11], microscopeObjective: [0.4, 1.22, -0.02], door: [0, 1.6, 7], shelves: [-5.5, 1.5, -3] },
  ConferenceHall: { stage: [0, 1.0, -6], lectern: [0, 1.9, -5.4], screen: [0, 4.5, -9.4], audience: [0, 1.5, 3], aisle: [0, 1.6, 9] },
  ConcreteOffice: { desk: [0, 0.8, -1], chair: [0, 1.2, 0], window: [0, 2.9, -3.8] },
  AwardHall: { plinth: [0, 1.2, 0], above: [0, 6, 0], entrance: [0, 1.7, 14] },
  MicroscopicWorld: { surface: [0, 1, 0], swarm: [0, 3, 0], entry: [0, 6, 14] },
  ArchiveCorridor: { entry: [0, 1.7, 0], mid: [0, 1.7, -20], exit: [0, 1.7, -40] },
};

/** Low-key industrial laboratory: bench with microscope, glassware, shelves, hanging lamps. Door opening at +Z. */
export function Laboratory({ position, rotation, frame, microscopeGlow = 0.6 }: Z & { microscopeGlow?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <ConcreteRoom size={[14, 5, 14]} windowSlit />
      <LabTable length={3.2} position={[0, 0, 0]} />
      <Microscope position={[0.4, 0.92, 0]} scale={1} lensGlow={microscopeGlow} frame={frame} />
      <GlassContainer kind="flask" position={[-0.6, 0.92, 0.1]} liquid="#a8d63a" glow />
      <GlassContainer kind="beaker" position={[-1.0, 0.92, -0.2]} />
      <PetriDish position={[1.1, 0.93, 0.2]} />
      <PetriDish position={[1.25, 0.93, -0.1]} colonies={5} />
      <SpecimenRack position={[-1.3, 0.93, 0.25]} />
      <LabTable length={4} position={[-5.2, 0, -2]} rotation={[0, Math.PI / 2, 0]} />
      <SpecimenRack position={[-5.2, 0.93, -2.6]} rotation={[0, Math.PI / 2, 0]} tubes={8} />
      <GlassContainer kind="jar" position={[-5.2, 0.92, -1.2]} liquid="#7a0a12" fill={0.7} />
      {[-3, 0, 3].map((z) => <FilingCabinet key={z} position={[6.3, 0, z]} rotation={[0, -Math.PI / 2, 0]} />)}
      <HangingLamp position={[0, 4.2, 0]} cable={0.6} intensity={35} castShadow />
      <HangingLamp position={[-5.2, 4.2, -2]} cable={0.6} intensity={18} shaftColor="#ff3a2a" />
      <SlotLight position={[0, 4.6, -6.7]} length={10} intensity={3} />
      <DustMotes bounds={[12, 4.5, 12]} count={250} frame={frame} />
    </group>
  );
}

/** Raked conference hall: stage, lectern, projection screen, seated instanced audience facing the stage (-Z). */
export function ConferenceHall({ position, rotation, frame, screenContent = 'graph', attention = 0.7, audienceLook = [0, 1.9, -5.4] as V3, doorways = [{ wall: 's', width: 3, height: 4 }] }: Z & { screenContent?: 'bars' | 'graph' | 'scan' | 'blank'; attention?: number; audienceLook?: V3; doorways?: Array<{ wall: 'n' | 's' | 'e' | 'w'; offset?: number; width?: number; height?: number }> }) {
  return (
    <group position={position} rotation={rotation}>
      <MonumentalRoom size={[24, 24]} height={10} colonnade={false} doorways={doorways} />
      <Platform size={[14, 1.0, 5]} steps={0} position={[0, 0, -7.5]} />
      <Lectern position={[0, 1.0, -5.6]} />
      <Screen width={9} height={4.5} content={screenContent} position={[0, 4.6, -10.6]} frame={frame} />
      <Crowd rows={7} perRow={16} position={[0, 0, 2]} rotation={[0, Math.PI, 0]} attention={attention} lookAt={[-audienceLook[0], audienceLook[1], -(audienceLook[2] - 2)]} frame={frame} />
      <SpotPool position={[0, 9, -2]} target={[0, 1, -5.6]} intensity={120} color="#ffe2cc" />
      <SlotLight position={[0, 9.3, 0]} rotation={[0, Math.PI / 2, 0]} length={20} intensity={2} />
      <HazeVolume size={[22, 22]} layers={4} height={8} opacity={0.035} />
    </group>
  );
}

/** Austere concrete office: desk, lamp, papers, chair, window slit. Open front at +Z. */
export function ConcreteOffice({ position, rotation }: Z) {
  return (
    <group position={position} rotation={rotation}>
      <ConcreteRoom size={[8, 4, 8]} />
      <Desk position={[0, 0, -1]} />
      <Chair position={[0, 0, -0.2]} rotation={[0, Math.PI, 0]} />
      <DeskLamp position={[-0.6, 0.77, -1.1]} />
      <PaperStack position={[0.35, 0.77, -1]} />
      <Journal position={[0.1, 0.77, -0.9]} open />
      <FilingCabinet position={[3.4, 0, -3]} />
      <FilingCabinet position={[2.8, 0, -3]} drawers={3} />
      <LightShaft position={[0, 2.9, -2.5]} rotation={[0.9, 0, 0]} length={5} radius={1.2} color="#ffd6c0" intensity={0.07} />
    </group>
  );
}

/** Black void hall with a central plinth (place an AwardPlinth/Trophy at the 'plinth' anchor) and pillar ring. */
export function AwardHall({ position, rotation, frame }: Z) {
  return (
    <group position={position} rotation={rotation}>
      <Platform size={[8, 0.4, 8]} steps={2} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <Pillar key={i} position={[Math.cos(a) * 11, 0, Math.sin(a) * 11]} height={14} width={1.2} material="concrete-dark" />;
      })}
      <LightShaft position={[0, 9, 0]} length={18} radius={3} color="#ffc060" intensity={0.12} />
      <DustMotes bounds={[14, 10, 14]} color="#ffcf7a" count={300} frame={frame} />
    </group>
  );
}

/** Microscopic world: folded stomach lining, mucus blanket, epithelial cells, spiral bacteria swarm. */
export function MicroscopicWorld({ position, rotation, frame, swarm = 160, appear = 0 }: Z & { swarm?: number; appear?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <StomachLining size={[40, 40]} foldHeight={1.2} frame={frame} />
      <CellCluster count={90} radius={14} cellSize={0.8} position={[0, 0.4, 0]} frame={frame} />
      <MucusLayer size={[40, 40]} height={2.6} frame={frame} />
      <MicrobeSwarm count={swarm} kind="spiral" bounds={[30, 4, 30]} position={[0, 2.6, 0]} size={0.9} frame={frame} appear={appear} />
      <DustMotes bounds={[30, 8, 30]} color="#c8ff6a" count={300} size={0.04} frame={frame} />
    </group>
  );
}

/** Long corridor of monoliths/archives — journey / passage of time. Entry z=0 → exit z=-40. */
export function ArchiveCorridor({ position, rotation, frame }: Z) {
  return (
    <group position={position} rotation={rotation}>
      <BrutalistCorridor length={40} width={8} height={8} />
      {[-12, -24, -36].map((z, i) => <Monolith key={z} seed={i + 3} position={[i % 2 ? 2.4 : -2.4, 0, z]} scale={0.5} />)}
      <DustMotes bounds={[8, 7, 40]} position={[0, 0, -20]} count={300} frame={frame} />
    </group>
  );
}
