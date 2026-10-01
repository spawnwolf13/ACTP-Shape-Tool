import type { GridState } from '../../types'

export function defaultGridState(): GridState {
  return {
    density: { cols: 64, rows: 64 },
    cellAspect: 'square',
    customAspectRatio: 1,
    radialOffset: { x: 0.5, y: 0.5 },
    // 0 = disabled (full scale everywhere); see GridModel's falloff formula.
    falloffRadius: 0,
    rotation: { global: 0, mode: 'none' },
    thresholds: [],
  }
}
