import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useMelodyAnalysis } from '../../src/composables/useMelodyAnalysis'
import type { AppNote } from '../../src/core/schemas/note.schema'
import { useHarmonyStore } from '../../src/stores/harmony.store'
import { useMelodyStore } from '../../src/stores/melody.store'
import { useProjectStore } from '../../src/stores/project.store'

const note: AppNote = {
  id: '12345678-1234-4234-8234-123456789abc',
  pitch: 'C4',
  midi: 60,
  step: 0,
  durationSteps: 4,
  velocity: 100,
  isMuted: false
}

describe('useMelodyAnalysis', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    useProjectStore().setBars(4)
  })
  afterEach(() => disposePinia(pinia))

  it('returns null for an empty or entirely muted melody', () => {
    const analysis = useMelodyAnalysis()
    expect(analysis.value).toBeNull()
    useMelodyStore().notes = [{ ...note, isMuted: true }]
    expect(analysis.value).toBeNull()
  })

  it('memoizes the result for unchanged references and unrelated state', () => {
    const melody = useMelodyStore()
    melody.notes = [note]
    const analysis = useMelodyAnalysis()
    const first = analysis.value
    melody.selectedNoteIds = [note.id]
    useProjectStore().bpm = 150
    expect(analysis.value).toBe(first)
    expect(analysis.value!.metrics).toBe(first!.metrics)
  })

  it('returns null when no sounding note is inside the project', () => {
    const melody = useMelodyStore()
    const analysis = useMelodyAnalysis()
    melody.notes = [{ ...note, step: useProjectStore().bars * 16 }]
    expect(analysis.value).toBeNull()
  })

  it('recomputes metrics after an immutable note edit', () => {
    const melody = useMelodyStore()
    melody.notes = [note, { ...note, id: 'other', pitch: 'D4', midi: 62, step: 4 }]
    const analysis = useMelodyAnalysis()
    const first = analysis.value
    melody.notes = melody.notes.map((item, index) => (index === 1 ? { ...item, pitch: 'G4', midi: 67 } : item))
    expect(analysis.value).not.toBe(first)
    expect(analysis.value!.metrics.rangeSemitones).toBe(7)
    expect(analysis.value!.metrics.motionBalance.leaps).toBe(1)
  })

  it('recomputes harmony metrics when the chord reference changes', () => {
    useMelodyStore().notes = [note]
    const analysis = useMelodyAnalysis()
    const first = analysis.value
    useHarmonyStore().chords = [
      {
        id: 'chord',
        name: 'C',
        roman: 'I',
        notes: ['C', 'E', 'G'],
        voicing: ['C3', 'E3', 'G3'],
        startBar: 0,
        durationBars: 4,
        inversion: 0
      }
    ]
    expect(analysis.value).not.toBe(first)
    expect(analysis.value!.metrics.chordToneRatio).toBe(1)
    expect(analysis.value!.score).toBeGreaterThan(first!.score)
  })

  it('recomputes when params or project context change', () => {
    const melody = useMelodyStore()
    melody.notes = [note]
    const analysis = useMelodyAnalysis()
    const first = analysis.value
    melody.generatorParams = { ...melody.generatorParams, minOctave: 2 }
    expect(analysis.value).not.toBe(first)
    const second = analysis.value
    useProjectStore().bars = 2
    expect(analysis.value).not.toBe(second)
    expect(analysis.value!.metrics.tensionPerBar).toHaveLength(2)
  })

  it('does not track nested note fields without a reference replacement', () => {
    const melody = useMelodyStore()
    melody.notes = [{ ...note }]
    const analysis = useMelodyAnalysis()
    const first = analysis.value
    melody.notes[0].velocity = 80
    expect(analysis.value).toBe(first)
  })

  it('omits harmonic judgement without chords and with harmony disabled', () => {
    const melody = useMelodyStore()
    melody.notes = [{ ...note, midi: 62, pitch: 'D4' }]
    const harmony = useHarmonyStore()
    const analysis = useMelodyAnalysis()
    expect(analysis.value!.metrics.chordToneRatio).toBeNull()
    harmony.chords = [
      {
        id: 'chord',
        name: 'C',
        roman: 'I',
        notes: ['C', 'E', 'G'],
        voicing: ['C3', 'E3', 'G3'],
        startBar: 0,
        durationBars: 4
      }
    ]
    expect(analysis.value!.metrics.resolution).toBe(0)
    harmony.useChords = false
    expect(analysis.value!.metrics.resolution).toBeNull()
    expect(analysis.value!.metrics.chordToneRatio).toBeNull()
  })
})
