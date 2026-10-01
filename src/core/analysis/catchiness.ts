import type { MelodyMetrics } from './types'

export const CATCHINESS_WEIGHTS = {
  repetition: 0.35,
  chordTone: 0.2,
  contourClarity: 0.2,
  rhythmPredictability: 0.15,
  resolution: 0.1
} as const

function unit(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

export function catchinessScore(metrics: MelodyMetrics): number {
  const availableWeight =
    1 -
    (metrics.chordToneRatio === null ? CATCHINESS_WEIGHTS.chordTone : 0) -
    (metrics.resolution === null ? CATCHINESS_WEIGHTS.resolution : 0)
  const score =
    unit(metrics.repetitionScore) * CATCHINESS_WEIGHTS.repetition +
    unit(metrics.chordToneRatio ?? 0) * CATCHINESS_WEIGHTS.chordTone +
    unit(metrics.contourClarity) * CATCHINESS_WEIGHTS.contourClarity +
    unit(metrics.rhythmPredictability) * CATCHINESS_WEIGHTS.rhythmPredictability +
    unit(metrics.resolution ?? 0) * CATCHINESS_WEIGHTS.resolution
  // A melody-only sketch has no harmonic evidence, rather than failed harmonic targets.
  return Math.min(100, Math.max(0, Math.round((score / availableWeight) * 100)))
}

export function catchinessLabel(score: number): 'sketchy' | 'developing' | 'hooky' | 'signature' {
  const safeScore = Number.isFinite(score) ? score : 0
  if (safeScore >= 80) return 'signature'
  if (safeScore >= 60) return 'hooky'
  if (safeScore >= 35) return 'developing'
  return 'sketchy'
}
