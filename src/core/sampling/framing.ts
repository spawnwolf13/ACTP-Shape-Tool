import type { FitMode } from '../../types'

export interface FramingParams {
  fitMode: FitMode
  /** -1..1, position within the available crop (cover) or letterbox (contain) margin. */
  panX: number
  panY: number
  /** width / height of the destination frame the source is being placed into. */
  outputAspect: number
  sourceWidth: number
  sourceHeight: number
}

/** Source-space crop rect to read from. */
export interface SourceRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

/** Destination rect, as a 0..1 fraction of the destination's own width/height. */
export interface DestRect {
  dx: number
  dy: number
  dw: number
  dh: number
}

export interface FramingRects {
  source: SourceRect
  dest: DestRect
}

const FULL_DEST: DestRect = { dx: 0, dy: 0, dw: 1, dh: 1 }

/**
 * Computes the source crop ('cover') or destination placement ('contain')
 * needed to map a source image into a destination of `outputAspect` without
 * distorting it. Expressed as fractions/source-pixels rather than concrete
 * destination pixels, so the same result is valid whether the caller draws
 * into a tiny cols*rows sampling canvas or the full-resolution output canvas
 * — both MediaSampler and the raw-media preview use this.
 */
export function computeFramingRects(params: FramingParams): FramingRects {
  const { fitMode, panX, panY, outputAspect, sourceWidth, sourceHeight } = params
  if (sourceWidth <= 0 || sourceHeight <= 0 || !Number.isFinite(outputAspect) || outputAspect <= 0) {
    return { source: { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight }, dest: FULL_DEST }
  }

  const sourceAspect = sourceWidth / sourceHeight

  if (fitMode === 'cover') {
    let sw = sourceWidth
    let sh = sourceHeight
    let sx = 0
    let sy = 0
    if (sourceAspect > outputAspect) {
      sw = sourceHeight * outputAspect
      sx = ((sourceWidth - sw) / 2) * (1 + clamp11(panX))
    } else if (sourceAspect < outputAspect) {
      sh = sourceWidth / outputAspect
      sy = ((sourceHeight - sh) / 2) * (1 + clamp11(panY))
    }
    return { source: { sx, sy, sw, sh }, dest: FULL_DEST }
  }

  let dw = 1
  let dh = 1
  if (sourceAspect / outputAspect >= 1) {
    dh = outputAspect / sourceAspect
  } else {
    dw = sourceAspect / outputAspect
  }
  const dx = ((1 - dw) / 2) * (1 + clamp11(panX))
  const dy = ((1 - dh) / 2) * (1 + clamp11(panY))
  return { source: { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight }, dest: { dx, dy, dw, dh } }
}

function clamp11(value: number): number {
  return value < -1 ? -1 : value > 1 ? 1 : value
}
