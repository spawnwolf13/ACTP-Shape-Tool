import type { RGBA } from '../../types'
import type { CellBuffer } from '../grid/CellBuffer'
import type { ShapeAtlas } from './ShapeAtlas'

export interface RenderOptions {
  width: number
  height: number
  background: RGBA
}

/** Shared contract so Canvas2D and WebGL backends are interchangeable from the Viewport's point of view. */
export interface RendererBase {
  draw(buffer: CellBuffer, binCount: number, atlas: ShapeAtlas | null, options: RenderOptions): void
  dispose?(): void
}
