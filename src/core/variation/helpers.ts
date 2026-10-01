import type { AppNote } from '../schemas/note.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import { getScaleMidiNotes, midiToPitch, pitchToMidi, snapPitchToScale } from '../theory/scale.engine'
import type { VariationContext } from './types'

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

export function validateContext(ctx: VariationContext): void {
  if (
    !Number.isInteger(ctx.snapStep) ||
    ctx.snapStep < 1 ||
    ctx.snapStep > 2 * STEPS_PER_BAR ||
    !Number.isInteger(ctx.regionStartStep) ||
    !Number.isFinite(ctx.regionEndStep) ||
    ctx.regionStartStep < 0 ||
    ctx.regionEndStep - ctx.regionStartStep < 0.25 ||
    !Number.isInteger(ctx.minOctave) ||
    !Number.isInteger(ctx.maxOctave) ||
    ctx.minOctave < -1 ||
    ctx.maxOctave > 9 ||
    ctx.minOctave > ctx.maxOctave
  ) {
    throw new RangeError('Invalid variation context')
  }
}

export function inRegion(note: AppNote, ctx: VariationContext): boolean {
  return note.step >= ctx.regionStartStep && note.step < ctx.regionEndStep
}

// Gate lengths may be fractional, but the piano roll stores onsets on whole steps.
export function integerOnset(step: number, duration: number, ctx: VariationContext): number {
  const lastStep = Math.max(ctx.regionStartStep, Math.floor(ctx.regionEndStep - duration))
  return clamp(Math.round(step), ctx.regionStartStep, lastStep)
}

export function chronological(notes: readonly AppNote[]): AppNote[] {
  return [...notes].sort((a, b) => a.step - b.step)
}

export function createPitchTools(ctx: VariationContext) {
  const scale = getScaleMidiNotes(ctx.key, ctx.scale)
  const register = scale.filter((midi) => midi >= (ctx.minOctave + 1) * 12 && midi < (ctx.maxOctave + 2) * 12)
  if (!register.length) throw new RangeError('Variation register contains no scale pitches')
  const nearest = (midi: number): number =>
    register.reduce((best, candidate) => (Math.abs(candidate - midi) < Math.abs(best - midi) ? candidate : best))
  const index = (note: AppNote): number => scale.indexOf(pitchToMidi(snapPitchToScale(note.pitch, ctx.key, ctx.scale)))
  const withMidi = (note: AppNote, midi: number): AppNote => {
    const nextMidi = nearest(midi)
    const pitch = nextMidi === note.midi && pitchToMidi(note.pitch) === nextMidi ? note.pitch : midiToPitch(nextMidi)
    return { ...note, midi: nextMidi, pitch }
  }
  const withDegree = (note: AppNote, degree: number): AppNote =>
    withMidi(note, scale[clamp(degree, 0, scale.length - 1)])
  return { index, withMidi, withDegree, normalize: (note: AppNote) => withDegree(note, index(note)) }
}

// Derived UUIDs keep splits reproducible without consuming musical random draws.
export function createNoteIdAllocator(notes: readonly AppNote[]): (source: AppNote) => string {
  const used = new Set(notes.map((note) => note.id))
  let serial = 0
  return (source) => {
    let id: string
    do {
      let hash = 2166136261
      for (const character of source.id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
      const prefix = (hash >>> 0).toString(16).padStart(8, '0')
      id = `${prefix}-0000-4000-8000-${(++serial).toString(16).padStart(12, '0')}`
    } while (used.has(id))
    used.add(id)
    return id
  }
}
