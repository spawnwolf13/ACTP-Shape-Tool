import { MediaDropzone } from './components/MediaIngestion/MediaDropzone'
import { ShapeSlotList } from './components/ShapeUploader/ShapeSlotList'
import { ShapeUploader } from './components/ShapeUploader/ShapeUploader'
import { Viewport } from './components/Viewport/Viewport'
import { useAppActions, useStoreSlice } from './hooks/useStoreSlice'

function App() {
  const cols = useStoreSlice((state) => state.grid.density.cols)
  const rows = useStoreSlice((state) => state.grid.density.rows)
  const invert = useStoreSlice((state) => state.color.invert)
  const actions = useAppActions()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-neutral-950 p-6 text-sm text-neutral-300">
      <Viewport />

      <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
        <MediaDropzone />
        <span>
          grid.density = {cols} × {rows}
        </span>
        <input
          type="range"
          min={16}
          max={256}
          step={8}
          value={cols}
          onChange={(event) => {
            const value = Number(event.target.value)
            actions.setPath(['grid', 'density', 'cols'], value)
            actions.setPath(['grid', 'density', 'rows'], value)
          }}
          onMouseUp={() => actions.commitHistory('Resize grid')}
        />
        <button
          className="rounded bg-neutral-800 px-2 py-1 hover:bg-neutral-700"
          onClick={() => actions.setPath(['color', 'invert'], !invert, { immediate: true })}
        >
          invert: {String(invert)}
        </button>
        <button className="rounded bg-indigo-700 px-3 py-1 hover:bg-indigo-600" onClick={() => actions.undo()}>
          Undo
        </button>
        <button className="rounded bg-indigo-700 px-3 py-1 hover:bg-indigo-600" onClick={() => actions.redo()}>
          Redo
        </button>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Shapes</span>
          <ShapeUploader />
        </div>
        <ShapeSlotList />
      </div>
    </div>
  )
}

export default App
