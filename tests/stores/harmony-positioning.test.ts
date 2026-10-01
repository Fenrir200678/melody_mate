import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChordEvent } from '../../src/core/schemas/chord.schema'
import { useHarmonyStore } from '../../src/stores/harmony.store'
import { useAudioStore } from '../../src/stores/audio.store'

const source: ChordEvent = {
  id: 'source',
  name: 'C',
  roman: 'I',
  notes: ['C', 'E', 'G'],
  voicing: ['C3', 'E3', 'G3'],
  startBar: 0,
  durationBars: 1,
  inversion: 0
}

describe('harmony timeline positioning history', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('records a move as one undo entry, selects the moved chord and clears the preset marker', () => {
    const store = useHarmonyStore()
    store.setChords([source], false)
    store.selectedProgressionId = 'preset'
    store.moveChordToPosition(source.id, 2)
    const moved = structuredClone(
      store.chords.map((chord) => ({ ...chord, notes: [...chord.notes], voicing: [...chord.voicing] }))
    )
    expect(store.selectedChordId).toBe(source.id)
    expect(store.selectedProgressionId).toBeNull()
    store.undo()
    expect(store.chords).toEqual([source])
    expect(store.canUndo).toBe(false)
    store.redo()
    expect(store.chords).toEqual(moved)
  })

  it('restores a clone with the same ID on redo and keeps selection valid on undo', () => {
    const store = useHarmonyStore()
    store.setChords([source], false)
    store.duplicateChordToPosition(source.id, 2)
    const clonedId = store.selectedChordId
    expect(clonedId).not.toBe(source.id)
    expect(store.chords).toHaveLength(2)
    store.undo()
    expect(store.chords).toEqual([source])
    expect(store.selectedChordId).toBe(source.id)
    expect(store.canUndo).toBe(false)
    store.redo()
    expect(store.chords.some((chord) => chord.id === clonedId)).toBe(true)
  })

  it('leaves history and redo intact for missing IDs, invalid targets and unchanged positions', () => {
    const store = useHarmonyStore()
    store.setChords([source], false)
    store.moveChordToPosition(source.id, 2)
    store.undo()
    store.moveChordToPosition('missing', 1)
    store.duplicateChordToPosition('missing', 1)
    store.moveChordToPosition(source.id, NaN)
    store.moveChordToPosition(source.id, 0)
    store.duplicateChordToPosition(source.id, 0)
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(true)
  })

  it('syncs the active audio schedule once for each committed edit and history traversal', () => {
    const store = useHarmonyStore()
    const audio = useAudioStore()
    store.setChords([source], false)
    audio.isPaused = true
    const sync = vi.spyOn(audio, 'syncChordSchedule').mockImplementation(() => {})
    store.moveChordToPosition(source.id, 2)
    store.duplicateChordToPosition(source.id, 4)
    store.undo()
    store.redo()
    expect(sync).toHaveBeenCalledTimes(4)
  })
})
