import type { MediaState } from '../../types'

export function defaultMediaState(): MediaState {
  return {
    type: null,
    resourceId: null,
    name: null,
    naturalWidth: 0,
    naturalHeight: 0,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
  }
}
