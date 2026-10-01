import type { GridState } from '../../types'

export function defaultGridState(): GridState {
  return {
    density: { cols: 64, rows: 64 },
    rotation: 0,
    thresholds: [],
  }
}
