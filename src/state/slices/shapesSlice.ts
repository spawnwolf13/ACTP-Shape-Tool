import type { ShapesState } from '../../types'

export function defaultShapesState(): ShapesState {
  return {
    slots: [],
  }
}

/** Equal-width cut points in (0,1) for `shapeCount` bins, darkest-first. */
export function defaultThresholdsForShapeCount(shapeCount: number): number[] {
  if (shapeCount <= 1) return []
  const thresholds: number[] = []
  for (let i = 1; i < shapeCount; i++) {
    thresholds.push(i / shapeCount)
  }
  return thresholds
}
