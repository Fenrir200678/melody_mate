import { createPinia, setActivePinia } from 'pinia'
import { ref, type Ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChordInsertion } from '../../src/composables/harmony/useChordInsertion'
import { useProgressionGaps } from '../../src/composables/harmony/useProgressionGaps'
import type { ChordEvent } from '../../src/core/schemas/chord.schema'
import type { ChordMode } from '../../src/core/theory/chord.engine'
import { DEFAULT_PROJECT_SETTINGS } from '../../src/config/defaults'
import { useAudioStore } from '../../src/stores/audio.store'
import { useHarmonyStore } from '../../src/stores/harmony.store'
import { useProjectStore } from '../../src/stores/project.store'

function chord(id: string, startBar: number, durationBars: number, name = id): ChordEvent {
  return {
    id,
    name,
    roman: 'I',
    notes: ['C', 'E', 'G'],
    voicing: ['C3', 'E3', 'G3'],
    startBar,
    durationBars,
    inversion: 0
  }
}

describe('useProgressionGaps', () => {
  let harmonyStore: ReturnType<typeof useHarmonyStore>
  let projectStore: ReturnType<typeof useProjectStore>
  let paletteDegree: Ref<number | null>
  let mode: Ref<ChordMode>
  let gaps: ReturnType<typeof useProgressionGaps>

  beforeEach(() => {
    setActivePinia(createPinia())
    harmonyStore = useHarmonyStore()
    projectStore = useProjectStore()
    const audioStore = useAudioStore()
    vi.spyOn(audioStore, 'auditionChord').mockResolvedValue(undefined)
    paletteDegree = ref<number | null>(1)
    mode = ref<ChordMode>('triad')
    gaps = useProgressionGaps({ paletteDegree: () => paletteDegree.value, chordMode: () => mode.value })
  })

  it('passes an exact duration override and uses the global duration when omitted', () => {
    const { insertChordAt } = useChordInsertion()
    harmonyStore.setDefaultChordDuration(2)
    const tonic = harmonyStore.diatonicPalette[0]

    const exact = insertChordAt(tonic, 'triad', 0, 0.5)
    const defaulted = insertChordAt(tonic, 'triad', 3)

    expect(exact.durationBars).toBe(0.5)
    expect(defaulted.durationBars).toBe(harmonyStore.defaultChordDuration)
  })

  it('inserts into the first available gap or appends at the end via insertInNextFreeSlot', () => {
    const { insertInNextFreeSlot } = useChordInsertion()
    harmonyStore.setDefaultChordDuration(1)
    const tonic = harmonyStore.diatonicPalette[0]
    const dominant = harmonyStore.diatonicPalette[4]

    // 1. Empty timeline: inserts at bar 0
    const first = insertInNextFreeSlot(tonic, 'triad')
    expect(first.startBar).toBe(0)
    expect(first.durationBars).toBe(1)

    // 2. Add chord at bar 2, creating a gap at bar 1
    harmonyStore.chords = [chord('c-0', 0, 1), chord('c-2', 2, 1)]
    const filled = insertInNextFreeSlot(dominant, 'triad')
    expect(filled.startBar).toBe(1)
    expect(filled.durationBars).toBe(1)

    // 3. Contiguous timeline: appends at the end
    harmonyStore.chords = [chord('c-0', 0, 1), chord('c-1', 1, 1), chord('c-2', 2, 1)]
    const appended = insertInNextFreeSlot(tonic, 'triad')
    expect(appended.startBar).toBe(3)
  })

  it('updates gaps after resize, move and undo without recreating the composable', () => {
    harmonyStore.chords = [chord('left', 0, 0.5), chord('right', 2, 1)]
    expect(gaps.gaps.value).toEqual([{ id: 'gap-left-right', startBar: 0.5, durationBars: 1.5 }])

    harmonyStore.resizeChord('left', 1)
    expect(gaps.gaps.value).toEqual([{ id: 'gap-left-right', startBar: 1, durationBars: 1 }])

    harmonyStore.moveChordInTime('right', 1)
    expect(gaps.gaps.value).toEqual([{ id: 'gap-left-right', startBar: 1, durationBars: 2 }])

    harmonyStore.undo()
    expect(gaps.gaps.value).toEqual([{ id: 'gap-left-right', startBar: 1, durationBars: 1 }])
  })

  it('uses the selected palette degree and seventh mode, with tonic fallback in the active scale', () => {
    projectStore.setKey('D')
    projectStore.setScale('major')
    expect(gaps.insertionChord.value?.degree).toBe(1)
    paletteDegree.value = 5
    expect(gaps.insertionChord.value?.degree).toBe(5)
    mode.value = 'seventh'
    harmonyStore.chords = [chord('left', 0, 0.5), chord('right', 1, 1)]

    const selected = gaps.fillGap(gaps.gaps.value[0])
    expect(selected?.name).toBe(harmonyStore.diatonicPalette[4].seventhName)
    expect(selected?.roman).toBe(harmonyStore.diatonicPalette[4].romanSeventh)
    expect(selected?.notes).toEqual(harmonyStore.diatonicPalette[4].seventhNotes)

    harmonyStore.chords = [chord('left-2', 0, 0.5), chord('right-2', 1, 1)]
    paletteDegree.value = null
    expect(gaps.insertionChord.value?.degree).toBe(1)
    projectStore.setKey('A')
    projectStore.setScale('minor')
    const fallback = gaps.fillGap(gaps.gaps.value[0])

    expect(fallback?.name).toBe(harmonyStore.diatonicPalette[0].seventhName)
    expect(fallback?.roman).toBe(harmonyStore.diatonicPalette[0].romanSeventh)
    expect(fallback?.notes).toEqual(harmonyStore.diatonicPalette[0].seventhNotes)
  })

  it('fills with one undoable action, retains the inserted ID on redo, and preserves neighbors with auto-smooth enabled', () => {
    harmonyStore.setAutoSmooth(true)
    harmonyStore.setDefaultChordDuration(2)
    paletteDegree.value = 4
    harmonyStore.chords = [
      chord('left', 0, 0.5, 'C'),
      {
        ...chord('right', 1, 1, 'G'),
        notes: ['G', 'B', 'D'],
        voicing: ['G4', 'B4', 'D5']
      }
    ]
    const before = JSON.parse(JSON.stringify(harmonyStore.chords)) as ChordEvent[]

    const inserted = gaps.fillGap(gaps.gaps.value[0])!
    const afterFill = JSON.parse(JSON.stringify(harmonyStore.chords)) as ChordEvent[]
    expect(inserted.durationBars).toBe(0.5)
    expect(gaps.gaps.value).toEqual([])
    expect(harmonyStore.selectedChordId).toBe(inserted.id)
    expect(useAudioStore().auditionChord).toHaveBeenCalledExactlyOnceWith(inserted.voicing)
    expect(afterFill.find(({ id }) => id === 'left')).toEqual(before[0])
    expect(afterFill.find(({ id }) => id === 'right')).toEqual(before[1])

    harmonyStore.undo()
    expect(harmonyStore.chords).toEqual(before)
    expect(gaps.gaps.value).toHaveLength(1)
    expect(harmonyStore.canUndo).toBe(false)
    expect(harmonyStore.canRedo).toBe(true)

    harmonyStore.redo()
    expect(harmonyStore.chords).toEqual(afterFill)
    expect(gaps.gaps.value).toEqual([])
    expect(harmonyStore.chords.find(({ startBar }) => startBar === 0.5)?.id).toBe(inserted.id)
    expect(harmonyStore.chords.find(({ id }) => id === 'left')).toEqual(before[0])
    expect(harmonyStore.chords.find(({ id }) => id === 'right')).toEqual(before[1])
  })

  it('ignores stale and repeated gap fills', () => {
    harmonyStore.chords = [chord('left', 0, 0.5), chord('right', 1, 1)]
    const staleGap = gaps.gaps.value[0]

    expect(gaps.fillGap(staleGap)).not.toBeNull()
    const afterFirstFill = JSON.parse(JSON.stringify(harmonyStore.chords)) as ChordEvent[]
    expect(gaps.fillGap(staleGap)).toBeNull()
    expect(gaps.fillGap(staleGap)).toBeNull()
    expect(harmonyStore.chords).toEqual(afterFirstFill)
  })

  it('floors empty positions, clips to the next chord, and rejects occupied or too-short snapped bars', () => {
    harmonyStore.setDefaultChordDuration(2)
    harmonyStore.chords = [chord('next', 1.5, 1)]

    const flooredAndClipped = gaps.insertInEmptyBar(1.25)
    expect(flooredAndClipped?.startBar).toBe(1)
    expect(flooredAndClipped?.durationBars).toBe(0.5)

    harmonyStore.chords = [chord('occupied', 1.5, 1)]
    expect(gaps.insertInEmptyBar(1.75)).toBeNull()
    expect(harmonyStore.chords).toHaveLength(1)

    harmonyStore.chords = [chord('earlier', 1, 0.5)]
    expect(gaps.insertInEmptyBar(1.75)).toBeNull()
    expect(harmonyStore.chords).toHaveLength(1)

    harmonyStore.chords = [chord('too-close', 1.03125, 0.25)]
    expect(gaps.insertInEmptyBar(1)).toBeNull()
    expect(harmonyStore.chords).toHaveLength(1)
  })

  it('grows the project when an empty-bar insertion extends beyond its current length', () => {
    projectStore.setBars(DEFAULT_PROJECT_SETTINGS.bars)
    harmonyStore.setDefaultChordDuration(2)

    const inserted = gaps.insertInEmptyBar(DEFAULT_PROJECT_SETTINGS.bars + 1.75)

    expect(inserted?.startBar).toBe(DEFAULT_PROJECT_SETTINGS.bars + 1)
    expect(inserted?.durationBars).toBe(harmonyStore.defaultChordDuration)
    expect(projectStore.bars).toBe(DEFAULT_PROJECT_SETTINGS.bars + 3)
  })
})
