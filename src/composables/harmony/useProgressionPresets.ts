import { computed, ref } from 'vue'
import {
  getProgressionRoman,
  pickRandomProgressionId,
  PREDEFINED_PROGRESSIONS,
  type PredefinedProgression,
  type ProgressionCategory
} from '@/core/theory/progressions'
import { useHarmonyStore } from '@/stores/harmony.store'
import { useUiStore } from '@/stores/ui.store'

export type ProgressionCategoryFilter = 'all' | ProgressionCategory

export const PROGRESSION_CATEGORIES: readonly { label: string; value: ProgressionCategoryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pop', value: 'pop' },
  { label: 'EDM', value: 'electronic' },
  { label: 'Dark', value: 'dark' },
  { label: 'Jazz', value: 'jazz-soul' },
  { label: 'Rock', value: 'rock' }
]

export function filterProgressions(filter: ProgressionCategoryFilter): readonly PredefinedProgression[] {
  if (filter === 'all') {
    return PREDEFINED_PROGRESSIONS
  }
  return PREDEFINED_PROGRESSIONS.filter((prog) => prog.category === filter)
}

/** Long turnaround-heavy progressions get an ellipsis so the preset name keeps its room. */
export function formatRoman(roman: readonly string[]): string {
  if (roman.length <= 4) {
    return roman.join('–')
  }
  return `${roman.slice(0, 3).join('–')} +${roman.length - 3}`
}

export function describeProgression(prog: PredefinedProgression): string {
  const headline = `${prog.name} — ${getProgressionRoman(prog).join(' – ')}`
  const facts = `${prog.chords.length} chords · ${prog.bars} bars · ${prog.scale} scale · ${prog.subgenre ?? prog.category}`
  const lines = [headline, facts]
  if (prog.description) {
    lines.push(prog.description)
  }
  return lines.join('\n')
}

export { getProgressionRoman }

/** Category filtering plus prev/next/dice cycling, shared by the dock popover and the sidebar list. */
export function useProgressionPresets() {
  const harmonyStore = useHarmonyStore()
  const uiStore = useUiStore()

  const categoryFilter = ref<ProgressionCategoryFilter>('all')
  const filteredProgressions = computed(() => filterProgressions(categoryFilter.value))

  /** The steppers cycle within the active filter, so the index is filter-relative. */
  const currentIndex = computed(() =>
    filteredProgressions.value.findIndex((p) => p.id === harmonyStore.selectedProgressionId)
  )

  const currentProgression = computed<PredefinedProgression | undefined>(() => {
    if (currentIndex.value >= 0) {
      return filteredProgressions.value[currentIndex.value]
    }
    return PREDEFINED_PROGRESSIONS.find((p) => p.id === harmonyStore.selectedProgressionId)
  })

  function selectProgression(id: string): void {
    // Popover content is teleported to <body>, so the dock root pointerdown never sees it.
    uiStore.setActiveTrack('chords')
    harmonyStore.loadPredefinedProgression(id)
  }

  function selectPrev(): void {
    const list = filteredProgressions.value
    if (list.length === 0) return
    const nextIdx = currentIndex.value <= 0 ? list.length - 1 : currentIndex.value - 1
    selectProgression(list[nextIdx].id)
  }

  function selectNext(): void {
    const list = filteredProgressions.value
    if (list.length === 0) return
    const nextIdx = currentIndex.value >= list.length - 1 ? 0 : currentIndex.value + 1
    selectProgression(list[nextIdx].id)
  }

  function pickRandom(): void {
    const picked = pickRandomProgressionId(filteredProgressions.value)
    if (picked) {
      selectProgression(picked)
    }
  }

  return {
    categoryFilter,
    filteredProgressions,
    currentIndex,
    currentProgression,
    selectProgression,
    selectPrev,
    selectNext,
    pickRandom
  }
}
