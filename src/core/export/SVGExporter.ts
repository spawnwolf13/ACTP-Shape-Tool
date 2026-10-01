import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import { SHAPE_SLOT_COUNT, type RGBA, type ShapeSlot, type ShapeSlots } from '../../types'
import { BLANK_SHAPE_INDEX, type CellBuffer } from '../grid/CellBuffer'

export interface SVGExportOptions {
  width: number
  height: number
  background: RGBA
}

interface ShapeSymbol {
  /** Inner vector markup for this shape's <symbol> — real paths for SVG uploads, a placeholder <rect> for PNG ones. */
  markup: string
  viewBox: string
  /** width / height of the viewBox, used to keep non-square shapes from being squashed into a cell. */
  aspect: number
}

/**
 * Builds a self-contained, 100% vector SVG string — no rasterized content
 * anywhere. Each shape slot becomes one <symbol id="shape-N" viewBox="..."> in
 * <defs>, holding either the uploaded SVG's own original paths/groups (see
 * VectorSource.ts) or, for a PNG-sourced slot, a simple centered vector box
 * sized to the image's aspect ratio — there's no raster data to preserve, so
 * a placeholder shape is the only vector-faithful option. Every visible cell
 * then costs one <use> that positions/sizes/rotates the symbol and tints it
 * via its own `fill` — which cascades into the symbol's paths since
 * VectorSource strips their original solid fills on upload.
 */
export function exportSVG(buffer: CellBuffer, slots: ShapeSlots, options: SVGExportOptions): string {
  const { width, height, background } = options

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  )
  parts.push(`<rect width="${width}" height="${height}" fill="${rgbaToCss(background)}"/>`)

  const symbols = slots.map((slot) => buildShapeSymbol(slot))

  parts.push('<defs>')
  symbols.forEach((symbol, index) => {
    if (symbol) parts.push(`<symbol id="shape-${index}" viewBox="${symbol.viewBox}">${symbol.markup}</symbol>`)
  })
  parts.push('</defs>')

  const cellWidth = width / buffer.cols
  const cellHeight = height / buffer.rows
  const baseSize = Math.min(cellWidth, cellHeight) * 0.9

  for (let i = 0; i < buffer.count; i++) {
    if (buffer.shapeIndex[i] === BLANK_SHAPE_INDEX) continue

    const alpha = buffer.colorA[i] / 255
    if (alpha <= 1 / 255) continue

    const size = baseSize * buffer.scale[i]
    if (size <= 0.5) continue

    const slotIndex = Math.min(buffer.shapeIndex[i], SHAPE_SLOT_COUNT - 1)
    const symbol = symbols[slotIndex]
    if (!symbol) continue // empty slot — nothing to stamp, same as the renderers' transparent tile

    const cx = buffer.posX[i] * width
    const cy = buffer.posY[i] * height
    const { w: dw, h: dh } = fitSymbolSize(symbol.aspect, size)
    const x = cx - dw / 2
    const y = cy - dh / 2
    const rotationDeg = (buffer.rotation[i] * 180) / Math.PI
    const fill = `rgb(${buffer.colorR[i]},${buffer.colorG[i]},${buffer.colorB[i]})`
    const opacityAttr = alpha < 1 - 1 / 255 ? ` fill-opacity="${round2(alpha)}"` : ''

    // Both `fill` (plain inheritance, what browsers resolve) and `color`
    // (what currentColor resolves to, what the symbol's own paths declare —
    // see VectorSource's sanitizeDescendants) carry the same active
    // foreground color, so the shape recolors correctly regardless of which
    // mechanism the SVG consumer honors.
    parts.push(
      `<use href="#shape-${slotIndex}" x="${round2(x)}" y="${round2(y)}" width="${round2(dw)}" height="${round2(dh)}" ` +
        `transform="rotate(${round2(rotationDeg)}, ${round2(cx)}, ${round2(cy)})" fill="${fill}" color="${fill}"${opacityAttr}/>`,
    )
  }

  parts.push('</svg>')
  return parts.join('')
}

function buildShapeSymbol(slot: ShapeSlot | null): ShapeSymbol | null {
  if (!slot) return null

  const vectorSource = resourceRegistry.getVectorSource(slot.resourceId)
  if (vectorSource) {
    const { width, height } = parseViewBoxSize(vectorSource.viewBox)
    return { markup: vectorSource.innerMarkup, viewBox: vectorSource.viewBox, aspect: width / height }
  }

  // PNG (or a failed-to-parse SVG) fallback: a centered vector box matching
  // the image's own aspect ratio — never raster data, per the pure-vector
  // export requirement.
  const image = resourceRegistry.get<HTMLImageElement>(slot.resourceId)
  const w = image?.naturalWidth || 1
  const h = image?.naturalHeight || 1
  const padding = 0.88
  const pw = w * padding
  const ph = h * padding
  const px = (w - pw) / 2
  const py = (h - ph) / 2

  return {
    markup: `<rect x="${round2(px)}" y="${round2(py)}" width="${round2(pw)}" height="${round2(ph)}" fill="currentColor"/>`,
    viewBox: `0 0 ${w} ${h}`,
    aspect: w / h,
  }
}

function parseViewBoxSize(viewBox: string): { width: number; height: number } {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number)
  if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
    return { width: parts[2], height: parts[3] }
  }
  return { width: 1, height: 1 }
}

/** Fits a symbol of the given aspect ratio into a `size` x `size` box (contain), so non-square shapes don't get squashed. */
function fitSymbolSize(aspect: number, size: number): { w: number; h: number } {
  if (!Number.isFinite(aspect) || aspect <= 0) return { w: size, h: size }
  return aspect >= 1 ? { w: size, h: size / aspect } : { w: size * aspect, h: size }
}

function rgbaToCss({ r, g, b, a }: RGBA): string {
  return `rgba(${r},${g},${b},${a})`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
