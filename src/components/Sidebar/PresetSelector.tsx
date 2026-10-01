import { useState } from 'react'

import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { applyPreset, PRESETS } from '../../state/presets'
import { Button } from '../common/Button'

export function PresetSelector() {
  const slots = useStoreSlice((state) => state.shapes.slots)
  const actions = useAppActions()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSelect(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setError(null)
    setLoadingId(presetId)
    try {
      await applyPreset(preset, actions, slots)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preset.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Presets</h3>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <Button key={preset.id} disabled={loadingId !== null} onClick={() => handleSelect(preset.id)}>
            {loadingId === preset.id ? 'Loading…' : preset.label}
          </Button>
        ))}
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </section>
  )
}
