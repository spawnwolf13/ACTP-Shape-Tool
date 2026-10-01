import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'

/** Fixed pill overlay in the viewport's top-left corner — detached from the sidebar scroll so it's always reachable. */
export function UndoRedoOverlay() {
  const { undoCount, redoCount } = useStoreSlice((state) => state.historyMeta)
  const actions = useAppActions()

  return (
    <div className="absolute left-4 top-4 z-30 flex items-center gap-0.5 rounded-full border border-neutral-800 bg-neutral-900/90 p-1 shadow-lg backdrop-blur">
      <button
        type="button"
        disabled={undoCount === 0}
        onClick={() => actions.undo()}
        title={`Undo (${undoCount})`}
        aria-label="Undo"
        className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ↶
      </button>
      <button
        type="button"
        disabled={redoCount === 0}
        onClick={() => actions.redo()}
        title={`Redo (${redoCount})`}
        aria-label="Redo"
        className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ↷
      </button>
    </div>
  )
}
