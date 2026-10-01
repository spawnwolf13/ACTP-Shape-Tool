import type { GridState } from '../../types'

export function defaultGridState(): GridState {
  return {
    density: { cols: 64, rows: 64 },
    cellAspect: 'square',
    customAspectRatio: 1,
    radialOffset: { x: 0.5, y: 0.5 },
    falloffRadius: 1,
    rotation: { global: 0, mode: 'none' },
    thresholds: [],
  }
}
