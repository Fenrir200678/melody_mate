import { generateEuclideanPattern } from '../rhythm/euclidean'
import { expandPattern } from '../rhythm/custom-pattern'
import { getRhythmPresetCycleSteps, type RhythmPreset } from '../rhythm/presets'
import { subdivisionToStepsPerBar, STEPS_PER_BAR } from '../schemas/project.schema'
import type { GeneratorParams } from '../schemas/generator.schema'
import type { CustomRhythmPattern } from '../schemas/custom-rhythm.schema'
import { applyPhraseRests } from './phrase-rests'

export interface RhythmOnset {
  step: number
  durationSteps: number
  velocity?: number
}

export interface RhythmOnsetOptions {
  generator: GeneratorParams
  rhythmPreset?: RhythmPreset
  customPattern?: CustomRhythmPattern
  rangeStartStep: number
  rangeEndStep: number
  rng: () => number
}

export function generateRhythmOnsets(options: RhythmOnsetOptions): RhythmOnset[] {
  const { generator, rangeStartStep, rangeEndStep, rng } = options
  const totalSteps = Math.max(0, rangeEndStep - rangeStartStep)
  if (totalSteps === 0) return []
  if (generator.rhythmMode === 'custom') {
    if (!options.customPattern) return []
    return expandPattern(options.customPattern, { startStep: rangeStartStep, endStep: rangeEndStep }).map((event) => ({
      step: event.absoluteStep - rangeStartStep,
      durationSteps: event.lengthSteps,
      velocity: event.velocity
    }))
  }

  const restProbability = generator.restProbability
  if (generator.rhythmMode === 'preset') {
    const preset = options.rhythmPreset
    if (!preset?.steps.length) return []
    const ratio = preset.subdivision === '8n' ? 2 : 1
    const cycleLength = getRhythmPresetCycleSteps(preset)
    if (cycleLength <= 0) return []
    const potential: RhythmOnset[] = []
    let position = 0
    let index = 0
    while (position < rangeEndStep) {
      const part = preset.steps[index % preset.steps.length]
      const duration = part.durationSteps * ratio
      if (part.isNote && position >= rangeStartStep) {
        potential.push({ step: position - rangeStartStep, durationSteps: Math.min(duration, rangeEndStep - position) })
      }
      position += duration
      index++
    }
    return applyPhraseRests(potential, restProbability, STEPS_PER_BAR, rng)
  }

  const { euclideanPulses, euclideanSteps, euclideanRotation, euclideanSubdivision } = generator
  const pattern = generateEuclideanPattern(euclideanPulses, euclideanSteps, euclideanRotation)
  if (!pattern.length || euclideanPulses === 0) return []
  const nominalSteps = subdivisionToStepsPerBar(euclideanSubdivision)
  const multiplier = STEPS_PER_BAR / nominalSteps
  if (!Number.isInteger(multiplier)) return []
  const active: number[] = []
  for (let index = 0; index * multiplier < rangeEndStep; index++) {
    const absoluteStep = index * multiplier
    if (absoluteStep >= rangeStartStep && pattern[index % pattern.length]) active.push(absoluteStep)
  }
  const retained = applyPhraseRests(
    active.map((step) => ({ step: step - rangeStartStep, durationSteps: 1 })),
    restProbability,
    STEPS_PER_BAR,
    rng
  ).map((onset) => onset.step + rangeStartStep)
  return retained.map((step) => {
    const next = active.find((candidate) => candidate > step) ?? rangeEndStep
    return {
      step: step - rangeStartStep,
      durationSteps: Math.min(Math.max(4, multiplier * 2), Math.max(1, next - step), rangeEndStep - step)
    }
  })
}
