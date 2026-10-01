import { createStore } from 'zustand/vanilla'
import { subscribeWithSelector } from 'zustand/middleware'

import type {
  ColorState,
  ExportState,
  FiltersState,
  GridState,
  MediaState,
  NoiseState,
  ShapesState,
  UIState,
} from '../types'
import { defaultColorState } from './slices/colorSlice'
import { defaultExportState } from './slices/exportSlice'
import { defaultFiltersState } from './slices/filtersSlice'
import { defaultGridState } from './slices/gridSlice'
import { defaultMediaState } from './slices/mediaSlice'
import { defaultNoiseState } from './slices/noiseSlice'
import { defaultShapesState } from './slices/shapesSlice'
import { defaultUIState } from './slices/uiSlice'
import { HistoryManager } from './history/HistoryManager'
import type { Path } from './history/commands'

export interface AppData {
  media: MediaState
  shapes: ShapesState
  grid: GridState
  color: ColorState
  filters: FiltersState
  noise: NoiseState
  /** Ephemeral — excluded from undo/redo history. */
  exportState: ExportState
  /** Ephemeral — excluded from undo/redo history. */
  ui: UIState
}

export interface SetPathOptions {
  label?: string
  /** Flush this edit into history immediately (e.g. pointerup) instead of debouncing. */
  immediate?: boolean
}

export interface AppActions {
  setPath: (path: Path, value: unknown, options?: SetPathOptions) => void
  commitHistory: (label?: string) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  resetToDefaults: () => void
}

export type AppStore = AppData & { actions: AppActions }

/** Slices whose mutations are tracked by undo/redo. exportState/ui are deliberately excluded. */
const HISTORY_SLICES = new Set<string>(['media', 'shapes', 'grid', 'color', 'filters', 'noise'])

function createDefaultData(): AppData {
  return {
    media: defaultMediaState(),
    shapes: defaultShapesState(),
    grid: defaultGridState(),
    color: defaultColorState(),
    filters: defaultFiltersState(),
    noise: defaultNoiseState(),
    exportState: defaultExportState(),
    ui: defaultUIState(),
  }
}

function getAtPath(source: unknown, path: Path): unknown {
  return path.reduce<unknown>((acc, segment) => {
    if (acc == null) return acc
    return (acc as Record<string | number, unknown>)[segment]
  }, source)
}

/** Immutable nested update: clones only the objects along `path`, preserving reference equality elsewhere. */
function setAtPath<T>(source: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T
  const [segment, ...rest] = path
  const container = source as unknown as Record<string | number, unknown>
  const cloned = (Array.isArray(source) ? [...source] : { ...container }) as Record<
    string | number,
    unknown
  >
  cloned[segment] = rest.length === 0 ? value : setAtPath(container[segment], rest, value)
  return cloned as unknown as T
}

export const appStore = createStore<AppStore>()(
  subscribeWithSelector((set, get) => {
    const history = new HistoryManager({
      applyPatches: (patches) => {
        set((state) => {
          let next: AppStore = { ...state }
          for (const patch of patches) {
            next = setAtPath(next, patch.path, patch.next)
          }
          return next
        })
      },
    })

    function setPath(path: Path, value: unknown, options: SetPathOptions = {}): void {
      if (path.length === 0) return
      const prev = getAtPath(get(), path)
      if (Object.is(prev, value)) return

      set((state) => setAtPath(state, path, value))

      if (HISTORY_SLICES.has(String(path[0]))) {
        history.record(path, prev, value, options)
      }
    }

    return {
      ...createDefaultData(),
      actions: {
        setPath,
        commitHistory: (label) => history.flush(label),
        undo: () => history.undo(),
        redo: () => history.redo(),
        canUndo: () => history.canUndo(),
        canRedo: () => history.canRedo(),
        resetToDefaults: () => {
          history.reset()
          set((state) => ({ ...state, ...createDefaultData() }))
        },
      },
    }
  }),
)
