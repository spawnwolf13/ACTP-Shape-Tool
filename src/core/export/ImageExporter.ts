import type { RGBA } from '../../types'
import type { CellBuffer } from '../grid/CellBuffer'
import { WebGLRenderer } from '../render/WebGLRenderer'
import type { ShapeAtlas } from '../render/ShapeAtlas'

export type ExportScale = 1 | 2 | 4

export interface ImageExportOptions {
  baseWidth: number
  baseHeight: number
  scale: ExportScale
  background: RGBA
  format: 'png' | 'jpeg'
}

/**
 * Re-renders the current frame via the WebGL instanced pipeline into a
 * detached canvas sized baseWidth*scale x baseHeight*scale — the cell grid
 * itself is unchanged (buffer stays at its normal cols*rows), only the
 * output pixel dimensions grow, so this reuses whatever was already
 * sampled/quantized rather than re-running that work.
 */
export async function exportImage(
  buffer: CellBuffer,
  binCount: number,
  atlas: ShapeAtlas | null,
  options: ImageExportOptions,
): Promise<Blob> {
  const { baseWidth, baseHeight, scale, background, format } = options
  const width = Math.round(baseWidth * scale)
  const height = Math.round(baseHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const renderer = new WebGLRenderer(canvas)
  renderer.draw(buffer, binCount, atlas, { width, height, background })

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('ImageExporter: toBlob failed'))),
      mimeType,
      format === 'jpeg' ? 0.92 : undefined,
    )
  })

  renderer.dispose()
  return blob
}
