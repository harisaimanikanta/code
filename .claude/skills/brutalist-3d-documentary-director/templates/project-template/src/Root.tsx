import React from 'react';
import { Composition } from 'remotion';
import { Documentary } from './Documentary';
import { AssetPreview } from './AssetPreview';
import { config } from './data';

export const Root: React.FC = () => (
  <>
    <Composition
      id="Documentary"
      component={Documentary}
      durationInFrames={config.durationFrames}
      fps={config.fps}
      width={config.width}
      height={config.height}
    />
    {/* Look-dev / library previews: npx remotion still src/index.ts AssetPreview out.png --props='{"component":"Microscope"}' */}
    <Composition
      id="AssetPreview"
      component={AssetPreview}
      durationInFrames={90}
      fps={30}
      width={800}
      height={800}
      defaultProps={{ component: 'Microscope', props: {}, preset: 'high-contrast-character' }}
    />
  </>
);
