import type { ColorState } from '../../types'

export function defaultColorState(): ColorState {
  return {
    background: { r: 245, g: 245, b: 240, a: 1 },
    foregroundColor: { r: 17, g: 17, b: 17, a: 1 },
  }
}
