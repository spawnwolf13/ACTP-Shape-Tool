import type { FiltersState } from '../../types'

export function defaultFiltersState(): FiltersState {
  return {
    contrast: 0,
    brightness: 0,
    effectEnabled: true,
  }
}
