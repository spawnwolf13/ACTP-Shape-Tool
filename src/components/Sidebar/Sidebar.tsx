import { ColorPanel } from './ColorPanel'
import { FiltersPanel } from './FiltersPanel'
import { GridPanel } from './GridPanel'
import { HistoryPanel } from './HistoryPanel'
import { NoisePanel } from './NoisePanel'
import { PresetSelector } from './PresetSelector'

const DIVIDER = <hr className="border-neutral-800" />

export function Sidebar() {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <PresetSelector />
      {DIVIDER}
      <HistoryPanel />
      {DIVIDER}
      <GridPanel />
      {DIVIDER}
      <ColorPanel />
      {DIVIDER}
      <FiltersPanel />
      {DIVIDER}
      <NoisePanel />
    </aside>
  )
}
