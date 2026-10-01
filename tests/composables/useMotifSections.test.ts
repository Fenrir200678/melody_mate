import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useMotifSections } from '../../src/composables/useMotifSections'
import { useMelodyStore } from '../../src/stores/melody.store'
import { useProjectStore } from '../../src/stores/project.store'

describe('useMotifSections', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does not show section badges for FREE', () => {
    const melodyStore = useMelodyStore()
    melodyStore.setGeneratorParams({ motif: 'FREE' })

    expect(useMotifSections().sectionLetters.value).toEqual([])
  })

  it('does not show section badges while Call & Response is active', () => {
    const melodyStore = useMelodyStore()
    melodyStore.setGeneratorParams({ callAndResponse: true })

    expect(useMotifSections().sectionLetters.value).toEqual([])
  })

  it.each([
    [4, ['A', 'B', 'A', 'B']],
    [8, ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B']]
  ])('tiles the motif across %i bars', (bars, expectedLetters) => {
    useProjectStore().setBars(bars)
    useMelodyStore().setGeneratorParams({ motif: 'ABAB' })
    const { sectionLetters } = useMotifSections()

    expect(sectionLetters.value).toEqual(expectedLetters)
  })

  it('tiles motif pattern consistently across all project bars', () => {
    const projectStore = useProjectStore()
    const melodyStore = useMelodyStore()
    projectStore.setBars(8)
    melodyStore.setGeneratorParams({ motif: 'ABAC' })

    expect(useMotifSections().sectionLetters.value).toEqual(['A', 'B', 'A', 'C', 'A', 'B', 'A', 'C'])
  })

  it('reacts to motif and Call & Response changes', () => {
    const projectStore = useProjectStore()
    const melodyStore = useMelodyStore()
    projectStore.setBars(4)
    melodyStore.setGeneratorParams({ motif: 'ABAC' })
    const { sectionLetters } = useMotifSections()

    expect(sectionLetters.value).toEqual(['A', 'B', 'A', 'C'])

    melodyStore.setGeneratorParams({ callAndResponse: true })
    expect(sectionLetters.value).toEqual([])

    melodyStore.setGeneratorParams({ callAndResponse: false })
    expect(sectionLetters.value).toEqual(['A', 'B', 'A', 'C'])
  })

  it('selects the corresponding bar work range on section click and toggles back on second click', () => {
    const projectStore = useProjectStore()
    const melodyStore = useMelodyStore()
    projectStore.setBars(4)
    melodyStore.setSelectedNoteIds(['some-note'])
    const { selectSection } = useMotifSections()

    selectSection(1) // Bar 2 (steps 16-32)
    expect(projectStore.workRange).toEqual({ startStep: 16, endStep: 64 / 2 })
    expect(melodyStore.selectedNoteIds).toEqual([])

    selectSection(1) // Second click toggles back to entire project
    expect(projectStore.workRange).toEqual({ startStep: 0, endStep: 64 })
  })
})
