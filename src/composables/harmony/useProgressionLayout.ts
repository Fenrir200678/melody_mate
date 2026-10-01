import { computed } from 'vue'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import { useHarmonyStore } from '@/stores/harmony.store'
import { useProjectStore } from '@/stores/project.store'
import { calculateProgressionBars, calculateTrackBars, progressionEndBar } from './timelineOps'

/**
 * Progression extents derived from the harmony store: how much lane the timeline needs,
 * how long the progression actually is, and where the next appended chord would land.
 */
export function useProgressionLayout() {
  const harmonyStore = useHarmonyStore()
  const projectStore = useProjectStore()

  const chords = computed<readonly ChordEvent[]>(() => harmonyStore.chords)
  const endBar = computed(() => progressionEndBar(chords.value))
  const totalTrackBars = computed(() => calculateTrackBars(projectStore.bars, chords.value))
  const totalBars = computed(() => calculateProgressionBars(projectStore.bars, chords.value))

  /** Grows the arrangement so it always covers the full progression after a chord was added. */
  function syncProjectBars(): void {
    if (totalBars.value > projectStore.bars) {
      projectStore.setBars(totalBars.value)
    }
  }

  return { chords, endBar, totalTrackBars, totalBars, syncProjectBars }
}
