import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSurpriseGeneration } from '../../src/composables/useSurpriseGeneration'
import { createSurpriseSettings } from '../../src/core/generator/surprise'
import type { AppNote } from '../../src/core/schemas/note.schema'
import * as modelService from '../../src/services/trained-model-service'
import { useHarmonyStore } from '../../src/stores/harmony.store'
import { useMelodyStore } from '../../src/stores/melody.store'
import { useProjectStore } from '../../src/stores/project.store'
import { useRhythmStore } from '../../src/stores/rhythm.store'
import { useTakesStore } from '../../src/stores/takes.store'
import { useUiStore } from '../../src/stores/ui.store'

describe('Surprise me generation', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('generates one take from an empty Custom rhythm with the selected settings and preserves the work range', async () => {
    const project = useProjectStore()
    project.setBars(4)
    project.setKey('D')
    project.setScale('minor')
    project.setWorkRange({ startStep: 16, endStep: 48 })
    const melody = useMelodyStore()
    melody.setGeneratorParams({ minOctave: 3, maxOctave: 5, randomRhythmPreset: true, callAndResponse: true })
    melody.setRhythmMode('custom')
    const outside: AppNote = {
      id: 'outside',
      pitch: 'D4',
      midi: 62,
      step: 0,
      durationSteps: 4,
      velocity: 90,
      isMuted: false
    }
    melody.setNotes([outside])
    const harmony = useHarmonyStore()
    harmony.setUseChords(false)
    harmony.addChord({
      id: crypto.randomUUID(),
      name: 'Dm',
      roman: 'i',
      notes: ['D', 'F', 'A'],
      voicing: ['D3', 'F3', 'A3'],
      startBar: 0,
      durationBars: 1,
      inversion: 0
    })
    const initialChords = harmony.chords.map((chord) => ({
      ...chord,
      notes: [...chord.notes],
      voicing: [...chord.voicing]
    }))
    const initialParams = { ...melody.generatorParams }
    const takes = useTakesStore()
    takes.currentSeed = 42
    takes.setSeedLocked(true)
    expect(useRhythmStore().canGenerate).toBe(false)

    let finishLoading!: () => void
    vi.spyOn(modelService, 'loadTrainedModel').mockReturnValue(
      new Promise((resolve) => {
        finishLoading = () => resolve(null)
      })
    )
    const settings = createSurpriseSettings(() => 0.5)
    const { surpriseMe } = useSurpriseGeneration()
    const pending = surpriseMe(() => 0.5)

    expect(melody.isGenerating).toBe(true)
    expect(melody.generatorParams).toEqual({ ...initialParams, ...settings.generator })
    expect(harmony.useChords).toBe(true)
    expect(harmony.adherence).toBe(settings.generator.chordAdherence)
    expect(useUiStore().isRhythmStudioOpen).toBe(false)
    const pendingChords = harmony.chords.map((chord) => ({
      ...chord,
      notes: [...chord.notes],
      voicing: [...chord.voicing]
    }))
    await surpriseMe(() => 0)
    expect(harmony.chords).toEqual(pendingChords)
    expect(project.key).toBe(settings.key)
    expect(project.scale).toBe(settings.scale)
    expect(melody.generatorParams).toEqual({ ...initialParams, ...settings.generator })

    finishLoading()
    await pending

    expect(melody.isGenerating).toBe(false)
    expect(melody.notes.find((note) => note.id === outside.id)).toEqual(outside)
    expect(melody.notes.some((note) => note.step >= 16 && note.step < 48)).toBe(true)
    expect(harmony.chords.find((chord) => chord.id === initialChords[0]!.id)).toEqual(initialChords[0])
    expect(project.workRange).toEqual({ startStep: 16, endStep: 48 })
    expect(project.key).toBe(settings.key)
    expect(project.scale).toBe(settings.scale)
    expect(takes.takes).toHaveLength(1)
    expect(takes.takes[0]!.params).toEqual(melody.generatorParams)
    expect(takes.takes[0]!.seed).toBe(42)
    expect(takes.takes[0]!.context).toMatchObject({ key: settings.key, scale: settings.scale })
    melody.undo()
    harmony.undo()
    expect(melody.notes).toEqual([outside])
    expect(harmony.chords).toEqual(initialChords)
  })

  it('keeps the random key and scale when applying a whole-project chord preset', async () => {
    vi.spyOn(modelService, 'loadTrainedModel').mockResolvedValue(null)
    const project = useProjectStore()
    project.setBars(4)
    project.setWorkRange({ startStep: 0, endStep: 64 })
    project.setKey('D')
    project.setScale('minor')
    const settings = createSurpriseSettings(() => 0.6)

    await useSurpriseGeneration().surpriseMe(() => 0.6)

    expect(project.key).toBe(settings.key)
    expect(project.scale).toBe(settings.scale)
    expect(useHarmonyStore().chords.length).toBeGreaterThan(0)
    expect(useHarmonyStore().selectedProgressionId).toBeNull()
    expect(useTakesStore().takes[0]!.context).toMatchObject({ key: settings.key, scale: settings.scale })
  })
})
