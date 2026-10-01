import type { AppActions } from '../state/store'
import { releaseMediaResource, resourceRegistry } from '../state/resources/ResourceRegistry'
import { createDefaultSourceImage } from './defaultSourceImage'

/** The SOURCE panel's "Sample" tab is identified by this media name — see SourcePanel's active-tab detection. */
export const DEFAULT_SAMPLE_NAME = 'Default Sample Image'

/** Ingests a user-picked file (image or video) into the media slice. Shared by MediaDropzone and SourcePanel's quick-upload button. */
export async function ingestMediaFile(file: File, actions: AppActions, currentResourceId: string | null): Promise<void> {
  const isVideo = file.type.startsWith('video/')

  if (isVideo) {
    const video = document.createElement('video')
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.src = URL.createObjectURL(file)
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('Failed to load video'))
    })
    await video.play()

    releaseMediaResource(currentResourceId)
    const resourceId = resourceRegistry.register(video)

    actions.setPath(['media', 'type'], 'video', { immediate: true, label: 'Load video' })
    actions.setPath(['media', 'resourceId'], resourceId, { immediate: true })
    actions.setPath(['media', 'name'], file.name, { immediate: true })
    actions.setPath(['media', 'naturalWidth'], video.videoWidth, { immediate: true })
    actions.setPath(['media', 'naturalHeight'], video.videoHeight, { immediate: true })
    actions.setPath(['media', 'duration'], video.duration || 0, { immediate: true })
    actions.setPath(['media', 'isPlaying'], true, { immediate: true })
    return
  }

  const image = new Image()
  image.src = URL.createObjectURL(file)
  await image.decode()

  releaseMediaResource(currentResourceId)
  const resourceId = resourceRegistry.register(image)

  actions.setPath(['media', 'type'], 'image', { immediate: true, label: 'Load image' })
  actions.setPath(['media', 'resourceId'], resourceId, { immediate: true })
  actions.setPath(['media', 'name'], file.name, { immediate: true })
  actions.setPath(['media', 'naturalWidth'], image.naturalWidth, { immediate: true })
  actions.setPath(['media', 'naturalHeight'], image.naturalHeight, { immediate: true })
  actions.setPath(['media', 'isPlaying'], false, { immediate: true })
}

/** Loads the procedural gradient sample as the active source — the SOURCE panel's "Sample" tab and the app's first-mount fallback. */
export async function loadDefaultSampleImage(actions: AppActions, currentResourceId: string | null): Promise<void> {
  const image = await createDefaultSourceImage()
  releaseMediaResource(currentResourceId)
  const resourceId = resourceRegistry.register(image)

  actions.setPath(['media', 'type'], 'image', { immediate: true, label: 'Default sample image' })
  actions.setPath(['media', 'resourceId'], resourceId, { immediate: true })
  actions.setPath(['media', 'name'], DEFAULT_SAMPLE_NAME, { immediate: true })
  actions.setPath(['media', 'naturalWidth'], image.naturalWidth, { immediate: true })
  actions.setPath(['media', 'naturalHeight'], image.naturalHeight, { immediate: true })
  actions.setPath(['media', 'isPlaying'], false, { immediate: true })
}

export function describeGetUserMediaError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Camera access denied — allow it in your browser settings.'
    if (error.name === 'NotFoundError') return 'No camera detected.'
  }
  return 'Could not access the camera.'
}

/** Starts webcam capture as the active source — the SOURCE panel's "Webcam" tab. Throws; caller handles/display the error. */
export async function startWebcamCapture(actions: AppActions, currentResourceId: string | null): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  await video.play()

  releaseMediaResource(currentResourceId)
  const resourceId = resourceRegistry.register(video)

  actions.setPath(['media', 'type'], 'webcam', { immediate: true, label: 'Start webcam' })
  actions.setPath(['media', 'resourceId'], resourceId, { immediate: true })
  actions.setPath(['media', 'name'], 'Webcam', { immediate: true })
  actions.setPath(['media', 'naturalWidth'], video.videoWidth, { immediate: true })
  actions.setPath(['media', 'naturalHeight'], video.videoHeight, { immediate: true })
  actions.setPath(['media', 'isPlaying'], true, { immediate: true })
}
