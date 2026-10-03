import { createSurpriseSettings } from '../core/generator/surprise'
import { useHarmonyStore } from '../stores/harmony.store'
import { useMelodyStore } from '../stores/melody.store'
import { useProjectStore } from '../stores/project.store'

export function useSurpriseGeneration() {
  const melodyStore = useMelodyStore()
  const harmonyStore = useHarmonyStore()
  const projectStore = useProjectStore()

  async function surpriseMe(rng?: () => number): Promise<void> {
    if (melodyStore.isGenerating) return

    const settings = createSurpriseSettings(rng)
    projectStore.setKey(settings.key)
    projectStore.setScale(settings.scale)
    harmonyStore.loadPredefinedProgression(settings.progressionId, settings.scale)
    harmonyStore.setUseChords(true)
    harmonyStore.setAdherence(settings.generator.chordAdherence)
    melodyStore.setRhythmMode('preset')
    melodyStore.setGeneratorParams(settings.generator)
    await melodyStore.generate()
  }

  return { surpriseMe }
}
