import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import type { ForegroundMode } from '../../types'
import { Button } from '../common/Button'
import { ColorPicker } from '../common/ColorPicker'

export function ColorPanel() {
  const color = useStoreSlice((state) => state.color)
  const actions = useAppActions()
  const commit = (label: string) => actions.commitHistory(label)

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Color &amp; Styling</h3>

      <ColorPicker
        label="Background"
        value={color.background}
        onChange={(rgba) => actions.setPath(['color', 'background'], rgba)}
        onCommit={() => commit('Background color')}
      />

      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        <span>Foreground Mode</span>
        <select
          value={color.foregroundMode}
          onChange={(event) =>
            actions.setPath(['color', 'foregroundMode'], event.target.value as ForegroundMode, {
              immediate: true,
              label: 'Foreground mode',
            })
          }
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-200"
        >
          <option value="sampled">Original Media Sampling</option>
          <option value="monochrome">Monochrome Tint</option>
          <option value="gradient">Multi-stop Gradient Map</option>
        </select>
      </label>

      {color.foregroundMode === 'monochrome' && (
        <ColorPicker
          label="Tint Color"
          value={color.monochromeColor}
          onChange={(rgba) => actions.setPath(['color', 'monochromeColor'], rgba)}
          onCommit={() => commit('Tint color')}
        />
      )}

      {color.foregroundMode === 'gradient' && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-neutral-400">Gradient Stops</span>
          {color.gradientStops.map((stop, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="color"
                value={stop.color}
                onChange={(event) => {
                  const stops = color.gradientStops.map((s, i) =>
                    i === index ? { ...s, color: event.target.value } : s,
                  )
                  actions.setPath(['color', 'gradientStops'], stops, { immediate: true, label: 'Gradient stop' })
                }}
                className="h-7 w-10 cursor-pointer rounded border border-neutral-700 bg-transparent"
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={stop.offset}
                onChange={(event) => {
                  const offset = Number(event.target.value)
                  const stops = color.gradientStops.map((s, i) => (i === index ? { ...s, offset } : s))
                  actions.setPath(['color', 'gradientStops'], stops)
                }}
                onPointerUp={() => commit('Gradient stop offset')}
                onKeyUp={() => commit('Gradient stop offset')}
                className="flex-1 accent-indigo-500"
              />
              <span className="w-10 text-right text-xs text-neutral-500">{Math.round(stop.offset * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      <Button
        variant={color.invert ? 'active' : 'default'}
        onClick={() => actions.setPath(['color', 'invert'], !color.invert, { immediate: true, label: 'Invert colors' })}
      >
        Invert Colors: {color.invert ? 'On' : 'Off'}
      </Button>
    </section>
  )
}
