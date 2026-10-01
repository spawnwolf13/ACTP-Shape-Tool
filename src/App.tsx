import { useAppActions, useStoreSlice } from './hooks/useStoreSlice'

function App() {
  const cols = useStoreSlice((state) => state.grid.density.cols)
  const rows = useStoreSlice((state) => state.grid.density.rows)
  const invert = useStoreSlice((state) => state.color.invert)
  const actions = useAppActions()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-neutral-950 text-sm text-neutral-300">
      <p className="text-neutral-500">Mosaic Shape-Mapper — scaffold phase (state layer verification)</p>

      <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
        <span>
          grid.density = {cols} × {rows}
        </span>
        <button
          className="rounded bg-neutral-800 px-2 py-1 hover:bg-neutral-700"
          onClick={() => actions.setPath(['grid', 'density', 'cols'], cols + 16, { immediate: true })}
        >
          +16 cols
        </button>
        <button
          className="rounded bg-neutral-800 px-2 py-1 hover:bg-neutral-700"
          onClick={() => actions.setPath(['color', 'invert'], !invert, { immediate: true })}
        >
          invert: {String(invert)}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded bg-indigo-700 px-3 py-1 hover:bg-indigo-600" onClick={() => actions.undo()}>
          Undo
        </button>
        <button className="rounded bg-indigo-700 px-3 py-1 hover:bg-indigo-600" onClick={() => actions.redo()}>
          Redo
        </button>
        <span className="text-neutral-500">
          canUndo: {String(actions.canUndo())} · canRedo: {String(actions.canRedo())}
        </span>
      </div>
    </div>
  )
}

export default App
