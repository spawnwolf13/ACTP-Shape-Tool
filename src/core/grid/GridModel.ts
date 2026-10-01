import type { GridState, NoiseState } from '../../types'
import { mulberry32 } from '../../utils/seededRandom'
import type { CellBuffer } from './CellBuffer'

/**
 * Fills posX/posY (normalized [0,1] cell centers), full scale (1), and the
 * global rotation — purely from grid layout params, independent of media
 * content. Must run first in the per-frame pipeline.
 */
export function computeGridLayout(buffer: CellBuffer, grid: GridState): void {
  const { cols, rows } = buffer

  for (let row = 0; row < rows; row++) {
    const cy = (row + 0.5) / rows
    for (let col = 0; col < cols; col++) {
      const cx = (col + 0.5) / cols
      const index = row * cols + col

      buffer.posX[index] = cx
      buffer.posY[index] = cy
      buffer.scale[index] = 1
      buffer.rotation[index] = grid.rotation
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

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}
