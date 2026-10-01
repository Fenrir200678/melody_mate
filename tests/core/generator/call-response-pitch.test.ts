import { describe, expect, it } from 'vitest'
import { applyCallAndResponse } from '../../../src/core/generator/call-response'
import type { AppNote } from '../../../src/core/schemas/note.schema'
import { midiToPitch } from '../../../src/core/theory/scale.engine'

const call: AppNote[] = [60, 62, 64, 65, 67].map((midi, index) => ({
  id: `call-${index}`,
  midi,
  pitch: midiToPitch(midi),
  step: index * 2,
  durationSteps: 2,
  velocity: 90,
  isMuted: false
}))
const chords = [{ id: 'c', name: 'C', notes: ['C', 'E', 'G'], roman: 'I', voicing: [], startBar: 0, durationBars: 2 }]

describe('call response pitch contour', () => {
  it('keeps intermediate endings open when the nearest open tone lies below the register', () => {
    const lowCall = [60, 62, 60, 62].map((midi, index) => ({ ...call[index], midi, pitch: midiToPitch(midi) }))
    const notes = applyCallAndResponse(lowCall, 4, 16, 'C', 'major', chords, 0, () => 0.9, 0, {
      style: 'contrast',
      variation: 0,
      chordAdherence: 1,
      minOctave: 4,
      maxOctave: 4
    }).filter((note) => note.step >= 16 && note.step < 32)
    // The run guard bends the third answer note away from C4, so the open
    // intermediate ending resolves to the dominant instead of the supertonic.
    expect(notes.at(-1)?.pitch).toBe('G4')
  })

  it('continues raw intervals instead of feeding chord-rounded pitches back into the sequence', () => {
    const notes = applyCallAndResponse(call, 2, 16, 'C', 'major', chords, 0, () => 0.9, 0, {
      style: 'continue',
      variation: 0,
      chordAdherence: 1,
      minOctave: 4,
      maxOctave: 5
    }).filter((note) => note.step >= 16)
    // A4 is harmonically anchored to G4, but the following +2 step still
    // starts from A4 and reaches B4 rather than starting from the rounded G4.
    expect(notes.slice(0, 2).map((note) => note.pitch)).toEqual(['G4', 'B4'])
  })

  it('honors zero adherence even with zero answer variation', () => {
    const notes = applyCallAndResponse(call, 2, 16, 'C', 'major', chords, 0, () => 0.9, 0, {
      style: 'continue',
      variation: 0,
      chordAdherence: 0,
      minOctave: 4,
      maxOctave: 5
    }).filter((note) => note.step >= 16)
    expect(notes.slice(0, 2).map((note) => note.pitch)).toEqual(['A4', 'B4'])
  })
})
