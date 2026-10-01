import { forwardRef, useState } from 'react'

import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { ingestMediaFile } from '../../utils/mediaSources'

/**
 * Image or video file dropzone (click or drag) — registers a real
 * HTMLImageElement/HTMLVideoElement into the ResourceRegistry. The root
 * <label> ref is exposed so SourcePanel's "Upload" quick-select button can
 * open the same native file picker via `.click()`.
 */
export const MediaDropzone = forwardRef<HTMLLabelElement>(function MediaDropzone(_props, ref) {
  const currentResourceId = useStoreSlice((state) => state.media.resourceId)
  const actions = useAppActions()
  const [isDragOver, setIsDragOver] = useState(false)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) await ingestMediaFile(file, actions, currentResourceId)
  }

  async function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file) await ingestMediaFile(file, actions, currentResourceId)
  }

  return (
    <label
      ref={ref}
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
        type="file"
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
        className="hidden"
        onChange={handleFileChange}
      />
    </label>
  )
})
