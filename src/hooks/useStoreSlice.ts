import { useStore } from 'zustand/react'

import { appStore, type AppStore } from '../state/store'

/**
 * The only sanctioned way for React components to read the store.
 * Renderer code subscribes directly via `appStore.subscribe(...)` instead —
 * never through this hook — so canvas updates never ride React's render cycle.
 */
export function useStoreSlice<T>(selector: (state: AppStore) => T): T {
  return useStore(appStore, selector)
}

export function useAppActions(): AppStore['actions'] {
  return useStore(appStore, (state) => state.actions)
}
