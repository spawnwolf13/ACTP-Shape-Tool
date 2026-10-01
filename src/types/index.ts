export type MediaType = 'image' | 'video' | 'webcam' | null

export interface MediaState {
  type: MediaType
  resourceId: string | null
  /** Display name for the SOURCE panel — file name, or "Webcam". */
  name: string | null
  naturalWidth: number
  naturalHeight: number
  isPlaying: boolean
  duration: number
  currentTime: number
}

export type ShapeSourceType = 'svg' | 'png'

export interface ShapeSlot {
  id: string
  name: string
  sourceType: ShapeSourceType
  resourceId: string
}

/** Exactly 4 fixed slots, darkest-bin-first: index 0 = darkest, index 3 = brightest. Empty slots are null. */
export const SHAPE_SLOT_COUNT = 4
export type ShapeSlots = [ShapeSlot | null, ShapeSlot | null, ShapeSlot | null, ShapeSlot | null]

export interface ShapesState {
  slots: ShapeSlots
}

export interface GridState {
  density: { cols: number; rows: number }
  /** Radians. */
  rotation: number
  /**
   * Ascending cut points in [0,1], length = SHAPE_SLOT_COUNT. Bins 0..N-1 map
   * directly to shape slots 0..N-1 (darkest first); the final threshold is
   * the highlight cutoff — luminance at or above it falls in the blank bin
   * (BLANK_SHAPE_INDEX) and renders background only, no shape.
   */
  thresholds: number[]
}

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

export interface ColorState {
  background: RGBA
  /** Flat tint applied to every shape — strictly a two-color mosaic, no gradients/sampling. */
  foregroundColor: RGBA
}

export interface FiltersState {
  /** -1..1 */
  contrast: number
  /** -1..1 */
  brightness: number
  /** false = bypass the mosaic pipeline and preview the raw source media directly, for quick A/B comparison. */
  effectEnabled: boolean
}

export interface NoiseState {
  positionJitter: number
  scaleRandomness: number
  seed: number
}

export type AspectPreset = '1:1' | '16:9' | '9:16' | '4:3' | 'custom'

/** 'cover' crops the source to fill the output frame; 'contain' shows the full source, letterboxed. */
export type FitMode = 'cover' | 'contain'

export interface OutputState {
  preset: AspectPreset
  customWidth: number
  customHeight: number
  fitMode: FitMode
  /** -1..1, position within the available crop (cover) or letterbox (contain) margin. */
  panX: number
  /** -1..1, position within the available crop (cover) or letterbox (contain) margin. */
  panY: number
}

export type RecordingFormat = 'webm' | 'mp4' | null
export type ExportScale = 1 | 2 | 4

export interface ExportState {
  isRecording: boolean
  recordingFormat: RecordingFormat
  exportScale: ExportScale
  lastExportUrl: string | null
}

export interface UIState {
  activeTab: string
  panelOpen: boolean
}

/** Reactive mirror of HistoryManager's stack sizes, so UI can read them without polling. */
export interface HistoryMetaState {
  undoCount: number
  redoCount: number
}
