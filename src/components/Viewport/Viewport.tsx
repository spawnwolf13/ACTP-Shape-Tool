import { useEffect, useRef } from 'react'

import { createCellBuffer, ensureCellBufferSize, type CellBuffer } from '../../core/grid/CellBuffer'
import { computeGridLayout } from '../../core/grid/GridModel'
import { applyLuminanceRotation, applyToneFilters, computeLuminance, quantizeToShapeIndex } from '../../core/quantize/Quantizer'
import { equalWidthThresholds } from '../../core/quantize/Thresholds'
import { Canvas2DRenderer } from '../../core/render/Canvas2DRenderer'
import type { RendererBase } from '../../core/render/RendererBase'
import { buildShapeAtlas, type ShapeAtlas } from '../../core/render/ShapeAtlas'
import { applyForegroundTint } from '../../core/render/Tint'
import { WebGLRenderer } from '../../core/render/WebGLRenderer'
import { MediaSampler } from '../../core/sampling/MediaSampler'
import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import { appStore } from '../../state/store'
import type { ShapeSlot } from '../../types'

export const VIEWPORT_WIDTH = 768
export const VIEWPORT_HEIGHT = 768

// No shape-upload UI yet when this bin count was introduced — now also the
// fallback when the shape slots are empty, so there's always something to see.
const PLACEHOLDER_BIN_COUNT = 5

// Per the approved architecture: WebGL instancing kicks in above this cell
// count, or whenever the source is video — Canvas2D handles small previews.
const WEBGL_CELL_THRESHOLD = 4096

const sampler = new MediaSampler()
let buffer: CellBuffer = createCellBuffer(1, 1)

let atlas: ShapeAtlas | null = null
let atlasKey = ''
let atlasBuilding = false

function shapesKey(slots: ShapeSlot[]): string {
  return slots.map((slot) => `${slot.id}:${slot.resourceId}`).join('|')
}

/** Kicks off an async atlas rebuild when the shape slots changed; `onReady` fires once it lands. */
function ensureAtlas(slots: ShapeSlot[], onReady: () => void): void {
  const key = shapesKey(slots)
  if (key === atlasKey || atlasBuilding) return

  atlasBuilding = true
  buildShapeAtlas(slots)
    .then((built) => {
      atlas = built
      atlasKey = key
      onReady()
    })
    .catch((error: unknown) => {
      console.error('ShapeAtlas build failed', error)
    })
    .finally(() => {
      atlasBuilding = false
    })
}

export function shouldUseWebGL(cols: number, rows: number, mediaType: string | null): boolean {
  return cols * rows > WEBGL_CELL_THRESHOLD || mediaType === 'video'
}

/**
 * One full sample -> quantize -> tint -> draw pass against the current store
 * state, against whichever renderer backend is passed in. Exported
 * standalone (not just inlined in the rAF loop) so it can run independent of
 * requestAnimationFrame scheduling, which browsers suspend entirely for
 * hidden/backgrounded tabs.
 */
export function renderFrame(renderer: RendererBase, onAtlasReady?: () => void): void {
  const { grid, media, color, filters, shapes } = appStore.getState()

  ensureAtlas(shapes.slots, () => onAtlasReady?.())

  const binCount = shapes.slots.length > 0 ? shapes.slots.length : PLACEHOLDER_BIN_COUNT

  buffer = ensureCellBufferSize(buffer, grid.density.cols, grid.density.rows)
  computeGridLayout(buffer, grid)

  const source = resourceRegistry.get<CanvasImageSource>(media.resourceId)
  if (source) {
    sampler.sample(source, buffer)
  } else {
    buffer.colorR.fill(38)
    buffer.colorG.fill(38)
    buffer.colorB.fill(38)
    buffer.colorA.fill(255)
  }

  computeLuminance(buffer)
  applyToneFilters(buffer, filters)
  if (grid.rotation.mode === 'luminance') applyLuminanceRotation(buffer)
  applyForegroundTint(buffer, color)

  const thresholds = grid.thresholds.length === binCount - 1 ? grid.thresholds : equalWidthThresholds(binCount)
  quantizeToShapeIndex(buffer, { thresholds, invert: color.invert })

  const activeAtlas = shapes.slots.length > 0 ? atlas : null
  renderer.draw(buffer, binCount, activeAtlas, {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    background: color.background,
  })
}

/**
 * Owns two stacked canvases (Canvas2D + WebGL) directly on the main thread,
 * each driven by an imperative requestAnimationFrame loop subscribed to the
 * store, per the approved architecture amendment: the primary viewport
 * canvas is never handed to a worker via transferControlToOffscreen, so the
 * backend can switch live by toggling which canvas is visible. React mounts
 * both once and never re-renders them — store changes mark a dirty flag that
 * the rAF loop checks, so slider drags never ride React's reconciliation.
 */
export function Viewport() {
  const canvas2DRef = useRef<HTMLCanvasElement>(null)
  const webglRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas2DEl = canvas2DRef.current
    const webglEl = webglRef.current
    if (!canvas2DEl || !webglEl) return

    const canvas2DRenderer = new Canvas2DRenderer(canvas2DEl)
    let webglRenderer: WebGLRenderer | null = null
    try {
      webglRenderer = new WebGLRenderer(webglEl)
    } catch (error) {
      console.warn('WebGLRenderer unavailable, falling back to Canvas2D only:', error)
    }

    let dirty = true
    let rafId = 0
    const unsubscribe = appStore.subscribe(() => {
      dirty = true
    })

    function frame() {
      rafId = requestAnimationFrame(frame)
      if (!dirty) return
      dirty = false

      const { grid, media } = appStore.getState()
      const useWebGL = Boolean(webglRenderer) && shouldUseWebGL(grid.density.cols, grid.density.rows, media.type)

      canvas2DEl!.style.display = useWebGL ? 'none' : 'block'
      webglEl!.style.display = useWebGL ? 'block' : 'none'

      renderFrame(useWebGL ? webglRenderer! : canvas2DRenderer, () => {
        dirty = true
      })
    }

    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      unsubscribe()
      webglRenderer?.dispose()
    }
  }, [])

  return (
    <div className="relative" style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }}>
      <canvas
        ref={canvas2DRef}
        width={VIEWPORT_WIDTH}
        height={VIEWPORT_HEIGHT}
        className="absolute inset-0 rounded-lg border border-neutral-800 bg-black"
      />
      <canvas
        ref={webglRef}
        width={VIEWPORT_WIDTH}
        height={VIEWPORT_HEIGHT}
        className="absolute inset-0 rounded-lg border border-neutral-800 bg-black"
      />
    </div>
  )
}
