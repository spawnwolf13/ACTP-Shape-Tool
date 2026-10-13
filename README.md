# Mosaic Shape-Mapper

A client-side web app that turns an uploaded image, video, or webcam feed into a geometric mosaic — each cell is mapped to one of four custom-uploaded shapes based on its luminance, with full control over grid, color, filters, and noise. Runs entirely in the browser; nothing is uploaded to a server.

## Features

- **Source**: upload an image/video, use the built-in sample, or go live via webcam
- **Shapes**: four fixed luminance-bin slots (darkest → lightest), accepting SVG or PNG uploads; pure-white highlights are reserved as blank negative space
- **Image framing**: Cover/Contain fit modes with Pan X/Y controls
- **Output**: 1:1, 16:9, 9:16, 4:3, or custom aspect ratio/resolution
- **Controls**: grid density/rotation, two-color background/foreground, contrast/brightness, position jitter/scale randomness, undo/redo
- **Export**:
  - SVG — a clean, fully vector file (real paths, no rasterized content) that opens in Illustrator/Figma with editable, correctly colored shapes
  - PNG — 1x/2x/4x raster export
  - WebM video recording for live video/webcam sources
- Save your current setup (shapes + params) as your own default, loaded automatically next time

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL in a browser.

### Other scripts

```bash
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build locally
npm run lint      # oxlint
```

## Stack

Vite + React 19 + TypeScript + Tailwind CSS v4. Rendering is framework-free imperative Canvas2D/WebGL2, driven by a vanilla Zustand store with its own command-pattern undo/redo. See `src/` for the pipeline: `core/grid` (sampling/layout), `core/quantize` (luminance → shape bin), `core/render` (Canvas2D/WebGL renderers + SVG vector export), `state/` (store, slices, history).
