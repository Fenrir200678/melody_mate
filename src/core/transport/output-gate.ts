import type { ProjectConfig } from '../schemas/project.schema'

export type OutputLoopBounds = Pick<ProjectConfig, 'isLooping' | 'loopEndStep'>

export function getOutputGate(
  onTimeSeconds: number,
  durationSeconds: number,
  startStep: number,
  stepDurationSeconds: number,
  loop: OutputLoopBounds
): { durationSeconds: number; offTimeSeconds: number; loopEndTimeSeconds?: number } {
  const loopEndTimeSeconds = loop.isLooping
    ? onTimeSeconds + Math.max(0, loop.loopEndStep - startStep) * stepDurationSeconds
    : undefined
  const gatedDurationSeconds = Math.max(
    0,
    Math.min(
      durationSeconds,
      loop.isLooping ? Math.max(0, loop.loopEndStep - startStep) * stepDurationSeconds : Infinity
    )
  )
  return {
    durationSeconds: gatedDurationSeconds,
    offTimeSeconds: onTimeSeconds + gatedDurationSeconds,
    loopEndTimeSeconds
  }
}

// Tone visits all ticks since the previous wakeup, so lookahead alone overstates guaranteed advance.
export function getMidiDispatchAdvanceSeconds(lookAheadSeconds: number, updateIntervalSeconds: number): number {
  return Math.max(0, lookAheadSeconds - updateIntervalSeconds)
}
