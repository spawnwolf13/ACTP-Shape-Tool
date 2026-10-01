import type { ExportState } from '../../types'

/** Ephemeral — never recorded to undo/redo history. */
export function defaultExportState(): ExportState {
  return {
    isRecording: false,
    recordingFormat: null,
    exportScale: 1,
    lastExportUrl: null,
  }
}
