import { useEffect, useRef } from 'react'

import { createCellBuffer, ensureCellBufferSize, type CellBuffer } from '../../core/grid/CellBuffer'
import { applyNoise, computeGridLayout } from '../../core/grid/GridModel'
import { applyEdgeRotation, applyEdgeScaleModulation, computeSobelEdges } from '../../core/quantize/EdgeDetector'
import { applyLuminanceRotation, applyToneFilters, computeLuminance, quantizeToShapeIndex } from '../../core/quantize/Quantizer'
import { equalWidthThresholds } from '../../core/quantize/Thresholds'
import { Canvas2DRenderer } from '../../core/render/Canvas2DRenderer'
import type { RendererBase } from '../../core/render/RendererBase'
import { buildShapeAtlas, type ShapeAtlas } from '../../core/render/ShapeAtlas'
import { applyForegroundTint } from '../../core/render/Tint'
import { WebGLRenderer } from '../../core/render/WebGLRenderer'
import { MediaSampler } from '../../core/sampling/MediaSampler'
import { startVideoFrameLoop, type VideoFrameLoopHandle } from '../../core/sampling/VideoFrameLoop'
import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import { appStore } from '../../state/store'
import type { MediaType, ShapeSlot } from '../../types'

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

function isLiveSource(mediaType: MediaType): boolean {
  return mediaType === 'video' || mediaType === 'webcam'
}

export function shouldUseWebGL(cols: number, rows: number, mediaType: MediaType): boolean {
  return cols * rows > WEBGL_CELL_THRESHOLD || isLiveSource(mediaType)
}

/**
 * One full sample -> quantize -> tint -> draw pass against the current store
 * state, against whichever renderer backend is passed in. Exported
 * standalone (not just inlined in the rAF loop) so it can run independent of
 * requestAnimationFrame scheduling, which browsers suspend entirely for
 * hidden/backgrounded tabs.
 */
export function renderFrame(renderer: RendererBase, onAtlasReady?: () => void): void {
  const { grid, media, color, filters, noise, shapes } = appStore.getState()

  ensureAtlas(shapes.slots, () => onAtlasReady?.())

  const binCount = shapes.slots.length > 0 ? shapes.slots.length : PLACEHOLDER_BIN_COUNT

  buffer = ensureCellBufferSize(buffer, grid.density.cols, grid.density.rows)
  computeGridLayout(buffer, grid)
  applyNoise(buffer, noise)

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

  // Either control can independently request the Sobel pass: the Filters
  // panel toggle (drives scale modulation) and the Grid panel's "By edge"
  // rotation mode are deliberately decoupled, same as "By luminance" is its
  // own independent rotation mode.
  if (filters.edgeDetection.enabled || grid.rotation.mode === 'edge') {
    computeSobelEdges(buffer)
  }
  if (filters.edgeDetection.enabled) {
    applyEdgeScaleModulation(buffer, { threshold: filters.edgeDetection.threshold })
  }
  if (grid.rotation.mode === 'luminance') applyLuminanceRotation(buffer)
  else if (grid.rotation.mode === 'edge') applyEdgeRotation(buffer)

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

/** Snapshot of exactly what was last rendered — exporters build from this instead of re-running the pipeline. */
export function getCurrentFrame(): { buffer: CellBuffer; atlas: ShapeAtlas | null; binCount: number } {
  const { shapes } = appStore.getState()
  const binCount = shapes.slots.length > 0 ? shapes.slots.length : PLACEHOLDER_BIN_COUNT
  return { buffer, atlas: shapes.slots.length > 0 ? atlas : null, binCount }
}

let activeCanvasEl: HTMLCanvasElement | null = null

/** The canvas currently being drawn to by the live rAF loop (Canvas2D or WebGL) — the correct one to captureStream(). */
export function getActiveCanvas(): HTMLCanvasElement | null {
  return activeCanvasEl
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

    let dirty = true
    let rafId = 0
    let webglContextLost = false
    let webglRenderer: WebGLRenderer | null = null
    try {
      webglRenderer = new WebGLRenderer(webglEl, {
        // Context loss is normal (tab backgrounded, GPU reset) — fall back to
        // Canvas2D immediately rather than leaving a frozen/black canvas.
        onContextLost: () => {
          webglContextLost = true
          dirty = true
        },
        onContextRestored: () => {
          webglContextLost = false
          dirty = true
        },
      })
    } catch (error) {
      console.warn('WebGLRenderer unavailable, falling back to Canvas2D only:', error)
    }
    const unsubscribe = appStore.subscribe(() => {
      dirty = true
    })

    // Live video/webcam content changes every frame even when the store
    // doesn't — a dedicated per-video-frame loop keeps the viewport dirty
    // while such a source is playing, independent of store subscriptions.
    let videoLoop: VideoFrameLoopHandle | null = null
    let videoLoopResourceId: string | null = null

    function syncVideoLoop(): void {
      const { media } = appStore.getState()
      const shouldRun = isLiveSource(media.type) && media.isPlaying && Boolean(media.resourceId)

      if (!shouldRun) {
        if (videoLoop) {
          videoLoop.stop()
          videoLoop = null
          videoLoopResourceId = null
        }
        return
      }

      if (videoLoopResourceId === media.resourceId && videoLoop) return

      videoLoop?.stop()
      videoLoop = null
      const element = resourceRegistry.get<HTMLVideoElement>(media.resourceId)
      if (element instanceof HTMLVideoElement) {
        videoLoop = startVideoFrameLoop(element, () => {
          dirty = true
        })
        videoLoopResourceId = media.resourceId
      }
    }

    const unsubscribeMedia = appStore.subscribe((state) => state.media, syncVideoLoop)
    syncVideoLoop()

    function frame() {
      rafId = requestAnimationFrame(frame)
      if (!dirty) return
      dirty = false

      const { grid, media } = appStore.getState()
      const useWebGL =
        Boolean(webglRenderer) && !webglContextLost && shouldUseWebGL(grid.density.cols, grid.density.rows, media.type)

      canvas2DEl!.style.display = useWebGL ? 'none' : 'block'
      webglEl!.style.display = useWebGL ? 'block' : 'none'
      activeCanvasEl = useWebGL ? webglEl! : canvas2DEl!

      renderFrame(useWebGL ? webglRenderer! : canvas2DRenderer, () => {
        dirty = true
      })
    }

    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      unsubscribe()
      unsubscribeMedia()
      videoLoop?.stop()
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
