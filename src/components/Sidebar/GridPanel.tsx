import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { Slider } from '../common/Slider'

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180

export function GridPanel() {
  const grid = useStoreSlice((state) => state.grid)
  const actions = useAppActions()
  const commit = (label: string) => actions.commitHistory(label)

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Grid</h3>

      <Slider
        label="Density"
        value={grid.density.cols}
        min={16}
        max={256}
        step={8}
        formatValue={() => `${grid.density.cols}×${grid.density.rows}`}
        onChange={(v) => {
          actions.setPath(['grid', 'density', 'cols'], v)
          actions.setPath(['grid', 'density', 'rows'], v)
        }}
        onCommit={() => commit('Resize grid')}
      />

      <Slider
        label="Rotation"
        value={Math.round(grid.rotation * RAD_TO_DEG)}
        min={-180}
        max={180}
        step={1}
        formatValue={(v) => `${v}°`}
        onChange={(v) => actions.setPath(['grid', 'rotation'], v * DEG_TO_RAD)}
        onCommit={() => commit('Rotation')}
      />
    </section>
  )
}
