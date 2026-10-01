import { useEffect, useRef } from 'react'

import { ExportBar } from './components/ExportBar/ExportBar'
import { MediaDropzone } from './components/MediaIngestion/MediaDropzone'
import { PlaybackControls } from './components/MediaIngestion/PlaybackControls'
import { WebcamCapture } from './components/MediaIngestion/WebcamCapture'
import { ShapeSlotList } from './components/ShapeUploader/ShapeSlotList'
import { ShapeUploader } from './components/ShapeUploader/ShapeUploader'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Viewport } from './components/Viewport/Viewport'
import { useAppActions, useStoreSlice } from './hooks/useStoreSlice'
import { applyPreset, PRESETS } from './state/presets'
import { resourceRegistry } from './state/resources/ResourceRegistry'
import { appStore } from './state/store'
import { createDefaultSourceImage } from './utils/defaultSourceImage'

const DEFAULT_PRESET_ID = 'bauhaus'

function App() {
  const slots = useStoreSlice((state) => state.shapes.slots)
  const actions = useAppActions()
  const didInit = useRef(false)

  // Load a visually striking default preset + a procedural gradient source
  // on first mount so the canvas never opens into an empty, inert state (a
  // preset alone with no media would quantize every cell to the same bin —
  // only one shape would ever show). Guarded so it only fires once and never
  // clobbers shapes/media the user has already loaded (e.g. React
  // StrictMode's double-invoke, or a hot reload mid-session).
  useEffect(() => {
    if (didInit.current || slots.length > 0) return
    didInit.current = true

    async function init() {
      const preset = PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)
      if (preset) await applyPreset(preset, actions, [])

      if (!appStore.getState().media.resourceId) {
        const image = await createDefaultSourceImage()
        const resourceId = resourceRegistry.register(image)
        actions.setPath(['media', 'type'], 'image', { immediate: true, label: 'Default source' })
        actions.setPath(['media', 'resourceId'], resourceId, { immediate: true })
        actions.setPath(['media', 'naturalWidth'], image.naturalWidth, { immediate: true })
        actions.setPath(['media', 'naturalHeight'], image.naturalHeight, { immediate: true })
      }
    }
    void init()
    // Deliberately run-once: `actions` is a stable store reference and `slots`
    // is read only to decide whether to skip, not to react to its changes.
  }, [])

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
