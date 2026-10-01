import { describe, expect, it, vi } from 'vitest'
import { resolveStructuredPitch, type StructuredPitchOptions } from '../../../src/core/generator/structured-pitch'

const options: StructuredPitchOptions = {
  root: 'C',
  scaleName: 'major',
  minOctave: 3,
  maxOctave: 5,
  chordNotes: ['G', 'B', 'D'],
  emphasizeChord: true,
  chordAdherence: 1,
  pentatonicMode: false,
  history: [],
  rng: () => 0.5
}

describe('structured pitch adaptation', () => {
  it('preserves altered chord tones while keeping pentatonic constraints strict', () => {
    const altered = { ...options, root: 'A', scaleName: 'minor', chordNotes: ['E', 'G#', 'B', 'D'] }
    expect(resolveStructuredPitch(68, altered).midi).toBe(68)
    expect(resolveStructuredPitch(68, { ...altered, emphasizeChord: false }).midi).toBe(68)
    expect(resolveStructuredPitch(68, { ...altered, scaleName: 'minor pentatonic', pentatonicMode: true }).midi).toBe(
      64
    )
  })

  it('leaves a single available chord tone after three repeats using an in-range scale tone', () => {
    expect(
      resolveStructuredPitch(67, {
        ...options,
        minOctave: 4,
        maxOctave: 4,
        chordNotes: ['G'],
        history: [{ midi: 67 }, { midi: 67 }, { midi: 67 }]
      }).pitch
    ).toBe('F4')
  })

  it('searches across octave boundaries instead of collapsing C4 and E4 onto D4', () => {
    expect([60, 64, 67].map((midi) => resolveStructuredPitch(midi, options).pitch)).toEqual(['B3', 'D4', 'G4'])
  })

  it('chooses an in-range chord tone before final octave clamping', () => {
    expect(resolveStructuredPitch(72, { ...options, minOctave: 4, maxOctave: 4 }).pitch).toBe('B4')
  })

  it('preserves passing notes at zero adherence and outside harmonic anchors', () => {
    expect(resolveStructuredPitch(69, { ...options, chordAdherence: 0 }).pitch).toBe('A4')
    expect(resolveStructuredPitch(69, { ...options, emphasizeChord: false }).pitch).toBe('A4')
  })

  it('uses adherence independently of motif variation', () => {
    expect(resolveStructuredPitch(69, { ...options, chordAdherence: 0.4 }).pitch).toBe('A4')
    expect(resolveStructuredPitch(69, { ...options, chordAdherence: 0.6 }).pitch).toBe('G4')
  })

  it('keeps a third repeat possible but breaks the run most of the time', () => {
    const history = [{ midi: 67 }, { midi: 67 }]
    expect(resolveStructuredPitch(67, { ...options, history, rng: () => 0.1 }).pitch).toBe('G4')
    expect(resolveStructuredPitch(67, { ...options, history }).pitch).toBe('B4')
    expect(
      resolveStructuredPitch(67, { ...options, history: [...history, { midi: 67 }], minOctave: 4, maxOctave: 4 }).pitch
    ).toBe('B4')
  })

  it('does not consume randomness when no chord or no probabilistic choice exists', () => {
    const rng = vi.fn(() => 0.5)
    resolveStructuredPitch(64, { ...options, rng })
    resolveStructuredPitch(64, { ...options, rng, chordAdherence: 0 })
    resolveStructuredPitch(64, { ...options, rng, chordNotes: [], chordAdherence: 0.5 })
    expect(rng).not.toHaveBeenCalled()
  })
})
