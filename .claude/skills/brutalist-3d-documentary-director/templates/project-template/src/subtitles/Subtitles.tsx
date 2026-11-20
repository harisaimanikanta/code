// Subtitle system: condensed bold white type, crimson emphasis, optional word-level highlight,
// mobile-safe margins, top/bottom placement per cue so the primary subject is never covered.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, continueRender, delayRender } from 'remotion';
import oswaldUrl from '../library/textures/fonts/oswald-latin-700-normal.woff';

// Bundled Oswald Bold (OFL) — subtitles never fall back to a random system font, and no network is needed.
if (typeof document !== 'undefined' && !(window as unknown as { __oswaldLoading?: boolean }).__oswaldLoading) {
  (window as unknown as { __oswaldLoading?: boolean }).__oswaldLoading = true;
  const handle = delayRender('Loading Oswald');
  new FontFace('Oswald', `url(${oswaldUrl})`, { weight: '700' }).load()
    .then((f) => { (document.fonts as unknown as { add(face: FontFace): void }).add(f); continueRender(handle); })
    .catch(() => continueRender(handle));
}
import type { SubtitleCue } from '../data';

const CRIMSON = '#e0182b';

export function Subtitles({ cues, settings }: { cues: SubtitleCue[]; settings: { wordHighlight: boolean; fontFamily: string; maxCharsPerLine: number; safeMarginPct: number } }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const cue = cues.find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  const fadeIn = interpolate(t, [cue.start, cue.start + 0.12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(t, [cue.end - 0.12, cue.end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const portrait = height > width;
  const fontSize = Math.round((portrait ? width * 0.062 : height * 0.052));
  const margin = `${settings.safeMarginPct}%`;
  const emphasis = new Set((cue.emphasis ?? []).map((w) => w.toLowerCase().replace(/[^a-z0-9']/g, '')));
  const words = cue.words && cue.words.length ? cue.words : cue.text.split(/\s+/).map((w) => ({ text: w, start: cue.start, end: cue.end }));
  const pos: React.CSSProperties = cue.position === 'top' ? { top: margin } : { bottom: portrait ? '24%' : margin };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: '8%', right: '8%', ...pos, display: 'flex', justifyContent: 'center', opacity: Math.min(fadeIn, fadeOut) }}>
        <div style={{ fontFamily: settings.fontFamily, fontWeight: 800, fontStretch: 'condensed', fontSize, lineHeight: 1.12, letterSpacing: '0.01em', textTransform: 'uppercase', textAlign: 'center', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)', maxWidth: `${settings.maxCharsPerLine * 0.62}em`, background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 72%)', padding: '0.25em 0.9em' }}>
          {words.map((w, i) => {
            const key = w.text.toLowerCase().replace(/[^a-z0-9']/g, '');
            const active = settings.wordHighlight && t >= w.start && t < w.end;
            const color = emphasis.has(key) ? CRIMSON : active ? '#ffd9dc' : '#ffffff';
            return (
              <span key={i} style={{ color, borderBottom: active ? `0.08em solid ${CRIMSON}` : '0.08em solid transparent' }}>
                {w.text}{i < words.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
