import type { GridState, NoiseState } from '../../types'
import { mulberry32 } from '../../utils/seededRandom'
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

/**
 * Perturbs posX/posY by `positionJitter` and multiplies `scale` by
 * `scaleRandomness`, using a PRNG seeded from noise.seed — the same seed
 * always reproduces the same jitter pattern. Must run after
 * computeGridLayout, which sets the unperturbed baseline values this reads.
 */
export function applyNoise(buffer: CellBuffer, noise: NoiseState): void {
  if (noise.positionJitter <= 0 && noise.scaleRandomness <= 0) return

  const rand = mulberry32(noise.seed)
  const cellWidth = 1 / buffer.cols
  const cellHeight = 1 / buffer.rows

  for (let i = 0; i < buffer.count; i++) {
    if (noise.positionJitter > 0) {
      const jitterX = (rand() * 2 - 1) * noise.positionJitter * cellWidth * 0.5
      const jitterY = (rand() * 2 - 1) * noise.positionJitter * cellHeight * 0.5
      buffer.posX[i] = clamp01(buffer.posX[i] + jitterX)
      buffer.posY[i] = clamp01(buffer.posY[i] + jitterY)
    }
    if (noise.scaleRandomness > 0) {
      const factor = 1 + (rand() * 2 - 1) * noise.scaleRandomness
      buffer.scale[i] = Math.max(0, buffer.scale[i] * factor)
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
