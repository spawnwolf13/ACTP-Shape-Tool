import type { GradientStop } from '../types'

export interface RGB {
  r: number
  g: number
  b: number
}

export function hexToRgb(hex: string): RGB {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized
  const num = parseInt(full, 16) || 0
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

/** Linearly interpolates `stops` (arbitrary order) at position `t` in [0,1]. */
export function sampleGradient(stops: GradientStop[], t: number): RGB {
  if (stops.length === 0) return { r: 255, g: 255, b: 255 }
  const sorted = [...stops].sort((a, b) => a.offset - b.offset)

  if (t <= sorted[0].offset) return hexToRgb(sorted[0].color)
  const last = sorted[sorted.length - 1]
  if (t >= last.offset) return hexToRgb(last.color)

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (t >= a.offset && t <= b.offset) {
      const span = b.offset - a.offset || 1
      const localT = (t - a.offset) / span
      const ca = hexToRgb(a.color)
      const cb = hexToRgb(b.color)
      return {
        r: Math.round(ca.r + (cb.r - ca.r) * localT),
        g: Math.round(ca.g + (cb.g - ca.g) * localT),
        b: Math.round(ca.b + (cb.b - ca.b) * localT),
      }
    }
  }
  return hexToRgb(last.color)
}
