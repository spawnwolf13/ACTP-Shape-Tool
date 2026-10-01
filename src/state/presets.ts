import { releaseMediaResource, resourceRegistry } from './resources/ResourceRegistry'
import type { AppActions } from './store'
import type { Path } from './history/commands'
import type { ShapeSlot } from '../types'

export interface PresetPatch {
  path: Path
  value: unknown
}

export interface PresetDefinition {
  id: string
  label: string
  /** Darkest-bin-first, matching shape slot order convention. */
  shapePaths: string[]
  patches: PresetPatch[]
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'ascii',
    label: 'ASCII',
    shapePaths: [
      '/presets/ascii/dot.svg',
      '/presets/ascii/colon.svg',
      '/presets/ascii/plus.svg',
      '/presets/ascii/asterisk.svg',
      '/presets/ascii/hash.svg',
    ],
    patches: [
      { path: ['grid', 'density'], value: { cols: 80, rows: 45 } },
      { path: ['grid', 'cellAspect'], value: 'square' },
      { path: ['grid', 'rotation'], value: { global: 0, mode: 'none' } },
      { path: ['grid', 'falloffRadius'], value: 0 },
      { path: ['color', 'foregroundMode'], value: 'monochrome' },
      { path: ['color', 'monochromeColor'], value: { r: 51, g: 255, b: 51, a: 1 } },
      { path: ['color', 'background'], value: { r: 0, g: 0, b: 0, a: 1 } },
      { path: ['color', 'invert'], value: false },
      { path: ['filters', 'edgeDetection'], value: { enabled: false, threshold: 0.25 } },
      { path: ['noise', 'positionJitter'], value: 0 },
      { path: ['noise', 'scaleRandomness'], value: 0 },
    ],
  },
  {
    id: 'halftone',
    label: 'Halftone',
    shapePaths: ['/presets/halftone/dot.svg'],
    patches: [
      { path: ['grid', 'density'], value: { cols: 128, rows: 128 } },
      { path: ['grid', 'cellAspect'], value: 'square' },
      { path: ['grid', 'rotation'], value: { global: 0, mode: 'none' } },
      { path: ['grid', 'falloffRadius'], value: 0 },
      { path: ['color', 'foregroundMode'], value: 'monochrome' },
      { path: ['color', 'monochromeColor'], value: { r: 10, g: 10, b: 10, a: 1 } },
      { path: ['color', 'background'], value: { r: 255, g: 255, b: 255, a: 1 } },
      { path: ['color', 'invert'], value: false },
      { path: ['filters', 'edgeDetection'], value: { enabled: false, threshold: 0.25 } },
      { path: ['noise', 'positionJitter'], value: 0 },
      { path: ['noise', 'scaleRandomness'], value: 0 },
    ],
  },
  {
    id: 'bauhaus',
    label: 'Geometric / Bauhaus',
    shapePaths: [
      '/presets/bauhaus/square.svg',
      '/presets/bauhaus/circle.svg',
      '/presets/bauhaus/triangle.svg',
      '/presets/bauhaus/diagonal-bar.svg',
    ],
    patches: [
      { path: ['grid', 'density'], value: { cols: 24, rows: 24 } },
      { path: ['grid', 'cellAspect'], value: 'square' },
      { path: ['grid', 'rotation'], value: { global: 0, mode: 'none' } },
      { path: ['grid', 'falloffRadius'], value: 0 },
      { path: ['color', 'foregroundMode'], value: 'gradient' },
      {
        path: ['color', 'gradientStops'],
        value: [
          { offset: 0, color: '#1d4ed8' },
          { offset: 0.33, color: '#dc2626' },
          { offset: 0.66, color: '#facc15' },
          { offset: 1, color: '#111827' },
        ],
      },
      { path: ['color', 'background'], value: { r: 245, g: 245, b: 240, a: 1 } },
      { path: ['color', 'invert'], value: false },
      { path: ['filters', 'edgeDetection'], value: { enabled: false, threshold: 0.25 } },
      { path: ['noise', 'positionJitter'], value: 0.05 },
      { path: ['noise', 'scaleRandomness'], value: 0 },
    ],
  },
  {
    id: 'crosshatch',
    label: 'Crosshatch',
    shapePaths: ['/presets/crosshatch/single.svg', '/presets/crosshatch/double.svg', '/presets/crosshatch/cross.svg'],
    patches: [
      { path: ['grid', 'density'], value: { cols: 160, rows: 160 } },
      { path: ['grid', 'cellAspect'], value: 'square' },
      { path: ['grid', 'rotation'], value: { global: 0, mode: 'edge' } },
      { path: ['grid', 'falloffRadius'], value: 0 },
      { path: ['color', 'foregroundMode'], value: 'monochrome' },
      { path: ['color', 'monochromeColor'], value: { r: 0, g: 0, b: 0, a: 1 } },
      { path: ['color', 'background'], value: { r: 255, g: 255, b: 255, a: 1 } },
      { path: ['color', 'invert'], value: false },
      { path: ['filters', 'edgeDetection'], value: { enabled: true, threshold: 0.2 } },
      { path: ['noise', 'positionJitter'], value: 0 },
      { path: ['noise', 'scaleRandomness'], value: 0 },
    ],
  },
]

async function loadShapeSlot(path: string): Promise<ShapeSlot> {
  const response = await fetch(path)
  const svgText = await response.text()

  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
  await image.decode()

  const resourceId = resourceRegistry.register(image)
  const name = path.split('/').pop() ?? path
  return { id: crypto.randomUUID(), name, sourceType: 'svg', resourceId, order: 0 }
}

/** Loads a preset's bundled shapes + parameters as a single undoable step, replacing any current shapes. */
export async function applyPreset(preset: PresetDefinition, actions: AppActions, currentSlots: ShapeSlot[]): Promise<void> {
  const loadedSlots = await Promise.all(preset.shapePaths.map(loadShapeSlot))
  const orderedSlots = loadedSlots.map((slot, index) => ({ ...slot, order: index }))

  for (const oldSlot of currentSlots) {
    releaseMediaResource(oldSlot.resourceId)
  }

  actions.setPath(['shapes', 'slots'], orderedSlots, { label: `Load preset: ${preset.label}` })
  for (const patch of preset.patches) {
    actions.setPath(patch.path, patch.value, { label: `Load preset: ${preset.label}` })
  }
  actions.commitHistory(`Load preset: ${preset.label}`)
}
