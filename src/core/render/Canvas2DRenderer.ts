import type { ColorState, RGBA } from '../../types'
import type { CellBuffer } from '../grid/CellBuffer'

export interface Canvas2DRenderOptions {
  width: number
  height: number
  background: RGBA
}

/**
 * Placeholder renderer: draws each cell as a square whose size encodes its
 * quantized shape-bin index (brighter bin -> larger square) and whose fill
 * is the cell's sampled average color. Exists to visually verify the
 * sampling/quantization math before the real shape atlas (custom uploaded
 * shapes rendered via SVG/PNG textures) is built.
 */
export class Canvas2DRenderer {
  draw(ctx: CanvasRenderingContext2D, buffer: CellBuffer, binCount: number, options: Canvas2DRenderOptions): void {
    const { width, height, background } = options

    ctx.save()
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = rgbaToCss(background)
    ctx.fillRect(0, 0, width, height)

    const cellWidth = width / buffer.cols
    const cellHeight = height / buffer.rows
    const baseSize = Math.min(cellWidth, cellHeight)

    for (let i = 0; i < buffer.count; i++) {
      const cx = buffer.posX[i] * width
      const cy = buffer.posY[i] * height
      const binFraction = binCount > 1 ? (buffer.shapeIndex[i] + 1) / binCount : 1
      const size = baseSize * binFraction * buffer.scale[i] * 0.9
      if (size <= 0) continue

      ctx.fillStyle = `rgba(${buffer.colorR[i]}, ${buffer.colorG[i]}, ${buffer.colorB[i]}, ${buffer.colorA[i] / 255})`
      ctx.save()
      ctx.translate(cx, cy)
      if (buffer.rotation[i] !== 0) ctx.rotate(buffer.rotation[i])
      ctx.fillRect(-size / 2, -size / 2, size, size)
      ctx.restore()
    }

    ctx.restore()
  }
}

function rgbaToCss({ r, g, b, a }: ColorState['background']): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
