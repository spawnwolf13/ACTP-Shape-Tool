import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { hexToRgb, rgbToHex } from '../../utils/color'
import { ColorHexField } from '../common/ColorHexField'

export function ColorPanel() {
  const color = useStoreSlice((state) => state.color)
  const actions = useAppActions()
  const commit = (label: string) => actions.commitHistory(label)

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Color</h3>

      <ColorHexField
        label="Background"
        value={rgbToHex(color.background)}
        onChange={(hex) =>
          actions.setPath(['color', 'background'], { ...color.background, ...hexToRgb(hex) }, { immediate: true })
        }
        onCommit={() => commit('Background color')}
      />

      <ColorHexField
        label="Foreground / Shape Color"
        value={rgbToHex(color.foregroundColor)}
        onChange={(hex) =>
          actions.setPath(['color', 'foregroundColor'], { ...color.foregroundColor, ...hexToRgb(hex) }, { immediate: true })
        }
        onCommit={() => commit('Foreground color')}
      />
    </section>
  )
}
