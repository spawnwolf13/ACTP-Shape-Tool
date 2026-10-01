import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import { rgbToHex } from '../../utils/color'
import { SHAPE_SLOT_COUNT, type RGBA, type ShapeSlot, type ShapeSlots } from '../../types'
import { BLANK_SHAPE_INDEX, type CellBuffer } from '../grid/CellBuffer'

export interface SVGExportOptions {
  width: number
  height: number
  background: RGBA
}

const TRANSFORM_PLACEHOLDER = '__MM_TRANSFORM__'

interface ShapeGeometry {
  vbMinX: number
  vbMinY: number
  vbWidth: number
  vbHeight: number
  /** vbWidth / vbHeight, used to keep non-square shapes from being squashed into a cell. */
  aspect: number
  /** Stamps this shape for one cell: `transform` lands directly on its own root element, or — only for a shape with genuinely multiple root elements — on one small local <g> wrapping them. */
  render: (transform: string) => string
}

/**
 * Builds a self-contained, 100% vector SVG — two clean layers only
 * ("Background" rect + one "Shapes" group), no rasterized content, and
 * nothing Adobe Illustrator's SVG importer is known to mishandle:
 * no <defs>/<symbol>/<use> (broken fill inheritance through <use>), no
 * currentColor (not reliably resolved), no rgba() colors (plain hex plus a
 * separate fill-opacity instead — rgba() isn't reliably parsed either), and
 * no per-cell <g> wrapper bloating the importer's layers panel with
 * thousands of redundant groups — a shape's transform lands directly on its
 * own path/circle/etc. element, falling back to one small local <g> only for
 * the rare shape with multiple root elements. All color comes straight from
 * the active store (ColorPanel's background/foregroundColor) — nothing here
 * is ever hardcoded black or white.
 */
export function exportSVG(buffer: CellBuffer, slots: ShapeSlots, options: SVGExportOptions): string {
  const { width, height, background } = options

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  )

  const backgroundOpacityAttr = background.a < 1 - 1 / 255 ? ` fill-opacity="${round2(background.a)}"` : ''
  parts.push(`<rect id="Background" width="100%" height="100%" fill="${rgbToHex(background)}"${backgroundOpacityAttr}/>`)

  // The mosaic is strictly two-color (see Tint.ts), so every cell shares the
  // same foreground tint/opacity — resolve them once rather than per cell.
  const foregroundHex = rgbToHex({ r: buffer.colorR[0], g: buffer.colorG[0], b: buffer.colorB[0] })
  const alpha = buffer.colorA[0] / 255

  parts.push(`<g id="Shapes" fill="${foregroundHex}">`)

  if (alpha > 1 / 255) {
    const shapes = slots.map((slot) => buildShapeGeometry(slot, alpha))
    const cellWidth = width / buffer.cols
    const cellHeight = height / buffer.rows
    const baseSize = Math.min(cellWidth, cellHeight) * 0.9

    for (let i = 0; i < buffer.count; i++) {
      if (buffer.shapeIndex[i] === BLANK_SHAPE_INDEX) continue

      const size = baseSize * buffer.scale[i]
      if (size <= 0.5) continue

      const slotIndex = Math.min(buffer.shapeIndex[i], SHAPE_SLOT_COUNT - 1)
      const shape = shapes[slotIndex]
      if (!shape) continue // empty slot — nothing to stamp, same as the renderers' transparent tile

      const cx = buffer.posX[i] * width
      const cy = buffer.posY[i] * height
      const { w: dw, h: dh } = fitShapeSize(shape.aspect, size)
      const x = cx - dw / 2
      const y = cy - dh / 2
      const rotationDeg = (buffer.rotation[i] * 180) / Math.PI

      const scaleX = dw / shape.vbWidth
      const scaleY = dh / shape.vbHeight

      // Rotate must be the OUTERMOST transform (applied last, listed first —
      // SVG transform lists apply right-to-left), rotating the shape around
      // its final on-canvas center AFTER it's already been translated/scaled
      // into place. Applying it any earlier would rotate in the shape's
      // local (pre-scale) space, which a non-uniform scale (any non-square
      // shape) then shears instead of cleanly turning.
      const transform = [`rotate(${round2(rotationDeg)}, ${round2(cx)}, ${round2(cy)})`, `translate(${round2(x)}, ${round2(y)})`]
      if (scaleX !== 1 || scaleY !== 1) transform.push(`scale(${round2(scaleX)}, ${round2(scaleY)})`)
      if (shape.vbMinX !== 0 || shape.vbMinY !== 0) {
        transform.push(`translate(${round2(-shape.vbMinX)}, ${round2(-shape.vbMinY)})`)
      }

      parts.push(shape.render(transform.join(' ')))
    }
  }

  parts.push('</g>')
  parts.push('</svg>')
  return parts.join('')
}

function buildShapeGeometry(slot: ShapeSlot | null, alpha: number): ShapeGeometry | null {
  if (!slot) return null

  const vectorSource = resourceRegistry.getVectorSource(slot.resourceId)
  if (vectorSource) {
    const box = parseViewBox(vectorSource.viewBox)
    return { ...box, aspect: box.vbWidth / box.vbHeight, render: buildCellRenderer(vectorSource.innerMarkup, alpha) }
  }

  // PNG (or a failed-to-parse SVG) fallback: a centered vector box matching
  // the image's own aspect ratio — never raster data, per the pure-vector
  // export requirement. No fill here either — it inherits from the "Shapes" group.
  const image = resourceRegistry.get<HTMLImageElement>(slot.resourceId)
  const w = image?.naturalWidth || 1
  const h = image?.naturalHeight || 1
  const padding = 0.88
  const pw = w * padding
  const ph = h * padding
  const px = (w - pw) / 2
  const py = (h - ph) / 2
  const markup = `<rect x="${round2(px)}" y="${round2(py)}" width="${round2(pw)}" height="${round2(ph)}"/>`

  return { vbMinX: 0, vbMinY: 0, vbWidth: w, vbHeight: h, aspect: w / h, render: buildCellRenderer(markup, alpha) }
}

/**
 * Precomputes, once per shape slot (never per cell), how to stamp this
 * shape's markup for one cell. A single root element gets `transform` (and
 * `fill-opacity`, if needed) injected directly onto itself — no wrapper.
 * Only a shape with genuinely multiple root elements (e.g. an uploaded icon
 * with several top-level paths) gets wrapped in one small local <g>; doing
 * that unconditionally for every cell is exactly the per-cell group bloat
 * this format is meant to avoid.
 */
function buildCellRenderer(markup: string, alpha: number): (transform: string) => string {
  const needsOpacity = alpha < 1 - 1 / 255
  const opacityAttr = needsOpacity ? ` fill-opacity="${round2(alpha)}"` : ''

  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml')
  const children = Array.from(doc.documentElement.children)

  if (children.length === 1) {
    const el = children[0]
    el.setAttribute('transform', TRANSFORM_PLACEHOLDER)
    if (needsOpacity) el.setAttribute('fill-opacity', String(round2(alpha)))
    const template = new XMLSerializer().serializeToString(el)
    return (transform) => template.replace(TRANSFORM_PLACEHOLDER, transform)
  }

  const template = `<g transform="${TRANSFORM_PLACEHOLDER}"${opacityAttr}>${markup}</g>`
  return (transform) => template.replace(TRANSFORM_PLACEHOLDER, transform)
}

function parseViewBox(viewBox: string): { vbMinX: number; vbMinY: number; vbWidth: number; vbHeight: number } {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number)
  if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
    return { vbMinX: parts[0], vbMinY: parts[1], vbWidth: parts[2], vbHeight: parts[3] }
  }
  return { vbMinX: 0, vbMinY: 0, vbWidth: 1, vbHeight: 1 }
}

/** Fits a shape of the given aspect ratio into a `size` x `size` box (contain), so non-square shapes don't get squashed. */
function fitShapeSize(aspect: number, size: number): { w: number; h: number } {
  if (!Number.isFinite(aspect) || aspect <= 0) return { w: size, h: size }
  return aspect >= 1 ? { w: size, h: size / aspect } : { w: size * aspect, h: size }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
