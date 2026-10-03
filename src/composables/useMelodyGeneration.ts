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

      const activeChords = harmonyStore.useChords && harmonyStore.chords.length > 0 ? harmonyStore.chords : undefined
      if (generatorParams.value.rhythmMode === 'preset' && generatorParams.value.randomRhythmPreset) {
        const randomId = pickRandomRhythmPresetId(undefined, rng)
        if (randomId) {
          setRhythmPreset(randomId)
        }
      }

      // Model loading can yield to UI edits, so the selected role and generation
      // inputs must describe the same request, including a randomized preset.
      const generator = { ...generatorParams.value }
      const project = projectStore.toConfig()
      const rhythmPreset = generator.rhythmMode === 'preset' ? getRhythmPresetById(generator.rhythmPresetId) : undefined
      const customPattern = generator.rhythmMode === 'custom' ? rhythmStore.pattern : undefined
      const trainedModel = await loadTrainedModel(rhythmPreset?.category === 'bass' ? 'bass' : 'melody')

      const generated = generateMelody({
        project,
        generator,
        chords: activeChords,
        chordAdherence: generator.chordAdherence ?? harmonyStore.adherence,
        rhythmPreset,
        customPattern,
        startWithRoot: generator.startWithRoot,
        endWithRoot: generator.endWithRoot,
        minOctave: generator.minOctave,
        maxOctave: generator.maxOctave,
        rangeStartStep,
        rangeEndStep,
        trainedModel,
        rng
      })

      replaceNotesInScope(generated, { startStep: rangeStartStep, endStep: rangeEndStep })
      takesStore.captureTake(
        generated,
        generator,
        {
          key: project.key,
          scale: project.scale,
          bpm: project.bpm,
          bars: project.bars,
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
