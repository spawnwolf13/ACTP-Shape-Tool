import type { GridState } from '../../types'
import type { CellBuffer } from './CellBuffer'

/**
 * Fills posX/posY (normalized [0,1] cell centers), the radial-falloff
 * component of `scale`, and the baseline rotation — purely from grid layout
 * params, independent of media content. Quantizer fills luminance-derived
 * rotation/shapeIndex afterward; this must run first in the per-frame pipeline.
 */
export function computeGridLayout(buffer: CellBuffer, grid: GridState): void {
  const { cols, rows } = buffer
  const { radialOffset, falloffRadius, rotation } = grid
  const globalRotation = rotation.mode === 'none' ? rotation.global : 0

  for (let row = 0; row < rows; row++) {
    const cy = (row + 0.5) / rows
    for (let col = 0; col < cols; col++) {
      const cx = (col + 0.5) / cols
      const index = row * cols + col

      buffer.posX[index] = cx
      buffer.posY[index] = cy
      buffer.scale[index] = radialFalloff(cx, cy, radialOffset.x, radialOffset.y, falloffRadius)
      // Overwritten by Quantizer.applyLuminanceRotation when mode === 'luminance',
      // and will be overwritten by edge-driven rotation once EdgeDetector exists.
      buffer.rotation[index] = globalRotation
    }
  }
}

/** 0 = disabled (always full scale). Otherwise linear falloff to 0 at `radius`. */
function radialFalloff(cx: number, cy: number, originX: number, originY: number, radius: number): number {
  if (radius <= 0) return 1
  const dx = cx - originX
  const dy = cy - originY
  const dist = Math.sqrt(dx * dx + dy * dy)
  return clamp01(1 - dist / radius)
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}
