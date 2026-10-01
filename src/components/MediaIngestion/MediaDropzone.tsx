import { useRef } from 'react'

import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { releaseMediaResource, resourceRegistry } from '../../state/resources/ResourceRegistry'

/** Image or video file input — registers a real HTMLImageElement/HTMLVideoElement into the ResourceRegistry. */
export function MediaDropzone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const currentResourceId = useStoreSlice((state) => state.media.resourceId)
  const actions = useAppActions()

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

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
    actions.setPath(['media', 'naturalWidth'], image.naturalWidth, { immediate: true })
    actions.setPath(['media', 'naturalHeight'], image.naturalHeight, { immediate: true })
    actions.setPath(['media', 'isPlaying'], false, { immediate: true })
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 rounded bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700">
      <span>Upload image/video</span>
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
