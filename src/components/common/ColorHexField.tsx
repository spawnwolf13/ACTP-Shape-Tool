import { useEffect, useState } from 'react'

import { isValidHexColor } from '../../utils/color'

interface ColorHexFieldProps {
  label: string
  value: string
  onChange: (hex: string) => void
  onCommit: () => void
}

/** A native color picker swatch + a directly-editable hex text field, kept in sync. */
export function ColorHexField({ label, value, onChange, onCommit }: ColorHexFieldProps) {
  const [text, setText] = useState(value)

  useEffect(() => {
    setText(value)
  }, [value])

  function commitText(): void {
    if (isValidHexColor(text)) {
      onChange(text)
      onCommit()
    } else {
      setText(value)
    }
  }

  return (
    <div className="flex flex-col gap-1 text-xs text-neutral-400">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setText(event.target.value)
          }}
          onBlur={onCommit}
          className="h-7 w-10 shrink-0 cursor-pointer rounded border border-neutral-700 bg-transparent"
        />
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitText()
              ;(event.target as HTMLInputElement).blur()
            }
          }}
          spellCheck={false}
          className="w-24 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 font-mono text-neutral-200"
        />
      </div>
    </div>
  )
}
