import type { HistoryCommand, Patch, Path } from './commands'
import { invertPatches, pathsEqual } from './commands'

export interface HistoryManagerOptions {
  /** Applies a patch set's `next` values to the external state container. */
  applyPatches: (patches: Patch[]) => void
  debounceMs?: number
  maxEntries?: number
}

export interface RecordOptions {
  label?: string
  /** Flush immediately instead of waiting for the idle debounce (e.g. pointerup). */
  immediate?: boolean
}

const DEFAULT_LABEL = 'Edit'

/**
 * Command-pattern undo/redo over minimal leaf-level patches rather than
 * full-state snapshots. A live slider drag updates the store on every tick
 * for instant feedback, but patches for the same path are merged into one
 * pending entry and only pushed to the undo stack on commit (drag-end or
 * an idle debounce) — so a single drag never produces dozens of history
 * entries.
 */
export class HistoryManager {
  private undoStack: HistoryCommand[] = []
  private redoStack: HistoryCommand[] = []
  private pending: Patch[] = []
  private pendingLabel: string = DEFAULT_LABEL
  private pendingTimer: ReturnType<typeof setTimeout> | null = null

  private readonly applyPatches: (patches: Patch[]) => void
  private readonly debounceMs: number
  private readonly maxEntries: number

  constructor(options: HistoryManagerOptions) {
    this.applyPatches = options.applyPatches
    this.debounceMs = options.debounceMs ?? 400
    this.maxEntries = options.maxEntries ?? 50
  }

  record(path: Path, prev: unknown, next: unknown, options: RecordOptions = {}): void {
    if (Object.is(prev, next)) return

    const existing = this.pending.find((patch) => pathsEqual(patch.path, path))
    if (existing) {
      existing.next = next
    } else {
      this.pending.push({ path, prev, next })
    }
    this.pendingLabel = options.label ?? this.pendingLabel

    // Any new edit invalidates the redo stack.
    this.redoStack = []

    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer)
      this.pendingTimer = null
    }

    if (options.immediate) {
      this.flush()
    } else {
      this.pendingTimer = setTimeout(() => this.flush(), this.debounceMs)
    }
  }

  /** Commits any pending patches as one history entry right now. */
  flush(label?: string): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer)
      this.pendingTimer = null
    }
    if (this.pending.length === 0) return

    const command: HistoryCommand = {
      label: label ?? this.pendingLabel,
      patches: this.pending,
      timestamp: Date.now(),
    }
    this.pending = []
    this.pendingLabel = DEFAULT_LABEL

    this.undoStack.push(command)
    if (this.undoStack.length > this.maxEntries) {
      this.undoStack.shift()
    }
  }

  undo(): void {
    this.flush()
    const command = this.undoStack.pop()
    if (!command) return
    this.applyPatches(invertPatches(command.patches))
    this.redoStack.push(command)
  }

  redo(): void {
    const command = this.redoStack.pop()
    if (!command) return
    this.applyPatches(command.patches)
    this.undoStack.push(command)
  }

  canUndo(): boolean {
    return this.undoStack.length > 0 || this.pending.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  reset(): void {
    if (this.pendingTimer) clearTimeout(this.pendingTimer)
    this.pendingTimer = null
    this.undoStack = []
    this.redoStack = []
    this.pending = []
    this.pendingLabel = DEFAULT_LABEL
  }
}
