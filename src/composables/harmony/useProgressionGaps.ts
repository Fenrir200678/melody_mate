import { computed } from 'vue'
import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
import { findProgressionGaps, type ProgressionGap } from '@/core/theory/progression-gaps'
import type { ChordMode } from '@/core/theory/chord.engine'
import { useHarmonyStore } from '@/stores/harmony.store'
import { useChordInsertion } from './useChordInsertion'

export function useProgressionGaps(options: { paletteDegree: () => number | null; chordMode: () => ChordMode }) {
  const harmonyStore = useHarmonyStore()
  const { insertChordAt } = useChordInsertion()
  const gaps = computed(() => findProgressionGaps(harmonyStore.chords))
  const insertionChord = computed(
    () =>
      harmonyStore.diatonicPalette.find((chord) => chord.degree === options.paletteDegree()) ??
      harmonyStore.diatonicPalette[0] ??
      null
  )

  function insert(startBar: number, durationBars: number) {
    if (!insertionChord.value) return null
    return insertChordAt(insertionChord.value, options.chordMode(), startBar, durationBars, { preserveExisting: true })
  }

  function fillGap(gap: ProgressionGap) {
    const current = gaps.value.find(
      (candidate) =>
        candidate.id === gap.id && candidate.startBar === gap.startBar && candidate.durationBars === gap.durationBars
    )
    return current ? insert(current.startBar, current.durationBars) : null
  }

  function insertInEmptyBar(positionBar: number) {
    if (!Number.isFinite(positionBar) || positionBar < 0) return null
    const startBar = Math.floor(positionBar)
    const chords = harmonyStore.chords
    if (
      chords.some(
        (chord) =>
          (startBar >= chord.startBar && startBar < chord.startBar + chord.durationBars) ||
          (positionBar >= chord.startBar && positionBar < chord.startBar + chord.durationBars)
      )
    ) {
      return null
    }
    const nextStart = Math.min(...chords.filter((chord) => chord.startBar > startBar).map((chord) => chord.startBar))
    const durationBars = Math.min(harmonyStore.defaultChordDuration, nextStart - startBar)
    if (durationBars < 1 / STEPS_PER_BAR) return null
    return insert(startBar, durationBars)
  }

  return { gaps, insertionChord, fillGap, insertInEmptyBar }
}
