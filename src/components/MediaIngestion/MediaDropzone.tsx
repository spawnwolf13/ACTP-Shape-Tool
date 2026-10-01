import { useRef } from 'react'

import { useAppActions } from '../../hooks/useStoreSlice'
import { resourceRegistry } from '../../state/resources/ResourceRegistry'

/**
 * Minimal image file input — enough to get a real HTMLImageElement into the
 * ResourceRegistry and exercise the sampling/quantize/render pipeline.
 * Video/webcam ingestion and drag-and-drop land in a later build step.
 */
export function MediaDropzone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const actions = useAppActions()

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const image = new Image()
    image.src = URL.createObjectURL(file)
    await image.decode()

    const resourceId = resourceRegistry.register(image)

    actions.setPath(['media', 'type'], 'image', { immediate: true, label: 'Load image' })
    actions.setPath(['media', 'resourceId'], resourceId, { immediate: true })
    actions.setPath(['media', 'naturalWidth'], image.naturalWidth, { immediate: true })
    actions.setPath(['media', 'naturalHeight'], image.naturalHeight, { immediate: true })

    event.target.value = ''
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 rounded bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700">
      <span>Upload image</span>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
    </label>
  )
}
