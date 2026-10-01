import { useEffect, useRef, useState } from 'react'

import { createCellBuffer, ensureCellBufferSize, type CellBuffer } from '../../core/grid/CellBuffer'
import { applyNoise, computeGridLayout } from '../../core/grid/GridModel'
import { applyToneFilters, computeLuminance, quantizeToShapeIndex } from '../../core/quantize/Quantizer'
import { defaultLuminanceThresholds } from '../../core/quantize/Thresholds'
import { Canvas2DRenderer } from '../../core/render/Canvas2DRenderer'
import { computeOutputSize, type OutputSize } from '../../core/render/outputSize'
import type { RendererBase } from '../../core/render/RendererBase'
import { buildShapeAtlas, type ShapeAtlas } from '../../core/render/ShapeAtlas'
import { applyForegroundTint } from '../../core/render/Tint'
import { WebGLRenderer } from '../../core/render/WebGLRenderer'
import { computeFramingRects } from '../../core/sampling/framing'
import { MediaSampler } from '../../core/sampling/MediaSampler'
import { startVideoFrameLoop, type VideoFrameLoopHandle } from '../../core/sampling/VideoFrameLoop'
import { useStoreSlice } from '../../hooks/useStoreSlice'
import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import { appStore, type AppStore } from '../../state/store'
import { SHAPE_SLOT_COUNT, type MediaType, type RGBA, type ShapeSlots } from '../../types'
import { UndoRedoOverlay } from './UndoRedoOverlay'

// Per the approved architecture: WebGL instancing kicks in above this cell
// count, or whenever the source is video — Canvas2D handles small previews.
const WEBGL_CELL_THRESHOLD = 4096

const sampler = new MediaSampler()
let buffer: CellBuffer = createCellBuffer(1, 1)

let atlas: ShapeAtlas | null = null
let atlasKey = ''
let atlasBuilding = false

function shapesKey(slots: ShapeSlots): string {
  return slots.map((slot) => (slot ? `${slot.id}:${slot.resourceId}` : 'empty')).join('|')
}

/** Kicks off an async atlas rebuild when the shape slots changed; `onReady` fires once it lands. */
function ensureAtlas(slots: ShapeSlots, onReady: () => void): void {
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

/** Current output pixel dimensions — exporters build at this size (or a multiple of it). */
export function getViewportSize(): OutputSize {
  return computeOutputSize(appStore.getState().output)
}

/**
 * Runs the full sample -> luminance -> filters -> tint -> quantize pipeline
 * against `target`, strictly from `state` (never from module-level globals)
 * so the result is reproducible from any AppStore snapshot — the live rAF
 * loop and on-demand exporters (which can't wait for the next animation
 * frame, and must never pick up a stale buffer) both funnel through this one
 * implementation instead of drifting apart.
 */
function populateMosaicBuffer(target: CellBuffer, state: AppStore): void {
  const { grid, media, color, filters, noise, output } = state

  computeGridLayout(target, grid)
  applyNoise(target, noise)

  const size = computeOutputSize(output)
  const source = resourceRegistry.get<CanvasImageSource>(media.resourceId)
  if (source) {
    sampler.sample(source, target, {
      fitMode: output.fitMode,
      panX: output.panX,
      panY: output.panY,
      outputAspect: size.width / size.height,
      sourceWidth: media.naturalWidth,
      sourceHeight: media.naturalHeight,
    })
  } else {
    target.colorR.fill(38)
    target.colorG.fill(38)
    target.colorB.fill(38)
    target.colorA.fill(255)
  }

  computeLuminance(target)
  applyToneFilters(target, filters)
  applyForegroundTint(target, color)

  const thresholds =
    grid.thresholds.length === SHAPE_SLOT_COUNT ? grid.thresholds : defaultLuminanceThresholds(SHAPE_SLOT_COUNT)
  quantizeToShapeIndex(target, { thresholds })
}

/**
 * One full sample -> quantize -> tint -> draw pass against the current store
 * state, against whichever renderer backend is passed in. Exported
 * standalone (not just inlined in the rAF loop) so it can run independent of
 * requestAnimationFrame scheduling, which browsers suspend entirely for
 * hidden/backgrounded tabs.
 */
export function renderFrame(renderer: RendererBase, onAtlasReady?: () => void): void {
  const state = appStore.getState()
  const { grid, color, shapes, output } = state

  ensureAtlas(shapes.slots, () => onAtlasReady?.())

  buffer = ensureCellBufferSize(buffer, grid.density.cols, grid.density.rows)
  populateMosaicBuffer(buffer, state)

  const size = computeOutputSize(output)
  renderer.draw(buffer, atlas, {
    width: size.width,
    height: size.height,
    background: color.background,
  })
}

/**
 * Builds a brand-new CellBuffer sampled fresh from the CURRENT store state —
 * used by SVG export so the file always matches exactly what's on screen
 * (active media, Fit Mode/Pan, filters, color), independent of the live rAF
 * loop's timing and never reusing the shared `buffer`/`atlas` globals (which
 * can go stale — e.g. while the Filters panel's Effect toggle is bypassing
 * the mosaic pipeline for its raw-media preview).
 */
export function buildExportBuffer(): CellBuffer {
  const state = appStore.getState()
  const exportBuffer = createCellBuffer(state.grid.density.cols, state.grid.density.rows)
  populateMosaicBuffer(exportBuffer, state)
  return exportBuffer
}

/**
 * Draws the raw source media directly (no mosaic pipeline) for the Filters
 * panel's Effect On/Off A/B toggle — same cover/contain framing as the
 * mosaic sampler so the comparison lines up.
 */
function drawRawMediaFrame(ctx: CanvasRenderingContext2D, size: OutputSize): void {
  const { media, color, output } = appStore.getState()

  ctx.save()
  ctx.clearRect(0, 0, size.width, size.height)
  ctx.fillStyle = rgbaToCss(color.background)
  ctx.fillRect(0, 0, size.width, size.height)

  const source = resourceRegistry.get<CanvasImageSource>(media.resourceId)
  if (source && media.naturalWidth > 0 && media.naturalHeight > 0) {
    const { source: s, dest: d } = computeFramingRects({
      fitMode: output.fitMode,
      panX: output.panX,
      panY: output.panY,
      outputAspect: size.width / size.height,
      sourceWidth: media.naturalWidth,
      sourceHeight: media.naturalHeight,
    })
    ctx.drawImage(
      source,
      s.sx,
      s.sy,
      s.sw,
      s.sh,
      d.dx * size.width,
      d.dy * size.height,
      d.dw * size.width,
      d.dh * size.height,
    )
  }
  ctx.restore()
}

function rgbaToCss({ r, g, b, a }: RGBA): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/** Snapshot of exactly what was last rendered — exporters build from this instead of re-running the pipeline. */
export function getCurrentFrame(): { buffer: CellBuffer; atlas: ShapeAtlas | null } {
  return { buffer, atlas }
}

let activeCanvasEl: HTMLCanvasElement | null = null

/** The canvas currently being drawn to by the live rAF loop (Canvas2D or WebGL) — the correct one to captureStream(). */
export function getActiveCanvas(): HTMLCanvasElement | null {
  return activeCanvasEl
}

function ensureCanvasPixelSize(canvas: HTMLCanvasElement, size: OutputSize): void {
  if (canvas.width === size.width && canvas.height === size.height) return
  canvas.width = size.width
  canvas.height = size.height
}

/**
 * Scales `size` down (never up) to fit within maxWidth x maxHeight while
 * preserving its aspect ratio. Done in JS rather than CSS `aspect-ratio` +
 * `max-width`/`max-height`: on a plain block box those two max-* properties
 * each clamp independently — when max-height actually binds, nothing then
 * shrinks the (definite, 100%-based) width to match, so a 1:1 output would
 * render as a wide rectangle instead of a square.
 */
function fitWithinBounds(size: OutputSize, maxWidth: number, maxHeight: number): OutputSize {
  if (!Number.isFinite(maxWidth) || !Number.isFinite(maxHeight) || maxWidth <= 0 || maxHeight <= 0) {
    return size
  }
  const scale = Math.min(maxWidth / size.width, maxHeight / size.height, 1)
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) }
}

/**
 * Owns two stacked canvases (Canvas2D + WebGL) directly on the main thread,
 * each driven by an imperative requestAnimationFrame loop subscribed to the
 * store, per the approved architecture amendment: the primary viewport
 * canvas is never handed to a worker via transferControlToOffscreen, so the
 * backend can switch live by toggling which canvas is visible. React mounts
 * both once and never re-renders them — store changes mark a dirty flag that
 * the rAF loop checks, so slider drags never ride React's reconciliation.
 *
 * The wrapper <div>'s CSS size DOES come from React (via useStoreSlice) since
 * aspect-ratio changes are a discrete, rare action, not a per-frame concern —
 * only the canvases' internal pixel resolution is managed imperatively.
 */
export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvas2DRef = useRef<HTMLCanvasElement>(null)
  const webglRef = useRef<HTMLCanvasElement>(null)
  const output = useStoreSlice((state) => state.output)
  const size = computeOutputSize(output)
  const [displaySize, setDisplaySize] = useState<OutputSize>(size)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function recompute(): void {
      const rect = container!.getBoundingClientRect()
      const maxHeight = Math.min(rect.height, window.innerHeight * 0.7)
      setDisplaySize(fitWithinBounds(size, rect.width, maxHeight))
    }

    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(container)
    return () => observer.disconnect()
  }, [size.width, size.height])

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

      const { grid, media, output: currentOutput, filters } = appStore.getState()
      const currentSize = computeOutputSize(currentOutput)
      ensureCanvasPixelSize(canvas2DEl!, currentSize)
      ensureCanvasPixelSize(webglEl!, currentSize)

      if (!filters.effectEnabled) {
        // A/B preview: bypass the mosaic pipeline entirely and show the raw
        // source media on the Canvas2D layer. getCurrentFrame()/export keep
        // returning the last computed mosaic buffer — this toggle is a live
        // preview only, not an export mode.
        canvas2DEl!.style.display = 'block'
        webglEl!.style.display = 'none'
        activeCanvasEl = canvas2DEl!
        drawRawMediaFrame(canvas2DEl!.getContext('2d')!, currentSize)
        return
      }

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
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      <div className="relative" style={{ width: displaySize.width, height: displaySize.height }}>
        <canvas ref={canvas2DRef} className="absolute inset-0 h-full w-full rounded-lg border border-neutral-800 bg-black" />
        <canvas ref={webglRef} className="absolute inset-0 h-full w-full rounded-lg border border-neutral-800 bg-black" />
        <UndoRedoOverlay />
      </div>
    </div>
  )
}
