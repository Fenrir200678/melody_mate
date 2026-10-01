import type { AppNote } from '../schemas/note.schema'
import { chronological, createNoteIdAllocator } from '../variation/helpers'

export interface WorkRange {
  startStep: number
  endStep: number
}

export function normalizeWorkRange(range: WorkRange, projectEnd: number): WorkRange {
  const end = Math.max(0, Math.floor(Number.isFinite(projectEnd) ? projectEnd : 0))
  const startStep = Math.max(0, Math.min(end, Math.floor(Number.isFinite(range.startStep) ? range.startStep : 0)))
  const requestedEnd = Math.max(0, Math.min(end, Math.ceil(Number.isFinite(range.endStep) ? range.endStep : 0)))
  return startStep < end
    ? { startStep, endStep: Math.max(startStep + 1, requestedEnd) }
    : { startStep: Math.max(0, end - 1), endStep: end }
}

export function moveWorkRangeBySteps(range: WorkRange, deltaSteps: number, projectEnd: number): WorkRange {
  const end = Math.max(0, Math.floor(Number.isFinite(projectEnd) ? projectEnd : 0))
  const normalized = normalizeWorkRange(range, end)
  if (end === 0) return normalized

  const length = normalized.endStep - normalized.startStep
  const delta = Number.isFinite(deltaSteps) ? Math.trunc(deltaSteps) : 0
  const startStep = Math.max(0, Math.min(end - length, normalized.startStep + delta))
  return normalizeWorkRange({ startStep, endStep: startStep + length }, end)
}

export function resizeWorkRangeEdge(
  range: WorkRange,
  edge: 'start' | 'end',
  step: number,
  projectEnd: number
): WorkRange {
  const end = Math.max(0, Math.floor(Number.isFinite(projectEnd) ? projectEnd : 0))
  const normalized = normalizeWorkRange(range, end)
  if (end === 0) return normalized

  const requestedStep = Number.isFinite(step)
    ? Math.trunc(step)
    : edge === 'start'
      ? normalized.startStep
      : normalized.endStep
  if (edge === 'start') {
    return {
      startStep: Math.max(0, Math.min(normalized.endStep - 1, requestedStep)),
      endStep: normalized.endStep
    }
  }
  return {
    startStep: normalized.startStep,
    endStep: Math.max(normalized.startStep + 1, Math.min(end, requestedStep))
  }
}

export function workRangeFromDrag(startStep: number, endStep: number, snapStep: number, projectEnd: number): WorkRange {
  const end = Math.max(0, Math.floor(Number.isFinite(projectEnd) ? projectEnd : 0))
  const snap = Math.max(1, Math.floor(Number.isFinite(snapStep) ? snapStep : 1))
  const low = Math.min(startStep, endStep)
  const high = Math.max(startStep, endStep)
  const snappedStart = Math.floor(low / snap) * snap
  const snappedEnd = Math.ceil(high / snap) * snap
  return normalizeWorkRange(
    { startStep: snappedStart, endStep: snappedEnd > snappedStart ? snappedEnd : snappedStart + snap },
    end
  )
}

export function notesInWorkRange(notes: readonly AppNote[], range: WorkRange) {
  const source = notes
    .filter((note) => note.step >= range.startStep && note.step < range.endStep)
    .map((note) => ({ ...note, durationSteps: Math.min(note.durationSteps, range.endStep - note.step) }))
  return { source, scope: range }
}

export function mergeWorkRangeVariation(
  notes: readonly AppNote[],
  source: readonly AppNote[],
  varied: readonly AppNote[],
  range: WorkRange
): AppNote[] {
  const sourceIds = new Set(source.map((note) => note.id))
  const allocateId = createNoteIdAllocator([...notes, ...varied])
  const retained = notes.flatMap((note) => {
    if (!sourceIds.has(note.id)) return [note]
    const original = note
    const tailStart = Math.max(original.step, range.endStep)
    const tailEnd = original.step + original.durationSteps
    return tailEnd > tailStart
      ? [{ ...original, id: allocateId(original), step: tailStart, durationSteps: tailEnd - tailStart }]
      : []
  })
  const variedWithinRange = varied
    .filter((note) => note.step >= range.startStep && note.step < range.endStep)
    .map((note) => ({
      ...note,
      durationSteps: Math.min(note.durationSteps, range.endStep - note.step)
    }))
    .filter((note) => Number.isFinite(note.durationSteps) && note.durationSteps > 0)
  const usedIds = new Set(retained.map((note) => note.id))
  const allocateReplacementId = createNoteIdAllocator([...notes, ...varied, ...retained])
  const replacements = variedWithinRange.map((note) => {
    const id = usedIds.has(note.id) ? allocateReplacementId(note) : note.id
    usedIds.add(id)
    return { ...note, id }
  })
  return chronological([...retained, ...replacements])
}

/** Replaces the contents of a time range while retaining crossing note fragments. */
export function replaceNotesInWorkRange(
  existing: readonly AppNote[],
  newNotes: readonly AppNote[],
  range: WorkRange
): AppNote[] {
  const allocateId = createNoteIdAllocator([...existing, ...newNotes])
  const preserved = existing.flatMap((note) => {
    const noteEnd = note.step + note.durationSteps
    if (noteEnd <= range.startStep || note.step >= range.endStep) return [note]
    const fragments: AppNote[] = []
    const leftDuration = Math.min(noteEnd, range.startStep) - note.step
    const rightStart = Math.max(note.step, range.endStep)
    const rightDuration = noteEnd - rightStart
    if (leftDuration > 0) fragments.push({ ...note, durationSteps: leftDuration })
    if (rightDuration > 0) {
      fragments.push({ ...note, id: allocateId(note), step: rightStart, durationSteps: rightDuration })
    }
    return fragments
  })
  const usedIds = new Set(preserved.map((note) => note.id))
  const allocateNewId = createNoteIdAllocator([...existing, ...newNotes, ...preserved])
  const boundedNewNotes = newNotes
    .filter((note) => note.step >= range.startStep && note.step < range.endStep)
    .map((note) => {
      const durationSteps = Math.min(note.durationSteps, range.endStep - note.step)
      const id = usedIds.has(note.id) ? allocateNewId(note) : note.id
      usedIds.add(id)
      return { ...note, id, durationSteps }
    })
  return chronological([...preserved, ...boundedNewNotes])
}
