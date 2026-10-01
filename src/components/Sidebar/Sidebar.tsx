import { ExportBar } from '../ExportBar/ExportBar'
import { ColorPanel } from './ColorPanel'
import { DefaultActions } from './DefaultActions'
import { FiltersPanel } from './FiltersPanel'
import { GridPanel } from './GridPanel'
import { NoisePanel } from './NoisePanel'
import { OutputSizePanel } from './OutputSizePanel'
import { ShapesPanel } from './ShapesPanel'
import { SourcePanel } from './SourcePanel'

const DIVIDER = <hr className="border-neutral-800" />

/**
 * SOURCE and SHAPES sit at the very top (the two things you need before
 * anything else renders meaningfully). Export + the default-state actions
 * are pinned in a non-scrolling footer, per the explicit "always
 * accessible, never pushed off-screen" requirement — everything else lives
 * in the scrollable middle section. Undo/Redo lives as a pill overlay on
 * the viewport itself (see UndoRedoOverlay), not in this scroll list.
 */
export function Sidebar() {
  return (
    <aside className="flex w-80 shrink-0 flex-col rounded-lg border border-neutral-800 bg-neutral-900">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <SourcePanel />
        {DIVIDER}
        <ShapesPanel />
        {DIVIDER}
        <OutputSizePanel />
        {DIVIDER}
        <ColorPanel />
        {DIVIDER}
        <GridPanel />
        {DIVIDER}
        <FiltersPanel />
        {DIVIDER}
        <NoisePanel />
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-800 p-4">
        <DefaultActions />
        {DIVIDER}
        <ExportBar />
      </div>
    </aside>
  )
}
