import type { AppNote } from '../schemas/note.schema'
import type { ProjectConfig } from '../schemas/project.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import { getStepDurationSeconds } from '../transport/playback-timing'
import { humanizeTimingOffset } from './humanize'
import { applySwing } from './swing'

export type GrooveConfig = Pick<ProjectConfig, 'bpm' | 'swing' | 'timingLooseness'>

function stableRandom(id: string): number {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619)
  }
  return (hash >>> 0) / 0xffffffff
}

export function getGroovedStartStep(
  step: number,
  id: string,
  config: GrooveConfig,
  skipSwing = false,
  subdivision: '8n' | '16n' = '16n'
): number {
  const stepDurationMs = getStepDurationSeconds(config.bpm, '16n') * 1000
  const stepsPerSubdivision = subdivision === '8n' ? 2 : 1
  const swingIndex = step / stepsPerSubdivision
  const swingOffset =
    skipSwing || !Number.isInteger(swingIndex)
      ? 0
      : applySwing(swingIndex, subdivision, config.swing) * stepsPerSubdivision
  const loosenessOffset = humanizeTimingOffset(config.timingLooseness, () => stableRandom(id)) / stepDurationMs
  // Full eighth-note swing needs two thirds of a sixteenth step to form a 2:1 triplet pair.
  const maxOffset = subdivision === '8n' ? 0.9 : 0.45
  const offset = Math.max(-0.45, Math.min(maxOffset, swingOffset + loosenessOffset))
  return Math.max(0, step + offset)
}

export function getGroovedLeadStarts(notes: AppNote[], config: GrooveConfig): Map<string, number> {
  const starts = new Map<string, number>()
  const sorted = [...notes].sort((a, b) => a.step - b.step)
  const stepsPerBar = STEPS_PER_BAR
  const occupiedSteps = new Set(sorted.map((note) => note.step))

  for (let i = 0; i < sorted.length; i++) {
    const note = sorted[i]
    const previous = sorted[i - 1]
    const next = sorted[i + 1]
    const bar = Math.floor(note.step / stepsPerBar)
    const alreadySwung =
      previous !== undefined &&
      next !== undefined &&
      Math.floor(previous.step / stepsPerBar) === bar &&
      Math.floor(next.step / stepsPerBar) === bar &&
      note.step - previous.step >= 3 &&
      next.step - note.step === 1
    const subdivision =
      note.step % 4 === 2 && !occupiedSteps.has(note.step - 1) && !occupiedSteps.has(note.step + 1) ? '8n' : '16n'

    starts.set(note.id, getGroovedStartStep(note.step, note.id, config, alreadySwung, subdivision))
  }

  return starts
}
