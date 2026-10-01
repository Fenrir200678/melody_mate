import { computed, type ComputedRef } from 'vue'
import { resolveMotifSections } from '@/core/generator/motif-sections'
import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
import { useMelodyStore } from '@/stores/melody.store'
import { useProjectStore } from '@/stores/project.store'

export function useMotifSections(): {
  sectionLetters: ComputedRef<string[]>
  selectSection: (bar: number) => void
} {
  const melodyStore = useMelodyStore()
  const projectStore = useProjectStore()

  const sectionLetters = computed(() => {
    const { motif, callAndResponse } = melodyStore.generatorParams
    if (motif === 'FREE' || callAndResponse) return []

    const letters = Array<string>(projectStore.bars).fill('')
    for (const section of resolveMotifSections(motif, projectStore.bars, STEPS_PER_BAR, 0)) {
      if (section.bar < projectStore.bars) {
        letters[section.bar] = section.letter
      }
    }
    return letters
  })

  function selectSection(bar: number): void {
    const startStep = bar * STEPS_PER_BAR
    const endStep = startStep + STEPS_PER_BAR
    melodyStore.clearSelection()

    if (projectStore.workRange.startStep === startStep && projectStore.workRange.endStep === endStep) {
      projectStore.selectEntireProject()
    } else {
      projectStore.setWorkRange({ startStep, endStep })
    }
  }

  return { sectionLetters, selectSection }
}
