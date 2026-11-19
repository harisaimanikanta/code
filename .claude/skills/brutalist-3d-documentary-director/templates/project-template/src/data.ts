// Single import point for all project data. Edit the JSON in /data, then run `npm run bake`.
import configJson from '../data/production-config.json';
import shotPlanJson from '../data/shot-plan.json';
import layoutJson from '../data/world-layout.json';
import subtitlesJson from '../data/subtitles.json';
import trackJson from './generated/camera-track.json';
import type { BakedTrack } from './library/camera-rigs/CameraRig';
import type { LightingCue } from './library/lighting/LightingDirector';
import type { Occluder } from './library/transitions/occlusion';

export interface ProductionConfig {
  title: string;
  fps: number;
  width: number;
  height: number;
  durationFrames: number;
  audio: { voiceover: string | null; soundBed: string | null; voiceoverDurationSec: number | null; voiceVolume: number; bedVolume: number };
  lighting: { blendFrames: number };
  style: { letterbox: number; grainScale: number };
  subtitles: { enabled: boolean; wordHighlight: boolean; fontFamily: string; maxCharsPerLine: number; safeMarginPct: number };
  render: { shadows: boolean; antialias: boolean };
}

export interface WorldEntity {
  id: string;
  component: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  props?: Record<string, unknown>;
  actions?: unknown[];
  cullRadius?: number;
  frames?: [number, number];
  children?: WorldEntity[];
}
export interface WorldLayout {
  anchors?: Record<string, [number, number, number]>;
  zones?: WorldEntity[];
  objects?: WorldEntity[];
  actors?: WorldEntity[];
  occluders?: Occluder[];
}

export interface SubtitleCue { start: number; end: number; text: string; words?: { text: string; start: number; end: number }[]; emphasis?: string[]; position?: 'bottom' | 'top' }

export const config = configJson as unknown as ProductionConfig;
export const layout = layoutJson as unknown as WorldLayout;
export const track = trackJson as unknown as BakedTrack;
export const subtitles = (subtitlesJson as unknown as { cues: SubtitleCue[] }).cues;
export const shotPlan = shotPlanJson as unknown as { shots: { id: string; startFrame: number; endFrame: number; lighting?: string }[] };

/** Lighting schedule derived from the shot plan (consecutive identical presets merged). */
export const lightingSchedule: LightingCue[] = (() => {
  const out: LightingCue[] = [];
  for (const s of [...shotPlan.shots].sort((a, b) => a.startFrame - b.startFrame)) {
    const preset = s.lighting ?? 'industrial-red';
    const prev = out[out.length - 1];
    if (prev && prev.preset === preset) prev.end = s.endFrame;
    else out.push({ start: s.startFrame, end: s.endFrame, preset });
  }
  return out;
})();
