export interface VideoFrameLoopHandle {
  stop: () => void
}

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number
  cancelVideoFrameCallback?: (handle: number) => void
}

/**
 * Drives `onFrame` once per decoded video frame while `video` plays, using
 * requestVideoFrameCallback when available — it fires exactly on new frame
 * decode (frame-accurate, and the browser can skip work between real
 * frames) — falling back to a plain requestAnimationFrame loop on browsers
 * without it (e.g. Firefox). Used to mark the Viewport's dirty flag so live
 * video/webcam content keeps re-sampling even though the store itself never
 * changes between frames.
 */
export function startVideoFrameLoop(video: HTMLVideoElement, onFrame: () => void): VideoFrameLoopHandle {
  const videoEl = video as VideoWithFrameCallback
  let stopped = false
  let rafId = 0
  let rvfcId = 0

  if (typeof videoEl.requestVideoFrameCallback === 'function') {
    const tick = () => {
      if (stopped) return
      onFrame()
      rvfcId = videoEl.requestVideoFrameCallback!(tick)
    }
    rvfcId = videoEl.requestVideoFrameCallback(tick)
  } else {
    const tick = () => {
      if (stopped) return
      onFrame()
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  return {
    stop: () => {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
      if (rvfcId) videoEl.cancelVideoFrameCallback?.(rvfcId)
    },
  }
}
