// Frame-time hook shared by all animated assets.
// Every animated asset accepts an optional `frame` prop; when absent it reads Remotion's
// current frame. Animation must be a pure function of frame — never use clocks or useFrame deltas.
import { useCurrentFrame, useVideoConfig } from 'remotion';

export function useAssetTime(frameOverride?: number): { frame: number; fps: number; t: number } {
  const current = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameOverride ?? current;
  return { frame, fps, t: frame / fps };
}
