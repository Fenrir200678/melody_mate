import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { GeneratorParamsSchema } from '../../src/core/schemas/generator.schema'
import type { AppNote } from '../../src/core/schemas/note.schema'
import { takeScope } from '../../src/core/takes/scope'
import { useMelodyStore } from '../../src/stores/melody.store'
import { useTakesStore } from '../../src/stores/takes.store'

const note = (id: string, step: number, durationSteps = 4): AppNote => ({
  id: id === 'take' ? '00000000-0000-4000-8000-000000000042' : id,
  step,
  durationSteps,
  midi: 60,
  pitch: 'C4',
  velocity: 100,
  isMuted: false
})

describe('Take actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function setup() {
    const melody = useMelodyStore()
    const takes = useTakesStore()
    const original = [note('crossing', 12, 8), note('inside', 24), note('outside', 48)]
    melody.setNotes(original, false)
    const take = takes.captureTake(
      [note('take', 20)],
      GeneratorParamsSchema.parse({}),
      {
        key: 'C',
        scale: 'major',
        bpm: 120,
        bars: 4,
        rangeStartStep: 16,
        rangeEndStep: 32
      },
      42
    )!
    return { melody, takes, original, take }
  }

  it('loads the captured scope with exactly one undo and isolates the snapshot', () => {
    const { melody, original, take } = setup()
    const params = { ...melody.generatorParams }
    melody.replaceNotesInScope(take.notes, takeScope(take.context))
    expect(melody.notes.map((item) => item.id)).toEqual(['crossing', note('take', 20).id, 'outside'])
    expect(melody.notes[0]!.durationSteps).toBe(4)
    expect(melody.generatorParams).toEqual(params)
    melody.notes.find((item) => item.id === note('take', 20).id)!.velocity = 1
    expect(take.notes[0]!.velocity).toBe(100)
    melody.undo()
    expect(melody.notes).toEqual(original)
    expect(melody.canUndo).toBe(false)
  })

  it('swaps twice to exact identity, including boundary notes, and undoes/redoes both sides', () => {
    const { melody, original, take } = setup()
    melody.swapTake(take)
    const alternate = structuredClone(JSON.parse(JSON.stringify(melody.notes)))
    melody.swapTake(take)
    expect(melody.notes).toEqual(original)
    melody.undo()
    expect(melody.notes).toEqual(alternate)
    melody.undo()
    expect(melody.notes).toEqual(original)
    melody.redo()
    expect(melody.notes).toEqual(alternate)
    melody.swapTake(take)
    expect(melody.notes).toEqual(original)
    expect(take.notes).toEqual([note('take', 20)])
  })

  it('starts a fresh comparison after editing and does not discard the edit on return', () => {
    const { melody, take } = setup()
    melody.swapTake(take)
    melody.addNote(note('edit', 56))
    const edited = JSON.parse(JSON.stringify(melody.notes))
    melody.swapTake(take)
    melody.swapTake(take)
    expect(melody.notes).toEqual(edited)
  })

  it('reuses and locks the seed without changing generator parameters', () => {
    const { melody, takes, take } = setup()
    const params = { ...melody.generatorParams }
    takes.reuseSeed(take.seed)
    expect(takes.currentSeed).toBe(42)
    expect(takes.seedLocked).toBe(true)
    expect(melody.generatorParams).toEqual(params)
  })
})
