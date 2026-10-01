import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import { SHAPE_SLOT_COUNT, type ShapeSlots } from '../../types'

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
 * Rasterizes each of the SHAPE_SLOT_COUNT fixed shape slots (SVG or PNG, or
 * empty) into a normalized 1:1 tile, auto-fit (contain, centered, slight
 * padding) into SHAPE_TILE_SIZE square, and packs all tiles side-by-side
 * into one horizontal atlas canvas. Always produces exactly SHAPE_SLOT_COUNT
 * tiles — an empty slot's tile is just left fully transparent, so a cell
 * quantized into that bin renders nothing rather than needing a separate
 * "no shape" fallback path in the renderers.
 *
 * Original shape colors/alpha are preserved as-is — renderers treat the
 * alpha channel as a silhouette mask and apply their own per-cell tint on
 * top (source-in compositing on Canvas2D, alpha-multiply in the WebGL
 * fragment shader).
 */
export async function buildShapeAtlas(slots: ShapeSlots): Promise<ShapeAtlas> {
  const tileSize = SHAPE_TILE_SIZE
  const width = tileSize * SHAPE_SLOT_COUNT
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, tileSize) : document.createElement('canvas')
  canvas.width = width
  canvas.height = tileSize

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!ctx) throw new Error('ShapeAtlas: 2D context unavailable')

  for (let i = 0; i < SHAPE_SLOT_COUNT; i++) {
    const slot = slots[i]
    if (!slot) continue
    const image = resourceRegistry.get<HTMLImageElement>(slot.resourceId)
    if (!image) continue
    drawFitted(ctx, image, i * tileSize, tileSize)
  }

  return { canvas, tileSize, count: SHAPE_SLOT_COUNT, version: nextVersion++ }
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
