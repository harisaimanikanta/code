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
import { Grade } from './effects/Grade';
import { Subtitles } from './subtitles/Subtitles';
import { Soundtrack } from './audio/Soundtrack';
import { config, layout, lightingSchedule, subtitles, track } from './data';

export const Documentary: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = sampleTrack(track, frame);
  const light = lightingAt(lightingSchedule, frame, config.lighting.blendFrames);
  const occ = occlusionAt(cam.p, layout.occluders ?? [], frame);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas
        width={config.width}
        height={config.height}
        shadows={config.render.shadows ? { type: THREE.PCFSoftShadowMap } : false}
        gl={{ antialias: config.render.antialias, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        camera={{ fov: track.fov[0], near: 0.02, far: 400, position: [0, 0, 0] }}
      >
        <CameraRig track={track} />
        <LightingDirector schedule={lightingSchedule} focus={cam.target} blendFrames={config.lighting.blendFrames} />
        <World layout={layout} cameraPosition={cam.p} />
      </ThreeCanvas>
      <Grade grade={light.grade} occlusion={occ} letterbox={config.style.letterbox} grainScale={config.style.grainScale} />
      {config.subtitles.enabled && <Subtitles cues={subtitles} settings={config.subtitles} />}
      <Soundtrack audio={config.audio} />
    </AbsoluteFill>
  );
};
