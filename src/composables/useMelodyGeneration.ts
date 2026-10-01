import type { Ref } from 'vue'
import { generateMelody } from '../core/generator/melody.generator'
import { createRng } from '../core/generator/rng'
import { getRhythmPresetById, pickRandomRhythmPresetId } from '../core/rhythm/presets'
import type { GeneratorParams } from '../core/schemas/generator.schema'
import type { AppNote } from '../core/schemas/note.schema'
import type { TakeScope } from '../core/takes/scope'
import { loadTrainedModel } from '../services/trained-model-service'
import { useHarmonyStore } from '../stores/harmony.store'
import { useProjectStore } from '../stores/project.store'
import { useRhythmStore } from '../stores/rhythm.store'
import { useTakesStore } from '../stores/takes.store'

export function useMelodyGeneration(
  generatorParams: Ref<GeneratorParams>,
  isGenerating: Ref<boolean>,
  setRhythmPreset: (id: string) => void,
  replaceNotesInScope: (notes: AppNote[], scope: TakeScope) => void
) {
  async function generate(): Promise<void> {
    if (isGenerating.value) return
    const rhythmStore = useRhythmStore()
    if (generatorParams.value.rhythmMode === 'custom' && !rhythmStore.canGenerate) return
    isGenerating.value = true
    try {
      const projectStore = useProjectStore()
      const harmonyStore = useHarmonyStore()
      const takesStore = useTakesStore()
      const { startStep: rangeStartStep, endStep: rangeEndStep } = { ...projectStore.workRange }
      const seed = takesStore.resolveGenerationSeed()
      const rng = createRng(seed)

      // Lazily fetched and cached by the service; null keeps the synthetic prior.
      const trainedModel = await loadTrainedModel('melody')

      const activeChords = harmonyStore.useChords && harmonyStore.chords.length > 0 ? harmonyStore.chords : undefined
      if (generatorParams.value.rhythmMode === 'preset' && generatorParams.value.randomRhythmPreset) {
        const randomId = pickRandomRhythmPresetId(undefined, rng)
        if (randomId) {
          setRhythmPreset(randomId)
        }
      }

      const rhythmPreset =
        generatorParams.value.rhythmMode === 'preset'
          ? getRhythmPresetById(generatorParams.value.rhythmPresetId)
          : undefined

      const generated = generateMelody({
        project: projectStore.toConfig(),
        generator: generatorParams.value,
        chords: activeChords,
        chordAdherence: generatorParams.value.chordAdherence ?? harmonyStore.adherence,
        rhythmPreset,
        customPattern: generatorParams.value.rhythmMode === 'custom' ? rhythmStore.pattern : undefined,
        startWithRoot: generatorParams.value.startWithRoot,
        endWithRoot: generatorParams.value.endWithRoot,
        minOctave: generatorParams.value.minOctave,
        maxOctave: generatorParams.value.maxOctave,
        targetOctave: Math.round((generatorParams.value.minOctave + generatorParams.value.maxOctave) / 2),
        rangeStartStep,
        rangeEndStep,
        trainedModel,
        rng
      })

      replaceNotesInScope(generated, { startStep: rangeStartStep, endStep: rangeEndStep })
      takesStore.captureTake(
        generated,
        generatorParams.value,
        {
          key: projectStore.key,
          scale: projectStore.scale,
          bpm: projectStore.bpm,
          bars: projectStore.bars,
          rangeStartStep,
          rangeEndStep
        },
        seed
      )
      takesStore.markSeedUsed(seed)
    } finally {
      isGenerating.value = false
    }
  }

  return { generate }
}
