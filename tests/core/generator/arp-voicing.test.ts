import { describe, expect, it } from 'vitest'
import {
  findActiveArpChord,
  getArpChordVoicingPitches,
  getArpVoicingPassingPitches,
  getArpVoicingSpan,
  isArpVoicingAvailable
} from '../../../src/core/generator/arp-voicing'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import { STEPS_PER_BAR } from '../../../src/core/schemas/project.schema'

const cChord: ChordEvent = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'C',
  roman: 'I',
  notes: ['C', 'E', 'G'],
  voicing: ['C3', 'E3', 'G3'],
  startBar: 0,
  durationBars: 1
}

const gChord: ChordEvent = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'G',
  roman: 'V',
  notes: ['G', 'B', 'D'],
  voicing: ['G3', 'B3', 'D4'],
  startBar: 1,
  durationBars: 1
}

const C_MAJOR = new Set([0, 2, 4, 5, 7, 9, 11])
const C_TRIAD = new Set([0, 4, 7])

describe('getArpChordVoicingPitches', () => {
  it('resolves ascending absolute MIDI pitches from the voicing', () => {
    expect(getArpChordVoicingPitches(cChord)).toEqual({
      midis: [48, 52, 55],
      names: ['C3', 'E3', 'G3'],
      lowMidi: 48,
      highMidi: 55
    })
  })

  it('sorts, removes identical duplicate MIDI pitches and keeps enharmonic spellings distinct', () => {
    const messy: ChordEvent = { ...cChord, voicing: ['G3', 'C3', 'E3', 'C3', 'B#2'] }
    expect(getArpChordVoicingPitches(messy)?.midis).toEqual([48, 52, 55])
  })

  it('returns null for a missing chord or a voicing without absolute pitches', () => {
    expect(getArpChordVoicingPitches(undefined)).toBeNull()
    expect(getArpChordVoicingPitches({ ...cChord, voicing: ['C', 'E', 'G'] })).toBeNull()
    expect(getArpChordVoicingPitches({ ...cChord, voicing: ['H#', '??'] })).toBeNull()
  })
})

describe('findActiveArpChord', () => {
  it('resolves the chord covering a step, including fractional bar boundaries', () => {
    expect(findActiveArpChord([cChord, gChord], 0)?.id).toBe(cChord.id)
    expect(findActiveArpChord([cChord, gChord], STEPS_PER_BAR)?.id).toBe(gChord.id)
    expect(findActiveArpChord([cChord, gChord], 2 * STEPS_PER_BAR)).toBeUndefined()
    expect(findActiveArpChord(undefined, 0)).toBeUndefined()
  })
})

describe('isArpVoicingAvailable', () => {
  it('is only true in voicing mode when a usable user chord is active', () => {
    expect(isArpVoicingAvailable('chord-voicing', [cChord], 0)).toBe(true)
    expect(isArpVoicingAvailable('pitch-classes', [cChord], 0)).toBe(false)
    expect(isArpVoicingAvailable('chord-voicing', [cChord], STEPS_PER_BAR)).toBe(false)
    expect(isArpVoicingAvailable('chord-voicing', [{ ...cChord, voicing: ['C'] }], 0)).toBe(false)
  })
})

describe('getArpVoicingSpan', () => {
  it('spans every chord overlapping the range so the UI can show the real register', () => {
    const span = getArpVoicingSpan([cChord, gChord], { startStep: 0, endStep: 2 * STEPS_PER_BAR })
    expect(span?.lowPitch).toBe('C3')
    expect(span?.highPitch).toBe('D4')
    expect(span?.chordCount).toBe(2)
  })

  it('ignores chords outside the range and returns null without usable voicings', () => {
    expect(getArpVoicingSpan([gChord], { startStep: 0, endStep: 4 })).toBeNull()
    expect(getArpVoicingSpan([], { startStep: 0, endStep: 16 })).toBeNull()
    expect(getArpVoicingSpan([{ ...cChord, voicing: ['C'] }], { startStep: 0, endStep: 16 })).toBeNull()
  })

  it('counts only overlapping chords that contribute a usable voicing', () => {
    expect(getArpVoicingSpan([cChord, gChord], { startStep: 0, endStep: STEPS_PER_BAR })?.chordCount).toBe(1)
    const unvoiced = getArpVoicingSpan([{ ...cChord, voicing: ['C'] }, gChord], {
      startStep: 0,
      endStep: 2 * STEPS_PER_BAR
    })
    expect(unvoiced?.chordCount).toBe(1)
    expect(unvoiced?.lowPitch).toBe('G3')
  })
})

describe('getArpVoicingPassingPitches', () => {
  it('offers only nearby diatonic non-chord tones and biases toward the travel direction', () => {
    // C3: above it only D3 is diatonic and non-chord; B2 lies two semitones below.
    expect(getArpVoicingPassingPitches(48, C_MAJOR, C_TRIAD, 1)).toEqual([50])
    expect(getArpVoicingPassingPitches(48, C_MAJOR, C_TRIAD, -1)).toEqual([47])
    expect(getArpVoicingPassingPitches(55, C_MAJOR, C_TRIAD, -1)).toEqual([53])
    // No travel yet (direction 0): both flanking candidates stay available, unbiased.
    expect(getArpVoicingPassingPitches(48, C_MAJOR, C_TRIAD, 0)).toEqual([50, 47])
  })

  it('returns an empty list when the neighbours are not scale conform', () => {
    // A triad-only scale leaves no non-chord neighbour; F4 sits between two chord tones
    // and its remaining neighbours are not diatonic.
    expect(getArpVoicingPassingPitches(48, C_TRIAD, C_TRIAD, 1)).toEqual([])
    expect(getArpVoicingPassingPitches(65, C_MAJOR, C_TRIAD, 1)).toEqual([])
  })

  it('never proposes a chord tone, so 100% adherence stays voicing-only', () => {
    for (let midi = 0; midi <= 127; midi++) {
      for (const pitch of getArpVoicingPassingPitches(midi, C_MAJOR, C_TRIAD, 1)) {
        expect(C_TRIAD.has(pitch % 12)).toBe(false)
        expect(Math.abs(pitch - midi)).toBeLessThanOrEqual(2)
      }
    }
  })
})
