import type { AppNote } from '../schemas/note.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import {
  chronological,
  clamp,
  createNoteIdAllocator,
  createPitchTools,
  inRegion,
  integerOnset,
  validateContext
} from './helpers'
import type { MutationAxes, VariationContext } from './types'

type Rng = () => number
type AllocateId = (source: AppNote) => string

function end(note: AppNote): number {
  return note.step + note.durationSteps
}

function canPlace(notes: AppNote[], index: number, step: number, duration: number): boolean {
  return notes.every((other, otherIndex) => otherIndex === index || step >= end(other) || step + duration <= other.step)
}

function mutateRhythm(
  notes: AppNote[],
  strength: number,
  ctx: VariationContext,
  rng: Rng,
  allocateId: AllocateId
): AppNote[] {
  const result = [...notes]
  for (let index = 0; index < result.length; index++) {
    if (rng() >= strength) continue
    const note = result[index]
    const next = result[index + 1]
    switch (Math.floor(rng() * 4)) {
      case 0: {
        const direction = rng() < 0.5 ? -1 : 1
        const step = integerOnset(note.step + direction * ctx.snapStep, note.durationSteps, ctx)
        if (canPlace(result, index, step, note.durationSteps)) result[index] = { ...note, step }
        break
      }
      case 1: {
        if (!next || end(note) > next.step) break
        const gap = next.step - end(note)
        const nextStep = integerOnset(note.step + next.durationSteps + gap, note.durationSteps, ctx)
        if (note.step + next.durationSteps > nextStep) break
        result[index] = { ...note, durationSteps: next.durationSteps }
        result[index + 1] = {
          ...next,
          step: nextStep,
          durationSteps: note.durationSteps
        }
        index++
        break
      }
      case 2: {
        if (note.durationSteps < 2 * ctx.snapStep || note.durationSteps > 4 * ctx.snapStep) break
        const firstDuration = ctx.snapStep
        result.splice(
          index,
          1,
          { ...note, durationSteps: firstDuration },
          {
            ...note,
            id: allocateId(note),
            step: note.step + firstDuration,
            durationSteps: note.durationSteps - firstDuration
          }
        )
        index++
        break
      }
      case 3: {
        if (
          next &&
          note.midi === next.midi &&
          note.isMuted === next.isMuted &&
          end(note) === next.step &&
          Math.min(note.durationSteps, next.durationSteps) <= ctx.snapStep
        ) {
          result.splice(index, 2, { ...note, durationSteps: note.durationSteps + next.durationSteps })
        }
        break
      }
    }
  }
  return chronological(result)
}

function mutatePitch(notes: AppNote[], strength: number, ctx: VariationContext, rng: Rng): AppNote[] {
  const pitches = createPitchTools(ctx)
  const result: AppNote[] = []
  for (let index = 0; index < notes.length; index++) {
    const note = notes[index]
    if (rng() >= strength) {
      result.push(note)
      continue
    }
    const degree = pitches.index(note)
    const neighbor = notes[index + 1] ?? notes[index - 1]
    const towardNeighbor = neighbor ? Math.sign(pitches.index(neighbor) - degree) : 0
    const direction = rng() < 0.75 && towardNeighbor ? towardNeighbor : rng() < 0.5 ? -1 : 1
    const distance = rng() < 0.75 ? 1 : 2
    const previous = result[index - 1]
    const next = notes[index + 1]
    // Stepping towards a neighbour by its exact interval lands on its degree, turning
    // motion into a repeated pitch. Bounce away; if both directions manufacture a
    // unison (or the register clamp does), keep the original pitch instead.
    const collides = (candidate: number): boolean =>
      (previous !== undefined && pitches.index(previous) === candidate) ||
      (next !== undefined && pitches.index(next) === candidate)
    let target = degree + direction * distance
    if (target !== degree && collides(target)) {
      const bounced = degree - direction * distance
      target = bounced !== degree && !collides(bounced) ? bounced : degree
    }
    let mutated = pitches.withDegree(note, target)
    if (
      mutated.midi !== note.midi &&
      ((previous !== undefined && mutated.midi === previous.midi) || (next !== undefined && mutated.midi === next.midi))
    ) {
      mutated = note
    }
    result.push(mutated)
  }
  return result
}

function ornamentNotes(
  notes: AppNote[],
  strength: number,
  ctx: VariationContext,
  rng: Rng,
  allocateId: AllocateId
): AppNote[] {
  const pitches = createPitchTools(ctx)
  const beat = STEPS_PER_BAR / 4
  return notes.flatMap((note, index) => {
    const offbeat = note.step % beat !== 0
    const long = note.durationSteps >= 2 * ctx.snapStep
    if ((!long && !offbeat) || note.durationSteps <= ctx.snapStep || rng() >= strength * 0.5) {
      return [note]
    }
    const next = notes[index + 1]
    const degree = pitches.index(note)
    const direction = next ? Math.sign(pitches.index(next) - degree) || (rng() < 0.5 ? -1 : 1) : rng() < 0.5 ? -1 : 1
    const durationSteps = Math.floor(note.durationSteps - ctx.snapStep)
    if (durationSteps < 1) return [note]
    return [
      { ...note, durationSteps },
      pitches.withDegree(
        {
          ...note,
          id: allocateId(note),
          step: note.step + durationSteps,
          durationSteps: note.durationSteps - durationSteps
        },
        degree + direction
      )
    ]
  })
}

function simplifyNotes(notes: AppNote[], strength: number, ctx: VariationContext, rng: Rng): AppNote[] {
  const result = [...notes]
  const beat = STEPS_PER_BAR / 4
  for (let index = 0; index < result.length; index++) {
    if (rng() >= strength) continue
    const note = result[index]
    const previous = result[index - 1]
    const next = result[index + 1]
    if (note.durationSteps < ctx.snapStep && note.step % beat !== 0) {
      if (previous && end(previous) === note.step && previous.isMuted === note.isMuted) {
        result.splice(index - 1, 2, {
          ...previous,
          durationSteps: previous.durationSteps + note.durationSteps
        })
        index--
        continue
      }
      if (next && end(note) === next.step && next.isMuted === note.isMuted) {
        result.splice(index, 2, {
          ...next,
          step: note.step,
          durationSteps: next.durationSteps + note.durationSteps
        })
        index--
        continue
      }
    }
    if (next && note.midi === next.midi && note.isMuted === next.isMuted && end(note) === next.step) {
      result.splice(index, 2, { ...note, durationSteps: note.durationSteps + next.durationSteps })
      index--
      continue
    }
    if (note.step % beat !== 0) {
      const step = integerOnset(Math.round(note.step / beat) * beat, note.durationSteps, ctx)
      if (canPlace(result, index, step, note.durationSteps)) result[index] = { ...note, step }
    }
  }
  return chronological(result)
}

export function mutateNotes(
  notes: readonly AppNote[],
  axes: MutationAxes,
  strength: number,
  ctx: VariationContext,
  rng: Rng = Math.random
): AppNote[] {
  validateContext(ctx)
  if (!Number.isFinite(strength)) throw new RangeError('Variation strength must be finite')
  const amount = clamp(strength, 0, 1)
  if (amount === 0 || !Object.values(axes).some(Boolean)) return notes.map((note) => ({ ...note }))
  const pitches = createPitchTools(ctx)
  const allocateId = createNoteIdAllocator(notes)
  let region = chronological(notes.filter((note) => inRegion(note, ctx))).map((note) => ({
    ...pitches.normalize(note),
    durationSteps: Math.min(note.durationSteps, ctx.regionEndStep - note.step)
  }))
  if (axes.rhythm) region = mutateRhythm(region, amount, ctx, rng, allocateId)
  if (axes.pitch) region = mutatePitch(region, amount, ctx, rng)
  if (axes.ornament) region = ornamentNotes(region, amount, ctx, rng, allocateId)
  if (axes.simplify) region = simplifyNotes(region, amount, ctx, rng)
  return chronological([...notes.filter((note) => !inRegion(note, ctx)).map((note) => ({ ...note })), ...region])
}
