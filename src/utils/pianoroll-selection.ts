import type { AppNote } from '@/core/schemas/note.schema'
import { STEPS_PER_BAR } from '@/core/schemas/project.schema'

export function getFullySelectedBars(
  notes: readonly AppNote[],
  selectedNoteIds: readonly string[],
  stepsPerBar = STEPS_PER_BAR
): Set<number> {
  const selectedIds = new Set(selectedNoteIds)
  const populatedBars = new Set<number>()
  const unselectedBars = new Set<number>()
  for (const note of notes) {
    const bar = Math.floor(note.step / stepsPerBar)
    populatedBars.add(bar)
    if (!selectedIds.has(note.id)) unselectedBars.add(bar)
  }
  return new Set([...populatedBars].filter((bar) => !unselectedBars.has(bar)))
}
