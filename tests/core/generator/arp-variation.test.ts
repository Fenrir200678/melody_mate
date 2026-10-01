import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import { varyArpNotes } from '../../../src/core/generator/arp-variation'
import { generateArpeggio, getArpHarmonyChromas } from '../../../src/core/generator/arpeggio.generator'
import type { ArpCandidateInputs } from '../../../src/core/generator/arp-candidate'
import { findActiveArpChord, getArpChordVoicingPitches } from '../../../src/core/generator/arp-voicing'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import type { AppNote } from '../../../src/core/schemas/note.schema'

const chords: ChordEvent[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'C',
    roman: 'I',
    notes: ['C', 'E', 'G'],
    voicing: ['C3', 'E3', 'G3'],
    startBar: 0,
    durationBars: 1
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'G',
    roman: 'V',
    notes: ['G', 'B', 'D'],
    voicing: ['G3', 'B3', 'D4'],
    startBar: 1,
    durationBars: 1
  }
]

const inputs: ArpCandidateInputs = {
  key: 'C',
  scale: 'major',
  range: { startStep: 0, endStep: 32 },
  pattern: 'up-down',
  rate: '1/16',
  octaveRange: 2,
  baseOctave: 3,
  gate: 80,
  adherence: 100,
  accent: 60,
  density: 100,
  seed: 7241,
  chords
}

const source = (patch: Partial<ArpCandidateInputs> = {}): AppNote[] => generateArpeggio({ ...inputs, ...patch })

describe('varyArpNotes', () => {
  it('rerolls pitches deterministically and preserves every non-pitch field', () => {
    const original = source()
    const first = varyArpNotes(original, inputs, 'pitches', 19)
    const again = varyArpNotes(original, inputs, 'pitches', 19)
    const otherSeed = varyArpNotes(original, inputs, 'pitches', 20)

    expect(first).toEqual(again)
    expect(first.some((note, index) => note.midi !== original[index].midi)).toBe(true)
    expect(otherSeed.map((note) => note.midi)).not.toEqual(first.map((note) => note.midi))
    first.forEach((note, index) => {
      expect({ ...note, midi: original[index].midi, pitch: original[index].pitch }).toEqual(original[index])
      expect(note.midi).toBeGreaterThanOrEqual(0)
      expect(note.midi).toBeLessThanOrEqual(127)
    })
  })

  it('keeps chord adherence and the selected absolute voicing across chord changes', () => {
    for (const pitchSource of ['pitch-classes', 'chord-voicing'] as const) {
      const options = { ...inputs, pitchSource, adherence: 100 }
      const original = source(options)
      const changed = varyArpNotes(original, options, 'pitches', 36)
      changed.forEach((note) => {
        const chord = findActiveArpChord(chords, note.step)!
        if (pitchSource === 'chord-voicing') {
          expect(getArpChordVoicingPitches(chord)!.midis).toContain(note.midi)
        } else {
          expect(chord.notes.map((pitch) => Note.chroma(pitch))).toContain(note.midi % 12)
        }
      })
    }
  })

  it('uses the base seed for synthetic harmony during a pitch reroll at full adherence', () => {
    const synthetic: ArpCandidateInputs = { ...inputs, chords: undefined, seed: 1407, adherence: 100 }
    const original = source(synthetic)
    const changed = varyArpNotes(original, synthetic, 'pitches', 913)

    expect(changed.some((note, index) => note.midi !== original[index].midi)).toBe(true)
    for (const note of changed) {
      expect(getArpHarmonyChromas(note.step, synthetic).has(note.midi % 12)).toBe(true)
    }
  })

  it('filters mismatched chord-voicing tones during a pedal-bass pitch reroll', () => {
    const inverted = {
      ...chords[0],
      voicing: ['G2', 'C3', 'E3', 'D4']
    }
    const voicingInputs: ArpCandidateInputs = {
      ...inputs,
      range: { startStep: 0, endStep: 16 },
      chords: [inverted],
      pitchSource: 'chord-voicing',
      pattern: 'pedal-bass',
      adherence: 100
    }
    const original = source(voicingInputs)
    const varied = varyArpNotes(original, voicingInputs, 'pitches', 233)
    const allowed = [inverted.voicing[0], inverted.voicing[1], inverted.voicing[2]]
      .map((pitch) => Number(Note.midi(pitch)))
      .filter((midi) => [7, 0, 4].includes(midi % 12))

    expect(original.some((note) => note.midi === Note.midi('D4'))).toBe(true)
    expect(varied.some((note, index) => note.midi !== original[index].midi)).toBe(true)
    varied.forEach((note) => expect(allowed).toContain(note.midi))
  })

  it('rerolls feel while retaining pitch, onset, identity, and mute state', () => {
    const original = source().map((note, index) => ({ ...note, isMuted: index % 2 === 0 }))
    const first = varyArpNotes(original, inputs, 'feel', 991)
    const again = varyArpNotes(original, inputs, 'feel', 991)

    expect(first).toEqual(again)
    expect(
      first.some(
        (note, index) =>
          note.velocity !== original[index].velocity || note.durationSteps !== original[index].durationSteps
      )
    ).toBe(true)
    first.forEach((note, index) => {
      expect(note.id).toBe(original[index].id)
      expect(note.step).toBe(original[index].step)
      expect(note.pitch).toBe(original[index].pitch)
      expect(note.midi).toBe(original[index].midi)
      expect(note.isMuted).toBe(original[index].isMuted)
      expect(note.velocity).toBeGreaterThanOrEqual(1)
      expect(note.velocity).toBeLessThanOrEqual(127)
      const next = first[index + 1]
      expect(note.durationSteps).toBeLessThanOrEqual((next?.step ?? inputs.range.endStep) - note.step)
      expect(note.step + note.durationSteps).toBeLessThanOrEqual(inputs.range.endStep)
    })
  })

  it('keeps feel durations proportional to the displayed note at sparse onsets', () => {
    const sparseInputs = { ...inputs, density: 50 }
    const original = source(sparseInputs)
    const changed = varyArpNotes(original, sparseInputs, 'feel', 308)

    expect(original.some((note, index) => index > 0 && note.step - original[index - 1].step > 1)).toBe(true)
    expect(changed.some((note, index) => note.durationSteps !== original[index].durationSteps)).toBe(true)
    changed.forEach((note, index) => {
      const next = changed[index + 1]
      expect(note.durationSteps).toBeLessThanOrEqual((next?.step ?? sparseInputs.range.endStep) - note.step)
      expect(note.step + note.durationSteps).toBeLessThanOrEqual(sparseInputs.range.endStep)
    })
  })

  it('keeps the metric accent hierarchy and returns valid no-op results for empty or impossible pitches', () => {
    const sourceNotes = source()
    const feel = varyArpNotes(sourceNotes, inputs, 'feel', 42)
    const downbeat = feel.find((note) => note.step % 16 === 0)!
    const sixteenth = feel.find((note) => note.step % 16 === 1)!
    expect(downbeat.velocity).toBeGreaterThan(sixteenth.velocity)

    const impossible = [{ ...sourceNotes[0], midi: 60, pitch: 'C4' }]
    const onePitchVoicing: ArpCandidateInputs = {
      ...inputs,
      pitchSource: 'chord-voicing',
      range: { startStep: 0, endStep: 1 },
      chords: [{ ...chords[0], voicing: ['C4'] }]
    }
    expect(varyArpNotes(impossible, onePitchVoicing, 'pitches', 65)).toEqual(impossible)
    expect(varyArpNotes([], inputs, 'feel', 2)).toEqual([])
  })
})
