import type { OutputState } from '../../types'

const ASPECT_RATIOS: Record<Exclude<OutputState['preset'], 'custom'>, [number, number]> = {
  '1:1': [1, 1],
  '16:9': [16, 9],
  '9:16': [9, 16],
  '4:3': [4, 3],
}

const MAX_PREVIEW_DIMENSION = 1024
const MAX_CUSTOM_DIMENSION = 2048
const MIN_DIMENSION = 16

export interface OutputSize {
  width: number
  height: number
}

/** Resolves the sidebar's aspect-ratio/size choice to actual pixel dimensions for the viewport and exports. */
export function computeOutputSize(output: OutputState): OutputSize {
  if (output.preset === 'custom') {
    return {
      width: clamp(Math.round(output.customWidth), MIN_DIMENSION, MAX_CUSTOM_DIMENSION),
      height: clamp(Math.round(output.customHeight), MIN_DIMENSION, MAX_CUSTOM_DIMENSION),
    }
  }
  const [aw, ah] = ASPECT_RATIOS[output.preset]
  if (aw >= ah) {
    return { width: MAX_PREVIEW_DIMENSION, height: Math.round((MAX_PREVIEW_DIMENSION * ah) / aw) }
  }
  return { width: Math.round((MAX_PREVIEW_DIMENSION * aw) / ah), height: MAX_PREVIEW_DIMENSION }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
