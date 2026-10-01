import { useState } from 'react'

import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { releaseMediaResource, resourceRegistry } from '../../state/resources/ResourceRegistry'
import { Button } from '../common/Button'

function describeGetUserMediaError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Camera access denied — allow it in your browser settings.'
    if (error.name === 'NotFoundError') return 'No camera detected.'
  }
  return 'Could not access the camera.'
}

/** Live webcam capture via getUserMedia, feeding the same ingestion path as file uploads. */
export function WebcamCapture() {
  const media = useStoreSlice((state) => state.media)
  const actions = useAppActions()
  const [error, setError] = useState<string | null>(null)
  const isActive = media.type === 'webcam'

  async function startWebcam() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.srcObject = stream
      await video.play()

      releaseMediaResource(media.resourceId)
      const resourceId = resourceRegistry.register(video)

      actions.setPath(['media', 'type'], 'webcam', { immediate: true, label: 'Start webcam' })
      actions.setPath(['media', 'resourceId'], resourceId, { immediate: true })
      actions.setPath(['media', 'name'], 'Webcam', { immediate: true })
      actions.setPath(['media', 'naturalWidth'], video.videoWidth, { immediate: true })
      actions.setPath(['media', 'naturalHeight'], video.videoHeight, { immediate: true })
      actions.setPath(['media', 'isPlaying'], true, { immediate: true })
    } catch (err) {
      setError(describeGetUserMediaError(err))
    }
  }

  function stopWebcam() {
    releaseMediaResource(media.resourceId)
    actions.setPath(['media', 'type'], null, { immediate: true, label: 'Stop webcam' })
    actions.setPath(['media', 'resourceId'], null, { immediate: true })
    actions.setPath(['media', 'name'], null, { immediate: true })
    actions.setPath(['media', 'isPlaying'], false, { immediate: true })
  }

  return (
    <div className="flex items-center gap-2">
      {isActive ? (
        <Button variant="danger" onClick={stopWebcam}>
          Stop Webcam
        </Button>
      ) : (
        <Button onClick={startWebcam}>Use Webcam</Button>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
