import { BLANK_SHAPE_INDEX, type CellBuffer } from '../grid/CellBuffer'
import type { RendererBase, RenderOptions } from './RendererBase'
import type { ShapeAtlas } from './ShapeAtlas'
import { FRAGMENT_SHADER_SOURCE } from './shaders/instanced.frag'
import { VERTEX_SHADER_SOURCE } from './shaders/instanced.vert'

// Unit quad in local [-0.5, 0.5] space, as a triangle strip.
const QUAD_VERTICES = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5])

const ATTR_QUAD_POS = 0
const ATTR_INSTANCE_POS = 1
const ATTR_INSTANCE_SIZE = 2
const ATTR_INSTANCE_ROTATION = 3
const ATTR_INSTANCE_COLOR = 4
const ATTR_INSTANCE_SHAPE_INDEX = 5

export interface WebGLRendererCallbacks {
  /** Fired when the GL context is lost (tab backgrounded, GPU reset, driver crash, …). Fall back to Canvas2D. */
  onContextLost?: () => void
  /** Fired after GL resources have been fully reinitialized post-restore. Safe to resume using this renderer. */
  onContextRestored?: () => void
}

/**
 * Instanced-quad WebGL2 renderer. One draw call renders every cell: a static
 * unit quad is instanced cols*rows times, with per-instance position/size/
 * rotation/color/shapeIndex uploaded as divisor-1 vertex attributes and the
 * ShapeAtlas bound as a single texture sampled per-fragment by shapeIndex —
 * this is what keeps 256x256 grids and live video at 60fps, versus the
 * Canvas2D path's per-cell draw calls.
 *
 * WebGL contexts can be lost at any time (tab backgrounding, GPU driver
 * reset, resource pressure — a background tab losing its context is normal
 * Chromium behavior, not an error). `webglcontextlost`/`webglcontextrestored`
 * are handled here: on loss, draw() becomes a no-op and the caller is
 * notified to fall back to Canvas2D; on restore, every GL resource (program,
 * buffers, texture) is recreated from scratch against the same context
 * object before resuming.
 */
export class WebGLRenderer implements RendererBase {
  private readonly canvas: HTMLCanvasElement
  private readonly gl: WebGL2RenderingContext
  private readonly callbacks: WebGLRendererCallbacks

  private program!: WebGLProgram
  private quadBuffer!: WebGLBuffer
  private posBuffer!: WebGLBuffer
  private sizeBuffer!: WebGLBuffer
  private rotationBuffer!: WebGLBuffer
  private colorBuffer!: WebGLBuffer
  private shapeIndexBuffer!: WebGLBuffer
  private atlasTexture!: WebGLTexture

  private uViewportSize: WebGLUniformLocation | null = null
  private uAtlas: WebGLUniformLocation | null = null
  private uHasAtlas: WebGLUniformLocation | null = null
  private uShapeCount: WebGLUniformLocation | null = null

  private uploadedAtlasVersion = -1
  private contextLost = false

  private posScratch = new Float32Array(0)
  private sizeScratch = new Float32Array(0)
  private colorScratch = new Float32Array(0)
  private shapeIndexScratch = new Float32Array(0)

  private readonly handleContextLost = (event: Event): void => {
    // Prevents the default (which would permanently forfeit restoration) and
    // tells the browser we intend to recover.
    event.preventDefault()
    this.contextLost = true
    this.callbacks.onContextLost?.()
  }

  private readonly handleContextRestored = (): void => {
    this.initializeGLResources()
    this.contextLost = false
    this.callbacks.onContextRestored?.()
  }

  constructor(canvas: HTMLCanvasElement, callbacks: WebGLRendererCallbacks = {}) {
    this.canvas = canvas
    this.callbacks = callbacks

    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, alpha: true })
    if (!gl) throw new Error('WebGL2 unavailable')
    this.gl = gl

    canvas.addEventListener('webglcontextlost', this.handleContextLost, false)
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false)

    this.initializeGLResources()
  }

  /** (Re)creates every GL resource against the current context. Called on construction and after a restore. */
  private initializeGLResources(): void {
    const gl = this.gl

    this.program = createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)
    gl.useProgram(this.program)

    this.quadBuffer = mustCreateBuffer(gl)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW)

    this.posBuffer = mustCreateBuffer(gl)
    this.sizeBuffer = mustCreateBuffer(gl)
    this.rotationBuffer = mustCreateBuffer(gl)
    this.colorBuffer = mustCreateBuffer(gl)
    this.shapeIndexBuffer = mustCreateBuffer(gl)

    const texture = gl.createTexture()
    if (!texture) throw new Error('WebGLRenderer: failed to create atlas texture')
    this.atlasTexture = texture
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)

    this.uViewportSize = gl.getUniformLocation(this.program, 'uViewportSize')
    this.uAtlas = gl.getUniformLocation(this.program, 'uAtlas')
    this.uHasAtlas = gl.getUniformLocation(this.program, 'uHasAtlas')
    this.uShapeCount = gl.getUniformLocation(this.program, 'uShapeCount')

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // The old GPU texture is gone even though the atlas canvas (plain JS/CPU
    // memory) survived the context loss untouched — force a re-upload next draw.
    this.uploadedAtlasVersion = -1
  }

  draw(buffer: CellBuffer, atlas: ShapeAtlas | null, options: RenderOptions): void {
    if (this.contextLost || this.gl.isContextLost()) return

    const gl = this.gl
    const { width, height, background } = options

    gl.viewport(0, 0, width, height)
    gl.clearColor(background.r / 255, background.g / 255, background.b / 255, background.a)
    gl.clear(gl.COLOR_BUFFER_BIT)

    if (!atlas) return

    const count = buffer.count
    this.ensureScratchSize(count)

    const cellWidth = width / buffer.cols
    const cellHeight = height / buffer.rows
    const baseSize = Math.min(cellWidth, cellHeight) * 0.9

    for (let i = 0; i < count; i++) {
      const isBlank = buffer.shapeIndex[i] === BLANK_SHAPE_INDEX

      this.posScratch[i * 2] = buffer.posX[i] * width
      this.posScratch[i * 2 + 1] = buffer.posY[i] * height
      // A zero-size instance is a degenerate (invisible) quad — cheaper than
      // branching per-instance inside the single instanced draw call below.
      this.sizeScratch[i] = isBlank ? 0 : baseSize * buffer.scale[i]

      this.colorScratch[i * 4] = buffer.colorR[i] / 255
      this.colorScratch[i * 4 + 1] = buffer.colorG[i] / 255
      this.colorScratch[i * 4 + 2] = buffer.colorB[i] / 255
      this.colorScratch[i * 4 + 3] = buffer.colorA[i] / 255

      this.shapeIndexScratch[i] = isBlank ? 0 : Math.min(buffer.shapeIndex[i], atlas.count - 1)
    }

    gl.useProgram(this.program)
    gl.uniform2f(this.uViewportSize, width, height)
    gl.uniform1i(this.uHasAtlas, 1)
    gl.uniform1f(this.uShapeCount, atlas.count)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture)
    if (this.uploadedAtlasVersion !== atlas.version) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas as TexImageSource)
      this.uploadedAtlasVersion = atlas.version
    }
    gl.uniform1i(this.uAtlas, 0)

    // Static, non-instanced base quad geometry (divisor 0).
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.enableVertexAttribArray(ATTR_QUAD_POS)
    gl.vertexAttribPointer(ATTR_QUAD_POS, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(ATTR_QUAD_POS, 0)

    this.uploadInstanced(ATTR_INSTANCE_POS, this.posBuffer, this.posScratch, count, 2)
    this.uploadInstanced(ATTR_INSTANCE_SIZE, this.sizeBuffer, this.sizeScratch, count, 1)
    this.uploadInstanced(ATTR_INSTANCE_ROTATION, this.rotationBuffer, buffer.rotation, count, 1)
    this.uploadInstanced(ATTR_INSTANCE_COLOR, this.colorBuffer, this.colorScratch, count, 4)
    this.uploadInstanced(ATTR_INSTANCE_SHAPE_INDEX, this.shapeIndexBuffer, this.shapeIndexScratch, count, 1)

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)
  }

  private ensureScratchSize(count: number): void {
    if (this.posScratch.length === count * 2) return
    this.posScratch = new Float32Array(count * 2)
    this.sizeScratch = new Float32Array(count)
    this.colorScratch = new Float32Array(count * 4)
    this.shapeIndexScratch = new Float32Array(count)
  }

  private uploadInstanced(
    location: number,
    glBuffer: WebGLBuffer,
    data: Float32Array,
    count: number,
    componentsPerInstance: number,
  ): void {
    const gl = this.gl
    const view = data.length === count * componentsPerInstance ? data : data.subarray(0, count * componentsPerInstance)
    gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, view, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, componentsPerInstance, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(location, 1)
  }

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored)

    const gl = this.gl
    if (gl.isContextLost()) return
    gl.deleteBuffer(this.quadBuffer)
    gl.deleteBuffer(this.posBuffer)
    gl.deleteBuffer(this.sizeBuffer)
    gl.deleteBuffer(this.rotationBuffer)
    gl.deleteBuffer(this.colorBuffer)
    gl.deleteBuffer(this.shapeIndexBuffer)
    gl.deleteTexture(this.atlasTexture)
    gl.deleteProgram(this.program)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

function mustCreateBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
  const buffer = gl.createBuffer()
  if (!buffer) throw new Error('WebGLRenderer: failed to create buffer')
  return buffer
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('WebGLRenderer: failed to create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`WebGLRenderer: shader compile failed: ${log}`)
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (!program) throw new Error('WebGLRenderer: failed to create program')
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`WebGLRenderer: program link failed: ${log}`)
  }
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)
  return program
}
