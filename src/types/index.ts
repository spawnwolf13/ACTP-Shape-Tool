export type MediaType = 'image' | 'video' | 'webcam' | null

export interface MediaState {
  type: MediaType
  resourceId: string | null
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
  order: number
}

export interface ShapesState {
  slots: ShapeSlot[]
}

export type CellAspectMode = 'square' | 'rectangular' | 'custom'
export type RotationMode = 'none' | 'luminance' | 'edge'

export interface GridState {
  density: { cols: number; rows: number }
  cellAspect: CellAspectMode
  customAspectRatio: number
  radialOffset: { x: number; y: number }
  falloffRadius: number
  rotation: { global: number; mode: RotationMode }
  /** Cut points in [0,1], length = shapes.slots.length - 1. Index 0 bin is darkest. */
  thresholds: number[]
}

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

export type ForegroundMode = 'monochrome' | 'sampled' | 'gradient'

export interface GradientStop {
  offset: number
  color: string
}

export interface ColorState {
  background: RGBA
  foregroundMode: ForegroundMode
  monochromeColor: RGBA
  gradientStops: GradientStop[]
  invert: boolean
}

export interface FiltersState {
  brightness: number
  contrast: number
  gamma: number
  edgeDetection: {
    enabled: boolean
    threshold: number
  }
}

export interface NoiseState {
  positionJitter: number
  scaleRandomness: number
  seed: number
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
