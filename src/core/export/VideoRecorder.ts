const MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4;codecs=h264',
  'video/mp4',
]

/** Runtime feature-detected mimeType, not hardcoded — browsers vary widely in codec support. */
export function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate
  }
  return null
}

/**
 * Records whichever canvas is passed in via captureStream + MediaRecorder.
 * The canvas must be the one actually being drawn to by the live render
 * loop — a detached or stale canvas produces a frozen/blank stream. No
 * audio track, by design (the mosaic is visual-only).
 */
export class VideoRecorder {
  private readonly canvas: HTMLCanvasElement
  private readonly fps: number
  private readonly mimeType: string
  private recorder: MediaRecorder | null = null
  private chunks: BlobPart[] = []

  constructor(canvas: HTMLCanvasElement, fps: number = 30) {
    const mime = pickSupportedMimeType()
    if (!mime) throw new Error('VideoRecorder: no supported MediaRecorder mimeType in this browser')
    this.canvas = canvas
    this.fps = fps
    this.mimeType = mime
  }

  start(): void {
    const stream = this.canvas.captureStream(this.fps)
    this.chunks = []
    this.recorder = new MediaRecorder(stream, { mimeType: this.mimeType })
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data)
    }
    this.recorder.start()
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder
      if (!recorder || recorder.state === 'inactive') {
        reject(new Error('VideoRecorder: not recording'))
        return
      }
      recorder.onstop = () => resolve(new Blob(this.chunks, { type: this.mimeType }))
      recorder.stop()
    })
  }

  get isRecording(): boolean {
    return this.recorder?.state === 'recording'
  }

  getMimeType(): string {
    return this.mimeType
  }
}
