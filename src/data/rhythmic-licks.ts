import type { UnifiedRhythm } from '@/ts/types/rhythm.types'

const NOTATION_TO_TICKS: Record<string, number> = {
  '1n': 512,
  '2n.': 384,
  '2n': 256,
  '4n.': 192,
  '4n': 128,
  '8n.': 96,
  '8n': 64,
  '8t': 43,
  '16n.': 48,
  '16n': 32,
  '32n': 16,
  '64n': 8
}

const SUBDIVISION_TO_STEPS_PER_BAR: Record<string, number> = {
  '4n': 4,
  '8n': 8,
  '16n': 16
}

function stepsToUnifiedRhythm(steps: string[], subdivision: '4n' | '8n' | '16n' = '16n'): UnifiedRhythm {
  const totalSteps = SUBDIVISION_TO_STEPS_PER_BAR[subdivision]
  const ticksPerStep = (128 * 4) / totalSteps
  const events = []
  let currentStep = 0
  for (const durationNotation of steps) {
    if (currentStep >= totalSteps) break
    const ticks = NOTATION_TO_TICKS[durationNotation]
    if (ticks) {
      const durationInSteps = Math.round(ticks / ticksPerStep)
      if (durationInSteps > 0) {
        events.push({ step: currentStep, durationInSteps, isRest: false })
        currentStep += durationInSteps
      }
    }
  }
  if (currentStep < totalSteps) {
    events.push({ step: currentStep, durationInSteps: totalSteps - currentStep, isRest: true })
  }
  return { events, totalSteps, subdivision }
}

export const RHYTHMIC_LICKS: UnifiedRhythm[] = [
  {
    ...stepsToUnifiedRhythm(['8n', '16n', '16n'], '16n')
  },
  {
    ...stepsToUnifiedRhythm(['8t', '8t', '8t'], '16n')
  },
  {
    ...stepsToUnifiedRhythm(['16n', '8n', '16n'], '16n')
  },
  {
    ...stepsToUnifiedRhythm(['8n.', '16n'], '16n')
  },
  {
    ...stepsToUnifiedRhythm(['16n', '16n'], '16n')
  }
]
