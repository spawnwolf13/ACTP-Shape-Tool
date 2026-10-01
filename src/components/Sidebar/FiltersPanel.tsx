import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { Button } from '../common/Button'
import { Slider } from '../common/Slider'

export function FiltersPanel() {
  const filters = useStoreSlice((state) => state.filters)
  const actions = useAppActions()
  const commit = (label: string) => actions.commitHistory(label)

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Image Filters</h3>

      <Slider
        label="Brightness"
        value={filters.brightness}
        min={-1}
        max={1}
        step={0.01}
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => actions.setPath(['filters', 'brightness'], v)}
        onCommit={() => commit('Brightness')}
      />
      <Slider
        label="Contrast"
        value={filters.contrast}
        min={-1}
        max={1}
        step={0.01}
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => actions.setPath(['filters', 'contrast'], v)}
        onCommit={() => commit('Contrast')}
      />
      <Slider
        label="Gamma"
        value={filters.gamma}
        min={0.2}
        max={3}
        step={0.05}
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => actions.setPath(['filters', 'gamma'], v)}
        onCommit={() => commit('Gamma')}
      />

      <Button
        variant={filters.edgeDetection.enabled ? 'active' : 'default'}
        onClick={() =>
          actions.setPath(['filters', 'edgeDetection', 'enabled'], !filters.edgeDetection.enabled, {
            immediate: true,
            label: 'Edge detection',
          })
        }
      >
        Edge Detection: {filters.edgeDetection.enabled ? 'On' : 'Off'}
      </Button>

      {filters.edgeDetection.enabled && (
        <Slider
          label="Edge Threshold"
          value={filters.edgeDetection.threshold}
          min={0}
          max={1}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => actions.setPath(['filters', 'edgeDetection', 'threshold'], v)}
          onCommit={() => commit('Edge threshold')}
        />
      )}
    </section>
  )
}
