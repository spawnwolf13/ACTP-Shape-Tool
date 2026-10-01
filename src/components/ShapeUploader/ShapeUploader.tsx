import { useRef } from 'react'

import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import type { ShapeSlot, ShapeSourceType } from '../../types'

const MAX_SHAPES = 6

function sourceTypeFromFile(file: File): ShapeSourceType {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg') ? 'svg' : 'png'
}

/** Uploads 1-6 custom SVG/PNG shapes into the ResourceRegistry and appends them as shape slots. */
export function ShapeUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const slots = useStoreSlice((state) => state.shapes.slots)
  const actions = useAppActions()
  const atCapacity = slots.length >= MAX_SHAPES

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    const remaining = MAX_SHAPES - slots.length
    const accepted = files.slice(0, Math.max(0, remaining))

    const newSlots: ShapeSlot[] = []
    for (const file of accepted) {
      const image = new Image()
      image.src = URL.createObjectURL(file)
      await image.decode()
      const resourceId = resourceRegistry.register(image)
      newSlots.push({
        id: crypto.randomUUID(),
        name: file.name,
        sourceType: sourceTypeFromFile(file),
        resourceId,
        order: 0, // reassigned below, by final array position
      })
    }

    const combined = [...slots, ...newSlots].map((slot, index) => ({ ...slot, order: index }))
    actions.setPath(['shapes', 'slots'], combined, { immediate: true, label: 'Add shape' })
  }

  return (
    <label
      className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm ${
        atCapacity
          ? 'cursor-not-allowed bg-neutral-900 text-neutral-600'
          : 'cursor-pointer bg-neutral-800 hover:bg-neutral-700'
      }`}
    >
      <span>
        Add shape ({slots.length}/{MAX_SHAPES})
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/svg+xml,image/png"
        multiple
        disabled={atCapacity}
        className="hidden"
        onChange={handleFilesSelected}
      />
    </label>
  )
}
