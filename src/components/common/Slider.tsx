import { useEffect, useRef, useState } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** Flushes the pending edit into undo/redo history — call on drag-end/blur/step-click. */
  onCommit: () => void
  formatValue?: (value: number) => string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function decimalsForStep(step: number): number {
  const text = String(step)
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

/**
 * A precision control group: [-] [number input] [+] plus a slider track.
 * The DOM input always updates instantly (local state, zero lag) — the
 * value only propagates to the store/render pipeline at most once per
 * animation frame, via a rAF-coalesced callback. This is what keeps
 * continuous dragging smooth: without it, every native `input` event (which
 * can fire far faster than 60fps) would trigger a synchronous store update
 * and a full re-sample/quantize/render pass, competing with the browser's
 * own paint work for the same main thread.
 */
export function Slider({ label, value, min, max, step = 1, onChange, onCommit, formatValue }: SliderProps) {
  const [displayValue, setDisplayValue] = useState(() => String(value))
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef<number | null>(null)
  const decimals = decimalsForStep(step)

  useEffect(() => {
    setDisplayValue(String(value))
  }, [value])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function propagate(next: number): void {
    pendingRef.current = next
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const pending = pendingRef.current
      pendingRef.current = null
      if (pending !== null) onChange(pending)
    })
  }

  function stepValue(): number {
    const parsed = Number(displayValue)
    return Number.isFinite(parsed) ? parsed : value
  }

  function handleSlider(raw: string): void {
    const next = clamp(Number(raw), min, max)
    setDisplayValue(next.toFixed(decimals))
    propagate(next)
  }

  function handleStepClick(direction: 1 | -1): void {
    const next = clamp(roundTo(stepValue() + direction * step, decimals), min, max)
    setDisplayValue(next.toFixed(decimals))
    propagate(next)
    onCommit()
  }

  function commitText(): void {
    const parsed = Number(displayValue)
    const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : value
    setDisplayValue(next.toFixed(decimals))
    propagate(next)
    onCommit()
  }

  return (
    <div className="flex flex-col gap-1 text-xs text-neutral-400">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-neutral-200">{formatValue ? formatValue(value) : displayValue}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleStepClick(-1)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="number"
          value={displayValue}
          min={min}
          max={max}
          step={step}
          onChange={(event) => setDisplayValue(event.target.value)}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitText()
              ;(event.target as HTMLInputElement).blur()
            }
          }}
          className="w-16 shrink-0 rounded border border-neutral-700 bg-neutral-950 px-1 py-1 text-center text-neutral-200"
        />
        <button
          type="button"
          onClick={() => handleStepClick(1)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamp(stepValue(), min, max)}
          onChange={(event) => handleSlider(event.target.value)}
          onPointerUp={onCommit}
          onKeyUp={onCommit}
          className="flex-1 accent-indigo-500"
        />
      </div>
    </div>
  )
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
