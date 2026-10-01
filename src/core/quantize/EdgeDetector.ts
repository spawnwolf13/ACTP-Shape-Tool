import type { CellBuffer } from '../grid/CellBuffer'

// Max possible |Gx| or |Gy| is 4 (every weighted tap at the extreme
// luminance delta of 1.0), so max magnitude is 4*sqrt(2) — normalize against that.
const MAX_SOBEL_MAGNITUDE = 4 * Math.SQRT2

/**
 * 3x3 Sobel convolution over the (already downsampled) luminance grid,
 * producing per-cell gradient magnitude (normalized to ~[0,1]) and
 * orientation theta = atan2(Gy, Gx). Operates on the small cols x rows grid,
 * not full-resolution source pixels — consistent with the rest of the
 * pipeline's perf approach. Border cells clamp to the nearest interior
 * neighbor (edge-replicate) rather than wrapping or zero-padding.
 */
export function computeSobelEdges(buffer: CellBuffer): void {
  const { cols, rows, luminance, edgeMagnitude, edgeAngle } = buffer

  const sampleAt = (col: number, row: number): number => {
    const c = col < 0 ? 0 : col >= cols ? cols - 1 : col
    const r = row < 0 ? 0 : row >= rows ? rows - 1 : row
    return luminance[r * cols + c]
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tl = sampleAt(col - 1, row - 1)
      const tc = sampleAt(col, row - 1)
      const tr = sampleAt(col + 1, row - 1)
      const ml = sampleAt(col - 1, row)
      const mr = sampleAt(col + 1, row)
      const bl = sampleAt(col - 1, row + 1)
      const bc = sampleAt(col, row + 1)
      const br = sampleAt(col + 1, row + 1)

      const gx = tr + 2 * mr + br - (tl + 2 * ml + bl)
      const gy = bl + 2 * bc + br - (tl + 2 * tc + tr)

      const index = row * cols + col
      edgeMagnitude[index] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / MAX_SOBEL_MAGNITUDE)
      edgeAngle[index] = Math.atan2(gy, gx)
    }
  }
}

/** Overwrites rotation with the Sobel edge orientation. Call only when grid.rotation.mode === 'edge'. */
export function applyEdgeRotation(buffer: CellBuffer): void {
  buffer.rotation.set(buffer.edgeAngle)
}

export interface EdgeScaleOptions {
  /** Cells with magnitude below this (same units as edgeMagnitude, ~[0,1]) get no boost. */
  threshold: number
}

/** Cells with edge magnitude above `threshold` get a proportional scale boost — stronger edges render bolder. */
export function applyEdgeScaleModulation(buffer: CellBuffer, options: EdgeScaleOptions): void {
  const { edgeMagnitude, scale, count } = buffer
  const { threshold } = options
  for (let i = 0; i < count; i++) {
    const boosted = edgeMagnitude[i] >= threshold ? edgeMagnitude[i] : 0
    scale[i] = Math.max(0, scale[i] * (1 + boosted))
  }
}
