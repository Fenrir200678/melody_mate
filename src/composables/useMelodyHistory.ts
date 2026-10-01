import { ref, type Ref } from 'vue'
import type { AppNote } from '@/core/schemas/note.schema'
import type { TakeSnapshot } from '@/core/schemas/take.schema'
import { copyNotes, takeScope } from '@/core/takes/scope'
import { replaceNotesInWorkRange } from '@/core/generator/work-range'
import { useHistory } from './useHistory'

interface Comparison {
  takeId: string
  alternateNotes: AppNote[]
}

interface MelodyState {
  notes: AppNote[]
  comparison: Comparison | null
}

export function useMelodyHistory(notes: Ref<AppNote[]>) {
  const comparison = ref<Comparison | null>(null)
  const history = useHistory<MelodyState>({ maxDepth: 50 })
  const snapshot = (): MelodyState => ({ notes: notes.value, comparison: comparison.value })

  function record(resetComparison = true): void {
    history.pushState(snapshot())
    if (resetComparison) comparison.value = null
  }

  function restore(state: MelodyState | undefined): boolean {
    if (!state) return false
    notes.value = state.notes
    comparison.value = state.comparison
    return true
  }

  function swap(take: TakeSnapshot): void {
    const previous = copyNotes(notes.value)
    const scope = takeScope(take.context)
    const next =
      comparison.value?.takeId === take.id
        ? copyNotes(comparison.value.alternateNotes)
        : replaceNotesInWorkRange(notes.value, copyNotes(take.notes), scope)
    record(false)
    notes.value = next
    // Keep complete sides so notes crossing a scope boundary survive the return swap exactly.
    comparison.value = { takeId: take.id, alternateNotes: previous }
  }

  return {
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    record,
    resetComparison: () => {
      comparison.value = null
    },
    swap,
    undo: () => restore(history.undo(snapshot())),
    redo: () => restore(history.redo(snapshot()))
  }
}
