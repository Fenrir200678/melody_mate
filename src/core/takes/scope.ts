import type { AppNote } from '../schemas/note.schema'
import type { TakeContext } from '../schemas/take.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'

export interface TakeScope {
  startStep: number
  endStep: number
}

export function takeScope(context: TakeContext): TakeScope {
  return {
    startStep: context.rangeStartStep ?? 0,
    endStep: context.rangeEndStep ?? context.bars * STEPS_PER_BAR
  }
}

export function copyNotes(notes: AppNote[]): AppNote[] {
  return notes.map((note) => ({ ...note }))
}
