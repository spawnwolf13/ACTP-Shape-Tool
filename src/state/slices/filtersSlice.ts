import type { FiltersState } from '../../types'

export function defaultFiltersState(): FiltersState {
  return {
    brightness: 0,
    contrast: 0,
    gamma: 1,
    edgeDetection: { enabled: false, threshold: 0.25 },
  }
}
