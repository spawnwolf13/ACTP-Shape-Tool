import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import type { ShapeSlot } from '../../types'

export const SHAPE_TILE_SIZE = 256

export interface ShapeAtlas {
  canvas: HTMLCanvasElement | OffscreenCanvas
  tileSize: number
  count: number
  /** Bumped on every rebuild; lets a renderer skip re-uploading an unchanged GPU texture. */
  version: number
}

let nextVersion = 1

/**
 * Rasterizes each uploaded shape (SVG or PNG) into a normalized 1:1 tile,
 * auto-fit (contain, centered, slight padding) into SHAPE_TILE_SIZE square,
 * and packs all tiles side-by-side into one horizontal atlas canvas.
 *
 * Original shape colors/alpha are preserved as-is — renderers treat the
 * alpha channel as a silhouette mask and apply their own per-cell tint on
 * top (source-in compositing on Canvas2D, alpha-multiply in the WebGL
 * fragment shader), so a single atlas supports monochrome/sampled/gradient
 * foreground modes without re-rasterizing.
 */
export async function buildShapeAtlas(slots: ShapeSlot[]): Promise<ShapeAtlas | null> {
  if (slots.length === 0) return null

  const tileSize = SHAPE_TILE_SIZE
  const width = tileSize * slots.length
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, tileSize) : document.createElement('canvas')
  canvas.width = width
  canvas.height = tileSize

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!ctx) throw new Error('ShapeAtlas: 2D context unavailable')

  for (let i = 0; i < slots.length; i++) {
    const image = resourceRegistry.get<HTMLImageElement>(slots[i].resourceId)
    if (!image) continue
    drawFitted(ctx, image, i * tileSize, tileSize)
  }

  return { canvas, tileSize, count: slots.length, version: nextVersion++ }
}

function drawFitted(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  image: HTMLImageElement,
  tileX: number,
  tileSize: number,
): void {
  const w = image.naturalWidth
  const h = image.naturalHeight
  if (!w || !h) return

  const padding = 0.88
  const scale = Math.min(tileSize / w, tileSize / h) * padding
  const dw = w * scale
  const dh = h * scale
  const dx = tileX + (tileSize - dw) / 2
  const dy = (tileSize - dh) / 2

  ctx.drawImage(image, dx, dy, dw, dh)
}
