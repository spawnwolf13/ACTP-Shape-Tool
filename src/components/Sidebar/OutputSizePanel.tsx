import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import type { AspectPreset, FitMode } from '../../types'
import { Button } from '../common/Button'
import { Slider } from '../common/Slider'

const PRESETS: { id: AspectPreset; label: string }[] = [
  { id: '1:1', label: '1:1 Square' },
  { id: '16:9', label: '16:9 Landscape' },
  { id: '9:16', label: '9:16 Story/Reel' },
  { id: '4:3', label: '4:3' },
  { id: 'custom', label: 'Custom' },
]

const FIT_MODES: { id: FitMode; label: string; description: string }[] = [
  { id: 'cover', label: 'Cover', description: 'Fills the canvas, cropping the source' },
  { id: 'contain', label: 'Contain', description: 'Shows the full source, letterboxed' },
]

export function OutputSizePanel() {
  const output = useStoreSlice((state) => state.output)
  const actions = useAppActions()
  const commit = (label: string) => actions.commitHistory(label)

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Output Size / Aspect Ratio</h3>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant={output.preset === preset.id ? 'active' : 'default'}
            onClick={() => actions.setPath(['output', 'preset'], preset.id, { immediate: true, label: 'Output size' })}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {output.preset === 'custom' && (
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <label className="flex flex-1 flex-col gap-1">
            <span>Width</span>
            <input
              type="number"
              min={16}
              max={2048}
              value={output.customWidth}
              onChange={(event) =>
                actions.setPath(['output', 'customWidth'], Number(event.target.value) || output.customWidth)
              }
              onBlur={() => commit('Custom width')}
              className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-200"
            />
          </label>
          <span className="pt-4 text-neutral-600">&times;</span>
          <label className="flex flex-1 flex-col gap-1">
            <span>Height</span>
            <input
              type="number"
              min={16}
              max={2048}
              value={output.customHeight}
              onChange={(event) =>
                actions.setPath(['output', 'customHeight'], Number(event.target.value) || output.customHeight)
              }
              onBlur={() => commit('Custom height')}
              className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-200"
            />
          </label>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-neutral-800 pt-2">
        <span className="text-xs text-neutral-500">Image Framing</span>
        <div className="grid grid-cols-2 gap-2">
          {FIT_MODES.map((mode) => (
            <Button
              key={mode.id}
              variant={output.fitMode === mode.id ? 'active' : 'default'}
              title={mode.description}
              onClick={() => actions.setPath(['output', 'fitMode'], mode.id, { immediate: true, label: 'Fit mode' })}
            >
              {mode.label}
            </Button>
          ))}
        </div>

        <Slider
          label="Pan X"
          value={output.panX}
          min={-1}
          max={1}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => actions.setPath(['output', 'panX'], v)}
          onCommit={() => commit('Pan X')}
        />
        <Slider
          label="Pan Y"
          value={output.panY}
          min={-1}
          max={1}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => actions.setPath(['output', 'panY'], v)}
          onCommit={() => commit('Pan Y')}
        />
      </div>
    </section>
  )
}
