import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ChordEvent } from '../../src/core/schemas/chord.schema'
import { useHarmonyStore } from '../../src/stores/harmony.store'

function chord(id: string, startBar: number, durationBars: number): ChordEvent {
  return {
    id,
    name: id,
    roman: 'I',
    notes: ['C', 'E', 'G'],
    voicing: ['C3', 'E3', 'G3'],
    startBar,
    durationBars
  }
}

describe('harmony progression gap closing', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('closes gaps as one undoable edit while retaining chord selection', () => {
    const store = useHarmonyStore()
    const first = chord('first', 1, 0.5)
    const second = chord('second', 3, 1)
    store.setChords([first, second], false)
    store.selectChord(second.id)
    store.setSelectedChordNoteIds([`${second.id}:1`])

    store.closeProgressionGaps()

    expect(store.chords.map(({ startBar }) => startBar)).toEqual([0, 0.5])
    expect(store.selectedChordId).toBe(second.id)
    expect(store.selectedChordNoteIds).toEqual([`${second.id}:1`])
    expect(store.canUndo).toBe(true)

    store.undo()
    expect(store.chords).toEqual([first, second])
    expect(store.selectedChordId).toBe(second.id)
    store.redo()
    expect(store.chords.map(({ startBar }) => startBar)).toEqual([0, 0.5])
  })

  it('does not add history or clear redo when no qualifying gaps exist', () => {
    const store = useHarmonyStore()
    store.setChords([chord('first', 0, 1), chord('second', 1, 1)], false)
    store.moveChordToPosition('second', 2)
    store.undo()

    store.closeProgressionGaps()

    expect(store.chords.map(({ startBar }) => startBar)).toEqual([0, 1])
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(true)
  })
})
