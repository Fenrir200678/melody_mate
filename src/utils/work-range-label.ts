import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
import type { WorkRange } from '@/core/generator/work-range'

export function formatWorkRangeLabel(range: WorkRange): string {
  const firstBar = Math.floor(range.startStep / STEPS_PER_BAR) + 1
  const lastBar = Math.floor((range.endStep - 1) / STEPS_PER_BAR) + 1
  const firstStepInBar = (range.startStep % STEPS_PER_BAR) + 1
  const lastStepInBar = ((range.endStep - 1) % STEPS_PER_BAR) + 1

  if (firstBar === lastBar && firstStepInBar === 1 && lastStepInBar === STEPS_PER_BAR) {
    return `Bar ${firstBar}`
  }
  if (firstStepInBar === 1 && lastStepInBar === STEPS_PER_BAR) return `Bars ${firstBar}–${lastBar}`

  if (firstBar === lastBar) return `Bar ${firstBar}, steps ${firstStepInBar}–${lastStepInBar}`
  return `Bar ${firstBar}, step ${firstStepInBar} → Bar ${lastBar}, step ${lastStepInBar}`
}
