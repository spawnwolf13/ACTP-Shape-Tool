import { useRef, useState } from 'react'

import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import type { MediaState } from '../../types'
import { DEFAULT_SAMPLE_NAME, describeGetUserMediaError, loadDefaultSampleImage, startWebcamCapture } from '../../utils/mediaSources'
import { Button } from '../common/Button'
import { MediaDropzone } from '../MediaIngestion/MediaDropzone'
import { PlaybackControls } from '../MediaIngestion/PlaybackControls'
import { WebcamCapture } from '../MediaIngestion/WebcamCapture'

type SourceKind = 'upload' | 'default' | 'webcam'

function activeSourceKind(media: MediaState): SourceKind {
  if (media.type === 'webcam') return 'webcam'
  if (media.name === DEFAULT_SAMPLE_NAME) return 'default'
  return 'upload'
}

/** Explicit source-type selector — makes which source is active unambiguous and lets Default/Webcam swap in one click. */
export function SourcePanel() {
  const media = useStoreSlice((state) => state.media)
  const actions = useAppActions()
  const dropzoneRef = useRef<HTMLLabelElement>(null)
  const [busy, setBusy] = useState<SourceKind | null>(null)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const activeKind = activeSourceKind(media)

  const thumbnail =
    media.type === 'image' ? resourceRegistry.get<HTMLImageElement>(media.resourceId)?.src : undefined

  async function selectDefault() {
    setWebcamError(null)
    setBusy('default')
    try {
      await loadDefaultSampleImage(actions, media.resourceId)
    } finally {
      setBusy(null)
    }
  }

  async function selectWebcam() {
    setWebcamError(null)
    setBusy('webcam')
    try {
      await startWebcamCapture(actions, media.resourceId)
    } catch (error) {
      setWebcamError(describeGetUserMediaError(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Source</h3>

      <div className="grid grid-cols-3 gap-1">
        <Button variant={activeKind === 'upload' ? 'active' : 'default'} onClick={() => dropzoneRef.current?.click()}>
          Upload
        </Button>
        <Button variant={activeKind === 'default' ? 'active' : 'default'} onClick={selectDefault} disabled={busy === 'default'}>
          Sample
        </Button>
        <Button variant={activeKind === 'webcam' ? 'active' : 'default'} onClick={selectWebcam} disabled={busy === 'webcam'}>
          Webcam
        </Button>
      </div>

      {media.name && (
        <div className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-neutral-800 text-neutral-500">
              {media.type === 'webcam' ? '●' : '▶'}
            </span>
          )}
          <span className="truncate text-neutral-300" title={media.name}>
            {media.name}
          </span>
        </div>
      )}

      <MediaDropzone ref={dropzoneRef} />

      <div className="flex flex-wrap items-center gap-2">
        <WebcamCapture />
        <PlaybackControls />
      </div>

      {webcamError && <span className="text-xs text-red-400">{webcamError}</span>}
    </section>
  )
}
