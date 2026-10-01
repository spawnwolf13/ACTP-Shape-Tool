import { useRef } from 'react'

import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import { SHAPE_SLOT_COUNT, type ShapeSlot, type ShapeSourceType } from '../../types'

const SLOT_LABELS = ['Darkest', '', '', 'Lightest']

function sourceTypeFromFile(file: File): ShapeSourceType {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg') ? 'svg' : 'png'
}

/** data: URLs (not blob: URLs) so "Save Current as Default" can persist shapes straight to localStorage. */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

interface ShapeSlotBoxProps {
  index: number
  slot: ShapeSlot | null
}

function ShapeSlotBox({ index, slot }: ShapeSlotBoxProps) {
  const actions = useAppActions()
  const inputRef = useRef<HTMLInputElement>(null)
  const image = slot ? resourceRegistry.get<HTMLImageElement>(slot.resourceId) : undefined

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const dataUrl = await readAsDataURL(file)
    const img = new Image()
    img.src = dataUrl
    await img.decode()

    if (slot) resourceRegistry.release(slot.resourceId)
    const resourceId = resourceRegistry.register(img)

    const newSlot: ShapeSlot = {
      id: slot?.id ?? crypto.randomUUID(),
      name: file.name,
      sourceType: sourceTypeFromFile(file),
      resourceId,
    }
    actions.setPath(['shapes', 'slots', index], newSlot, { immediate: true, label: `Shape slot ${index + 1}` })
  }

  function handleRemove(event: React.MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    if (slot) resourceRegistry.release(slot.resourceId)
    actions.setPath(['shapes', 'slots', index], null, { immediate: true, label: `Clear shape slot ${index + 1}` })
  }

  return (
    <label className="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded border border-neutral-700 bg-neutral-950 p-1 text-center hover:border-neutral-600">
      {image ? (
        <img src={image.src} alt={slot?.name ?? ''} className="max-h-10 max-w-10 object-contain" />
      ) : (
        <span className="text-xl text-neutral-700">+</span>
      )}
      <span className="text-[10px] leading-tight text-neutral-500">
        {index + 1}
        {SLOT_LABELS[index] ? ` · ${SLOT_LABELS[index]}` : ''}
      </span>
      {slot && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-800 text-[10px] leading-none text-neutral-400 hover:bg-red-900 hover:text-red-200"
          aria-label={`Remove shape ${index + 1}`}
        >
          ×
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/svg+xml,image/png"
        className="hidden"
        onChange={handleFileChange}
      />
    </label>
  )
}

/** Exactly 4 fixed shape slots, darkest-bin-first — click any slot to upload or replace its shape. */
export function ShapesPanel() {
  const slots = useStoreSlice((state) => state.shapes.slots)

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Shapes (Luminance Bins)</h3>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: SHAPE_SLOT_COUNT }, (_, index) => (
          <ShapeSlotBox key={index} index={index} slot={slots[index]} />
        ))}
      </div>
    </section>
  )
}
