import type { RGBA } from '../../types'
import { BLANK_SHAPE_INDEX, type CellBuffer } from '../grid/CellBuffer'
import type { RendererBase, RenderOptions } from './RendererBase'
import type { ShapeAtlas } from './ShapeAtlas'

/**
 * Draws each cell's quantized shape, tinted per-cell via a scratch-canvas
 * source-in composite (so tinting one shape never bleeds into a
 * neighboring cell's already-drawn pixels on the shared destination
 * canvas — compositing ops act on the whole destination, not just what a
 * save()/restore() block drew). An empty shape slot's atlas tile is fully
 * transparent, so those cells simply draw nothing — no separate fallback
 * needed. Cells quantized into the blank highlight bin (BLANK_SHAPE_INDEX)
 * are skipped outright, same as the brief startup window before the first
 * atlas build resolves (atlas === null).
 */
export class Canvas2DRenderer implements RendererBase {
  private ctx: CanvasRenderingContext2D
  private scratch = document.createElement('canvas')
  private scratchCtx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas2DRenderer: 2D context unavailable')
    this.ctx = ctx

    const scratchCtx = this.scratch.getContext('2d')
    if (!scratchCtx) throw new Error('Canvas2DRenderer: scratch 2D context unavailable')
    this.scratchCtx = scratchCtx
  }

  draw(buffer: CellBuffer, atlas: ShapeAtlas | null, options: RenderOptions): void {
    const ctx = this.ctx
    const { width, height, background } = options

    ctx.save()
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = rgbaToCss(background)
    ctx.fillRect(0, 0, width, height)

    if (!atlas) {
      ctx.restore()
      return
    }

    const cellWidth = width / buffer.cols
    const cellHeight = height / buffer.rows
    const baseSize = Math.min(cellWidth, cellHeight) * 0.9

    for (let i = 0; i < buffer.count; i++) {
      if (buffer.shapeIndex[i] === BLANK_SHAPE_INDEX) continue

      const size = baseSize * buffer.scale[i]
      if (size <= 0.5) continue

      const cx = buffer.posX[i] * width
      const cy = buffer.posY[i] * height
      const tintCss = `rgba(${buffer.colorR[i]}, ${buffer.colorG[i]}, ${buffer.colorB[i]}, ${buffer.colorA[i] / 255})`
      const tileIndex = Math.min(buffer.shapeIndex[i], atlas.count - 1)

      ctx.save()
      ctx.translate(cx, cy)
      if (buffer.rotation[i] !== 0) ctx.rotate(buffer.rotation[i])

      const tinted = this.tintedShape(atlas, tileIndex, size, tintCss)
      ctx.drawImage(tinted, -size / 2, -size / 2, size, size)

      ctx.restore()
    }

    ctx.restore()
  }

  /** Renders one atlas tile into a reusable scratch canvas, tinted via source-in, and returns it. */
  private tintedShape(atlas: ShapeAtlas, tileIndex: number, size: number, tintCss: string): HTMLCanvasElement {
    const s = Math.max(1, Math.ceil(size))
    if (this.scratch.width !== s || this.scratch.height !== s) {
      this.scratch.width = s
      this.scratch.height = s
    }

    const sctx = this.scratchCtx
    sctx.clearRect(0, 0, s, s)
    sctx.drawImage(atlas.canvas, tileIndex * atlas.tileSize, 0, atlas.tileSize, atlas.tileSize, 0, 0, s, s)
    sctx.globalCompositeOperation = 'source-in'
    sctx.fillStyle = tintCss
    sctx.fillRect(0, 0, s, s)
    sctx.globalCompositeOperation = 'source-over'
    return this.scratch
  }
}

function rgbaToCss({ r, g, b, a }: RGBA): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
