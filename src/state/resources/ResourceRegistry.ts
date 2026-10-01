export type ResourceId = string

/**
 * Keeps non-serializable runtime resources (video elements, ImageBitmaps,
 * decoded SVG markup, GPU textures) out of the Zustand store entirely.
 * The store only ever holds the ResourceId string, which is what makes
 * undo/redo patches cheap and state snapshots safe to clone.
 */
class ResourceRegistry {
  private resources = new Map<ResourceId, unknown>()

  register<T>(value: T): ResourceId {
    const id = crypto.randomUUID()
    this.resources.set(id, value)
    return id
  }

  get<T>(id: ResourceId | null | undefined): T | undefined {
    if (!id) return undefined
    return this.resources.get(id) as T | undefined
  }

  replace<T>(id: ResourceId, value: T): void {
    this.resources.set(id, value)
  }

  has(id: ResourceId): boolean {
    return this.resources.has(id)
  }

  release(id: ResourceId | null | undefined): void {
    if (!id) return
    this.resources.delete(id)
  }
}

export const resourceRegistry = new ResourceRegistry()

/**
 * Releases a media resource (image or video element) from the registry,
 * explicitly stopping any live MediaStream tracks first — required so the
 * OS camera/mic indicator reliably turns off when switching away from a
 * webcam source or replacing it, not just when the tab closes.
 */
export function releaseMediaResource(id: ResourceId | null | undefined): void {
  if (!id) return
  const element = resourceRegistry.get<HTMLVideoElement | HTMLImageElement>(id)
  if (element instanceof HTMLVideoElement) {
    const stream = element.srcObject as MediaStream | null
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      element.srcObject = null
    }
    element.pause()
    element.removeAttribute('src')
    element.load()
  }
  resourceRegistry.release(id)
}
