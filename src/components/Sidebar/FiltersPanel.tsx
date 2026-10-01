import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { Button } from '../common/Button'
import { Slider } from '../common/Slider'

export function FiltersPanel() {
  const filters = useStoreSlice((state) => state.filters)
  const actions = useAppActions()

  function toggleEffect() {
    actions.setPath(['filters', 'effectEnabled'], !filters.effectEnabled, { immediate: true, label: 'Toggle effect' })
    actions.commitHistory('Toggle effect')
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Contrast / Brightness</h3>
        <Button variant={filters.effectEnabled ? 'active' : 'default'} onClick={toggleEffect}>
          Effect: {filters.effectEnabled ? 'On' : 'Off'}
        </Button>
      </div>

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

      <Slider
        label="Brightness"
        value={filters.brightness}
        min={-1}
        max={1}
        step={0.01}
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => actions.setPath(['filters', 'brightness'], v)}
        onCommit={() => actions.commitHistory('Brightness')}
      />
    </section>
  )
}
