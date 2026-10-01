import type { RGBA } from '../../types'
import type { CellBuffer } from '../grid/CellBuffer'
import type { ShapeAtlas } from '../render/ShapeAtlas'

export interface SVGExportOptions {
  width: number
  height: number
  background: RGBA
}

/**
 * Builds a self-contained SVG string. One <mask> per shape (a white-on-
 * transparent silhouette derived from the atlas tile's alpha channel), plus
 * one masked <rect id="shape-N"> per shape in <defs>; each visible cell then
 * costs one <use href="#shape-N" transform=... fill=...>. Shape pixel data
 * is stored exactly once regardless of cell count — the actual
 * defs/use file-size win — and the mask's own luminance is just white vs
 * transparent, so it renders correctly under the universally-supported
 * default luminance mask type (no mask-type="alpha" compatibility bet).
 * A <use>'s own `fill` cascades into the cloned <rect> (which carries no
 * fill of its own), giving correct per-cell tinting without re-rasterizing
 * per cell.
 */
export function exportSVG(buffer: CellBuffer, atlas: ShapeAtlas | null, options: SVGExportOptions): string {
  const { width, height, background } = options

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  )
  parts.push(`<rect width="${width}" height="${height}" fill="${rgbaToCss(background)}"/>`)

  if (!atlas) {
    parts.push('</svg>')
    return parts.join('')
  }

  parts.push('<defs>')
  for (let i = 0; i < atlas.count; i++) {
    const dataUrl = silhouetteDataURL(atlas, i)
    parts.push(
      `<mask id="shape-mask-${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="1" height="1">` +
        `<image href="${dataUrl}" width="1" height="1"/></mask>`,
    )
    parts.push(`<rect id="shape-${i}" width="1" height="1" mask="url(#shape-mask-${i})"/>`)
  }
  parts.push('</defs>')

  const cellWidth = width / buffer.cols
  const cellHeight = height / buffer.rows
  const baseSize = Math.min(cellWidth, cellHeight) * 0.9

  for (let i = 0; i < buffer.count; i++) {
    const alpha = buffer.colorA[i] / 255
    if (alpha <= 1 / 255) continue

    const size = baseSize * buffer.scale[i]
    if (size <= 0.5) continue

    const cx = buffer.posX[i] * width
    const cy = buffer.posY[i] * height
    const rotationDeg = (buffer.rotation[i] * 180) / Math.PI
    const fill = `rgb(${buffer.colorR[i]},${buffer.colorG[i]},${buffer.colorB[i]})`
    const opacityAttr = alpha < 1 - 1 / 255 ? ` fill-opacity="${round2(alpha)}"` : ''
    // Local 1x1 square: recenter to origin, scale to pixel size, rotate, then place at the cell center.
    const transform = `translate(${round2(cx)} ${round2(cy)}) rotate(${round2(rotationDeg)}) scale(${round2(size)}) translate(-0.5 -0.5)`
    const shapeIndex = Math.min(buffer.shapeIndex[i], atlas.count - 1)

    parts.push(`<use href="#shape-${shapeIndex}" transform="${transform}" fill="${fill}"${opacityAttr}/>`)
  }

  parts.push('</svg>')
  return parts.join('')
}

/** White-on-transparent version of an atlas tile — isolates the alpha silhouette for mask content. */
function silhouetteDataURL(atlas: ShapeAtlas, tileIndex: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = atlas.tileSize
  canvas.height = atlas.tileSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('SVGExporter: 2D context unavailable')

  ctx.drawImage(
    atlas.canvas,
    tileIndex * atlas.tileSize,
    0,
    atlas.tileSize,
    atlas.tileSize,
    0,
    0,
    atlas.tileSize,
    atlas.tileSize,
  )
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, atlas.tileSize, atlas.tileSize)
  return canvas.toDataURL('image/png')
}

function rgbaToCss({ r, g, b, a }: RGBA): string {
  return `rgba(${r},${g},${b},${a})`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
