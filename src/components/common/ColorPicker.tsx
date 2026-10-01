import { hexToRgb, rgbToHex } from '../../utils/color'
import type { RGBA } from '../../types'

interface ColorPickerProps {
  label: string
  value: RGBA
  onChange: (value: RGBA) => void
  onCommit: () => void
}

/** Native hex color input (RGB) + a separate alpha slider, composed into one RGBA control. */
export function ColorPicker({ label, value, onChange, onCommit }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-1 text-xs text-neutral-400">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={rgbToHex(value)}
          onChange={(event) => {
            const { r, g, b } = hexToRgb(event.target.value)
            onChange({ ...value, r, g, b })
          }}
          onBlur={onCommit}
          className="h-7 w-10 cursor-pointer rounded border border-neutral-700 bg-transparent"
        />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value.a}
          onChange={(event) => onChange({ ...value, a: Number(event.target.value) })}
          onPointerUp={onCommit}
          onKeyUp={onCommit}
          className="flex-1 accent-indigo-500"
        />
        <span className="w-9 text-right text-neutral-500">{Math.round(value.a * 100)}%</span>
      </div>
    </div>
  )
}
