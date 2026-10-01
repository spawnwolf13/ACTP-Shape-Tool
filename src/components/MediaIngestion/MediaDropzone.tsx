import { useRef, useState } from 'react'

import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { releaseMediaResource, resourceRegistry } from '../../state/resources/ResourceRegistry'

/** Image or video file dropzone (click or drag) — registers a real HTMLImageElement/HTMLVideoElement into the ResourceRegistry. */
export function MediaDropzone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const currentResourceId = useStoreSlice((state) => state.media.resourceId)
  const actions = useAppActions()
  const [isDragOver, setIsDragOver] = useState(false)

  async function ingestFile(file: File): Promise<void> {
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

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) await ingestFile(file)
  }

  async function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file) await ingestFile(file)
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed px-3 py-4 text-center text-xs transition-colors ${
        isDragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-neutral-700 bg-neutral-950 hover:border-neutral-600'
      }`}
    >
      <span className="text-neutral-300">Drop an image or video, or click to upload</span>
      <span className="text-neutral-600">PNG, JPG, WebP, MP4, WebM</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
        className="hidden"
        onChange={handleFileChange}
      />
    </label>
  )
}
