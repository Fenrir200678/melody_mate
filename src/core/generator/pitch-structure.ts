import type { ChordEvent } from '../schemas/chord.schema'
import type { GeneratorParams } from '../schemas/generator.schema'
import type { AppNote } from '../schemas/note.schema'
import { midiToPitch } from '../theory/scale.engine'
import { getActiveChordNotes } from './chord.lookup'
import { resolveMotifSections } from './motif-sections'
import { buildSectionVariationContext, resolveSectionVariation } from './motif-variation'
import { mutateNotes } from '../variation'
import { resolveStructuredPitch } from './structured-pitch'

/** Reuses pitch contours while preserving the source rhythm and dynamics. */
export function applyPitchOnlyStructure(
  notes: AppNote[],
  generator: GeneratorParams,
  bars: number,
  stepsPerBar: number,
  rangeStartStep: number,
  chords: ChordEvent[] | undefined,
  root: string,
  scale: string,
  rng: () => number = Math.random,
  minOctave: number = generator.minOctave,
  maxOctave: number = generator.maxOctave,
  chordAdherence: number = generator.chordAdherence
): AppNote[] {
  if (notes.length === 0 || (!generator.callAndResponse && generator.motif === 'FREE')) return notes
  const grouped = new Map<number, AppNote[]>()
  for (const note of notes) {
    const bar = Math.floor(note.step / stepsPerBar)
    grouped.set(bar, [...(grouped.get(bar) ?? []), note])
  }
  const result: AppNote[] = []
  const firstBar = Math.floor(rangeStartStep / stepsPerBar)
  const sections = resolveMotifSections(generator.motif, bars, stepsPerBar, rangeStartStep)
  const sectionByBar = new Map(sections.map((section) => [section.bar, section]))
  const beatSteps = Math.max(1, Math.round(stepsPerBar / 4))
  const adaptPitch = (note: AppNote, history: AppNote[]) =>
    resolveStructuredPitch(note.midi, {
      root,
      scaleName: scale,
      minOctave,
      maxOctave,
      chordNotes: getActiveChordNotes(note.step, stepsPerBar, chords),
      emphasizeChord: note.step % beatSteps === 0,
      chordAdherence,
      pentatonicMode: generator.pentatonicMode,
      history,
      rng
    })

  for (const [bar, barNotes] of [...grouped.entries()].sort((a, b) => a[0] - b[0])) {
    let source: AppNote[] | undefined
    if (generator.callAndResponse) {
      if ((bar - firstBar) % 2 === 1) source = grouped.get(bar - 1)
    } else {
      const section = sectionByBar.get(bar)
      // Each section refers to the opening phrase to prevent cumulative drift.
      if (section?.sourceBar !== undefined) source = grouped.get(section.sourceBar)
    }

    if (!source?.length) {
      result.push(...barNotes)
      continue
    }
    const derived: AppNote[] = []
    for (let index = 0; index < barNotes.length; index++) {
      const note = barNotes[index]
      const template = source[Math.min(source.length - 1, Math.floor((index * source.length) / barNotes.length))]
      let targetMidi = template.midi
      if (generator.callAndResponse) {
        if (generator.answerStyle === 'continue') targetMidi += 2
        if (generator.answerStyle === 'contrast') targetMidi = note.midi + (note.midi - template.midi)
      }
      if (generator.callAndResponse) {
        const adapted = adaptPitch({ ...note, midi: targetMidi }, [...result, ...derived])
        derived.push({ ...note, ...adapted })
      } else {
        derived.push({ ...note, pitch: midiToPitch(targetMidi), midi: targetMidi })
      }
    }
    const section = sectionByBar.get(bar)
    if (generator.callAndResponse || !section) {
      result.push(...derived)
      continue
    }
    // Fixed phrases keep their onsets, rests and lengths; rhythmic mutations
    // would erase the phrasing already supplied by the rhythm source.
    const variation = resolveSectionVariation(section.role, generator.motifVariation, { rhythmLocked: true })
    const ctx = buildSectionVariationContext(section, root, scale, minOctave, maxOctave, stepsPerBar)
    const mutated = mutateNotes(derived, variation.axes, variation.strength, ctx, rng)
    const originalById = new Map(derived.map((note) => [note.id, note]))
    for (const changed of mutated) {
      // mutateNotes clamps its region even for pitch-only changes; source gates
      // may cross a bar line, so keep the stored gate rather than that region clamp.
      const note = { ...changed, durationSteps: originalById.get(changed.id)!.durationSteps }
      result.push({ ...note, ...adaptPitch(note, result) })
    }
  }
  return result.sort((a, b) => a.step - b.step)
}
