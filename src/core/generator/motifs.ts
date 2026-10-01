import { Note } from 'tonal'
import { DEFAULT_GENERATOR_PARAMS } from '../../config/defaults'
import type { ChordEvent } from '../schemas/chord.schema'
import type { MotifPattern } from '../schemas/generator.schema'
import type { AppNote } from '../schemas/note.schema'
import { mutateNotes } from '../variation'
import { createNoteIdAllocator } from '../variation/helpers'
import { getActiveChordNotes } from './chord.lookup'
import { resolveMotifSections } from './motif-sections'
import { buildSectionVariationContext, resolveSectionVariation } from './motif-variation'
import { resolveStructuredPitch } from './structured-pitch'

export interface MotifStructureOptions {
  pattern: MotifPattern
  bars: number
  stepsPerBar: number
  chords?: ChordEvent[]
  root: string
  scaleName: string
  minOctave: number
  maxOctave: number
  motifVariation: number
  chordAdherence?: number
  pentatonicMode?: boolean
  rng: () => number
  startStep: number
}

type DerivedNote = AppNote & { templatePitch: string; templateStep: number }

/** Derives bar-aligned repeats and contrasts from the opening phrase. */
export function applyMotifStructure(notes: AppNote[], options: MotifStructureOptions): AppNote[] {
  const { pattern, bars, stepsPerBar, chords, root, scaleName, minOctave, maxOctave, motifVariation, rng, startStep } =
    options
  if (pattern === 'FREE' || notes.length === 0 || bars <= 1) return [...notes]

  const sections = resolveMotifSections(pattern, bars, stepsPerBar, startStep)
  const source = sections[0]
  const template = notes.filter((note) => note.step >= source.startStep && note.step < source.endStep)
  const allocateId = createNoteIdAllocator(notes)
  const beatSteps = Math.max(1, Math.round(stepsPerBar / 4))
  const result: AppNote[] = []

  for (const section of sections) {
    if (section.role === 'source') {
      result.push(...template)
      continue
    }
    // Parallel derivation avoids cumulative A -> A' -> A'' drift that would erase
    // the hook in AAAB. Sequential RNG draws still give each copy its own variation.
    const duplicated: DerivedNote[] = template.map((note) => ({
      ...note,
      id: allocateId(note),
      step: section.startStep + note.step - source.startStep,
      durationSteps: Math.min(note.durationSteps, source.endStep - note.step),
      templatePitch: note.pitch,
      templateStep: note.step
    }))
    const variation = resolveSectionVariation(section.role, motifVariation, { rhythmLocked: false })
    const ctx = buildSectionVariationContext(section, root, scaleName, minOctave, maxOctave, stepsPerBar)
    const mutated = mutateNotes(duplicated, variation.axes, variation.strength, ctx, rng) as DerivedNote[]

    for (const derived of mutated) {
      const { templatePitch, templateStep, ...note } = derived
      const targetChord = getActiveChordNotes(note.step, stepsPerBar, chords)
      const sourceChord = getActiveChordNotes(templateStep, stepsPerBar, chords)
      // Mutation can move or split a note; its original pitch still decides whether
      // it was a chord tone, while the mutated pitch drives destination adaptation.
      const wasChordTone = sourceChord.some((pitch) => Note.chroma(pitch) === Note.chroma(templatePitch))
      const unchangedPitch = Note.chroma(note.pitch) === Note.chroma(templatePitch)
      const adapted = resolveStructuredPitch(note.midi, {
        root,
        scaleName,
        minOctave,
        maxOctave,
        chordNotes: targetChord,
        emphasizeChord: note.step % beatSteps === 0 || (wasChordTone && unchangedPitch),
        chordAdherence: options.chordAdherence ?? DEFAULT_GENERATOR_PARAMS.chordAdherence,
        pentatonicMode: options.pentatonicMode ?? DEFAULT_GENERATOR_PARAMS.pentatonicMode,
        history: result,
        rng
      })
      result.push({ ...note, ...adapted })
    }
  }
  return result.sort((a, b) => a.step - b.step)
}
