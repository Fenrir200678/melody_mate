import { computed, toRaw } from 'vue'
import { catchinessLabel, catchinessScore, computeMelodyMetrics } from '@/core/analysis'
import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
import { useHarmonyStore } from '@/stores/harmony.store'
import { useMelodyStore } from '@/stores/melody.store'
import { useProjectStore } from '@/stores/project.store'

export function useMelodyAnalysis() {
  const melody = useMelodyStore()
  const harmony = useHarmonyStore()
  const project = useProjectStore()

  return computed(() => {
    // Immutable array references are the dependencies; metric traversal must not track every note field.
    const notes = toRaw(melody.notes)
    const chords = harmony.useChords ? toRaw(harmony.chords) : undefined
    const params = toRaw(melody.generatorParams)
    const context = {
      key: project.key,
      scale: project.scale,
      bars: project.bars,
      stepsPerBar: STEPS_PER_BAR,
      snapStep: 1,
      minOctave: params.minOctave,
      maxOctave: params.maxOctave,
      chords
    }
    if (
      !notes.some(
        (note) =>
          !note.isMuted && Number.isFinite(note.step) && note.step >= 0 && note.step < context.bars * STEPS_PER_BAR
      )
    )
      return null
    const metrics = computeMelodyMetrics(notes, context)
    const score = catchinessScore(metrics)
    return { metrics, score, label: catchinessLabel(score) }
  })
}
