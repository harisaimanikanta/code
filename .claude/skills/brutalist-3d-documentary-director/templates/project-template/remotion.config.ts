// Remotion configuration for brutalist documentary projects.
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
// WebGL in headless Chromium: 'angle' works on most machines; render-project.sh falls back to 'swangle' (software).
Config.setChromiumOpenGlRenderer('angle');
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
// Keep symlinked library paths inside the project so `three`/`react` resolve from this node_modules
// (needed when src/library is a symlink to the shared asset library: link mode "link").
Config.overrideWebpackConfig((c) => ({ ...c, resolve: { ...c.resolve, symlinks: false } }));
