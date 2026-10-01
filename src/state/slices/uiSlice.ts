import type { UIState } from '../../types'

/** Ephemeral — never recorded to undo/redo history. */
export function defaultUIState(): UIState {
  return {
    activeTab: 'grid',
    panelOpen: true,
  }
}
