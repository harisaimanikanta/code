// Cinematic post-processing chain built directly on `postprocessing` + `n8ao` (no wrapper):
//   scene render → N8AO ambient occlusion → depth of field focused on the camera's look target →
//   bloom on emissives/practicals → AgX tone mapping → contrast/saturation grade → vignette → grain → SMAA.
// Driven from a priority-1 useFrame so it works under Remotion's manual `advance()` render loop
// (the @react-three/postprocessing wrapper renders black there because its buffers are sized at mount).
// The canvas must be created with `flat` (renderer tone mapping off — the AgX pass does it).
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BloomEffect, BrightnessContrastEffect, DepthOfFieldEffect, EffectComposer, EffectPass, HueSaturationEffect,
  NoiseEffect, BlendFunction, RenderPass, SMAAEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

export type PostQuality = 'draft' | 'preview' | 'final';

export interface PostFXProps {
  quality?: PostQuality;
  /** world distance from camera to the subject (meters) — drives depth of field */
  focusDistance?: number;
  /** depth-of-field strength 0..1 (0 = off). Portraits 0.6–1, environments 0.2–0.4, wide 0 */
  dof?: number;
  bloom?: number;
  bloomThreshold?: number;
  ao?: number; // ambient occlusion intensity (0 = off)
  aoRadius?: number; // meters
  contrast?: number; // -1..1
  saturation?: number; // -1..1
  vignette?: number; // 0..1
  grain?: number; // 0..0.2
  /** ACES keeps saturated crimson deep (studio default); AGX is softer but desaturates reds toward pink */
  toneMapping?: 'aces' | 'agx';
  exposure?: number;
}

export const POST_DEFAULTS: Required<Omit<PostFXProps, 'quality' | 'focusDistance' | 'toneMapping' | 'exposure'>> = {
  dof: 0.4, bloom: 0.8, bloomThreshold: 0.92, ao: 2.5, aoRadius: 1.0, contrast: 0.12, saturation: 0.12, vignette: 0.55, grain: 0.045,
};

export function PostFX(props: PostFXProps) {
  const p = { ...POST_DEFAULTS, ...props };
  const quality = props.quality ?? 'final';
  const { gl, scene, camera } = useThree();

  const chain = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    composer.addPass(new RenderPass(scene, camera));
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    let ao: N8AOPostPass | null = null;
    if (quality !== 'draft') {
      ao = new N8AOPostPass(scene, camera, size.x, size.y);
      ao.configuration.halfRes = quality !== 'final';
      ao.configuration.gammaCorrection = false;
      ao.setQualityMode(quality === 'final' ? 'High' : 'Medium');
      composer.addPass(ao);
    }
    const dof = new DepthOfFieldEffect(camera, { worldFocusDistance: 5, worldFocusRange: 3, bokehScale: 2, resolutionScale: quality === 'final' ? 0.75 : 0.5 });
    const bloom = new BloomEffect({ intensity: 1, luminanceThreshold: 0.6, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.72 });
    const tone = new ToneMappingEffect({ mode: (props.toneMapping ?? 'aces') === 'agx' ? ToneMappingMode.AGX : ToneMappingMode.ACES_FILMIC });
    const bc = new BrightnessContrastEffect({ contrast: 0.1 });
    const hs = new HueSaturationEffect({ saturation: 0.04 });
    const vig = new VignetteEffect({ offset: 0.28, darkness: 0.55 });
    const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
    const smaa = new SMAAEffect();
    // DoF must run in its own pass (it needs depth/convolution); the rest merge into one pass
    if (quality !== 'draft') composer.addPass(new EffectPass(camera, dof));
    composer.addPass(new EffectPass(camera, bloom, tone, bc, hs, vig, noise));
    composer.addPass(new EffectPass(camera, smaa));
    return { composer, ao, dof, bloom, bc, hs, vig, noise };
  }, [gl, scene, camera, quality, props.toneMapping]);

  useLayoutEffect(() => () => chain.composer.dispose(), [chain]);

  useFrame(() => {
    const { composer, ao, dof, bloom, bc, hs, vig, noise } = chain;
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    // size every frame: under Remotion the drawing buffer is final only after the first layout
    if (composer.inputBuffer.width !== size.x || composer.inputBuffer.height !== size.y) composer.setSize(size.x, size.y, false);
    if (ao) {
      ao.configuration.aoRadius = p.aoRadius;
      ao.configuration.intensity = p.ao;
      ao.configuration.distanceFalloff = 1;
      ao.configuration.color = new THREE.Color(0, 0, 0);
    }
    const fd = Math.max(0.3, props.focusDistance ?? 5);
    dof.cocMaterial.worldFocusDistance = fd;
    dof.cocMaterial.worldFocusRange = Math.max(0.5, fd * (1.2 - p.dof * 0.9));
    dof.bokehScale = p.dof > 0.01 ? 1 + p.dof * 4 : 0;
    bloom.intensity = p.bloom;
    bloom.luminanceMaterial.threshold = p.bloomThreshold;
    bc.contrast = p.contrast;
    hs.saturation = p.saturation;
    vig.darkness = p.vignette;
    noise.blendMode.opacity.value = p.grain;
    gl.toneMappingExposure = props.exposure ?? gl.toneMappingExposure;
    composer.render();
  }, 1);

  return null;
}
