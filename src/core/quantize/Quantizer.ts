import type { CellBuffer } from '../grid/CellBuffer'

/**
 * Per spec: Y = 0.299R + 0.587G + 0.114B, from each cell's already-downsampled
 * average RGB (see MediaSampler). Must run after sampling, before any tone
 * filters or quantization.
 */
export function computeLuminance(buffer: CellBuffer): void {
  const { luminance, colorR, colorG, colorB, count } = buffer
  for (let i = 0; i < count; i++) {
    luminance[i] = (0.299 * colorR[i] + 0.587 * colorG[i] + 0.114 * colorB[i]) / 255
  }
}

export interface ToneFilterOptions {
  /** Roughly -1..1; 0 = neutral, scales contrast around the 0.5 midpoint. */
  contrast: number
}

/** Applies contrast to luminance in place. Run after computeLuminance, before quantizing. */
export function applyToneFilters(buffer: CellBuffer, filters: ToneFilterOptions): void {
  const { luminance, count } = buffer
  const contrastFactor = 1 + filters.contrast

  for (let i = 0; i < count; i++) {
    luminance[i] = clamp01((luminance[i] - 0.5) * contrastFactor + 0.5)
  }
}

export interface QuantizeOptions {
  /** Ascending cut points in (0,1), length = shapeCount - 1. */
  thresholds: number[]
}

/**
 * Assigns each cell a shape-bin index from luminance + explicit threshold
 * cut points. Shape slot order IS the bin order: bin 0 = darkest, bin N-1 =
 * brightest, matching spec exactly.
 */
export function quantizeToShapeIndex(buffer: CellBuffer, options: QuantizeOptions): void {
  const { luminance, shapeIndex, count } = buffer
  const { thresholds } = options
  const binCount = thresholds.length + 1

  for (let i = 0; i < count; i++) {
    const y = luminance[i]
    let bin = 0
    while (bin < thresholds.length && y >= thresholds[bin]) bin++
    shapeIndex[i] = Math.min(bin, binCount - 1)
  }
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}
