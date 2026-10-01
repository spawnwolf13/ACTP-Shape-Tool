import type { ColorState } from '../../types'
import { sampleGradient } from '../../utils/color'
import type { CellBuffer } from '../grid/CellBuffer'

/**
 * Resolves each cell's final render color (colorR/G/B/A) from the sampled
 * media color + color.foregroundMode, overwriting the buffer's color arrays
 * in place. Must run after computeLuminance (gradient mode keys off
 * luminance) and before a renderer treats colorR/G/B/A as the per-cell tint.
 */
export function applyForegroundTint(buffer: CellBuffer, color: ColorState): void {
  const { colorR, colorG, colorB, colorA, luminance, count } = buffer

  if (color.foregroundMode === 'monochrome') {
    const { r, g, b, a } = color.monochromeColor
    const alpha = Math.round(a * 255)
    for (let i = 0; i < count; i++) {
      colorR[i] = r
      colorG[i] = g
      colorB[i] = b
      colorA[i] = alpha
    }
    return
  }

  if (color.foregroundMode === 'gradient') {
    for (let i = 0; i < count; i++) {
      const { r, g, b } = sampleGradient(color.gradientStops, luminance[i])
      colorR[i] = r
      colorG[i] = g
      colorB[i] = b
      colorA[i] = 255
    }
    return
  }

  // 'sampled' — colorR/G/B/A already hold MediaSampler's per-cell average; nothing to do.
}
