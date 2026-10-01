import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as arpeggioGenerator from '../../src/core/generator/arpeggio.generator'
import type { TrainedMarkovArtifact, TrainedModelIndexEntry } from '../../src/core/schemas/trained-markov.schema'
import * as trainedModelService from '../../src/services/trained-model-service'
import { useAudioStore } from '../../src/stores/audio.store'
import { useHarmonyStore } from '../../src/stores/harmony.store'
import { useMelodyStore } from '../../src/stores/melody.store'
import { useProjectStore } from '../../src/stores/project.store'
import { useTakesStore } from '../../src/stores/takes.store'
import { arpTestModel } from '../helpers/arp-model'

const modelEntry = { id: arpTestModel.id, role: 'arp' } as TrainedModelIndexEntry

function useFallbackModel() {
  return vi.spyOn(trainedModelService, 'loadTrainedModelIndex').mockResolvedValue(null)
}

function setup() {
  const project = useProjectStore()
  project.setWorkRange({ startStep: 20, endStep: 52 })
  const melody = useMelodyStore()
  melody.setGeneratorParams({ arpPattern: 'up-down', arpRate: '1/16', arpSeed: 42, arpSeedLocked: false })
  return { project, melody, takes: useTakesStore(), audio: useAudioStore() }
}

describe('Arp Studio candidate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('applies exactly the displayed candidate without a second generation, seed roll or model run', async () => {
    useFallbackModel()
    const nextSeed = vi.spyOn(await import('../../src/composables/arpSeed'), 'nextArpSeed').mockReturnValue(777)
    const generate = vi.spyOn(arpeggioGenerator, 'generateArpeggio')
    const { melody, takes } = setup()
    await melody.loadArpModels()

    const shown = melody.shuffleArp()!
    expect(melody.generatorParams.arpSeed).toBe(777)
    expect(generate).toHaveBeenCalledTimes(1)

    await melody.applyArp()

    expect(generate).toHaveBeenCalledTimes(1)
    expect(nextSeed).toHaveBeenCalledTimes(1)
    expect(melody.generatorParams.arpSeed).toBe(777)
    expect(melody.arpCandidate).toBe(shown)
    expect(melody.notes).toEqual(shown.notes)
    expect(takes.takes).toHaveLength(1)
    expect(takes.takes[0].notes).toEqual(shown.notes)
    expect(takes.takes[0].seed).toBe(777)
    expect(shown.notes.every((note) => note.step >= 20 && note.step < 52)).toBe(true)
    expect(new Set(shown.notes.map((note) => Math.floor(note.step / 16)))).toEqual(new Set([1, 2, 3]))
  })

  it('keeps targeted previews reversible and applies the displayed variation as one undoable take', async () => {
    useFallbackModel()
    const { melody, takes, audio, project } = setup()
    const audition = vi.spyOn(audio, 'auditionNotes').mockResolvedValue(undefined)
    await melody.loadArpModels()
    const original = melody.syncArpCandidate()!
    melody.setArpVariationSeed(853)

    expect(melody.rerollArpVariation('feel')).toBe(true)
    const varied = melody.arpCandidate!
    expect(varied.notes).not.toEqual(original.notes)
    expect(varied.baseNotes).toEqual(original.notes)
    expect(varied.variations).toEqual([{ mode: 'feel', seed: 853 }])
    expect(melody.notes).toEqual([])
    expect(takes.takes).toEqual([])
    expect(melody.canUndo).toBe(false)

    await melody.auditionArp()
    expect(audition).toHaveBeenCalledWith(varied.notes, project.bpm, expect.any(String), {
      originStep: project.workRange.startStep,
      durationSteps: project.workRange.endStep - project.workRange.startStep
    })

    await melody.applyArp()
    expect(melody.notes).toEqual(varied.notes)
    expect(takes.takes).toHaveLength(1)
    expect(takes.takes[0].notes).toEqual(varied.notes)
    expect(takes.takes[0].seed).toBe(original.inputs.seed)
    expect(takes.takes[0].arpVariations).toEqual(varied.variations)
    melody.undo()
    expect(melody.notes).toEqual([])
    melody.redo()
    expect(melody.notes).toEqual(varied.notes)

    melody.resetArpVariation()
    expect(melody.arpCandidate!.notes).toEqual(original.notes)
    expect(melody.arpCandidate!.variations).toEqual([])
    expect(melody.notes).toEqual(varied.notes)

    expect(melody.rerollArpVariation('feel')).toBe(true)
    expect(melody.arpCandidate!.notes).toEqual(varied.notes)
    await melody.applyArp()
    expect(takes.takes).toHaveLength(2)
    expect(takes.takes[1].arpVariations).toEqual(varied.variations)
  })

  it('reports a pitch no-op without replacing the candidate or creating history', async () => {
    useFallbackModel()
    const { melody, project, takes } = setup()
    project.setWorkRange({ startStep: 0, endStep: 16 })
    const harmony = useHarmonyStore()
    harmony.useChords = true
    harmony.setChords([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'C',
        roman: 'I',
        notes: ['C'],
        voicing: ['C4'],
        startBar: 0,
        durationBars: 1
      }
    ])
    melody.setGeneratorParams({ arpPitchSource: 'chord-voicing', arpAdherence: 100 })
    await melody.loadArpModels()
    const displayed = melody.syncArpCandidate()

    expect(melody.rerollArpVariation('pitches')).toBe(false)
    expect(melody.arpCandidate).toBe(displayed)
    expect(melody.arpVariationMessage).toBe('No alternate pitches available')
    expect(melody.canUndo).toBe(false)
    expect(takes.takes).toEqual([])
  })

  it('uses the loaded trained model once and applies the model-based candidate as displayed', async () => {
    vi.spyOn(trainedModelService, 'loadTrainedModelIndex').mockResolvedValue({
      artifactVersion: 1,
      kind: 'melodymate-markov-index',
      models: [modelEntry as TrainedModelIndexEntry]
    })
    const loadModel = vi.spyOn(trainedModelService, 'loadTrainedModel').mockResolvedValue(arpTestModel)
    const generate = vi.spyOn(arpeggioGenerator, 'generateArpeggio')
    const { melody } = setup()
    await melody.loadArpModels()

    const shown = melody.syncArpCandidate()!
    await melody.applyArp()

    expect(melody.arpModelStatus).toBe('available')
    expect(shown.modelId).toBe(arpTestModel.id)
    expect(generate).toHaveBeenCalledTimes(1)
    expect(generate.mock.calls[0][0].trainedModel).toBe(arpTestModel)
    expect(loadModel).toHaveBeenCalledTimes(1)
    expect(melody.notes).toEqual(shown.notes)
  })

  it('rebuilds the same candidate with a locked seed and a new one only in Auto', async () => {
    useFallbackModel()
    const { melody } = setup()
    melody.setGeneratorParams({ arpSeedLocked: true })
    await melody.loadArpModels()

    const first = melody.shuffleArp()!
    const refreshed = melody.shuffleArp()!
    expect(refreshed.revision).toBeGreaterThan(first.revision)
    expect(refreshed.notes).toEqual(first.notes)
    expect(melody.generatorParams.arpSeed).toBe(42)

    melody.setGeneratorParams({ arpSeedLocked: false })
    const shuffled = melody.shuffleArp()!
    expect(shuffled.inputs.seed).toBe(melody.generatorParams.arpSeed)
    expect(shuffled.inputs.seed).not.toBe(42)
  })

  it('marks the candidate outdated on input changes and rebuilds it from the new inputs', async () => {
    useFallbackModel()
    const { melody, project } = setup()
    await melody.loadArpModels()
    const first = melody.syncArpCandidate()!
    expect(melody.arpCandidateState).toBe('ready')

    melody.setGeneratorParams({ arpPattern: 'down' })
    expect(melody.arpCandidateState).toBe('stale')
    const second = melody.syncArpCandidate()!
    expect(second.revision).toBeGreaterThan(first.revision)
    expect(second.inputs.pattern).toBe('down')

    project.setWorkRange({ startStep: 0, endStep: 16 })
    expect(melody.arpCandidateState).toBe('stale')
    expect(melody.syncArpCandidate()!.inputs.range).toEqual({ startStep: 0, endStep: 16 })
    expect(melody.arpCandidateState).toBe('ready')
  })

  it('invalidates octave mode changes and captures the displayed mode in the take', async () => {
    useFallbackModel()
    const { melody, takes } = setup()
    melody.setGeneratorParams({ arpOctaveRange: 3, arpOctaveMode: 'up' })
    await melody.loadArpModels()
    const first = melody.syncArpCandidate()!

    melody.setGeneratorParams({ arpOctaveMode: 'down' })
    expect(melody.arpCandidateState).toBe('stale')
    const second = melody.syncArpCandidate()!
    expect(second.inputs.octaveMode).toBe('down')
    expect(second.notes).not.toEqual(first.notes)

    await melody.applyArp()
    expect(takes.takes[0].params.arpOctaveMode).toBe('down')
    expect(takes.takes[0].notes).toEqual(second.notes)
  })

  it.each([2, 4])(
    'enables inversion cycling only with enabled chords held for %s bars and retains the preference',
    async (durationBars) => {
      useFallbackModel()
      const { melody } = setup()
      const harmony = useHarmonyStore()
      const chord = {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'C',
        roman: 'I',
        notes: ['C', 'E', 'G'],
        voicing: ['C3', 'E3', 'G3'],
        startBar: 0,
        durationBars: 1
      }
      harmony.useChords = true
      harmony.setChords([chord, { ...chord, id: '22222222-2222-4222-8222-222222222222', startBar: 1 }])
      melody.setGeneratorParams({ arpInversionCycling: true })
      await melody.loadArpModels()
      expect(melody.syncArpCandidate()!.inputs.inversionCycling).toBe(false)

      harmony.setChords([{ ...chord, durationBars }])
      expect(melody.arpCandidateState).toBe('stale')
      expect(melody.syncArpCandidate()!.inputs.inversionCycling).toBe(true)

      harmony.useChords = false
      expect(melody.arpCandidateState).toBe('stale')
      expect(melody.syncArpCandidate()!.inputs.inversionCycling).toBe(false)
      expect(melody.generatorParams.arpInversionCycling).toBe(true)

      harmony.useChords = true
      expect(melody.syncArpCandidate()!.inputs.inversionCycling).toBe(true)
      melody.setGeneratorParams({ arpInversionCycling: false })
      expect(melody.syncArpCandidate()!.inputs.inversionCycling).toBe(false)

      melody.setGeneratorParams({ arpInversionCycling: true })
      harmony.setChords([{ ...chord, durationBars: 1.75 }])
      expect(melody.syncArpCandidate()!.inputs.inversionCycling).toBe(false)
      harmony.setChords([])
      expect(melody.syncArpCandidate()!.inputs.inversionCycling).toBe(false)
      expect(melody.generatorParams.arpInversionCycling).toBe(true)
    }
  )

  it('builds no candidate and blocks audition while the model is loading, then a late response yields the current one', async () => {
    vi.spyOn(trainedModelService, 'loadTrainedModelIndex').mockResolvedValue({
      artifactVersion: 1,
      kind: 'melodymate-markov-index',
      models: [modelEntry]
    })
    let resolveModel!: (model: TrainedMarkovArtifact | null) => void
    vi.spyOn(trainedModelService, 'loadTrainedModel').mockReturnValue(
      new Promise((resolve) => {
        resolveModel = resolve
      })
    )
    const { melody, audio } = setup()
    const audition = vi.spyOn(audio, 'auditionNotes')
    const loading = melody.loadArpModels()

    expect(melody.arpCandidateState).toBe('loading')
    expect(melody.syncArpCandidate()).toBeNull()
    await melody.auditionArp()
    expect(audition).not.toHaveBeenCalled()

    melody.setGeneratorParams({ arpPattern: 'random' })
    resolveModel(arpTestModel)
    await loading

    const candidate = melody.syncArpCandidate()!
    expect(candidate.inputs.pattern).toBe('random')
    expect(candidate.modelId).toBe(arpTestModel.id)
    expect(melody.arpCandidateState).toBe('ready')
  })

  describe('audition', () => {
    function mockAudio(audio: ReturnType<typeof useAudioStore>) {
      const start = vi.spyOn(audio, 'auditionNotes').mockImplementation(async (_notes, _bpm, id) => {
        audio.auditioningId = id ?? null
      })
      const stop = vi.spyOn(audio, 'stopNotesAudition').mockImplementation(() => {
        audio.auditioningId = null
      })
      return { start, stop }
    }

    it('plays the displayed notes with the work range origin and length, leaving melody and takes untouched', async () => {
      useFallbackModel()
      const { melody, takes, audio, project } = setup()
      const { start } = mockAudio(audio)
      await melody.loadArpModels()
      const shown = melody.syncArpCandidate()!

      await melody.auditionArp()

      expect(start).toHaveBeenCalledWith(shown.notes, project.bpm, expect.stringContaining('arp-candidate'), {
        originStep: 20,
        durationSteps: 32
      })
      expect(melody.isAuditioningArp).toBe(true)
      expect(melody.notes).toEqual([])
      expect(melody.canUndo).toBe(false)
      expect(takes.takes).toEqual([])
    })

    it('stops when the candidate is replaced, discarded or panicked, but never a take audition', async () => {
      useFallbackModel()
      const { melody, audio } = setup()
      const { stop } = mockAudio(audio)
      await melody.loadArpModels()
      melody.syncArpCandidate()

      await melody.auditionArp()
      melody.setGeneratorParams({ arpDensity: 60 })
      melody.syncArpCandidate()
      expect(melody.isAuditioningArp).toBe(false)

      await melody.auditionArp()
      melody.shuffleArp()
      expect(melody.isAuditioningArp).toBe(false)

      await melody.auditionArp()
      melody.discardArpCandidate()
      expect(melody.isAuditioningArp).toBe(false)
      expect(stop).toHaveBeenCalledTimes(3)

      audio.auditioningId = 'take-1'
      melody.syncArpCandidate()
      melody.stopArpAudition()
      expect(audio.auditioningId).toBe('take-1')
      expect(stop).toHaveBeenCalledTimes(3)
    })

    it('does not audition an outdated candidate', async () => {
      useFallbackModel()
      const { melody, audio } = setup()
      const { start } = mockAudio(audio)
      await melody.loadArpModels()
      melody.syncArpCandidate()
      melody.setGeneratorParams({ arpPattern: 'converge' })

      await melody.auditionArp()

      expect(start).not.toHaveBeenCalled()
    })
  })
})
