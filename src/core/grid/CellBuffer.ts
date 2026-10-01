/**
 * Struct-of-arrays grid buffer: flat TypedArrays only, no per-cell JS
 * objects. Sampling/quantization run once per dirty frame over cols*rows
 * cells (up to 65,536 at the 256x256 ceiling) — per-cell object allocation
 * at that frequency would thrash the GC, especially during video playback.
 */
export interface CellBuffer {
  count: number
  cols: number
  rows: number
  /** Normalized [0,1] cell center X. */
  posX: Float32Array
  /** Normalized [0,1] cell center Y. */
  posY: Float32Array
  /** [0,1], post tone-filter luminance used for quantization. */
  luminance: Float32Array
  /** Shape slot index this cell quantized to; 0 = darkest bin. */
  shapeIndex: Uint8Array
  /** Radians. */
  rotation: Float32Array
  /** Multiplier in [0,1]: jitter scale randomness, combined at render time. */
  scale: Float32Array
  colorR: Uint8Array
  colorG: Uint8Array
  colorB: Uint8Array
  colorA: Uint8Array
}

export function createCellBuffer(cols: number, rows: number): CellBuffer {
  const safeCols = Math.max(1, Math.floor(cols))
  const safeRows = Math.max(1, Math.floor(rows))
  const count = safeCols * safeRows
  return {
    count,
    cols: safeCols,
    rows: safeRows,
    posX: new Float32Array(count),
    posY: new Float32Array(count),
    luminance: new Float32Array(count),
    shapeIndex: new Uint8Array(count),
    rotation: new Float32Array(count),
    scale: new Float32Array(count),
    colorR: new Uint8Array(count),
    colorG: new Uint8Array(count),
    colorB: new Uint8Array(count),
    colorA: new Uint8Array(count),
  }
}

/** Reallocates only when cols/rows actually changed; otherwise returns `buffer` unchanged. */
export function ensureCellBufferSize(buffer: CellBuffer, cols: number, rows: number): CellBuffer {
  if (buffer.cols === cols && buffer.rows === rows) return buffer
  return createCellBuffer(cols, rows)
}
