import { ExportBar } from './components/ExportBar/ExportBar'
import { MediaDropzone } from './components/MediaIngestion/MediaDropzone'
import { PlaybackControls } from './components/MediaIngestion/PlaybackControls'
import { WebcamCapture } from './components/MediaIngestion/WebcamCapture'
import { ShapeSlotList } from './components/ShapeUploader/ShapeSlotList'
import { ShapeUploader } from './components/ShapeUploader/ShapeUploader'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Viewport } from './components/Viewport/Viewport'

function App() {
  return (
    <div className="flex h-full w-full gap-4 bg-neutral-950 p-6 text-sm text-neutral-300">
      <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto">
        <Viewport />

        <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
          <MediaDropzone />
          <WebcamCapture />
          <PlaybackControls />
        </div>

        <ExportBar />

        <div className="flex w-full max-w-2xl flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Shapes</span>
            <ShapeUploader />
          </div>
          <ShapeSlotList />
        </div>
      </div>

      <Sidebar />
    </div>
  )
}

export default App
