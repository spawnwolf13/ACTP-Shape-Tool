import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { Button } from '../common/Button'
import { Slider } from '../common/Slider'

export function NoisePanel() {
  const noise = useStoreSlice((state) => state.noise)
  const actions = useAppActions()
  const commit = (label: string) => actions.commitHistory(label)

  function randomizeAll(): void {
    actions.setPath(['noise', 'positionJitter'], Math.random())
    actions.setPath(['noise', 'scaleRandomness'], Math.random())
    actions.setPath(['noise', 'seed'], Math.floor(Math.random() * 2 ** 31))
    commit('Randomize noise')
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Noise &amp; Randomness</h3>

      <Slider
        label="Position Jitter"
        value={noise.positionJitter}
        min={0}
        max={1}
        step={0.01}
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => actions.setPath(['noise', 'positionJitter'], v)}
        onCommit={() => commit('Position jitter')}
      />
      <Slider
        label="Scale Randomness"
        value={noise.scaleRandomness}
        min={0}
        max={1}
        step={0.01}
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => actions.setPath(['noise', 'scaleRandomness'], v)}
        onCommit={() => commit('Scale randomness')}
      />

      <Button variant="primary" onClick={randomizeAll}>
        Randomize All
      </Button>
    </section>
  )
}
