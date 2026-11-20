// The whole film is ONE continuous 3D scene viewed through ONE baked camera track.
// Do not add <Sequence>-based scene switching for visuals — that would create editorial cuts.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { CameraRig, sampleTrack } from './library/camera-rigs/CameraRig';
import { LightingDirector, lightingAt } from './library/lighting/LightingDirector';
import { occlusionAt } from './library/transitions/occlusion';
import { World } from './world/World';
import { PostFX } from './library/rendering/PostFX';
import { dist } from './library/camera-rigs/engine/vec.ts';
import { Grade } from './effects/Grade';
import { Subtitles } from './subtitles/Subtitles';
import { Soundtrack } from './audio/Soundtrack';
import { config, layout, lightingSchedule, postAt, subtitles, track } from './data';

export const Documentary: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = sampleTrack(track, frame);
  const light = lightingAt(lightingSchedule, frame, config.lighting.blendFrames);
  const occ = occlusionAt(cam.p, layout.occluders ?? [], frame);
  // post settings: lighting-preset defaults ← per-shot overrides (shot.post) ← config quality tier
  const post = { ...(light.post ?? {}), ...postAt(frame) };
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas
        width={config.width}
        height={config.height}
        flat
        shadows={config.render.shadows ? { type: THREE.PCFSoftShadowMap } : false}
        gl={{ antialias: config.render.antialias, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        camera={{ fov: track.fov[0], near: 0.02, far: 400, position: [0, 0, 0] }}
      >
        <CameraRig track={track} />
        <LightingDirector schedule={lightingSchedule} focus={cam.target} blendFrames={config.lighting.blendFrames} shadowMapSize={config.render.shadowMapSize ?? 2048} />
        <World layout={layout} cameraPosition={cam.p} />
        {config.render.post !== 'off' && <PostFX quality={config.render.post ?? 'final'} focusDistance={dist(cam.p, cam.target)} {...post} />}
      </ThreeCanvas>
      <Grade grade={light.grade} occlusion={occ} letterbox={config.style.letterbox} grainScale={config.render.post === 'off' ? config.style.grainScale : 0} cssVignette={config.render.post === 'off'} />
      {config.subtitles.enabled && <Subtitles cues={subtitles} settings={config.subtitles} />}
      <Soundtrack audio={config.audio} />
    </AbsoluteFill>
  );
};
