import { useEffect, useRef } from 'react'

import { createCellBuffer, ensureCellBufferSize, type CellBuffer } from '../../core/grid/CellBuffer'
import { computeGridLayout } from '../../core/grid/GridModel'
import { applyLuminanceRotation, applyToneFilters, computeLuminance, quantizeToShapeIndex } from '../../core/quantize/Quantizer'
import { equalWidthThresholds } from '../../core/quantize/Thresholds'
import { Canvas2DRenderer } from '../../core/render/Canvas2DRenderer'
import { MediaSampler } from '../../core/sampling/MediaSampler'
import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import { appStore } from '../../state/store'

export const VIEWPORT_WIDTH = 768
export const VIEWPORT_HEIGHT = 768

// No shape-upload UI yet (later build step), so placeholder rendering always
// quantizes into this many bins to make the binning math visible.
const PLACEHOLDER_BIN_COUNT = 5

const sampler = new MediaSampler()
const renderer = new Canvas2DRenderer()
let buffer: CellBuffer = createCellBuffer(1, 1)

/**
 * One full sample -> quantize -> draw pass against the current store state.
 * Exported standalone (not just inlined in the rAF loop) so it can run
 * independent of requestAnimationFrame scheduling, which browsers suspend
 * entirely for hidden/backgrounded tabs.
 */
export function renderFrame(ctx: CanvasRenderingContext2D): void {
  const { grid, media, color, filters, shapes } = appStore.getState()
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

  const thresholds = grid.thresholds.length === binCount - 1 ? grid.thresholds : equalWidthThresholds(binCount)
  quantizeToShapeIndex(buffer, { thresholds, invert: color.invert })

  renderer.draw(ctx, buffer, binCount, {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    background: color.background,
  })
}

/**
 * Owns the live viewport canvas directly on the main thread: an imperative
 * requestAnimationFrame loop subscribed to the store, per the approved
 * architecture amendment. React mounts this canvas once and never
 * re-renders it — store changes mark a dirty flag that the rAF loop checks,
 * so slider drags never ride React's reconciliation.
 */
export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const context = ctx

    let dirty = true
    let rafId = 0

    const unsubscribe = appStore.subscribe(() => {
      dirty = true
    })

    function frame() {
      rafId = requestAnimationFrame(frame)
      if (!dirty) return
      dirty = false
      renderFrame(context)
    }

    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      unsubscribe()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={VIEWPORT_WIDTH}
      height={VIEWPORT_HEIGHT}
      className="rounded-lg border border-neutral-800 bg-black"
    />
  )
}
