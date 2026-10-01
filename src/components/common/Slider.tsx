interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** Flushes the pending edit into undo/redo history — call on drag-end. */
  onCommit: () => void
  formatValue?: (value: number) => string
}

/**
 * A live-updating range input wired to the debounced store pattern: onChange
 * fires on every drag tick (instant visual feedback), onCommit flushes the
 * pending history entry on release — via pointerup for mouse/touch/pen and
 * keyup for arrow-key adjustments, which never fire pointerup.
 */
export function Slider({ label, value, min, max, step = 1, onChange, onCommit, formatValue }: SliderProps) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-400">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="text-neutral-200">{formatValue ? formatValue(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className="accent-indigo-500"
      />
    </label>
  )
}
