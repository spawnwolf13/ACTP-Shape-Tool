import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { Slider } from '../common/Slider'

export function FiltersPanel() {
  const filters = useStoreSlice((state) => state.filters)
  const actions = useAppActions()

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Contrast / Threshold</h3>

      <Slider
        label="Contrast"
        value={filters.contrast}
        min={-1}
        max={1}
        step={0.01}
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => actions.setPath(['filters', 'contrast'], v)}
        onCommit={() => actions.commitHistory('Contrast')}
      />
    </section>
  )
}
