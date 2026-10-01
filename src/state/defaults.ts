import { defaultColorState } from './slices/colorSlice'
import { defaultFiltersState } from './slices/filtersSlice'
import { defaultGridState } from './slices/gridSlice'
import { defaultNoiseState } from './slices/noiseSlice'
import { defaultOutputState } from './slices/outputSlice'
import { releaseMediaResource, resourceRegistry } from './resources/ResourceRegistry'
import { appStore } from './store'
import type { AppActions } from './store'
import { SHAPE_SLOT_COUNT } from '../types'
import type { ColorState, FiltersState, GridState, NoiseState, OutputState, ShapeSlot, ShapeSlots, ShapeSourceType } from '../types'

const STORAGE_KEY = 'mosaic-shape-mapper:default-v1'

/** The only remaining built-in look: a clean geometric set, darkest-bin-first. */
const BUILT_IN_SHAPE_PATHS = [
  '/presets/bauhaus/square.svg',
  '/presets/bauhaus/circle.svg',
  '/presets/bauhaus/triangle.svg',
  '/presets/bauhaus/diagonal-bar.svg',
]

interface SerializedShape {
  name: string
  sourceType: ShapeSourceType
  dataUrl: string
}

interface SavedDefault {
  grid: GridState
  color: ColorState
  filters: FiltersState
  noise: NoiseState
  output: OutputState
  shapes: Array<SerializedShape | null>
}

interface DefaultParams {
  grid: GridState
  color: ColorState
  filters: FiltersState
  noise: NoiseState
  output: OutputState
}

async function loadShapeFromDataUrl(dataUrl: string, name: string, sourceType: ShapeSourceType): Promise<ShapeSlot> {
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  const resourceId = resourceRegistry.register(image)
  return { id: crypto.randomUUID(), name, sourceType, resourceId }
}

async function loadBuiltInShapes(): Promise<ShapeSlots> {
  const loaded = await Promise.all(
    BUILT_IN_SHAPE_PATHS.map(async (path) => {
      const response = await fetch(path)
      const svgText = await response.text()
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
      const name = path.split('/').pop() ?? path
      return loadShapeFromDataUrl(dataUrl, name, 'svg')
    }),
  )
  return loaded as ShapeSlots
}

async function loadSavedShapes(saved: Array<SerializedShape | null>): Promise<ShapeSlots> {
  const loaded = await Promise.all(
    saved.map((entry) => (entry ? loadShapeFromDataUrl(entry.dataUrl, entry.name, entry.sourceType) : null)),
  )
  const padded: (ShapeSlot | null)[] = []
  for (let i = 0; i < SHAPE_SLOT_COUNT; i++) padded.push(loaded[i] ?? null)
  return padded as ShapeSlots
}

function releaseSlots(slots: ShapeSlots): void {
  for (const slot of slots) {
    if (slot) releaseMediaResource(slot.resourceId)
  }
}

function applyParamsAndShapes(actions: AppActions, params: DefaultParams, shapeSlots: ShapeSlots, currentSlots: ShapeSlots, label: string): void {
  releaseSlots(currentSlots)

  actions.setPath(['shapes', 'slots'], shapeSlots, { label })
  actions.setPath(['grid'], params.grid, { label })
  actions.setPath(['color'], params.color, { label })
  actions.setPath(['filters'], params.filters, { label })
  actions.setPath(['noise'], params.noise, { label })
  actions.setPath(['output'], params.output, { label })
  actions.commitHistory(label)
}

function builtInParams(): DefaultParams {
  return {
    grid: defaultGridState(),
    color: defaultColorState(),
    filters: defaultFiltersState(),
    noise: defaultNoiseState(),
    output: defaultOutputState(),
  }
}

/** The hardcoded geometric default — used when the user hasn't saved their own default yet. */
export async function loadBuiltInDefault(actions: AppActions, currentSlots: ShapeSlots): Promise<void> {
  const shapeSlots = await loadBuiltInShapes()
  applyParamsAndShapes(actions, builtInParams(), shapeSlots, currentSlots, 'Reset to default')
}

export function hasSavedDefault(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}

/** Serializes the current params + shapes (as data: URLs) to localStorage as the user's own default. */
export function saveCurrentAsDefault(): void {
  const state = appStore.getState()
  const shapes: Array<SerializedShape | null> = state.shapes.slots.map((slot) => {
    if (!slot) return null
    const image = resourceRegistry.get<HTMLImageElement>(slot.resourceId)
    if (!image) return null
    return { name: slot.name, sourceType: slot.sourceType, dataUrl: image.src }
  })

  const payload: SavedDefault = {
    grid: state.grid,
    color: state.color,
    filters: state.filters,
    noise: state.noise,
    output: state.output,
    shapes,
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

/** Loads the user's saved default if present, else the built-in geometric default. Used on mount and "Reset to Default". */
export async function loadDefault(actions: AppActions, currentSlots: ShapeSlots): Promise<void> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    await loadBuiltInDefault(actions, currentSlots)
    return
  }

  try {
    const saved = JSON.parse(raw) as SavedDefault
    const shapeSlots = await loadSavedShapes(saved.shapes)
    applyParamsAndShapes(
      actions,
      { grid: saved.grid, color: saved.color, filters: saved.filters, noise: saved.noise, output: saved.output },
      shapeSlots,
      currentSlots,
      'Reset to default',
    )
  } catch (error) {
    console.error('Failed to load saved default, falling back to built-in:', error)
    await loadBuiltInDefault(actions, currentSlots)
  }
}
