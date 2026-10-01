import { useState } from 'react'

import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { loadDefault, saveCurrentAsDefault } from '../../state/defaults'
import { Button } from '../common/Button'

export function DefaultActions() {
  const slots = useStoreSlice((state) => state.shapes.slots)
  const actions = useAppActions()
  const [busy, setBusy] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  async function handleReset() {
    setBusy(true)
    try {
      await loadDefault(actions, slots)
    } finally {
      setBusy(false)
    }
  }

  function handleSave() {
    saveCurrentAsDefault()
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  return (
    <div className="flex items-center gap-2">
      <Button className="flex-1" disabled={busy} onClick={handleReset}>
        {busy ? 'Loading…' : 'Reset to Default'}
      </Button>
      <Button className="flex-1" variant="primary" onClick={handleSave}>
        {savedFlash ? 'Saved!' : 'Save Current as Default'}
      </Button>
    </div>
  )
}
