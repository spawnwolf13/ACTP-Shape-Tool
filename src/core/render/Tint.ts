import type { ColorState } from '../../types'
import type { CellBuffer } from '../grid/CellBuffer'

/**
 * Overwrites colorR/G/B/A with the flat foreground color for every cell —
 * strictly a two-color mosaic (background + foreground), no gradients or
 * per-cell media sampling. Must run before a renderer treats colorR/G/B/A as
 * the per-cell tint.
 */
export function applyForegroundTint(buffer: CellBuffer, color: ColorState): void {
  const { r, g, b, a } = color.foregroundColor
  const alpha = Math.round(a * 255)
  const { colorR, colorG, colorB, colorA, count } = buffer
  for (let i = 0; i < count; i++) {
    colorR[i] = r
    colorG[i] = g
    colorB[i] = b
    colorA[i] = alpha
  }
}
