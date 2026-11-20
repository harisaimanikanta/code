// Screen-space finishing: colour tint, vignette, deterministic film grain, optional letterbox,
// and the occlusion fill used by camera-through-object transitions. Driven by the lighting preset.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

export function Grade({ grade, occlusion, letterbox = 0, grainScale = 1, cssVignette = true }: {
  grade: { tint: string; tintOpacity: number; vignette: number; grain: number };
  occlusion: { coverage: number; color: string };
  letterbox?: number; // fraction of height per bar, e.g. 0.06
  grainScale?: number;
  /** CSS vignette only when the WebGL post chain is off (PostFX has a real vignette) */
  cssVignette?: boolean;
}) {
  const frame = useCurrentFrame();
  const seed = frame % 97;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ backgroundColor: grade.tint, opacity: grade.tintOpacity, mixBlendMode: 'soft-light' }} />
      {cssVignette && <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,${grade.vignette}) 100%)` }} />}
      {grade.grain * grainScale > 0 && (
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: grade.grain * grainScale, mixBlendMode: 'overlay' }}>
          <filter id={`grain-${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
        </svg>
      )}
      {occlusion.coverage > 0.001 && <AbsoluteFill style={{ backgroundColor: occlusion.color, opacity: occlusion.coverage }} />}
      {letterbox > 0 && (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: `${letterbox * 100}%`, background: '#000' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${letterbox * 100}%`, background: '#000' }} />
        </>
      )}
    </AbsoluteFill>
  );
}
