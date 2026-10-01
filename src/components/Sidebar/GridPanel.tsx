import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import type { CellAspectMode, RotationMode } from '../../types'
import { Slider } from '../common/Slider'

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180

export function GridPanel() {
  const grid = useStoreSlice((state) => state.grid)
  const actions = useAppActions()
  const commit = (label: string) => actions.commitHistory(label)

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Grid &amp; Geometry</h3>

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

      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        <span>Cell Aspect Ratio</span>
        <select
          value={grid.cellAspect}
          onChange={(event) =>
            actions.setPath(['grid', 'cellAspect'], event.target.value as CellAspectMode, {
              immediate: true,
              label: 'Cell aspect ratio',
            })
          }
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-200"
        >
          <option value="square">Square</option>
          <option value="rectangular">Rectangular</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      {grid.cellAspect === 'custom' && (
        <Slider
          label="Custom Aspect Ratio"
          value={grid.customAspectRatio}
          min={0.25}
          max={4}
          step={0.05}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => actions.setPath(['grid', 'customAspectRatio'], v)}
          onCommit={() => commit('Custom aspect ratio')}
        />
      )}

      <Slider
        label="Radial Center X"
        value={grid.radialOffset.x}
        min={0}
        max={1}
        step={0.01}
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => actions.setPath(['grid', 'radialOffset', 'x'], v)}
        onCommit={() => commit('Radial center')}
      />
      <Slider
        label="Radial Center Y"
        value={grid.radialOffset.y}
        min={0}
        max={1}
        step={0.01}
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => actions.setPath(['grid', 'radialOffset', 'y'], v)}
        onCommit={() => commit('Radial center')}
      />
      <Slider
        label="Falloff Radius"
        value={grid.falloffRadius}
        min={0}
        max={1.5}
        step={0.01}
        formatValue={(v) => (v === 0 ? 'off' : v.toFixed(2))}
        onChange={(v) => actions.setPath(['grid', 'falloffRadius'], v)}
        onCommit={() => commit('Falloff radius')}
      />

      <Slider
        label="Rotation"
        value={Math.round(grid.rotation.global * RAD_TO_DEG)}
        min={-180}
        max={180}
        step={1}
        formatValue={(v) => `${v}°`}
        onChange={(v) => actions.setPath(['grid', 'rotation', 'global'], v * DEG_TO_RAD)}
        onCommit={() => commit('Rotation')}
      />

      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        <span>Rotation Mode</span>
        <select
          value={grid.rotation.mode}
          onChange={(event) =>
            actions.setPath(['grid', 'rotation', 'mode'], event.target.value as RotationMode, {
              immediate: true,
              label: 'Rotation mode',
            })
          }
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-200"
        >
          <option value="none">Fixed</option>
          <option value="luminance">By luminance</option>
          <option value="edge">By edge</option>
        </select>
      </label>
    </section>
  )
}
