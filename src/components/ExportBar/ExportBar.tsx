import { useEffect, useRef, useState } from 'react'

import { exportImage, type ExportScale } from '../../core/export/ImageExporter'
import { exportSVG } from '../../core/export/SVGExporter'
import { pickSupportedMimeType, VideoRecorder } from '../../core/export/VideoRecorder'
import { getActiveCanvas, getCurrentFrame, VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from '../Viewport/Viewport'
import { useStoreSlice } from '../../hooks/useStoreSlice'
import { Button } from '../common/Button'
import { RecordingIndicator } from './RecordingIndicator'

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function buildSVGString(background: { r: number; g: number; b: number; a: number }): string {
  const { buffer, atlas } = getCurrentFrame()
  return exportSVG(buffer, atlas, { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, background })
}

/** Save as SVG, copy SVG to clipboard, download PNG at 1x/2x/4x, and record the live canvas to video. */
export function ExportBar() {
  const media = useStoreSlice((state) => state.media)
  const color = useStoreSlice((state) => state.color)

  const [copyLabel, setCopyLabel] = useState('Copy to Illustrator')
  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [recordError, setRecordError] = useState<string | null>(null)
  const recorderRef = useRef<VideoRecorder | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isLiveSource = media.type === 'video' || media.type === 'webcam'
  const svgDisabled = isLiveSource && media.isPlaying
  const canRecord = pickSupportedMimeType() !== null

  function handleSaveSVG() {
    downloadBlob(new Blob([buildSVGString(color.background)], { type: 'image/svg+xml' }), 'mosaic.svg')
  }

  async function handleCopySVG() {
    try {
      await navigator.clipboard.writeText(buildSVGString(color.background))
      setCopyLabel('Copied!')
    } catch {
      setCopyLabel('Copy failed')
    }
    setTimeout(() => setCopyLabel('Copy to Illustrator'), 1500)
  }

  async function handleDownloadImage(scale: ExportScale) {
    const { buffer, atlas, binCount } = getCurrentFrame()
    const blob = await exportImage(buffer, binCount, atlas, {
      baseWidth: VIEWPORT_WIDTH,
      baseHeight: VIEWPORT_HEIGHT,
      scale,
      background: color.background,
      format: 'png',
    })
    downloadBlob(blob, `mosaic-${scale}x.png`)
  }

  function startRecording() {
    setRecordError(null)
    const canvas = getActiveCanvas()
    if (!canvas) {
      setRecordError('Viewport not ready yet.')
      return
    }
    try {
      const recorder = new VideoRecorder(canvas, 30)
      recorder.start()
      recorderRef.current = recorder
      setIsRecording(true)
      setRecordSeconds(0)
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : 'Could not start recording.')
    }
  }

  async function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = recorderRef.current
    recorderRef.current = null
    setIsRecording(false)
    if (!recorder) return
    try {
      const blob = await recorder.stop()
      downloadBlob(blob, 'mosaic-recording.webm')
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : 'Recording failed.')
    }
  }

  // Stop any in-flight recording/timer if the bar unmounts mid-recording.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recorderRef.current?.isRecording) recorderRef.current.stop().catch(() => {})
    }
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
      <div className="flex items-center gap-2">
        <Button onClick={handleSaveSVG} disabled={svgDisabled} title={svgDisabled ? 'Pause to export SVG' : undefined}>
          Save as SVG
        </Button>
        <Button onClick={handleCopySVG} disabled={svgDisabled}>
          {copyLabel}
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs text-neutral-500">PNG</span>
        <Button onClick={() => handleDownloadImage(1)}>1x</Button>
        <Button onClick={() => handleDownloadImage(2)}>2x</Button>
        <Button onClick={() => handleDownloadImage(4)}>4x</Button>
      </div>

      <div className="flex items-center gap-2">
        {canRecord ? (
          isRecording ? (
            <>
              <RecordingIndicator seconds={recordSeconds} />
              <Button variant="danger" onClick={stopRecording}>
                Stop
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={startRecording}>
              Record Video
            </Button>
          )
        ) : (
          <span className="text-xs text-neutral-600">Recording unsupported in this browser</span>
        )}
        {recordError && <span className="text-xs text-red-400">{recordError}</span>}
      </div>
    </div>
  )
}
