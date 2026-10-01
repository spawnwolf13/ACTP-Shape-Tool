import type { ColorState } from '../../types'

export function defaultColorState(): ColorState {
  return {
    background: { r: 0, g: 0, b: 0, a: 1 },
    foregroundMode: 'sampled',
    monochromeColor: { r: 255, g: 255, b: 255, a: 1 },
    gradientStops: [
      { offset: 0, color: '#1e1b4b' },
      { offset: 1, color: '#f8fafc' },
    ],
    invert: false,
  }
}
