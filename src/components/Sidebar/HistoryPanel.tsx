import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { Button } from '../common/Button'

export function HistoryPanel() {
  const { undoCount, redoCount } = useStoreSlice((state) => state.historyMeta)
  const actions = useAppActions()

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">History</h3>
      <div className="flex items-center gap-2">
        <Button disabled={undoCount === 0} onClick={() => actions.undo()}>
          Undo ({undoCount})
        </Button>
        <Button disabled={redoCount === 0} onClick={() => actions.redo()}>
          Redo ({redoCount})
        </Button>
      </div>
    </section>
  )
}
