import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateMelody } from '../../src/core/generator/melody.generator'
import { createRng } from '../../src/core/generator/rng'
import * as rhythmPresets from '../../src/core/rhythm/presets'
import type { GeneratorParams } from '../../src/core/schemas/generator.schema'
import type { AppNote } from '../../src/core/schemas/note.schema'
import type { TrainedMarkovArtifact } from '../../src/core/schemas/trained-markov.schema'
import * as modelService from '../../src/services/trained-model-service'
import { useHarmonyStore } from '../../src/stores/harmony.store'
import { useMelodyStore } from '../../src/stores/melody.store'
import { useProjectStore } from '../../src/stores/project.store'
import { useRhythmStore } from '../../src/stores/rhythm.store'
import { useTakesStore } from '../../src/stores/takes.store'

const SEED = 4242
let bassModel: TrainedMarkovArtifact
let melodyModel: TrainedMarkovArtifact

function musicalNotes(notes: AppNote[]) {
  return notes.map(({ id: _id, ...note }) => note)
}

function expectedNotes(model: TrainedMarkovArtifact, generator: GeneratorParams = useMelodyStore().generatorParams) {
  const project = useProjectStore()
  return musicalNotes(
    generateMelody({
      project: project.toConfig(),
      generator,
      rhythmPreset:
        generator.rhythmMode === 'preset' ? rhythmPresets.getRhythmPresetById(generator.rhythmPresetId) : undefined,
      customPattern: generator.rhythmMode === 'custom' ? useRhythmStore().pattern : undefined,
      trainedModel: model,
      rangeStartStep: project.workRange.startStep,
      rangeEndStep: project.workRange.endStep,
      rng: createRng(SEED)
    })
  )
}

describe('melody generation model selection', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const project = useProjectStore()
    project.setBars(4)
    project.setKey('C')
    project.setScale('minor')
    project.setWorkRange({ startStep: 0, endStep: 64 })
    useHarmonyStore().useChords = false
    const takes = useTakesStore()
    takes.currentSeed = SEED
    takes.setSeedLocked(true)
    useMelodyStore().setGeneratorParams({
      rhythmMode: 'preset',
      randomRhythmPreset: false,
      motif: 'FREE',
      callAndResponse: false,
      restProbability: 0,
      velocityVariation: 0,
      minOctave: 2,
      maxOctave: 3,
      startWithRoot: true,
      endWithRoot: false
    })
    const bass = await modelService.loadTrainedModel('bass')
    const melody = await modelService.loadTrainedModel('melody')
    if (!bass || !melody) throw new Error('Shipped bass and melody models must be available')
    bassModel = bass
    melodyModel = melody
  })

  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['ebm-machine-pulse', 'bass'],
    ['arpeggio-flow', 'melody'],
    ['tresillo', 'melody']
  ] as const)('generates %s pitches with the %s model', async (presetId, role) => {
    const store = useMelodyStore()
    store.setRhythmPreset(presetId)
    const expected = expectedNotes(role === 'bass' ? bassModel : melodyModel)
    const other = expectedNotes(role === 'bass' ? melodyModel : bassModel)
    expect(expected).not.toEqual(other)

    await store.generate()

    expect(musicalNotes(store.notes)).toEqual(expected)
  })

  it('uses the model for the randomized preset rather than the previously selected preset', async () => {
    const store = useMelodyStore()
    store.setRhythmPreset('arpeggio-flow')
    store.setGeneratorParams({ randomRhythmPreset: true })
    vi.spyOn(rhythmPresets, 'pickRandomRhythmPresetId').mockReturnValue('ebm-machine-pulse')
    const expected = expectedNotes(bassModel, { ...store.generatorParams, rhythmPresetId: 'ebm-machine-pulse' })

    await store.generate()

    expect(store.generatorParams.rhythmPresetId).toBe('ebm-machine-pulse')
    expect(musicalNotes(store.notes)).toEqual(expected)
  })

  it.each(['custom', 'euclidean'] as const)('ignores a saved bass preset in %s mode', async (mode) => {
    const store = useMelodyStore()
    store.setRhythmPreset('ebm-machine-pulse')
    useRhythmStore().insert(0, 4, 92)
    useRhythmStore().insert(8, 4, 92)
    store.setRhythmMode(mode)
    const expected = expectedNotes(melodyModel)
    expect(expected).not.toEqual(expectedNotes(bassModel))

    await store.generate()

    expect(musicalNotes(store.notes)).toEqual(expected)
  })

  it('keeps a pending bass request and its Take consistent when settings change during loading', async () => {
    const store = useMelodyStore()
    const project = useProjectStore()
    store.setRhythmPreset('ebm-machine-pulse')
    const generator = { ...store.generatorParams }
    const expected = expectedNotes(bassModel)
    let resolveModel!: (model: TrainedMarkovArtifact) => void
    vi.spyOn(modelService, 'loadTrainedModel').mockReturnValueOnce(
      new Promise((resolve) => {
        resolveModel = resolve
      })
    )

    const pending = store.generate()
    store.setRhythmPreset('arpeggio-flow')
    store.setRhythmMode('euclidean')
    project.setKey('D')
    resolveModel(bassModel)
    await pending

    expect(musicalNotes(store.notes)).toEqual(expected)
    expect(useTakesStore().takes[0].params).toEqual(generator)
    expect(useTakesStore().takes[0].context.key).toBe('C')
    expect(store.generatorParams.rhythmMode).toBe('euclidean')
  })
})
