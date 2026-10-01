import type { CellBuffer } from '../grid/CellBuffer'
import { computeFramingRects, type FramingParams } from './framing'

type SamplerCanvas = HTMLCanvasElement | OffscreenCanvas
type SamplerContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * Downsamples a source image/video frame into a CellBuffer's color arrays.
 *
 * The key perf trick: draw the source onto a canvas sized exactly
 * cols x rows with image smoothing enabled, then take one getImageData call
 * over that tiny canvas. The browser's own bilinear/mip downsampling
 * approximates a per-cell box average essentially for free, at a cost
 * independent of the source's native resolution — iterating full-res source
 * pixels per cell would be O(cols*rows*sourceW*sourceH) instead of O(cols*rows).
 *
 * Framing (fit mode + pan) is resolved via computeFramingRects, expressed as
 * fractions of the destination — see framing.ts for why that keeps the
 * result correct regardless of how the cols*rows grid aspect relates to the
 * final output aspect.
 */
export class MediaSampler {
  private canvas: SamplerCanvas
  private ctx: SamplerContext
  private cols = 0
  private rows = 0

  constructor() {
    this.canvas =
      typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas')
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true }) as SamplerContext | null
    if (!ctx) throw new Error('MediaSampler: 2D context unavailable')
    this.ctx = ctx
  }

  private ensureSize(cols: number, rows: number): void {
    if (this.cols === cols && this.rows === rows) return
    this.cols = cols
    this.rows = rows
    this.canvas.width = cols
    this.canvas.height = rows
  }

  sample(source: CanvasImageSource, buffer: CellBuffer, framing: FramingParams): void {
    const { cols, rows } = buffer
    this.ensureSize(cols, rows)

    this.ctx.imageSmoothingEnabled = true
    if ('imageSmoothingQuality' in this.ctx) {
      this.ctx.imageSmoothingQuality = 'high'
    }
    this.ctx.clearRect(0, 0, cols, rows)

    const { source: s, dest: d } = computeFramingRects(framing)
    this.ctx.drawImage(source, s.sx, s.sy, s.sw, s.sh, d.dx * cols, d.dy * rows, d.dw * cols, d.dh * rows)

    const { data } = this.ctx.getImageData(0, 0, cols, rows)
    const { colorR, colorG, colorB, colorA, count } = buffer
    for (let i = 0; i < count; i++) {
      const offset = i * 4
      const alpha = data[offset + 3]
      if (alpha === 0) {
        // Outside the drawn image (the letterbox margin in 'contain' mode) —
        // sample as bright/white so it naturally falls in the blank
        // highlight bin instead of the (wrong) darkest one.
        colorR[i] = 255
        colorG[i] = 255
        colorB[i] = 255
        colorA[i] = 0
      } else {
        colorR[i] = data[offset]
        colorG[i] = data[offset + 1]
        colorB[i] = data[offset + 2]
        colorA[i] = alpha
      }
    }
  }
}
