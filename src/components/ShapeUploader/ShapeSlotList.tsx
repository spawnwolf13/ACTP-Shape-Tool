import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { resourceRegistry } from '../../state/resources/ResourceRegistry'

/** Lists uploaded shape slots darkest-first (slot order IS luminance-bin order), with reorder/remove. */
export function ShapeSlotList() {
  const slots = useStoreSlice((state) => state.shapes.slots)
  const actions = useAppActions()

  function moveSlot(index: number, direction: -1 | 1): void {
    const target = index + direction
    if (target < 0 || target >= slots.length) return
    const reordered = [...slots]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    actions.setPath(
      ['shapes', 'slots'],
      reordered.map((slot, i) => ({ ...slot, order: i })),
      { immediate: true, label: 'Reorder shapes' },
    )
  }

  function removeSlot(id: string): void {
    const slot = slots.find((s) => s.id === id)
    if (slot) resourceRegistry.release(slot.resourceId)
    const remaining = slots.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }))
    actions.setPath(['shapes', 'slots'], remaining, { immediate: true, label: 'Remove shape' })
  }

  if (slots.length === 0) {
    return <p className="text-xs text-neutral-600">No shapes uploaded yet — rendering placeholder squares.</p>
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {slots.map((slot, index) => {
        const image = resourceRegistry.get<HTMLImageElement>(slot.resourceId)
        return (
          <li
            key={slot.id}
            className="flex flex-col items-center gap-1 rounded border border-neutral-800 bg-neutral-900 p-2"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded bg-neutral-950">
              {image ? <img src={image.src} alt={slot.name} className="max-h-10 max-w-10 object-contain" /> : null}
            </div>
            <span className="max-w-16 truncate text-[10px] text-neutral-400" title={slot.name}>
              {slot.name}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded bg-neutral-800 px-1 text-xs hover:bg-neutral-700 disabled:opacity-30"
                disabled={index === 0}
                onClick={() => moveSlot(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="rounded bg-neutral-800 px-1 text-xs hover:bg-neutral-700 disabled:opacity-30"
                disabled={index === slots.length - 1}
                onClick={() => moveSlot(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="rounded bg-red-900 px-1 text-xs hover:bg-red-800"
                onClick={() => removeSlot(slot.id)}
              >
                ×
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
