import type { AppNote } from '../schemas/note.schema'

export interface LoopRange {
  startStep: number
  endStep: number
}

/**
 * Snaps a loop region outward to the given notes: the earliest note start becomes the
 * loop start, the latest note end the loop end — both aligned to the snap grid.
 * The end is clamped to the project length and the region spans at least one grid step.
 */
export function computeLoopRangeFromSelection(
  notes: readonly Pick<AppNote, 'step' | 'durationSteps'>[],
  snapStep: number,
  maxStep: number
): LoopRange | null {
  if (notes.length === 0) return null

  const snap = Math.max(1, snapStep)
  let earliestStep = Infinity
  let latestStep = -Infinity
  for (const note of notes) {
    earliestStep = Math.min(earliestStep, note.step)
    latestStep = Math.max(latestStep, note.step + note.durationSteps)
  }

  const startStep = Math.floor(earliestStep / snap) * snap
  const endStep = Math.min(maxStep, Math.max(startStep + snap, Math.ceil(latestStep / snap) * snap))

  return { startStep, endStep }
}
