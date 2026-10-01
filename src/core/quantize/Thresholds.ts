export type ThresholdStrategy = 'equalWidth' | 'equalizeHistogram'

/** Luminance at/above this is reserved as blank highlight space — see defaultLuminanceThresholds. */
export const HIGHLIGHT_CUTOFF = 0.85

/**
 * Darkest-first cut points for `shapeSlotCount` shape brackets plus one
 * blank highlight bracket above `highlightCutoff` — length = shapeSlotCount,
 * with the final entry always equal to `highlightCutoff` itself. The shape
 * brackets equally split [0, highlightCutoff), matching the spec's "map
 * strictly across the remaining luminance range" requirement.
 */
export function defaultLuminanceThresholds(shapeSlotCount: number, highlightCutoff = HIGHLIGHT_CUTOFF): number[] {
  if (shapeSlotCount <= 0) return []
  const thresholds: number[] = []
  for (let i = 1; i <= shapeSlotCount; i++) {
    thresholds.push((highlightCutoff * i) / shapeSlotCount)
  }
  return thresholds
}

/** Equal-width cut points in (0,1) for `binCount` bins, darkest-first. */
export function equalWidthThresholds(binCount: number): number[] {
  if (binCount <= 1) return []
  const thresholds: number[] = []
  for (let i = 1; i < binCount; i++) {
    thresholds.push(i / binCount)
  }
  return thresholds
}

/**
 * Cut points placed so each bin covers roughly equal luminance mass, derived
 * from a 256-bucket histogram of the buffer's current luminance values.
 * Improves output on low/high-key source media versus fixed equal-width bins.
 */
export function equalizeHistogramThresholds(luminance: Float32Array, binCount: number): number[] {
  if (binCount <= 1) return []
  if (luminance.length === 0) return equalWidthThresholds(binCount)

  const buckets = new Uint32Array(256)
  for (let i = 0; i < luminance.length; i++) {
    const bucket = Math.min(255, Math.max(0, Math.round(luminance[i] * 255)))
    buckets[bucket]++
  }

  const cumulative = new Float64Array(256)
  let running = 0
  for (let i = 0; i < 256; i++) {
    running += buckets[i]
    cumulative[i] = running
  }
  const total = running
  if (total === 0) return equalWidthThresholds(binCount)

  const thresholds: number[] = []
  for (let bin = 1; bin < binCount; bin++) {
    const targetMass = (total * bin) / binCount
    let bucket = 0
    while (bucket < 255 && cumulative[bucket] < targetMass) bucket++
    thresholds.push(bucket / 255)
  }
  return thresholds
}

export function computeThresholds(
  strategy: ThresholdStrategy,
  binCount: number,
  luminance?: Float32Array,
): number[] {
  if (strategy === 'equalizeHistogram' && luminance) {
    return equalizeHistogramThresholds(luminance, binCount)
  }
  return equalWidthThresholds(binCount)
}
