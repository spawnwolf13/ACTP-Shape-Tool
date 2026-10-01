export type PathSegment = string | number
export type Path = PathSegment[]

export interface Patch {
  path: Path
  prev: unknown
  next: unknown
}

export interface HistoryCommand {
  label: string
  patches: Patch[]
  timestamp: number
}

export function pathsEqual(a: Path, b: Path): boolean {
  return a.length === b.length && a.every((segment, index) => segment === b[index])
}

/** Produces the inverse patch set, in reverse application order. */
export function invertPatches(patches: Patch[]): Patch[] {
  return patches
    .map((patch) => ({ path: patch.path, prev: patch.next, next: patch.prev }))
    .reverse()
}
