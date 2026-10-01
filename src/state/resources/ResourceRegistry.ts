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
