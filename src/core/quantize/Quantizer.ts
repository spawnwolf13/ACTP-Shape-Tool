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
  /** Additive, roughly -1..1. */
  brightness: number
  /** Roughly -1..1; 0 = neutral, scales contrast around the 0.5 midpoint. */
  contrast: number
  /** >0; 1 = neutral. */
  gamma: number
}

/** Applies brightness/contrast/gamma to luminance in place. Run after computeLuminance, before quantizing. */
export function applyToneFilters(buffer: CellBuffer, filters: ToneFilterOptions): void {
  const { luminance, count } = buffer
  const { brightness, contrast, gamma } = filters
  const contrastFactor = 1 + contrast

  for (let i = 0; i < count; i++) {
    let y = (luminance[i] - 0.5) * contrastFactor + 0.5 + brightness
    y = clamp01(y)
    if (gamma !== 1) y = Math.pow(y, 1 / gamma)
    luminance[i] = clamp01(y)
  }
}

/** Maps luminance to a full-turn rotation. Call only when grid.rotation.mode === 'luminance'. */
export function applyLuminanceRotation(buffer: CellBuffer): void {
  const { luminance, rotation, count } = buffer
  for (let i = 0; i < count; i++) {
    rotation[i] = luminance[i] * Math.PI * 2
  }
}

export interface QuantizeOptions {
  /** Ascending cut points in (0,1), length = shapeCount - 1. */
  thresholds: number[]
  invert?: boolean
}

/**
 * Assigns each cell a shape-bin index from luminance + explicit threshold
 * cut points. Shape slot order IS the bin order: bin 0 = darkest, bin N-1 =
 * brightest, matching spec exactly.
 */
export function quantizeToShapeIndex(buffer: CellBuffer, options: QuantizeOptions): void {
  const { luminance, shapeIndex, count } = buffer
  const { thresholds, invert = false } = options
  const binCount = thresholds.length + 1

  for (let i = 0; i < count; i++) {
    const y = invert ? 1 - luminance[i] : luminance[i]
    let bin = 0
    while (bin < thresholds.length && y >= thresholds[bin]) bin++
    shapeIndex[i] = Math.min(bin, binCount - 1)
  }
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}
