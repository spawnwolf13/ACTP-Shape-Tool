import { useEffect, useRef } from 'react'

import { Sidebar } from './components/Sidebar/Sidebar'
import { Viewport } from './components/Viewport/Viewport'
import { useAppActions, useStoreSlice } from './hooks/useStoreSlice'
import { loadDefault } from './state/defaults'
import { resourceRegistry } from './state/resources/ResourceRegistry'
import { appStore } from './state/store'
import { createDefaultSourceImage } from './utils/defaultSourceImage'

function App() {
  const slots = useStoreSlice((state) => state.shapes.slots)
  const actions = useAppActions()
  const didInit = useRef(false)

  // Load the default (user-saved, or the built-in geometric look) on first
  // mount, plus a procedural gradient source, so the canvas never opens into
  // an empty, inert state (uniform luminance would otherwise collapse every
  // cell into the same shape bin). Guarded so it only fires once and never
  // clobbers shapes/media the user has already loaded (e.g. React
  // StrictMode's double-invoke, or a hot reload mid-session).
  useEffect(() => {
    if (didInit.current || slots.some(Boolean)) return
    didInit.current = true

    async function init() {
      await loadDefault(actions, slots)

      if (!appStore.getState().media.resourceId) {
        const image = await createDefaultSourceImage()
        const resourceId = resourceRegistry.register(image)
        actions.setPath(['media', 'type'], 'image', { immediate: true, label: 'Default source' })
        actions.setPath(['media', 'resourceId'], resourceId, { immediate: true })
        actions.setPath(['media', 'name'], 'Default gradient', { immediate: true })
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
      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <Viewport />
      </div>

      <Sidebar />
    </div>
  )
}

export default App
