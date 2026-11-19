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
  render: { shadows: boolean; antialias: boolean; post?: 'off' | 'draft' | 'preview' | 'final' };
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
export interface ShotPost { dof?: number; bloom?: number; bloomThreshold?: number; ao?: number; contrast?: number; saturation?: number; vignette?: number; grain?: number }
export const shotPlan = shotPlanJson as unknown as { shots: { id: string; startFrame: number; endFrame: number; lighting?: string; post?: ShotPost }[] };

/** Per-shot post overrides, cross-faded over 24 frames at shot boundaries (numeric keys only). */
export function postAt(frame: number): ShotPost {
  const shots = shotPlan.shots;
  const i = shots.findIndex((s) => frame >= s.startFrame && frame < s.endFrame);
  if (i < 0) return {};
  const cur = shots[i].post ?? {};
  const prev = i > 0 ? shots[i - 1].post ?? {} : {};
  const k = Math.min(1, (frame - shots[i].startFrame) / 24);
  if (k >= 1 || i === 0) return cur;
  const out: Record<string, number> = {};
  for (const key of new Set([...Object.keys(prev), ...Object.keys(cur)])) {
    const a = (prev as Record<string, number>)[key], b = (cur as Record<string, number>)[key];
    out[key] = a === undefined ? b : b === undefined ? a : a + (b - a) * k;
  }
  return out as ShotPost;
}

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
