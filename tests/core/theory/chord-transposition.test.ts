import { describe, expect, it } from 'vitest'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import {
  findClosestOctavePitch,
  getShortestKeyDistance,
  mapPitchToScale,
  resolvePitchClassToScale,
  transposeChordEvent,
  transposeChordProgression
} from '../../../src/core/theory/chord-transposition'

function sampleChord(
  id: string,
  name: string,
  roman: string,
  voicing: string[],
  startBar = 0,
  durationBars = 1,
  inversion = 0
): ChordEvent {
  return {
    id,
    name,
    roman,
    notes: voicing.map((p) => p.replace(/\d+$/, '')),
    voicing,
    startBar,
    durationBars,
    inversion
  }
}

describe('chord-transposition', () => {
  describe('getShortestKeyDistance', () => {
    it('calculates the closest chromatic displacement between root keys', () => {
      expect(getShortestKeyDistance('C', 'C')).toBe(0)
      expect(getShortestKeyDistance('C', 'C#')).toBe(1)
      expect(getShortestKeyDistance('C', 'D')).toBe(2)
      expect(getShortestKeyDistance('C', 'Eb')).toBe(3)
      expect(getShortestKeyDistance('C', 'E')).toBe(4)
      expect(getShortestKeyDistance('C', 'F')).toBe(5)
      expect(getShortestKeyDistance('C', 'B')).toBe(-1)
      expect(getShortestKeyDistance('C', 'Bb')).toBe(-2)
      expect(getShortestKeyDistance('C', 'A')).toBe(-3)
      expect(getShortestKeyDistance('C', 'Ab')).toBe(-4)
      expect(getShortestKeyDistance('C', 'G')).toBe(-5)
    })
  })

  describe('findClosestOctavePitch', () => {
    it('picks the octave that minimizes distance to the target MIDI value', () => {
      // E3 is MIDI 52 -> Eb3 is MIDI 51 (closest)
      expect(findClosestOctavePitch('Eb', 52)).toBe('Eb3')
      // B3 is MIDI 59 -> Bb3 is MIDI 58 (closest)
      expect(findClosestOctavePitch('Bb', 59)).toBe('Bb3')
      // C3 (48) + 2 semitones = 50 -> D3 (MIDI 50)
      expect(findClosestOctavePitch('D', 50)).toBe('D3')
      // C3 (48) - 1 semitone = 47 -> B2 (MIDI 47)
      expect(findClosestOctavePitch('B', 47)).toBe('B2')
    })
  })

  describe('resolvePitchClassToScale', () => {
    it('maps diatonic scale degrees across equal-length scales', () => {
      // C Major -> C Minor
      expect(resolvePitchClassToScale('C', 'C', 'major', 'C', 'minor')).toBe('C')
      expect(resolvePitchClassToScale('D', 'C', 'major', 'C', 'minor')).toBe('D')
      expect(resolvePitchClassToScale('E', 'C', 'major', 'C', 'minor')).toBe('Eb')
      expect(resolvePitchClassToScale('F', 'C', 'major', 'C', 'minor')).toBe('F')
      expect(resolvePitchClassToScale('G', 'C', 'major', 'C', 'minor')).toBe('G')
      expect(resolvePitchClassToScale('A', 'C', 'major', 'C', 'minor')).toBe('Ab')
      expect(resolvePitchClassToScale('B', 'C', 'major', 'C', 'minor')).toBe('Bb')

      // C Major -> C Dorian (natural 6th: A)
      expect(resolvePitchClassToScale('A', 'C', 'major', 'C', 'dorian')).toBe('A')
      expect(resolvePitchClassToScale('E', 'C', 'major', 'C', 'dorian')).toBe('Eb')

      // C Major -> C Harmonic Minor (leading tone: B)
      expect(resolvePitchClassToScale('B', 'C', 'major', 'C', 'harmonic minor')).toBe('B')
      expect(resolvePitchClassToScale('A', 'C', 'major', 'C', 'harmonic minor')).toBe('Ab')
    })

    it('maps pitch classes across root key changes', () => {
      // C Major -> D Major
      expect(resolvePitchClassToScale('C', 'C', 'major', 'D', 'major')).toBe('D')
      expect(resolvePitchClassToScale('E', 'C', 'major', 'D', 'major')).toBe('F#')
      expect(resolvePitchClassToScale('G', 'C', 'major', 'D', 'major')).toBe('A')
    })

    it('snaps pitches when target scale has different length', () => {
      // C Major (7) -> C Major Pentatonic (5: C, D, E, G, A)
      expect(resolvePitchClassToScale('F', 'C', 'major', 'C', 'major pentatonic')).toBe('E')
      expect(resolvePitchClassToScale('B', 'C', 'major', 'C', 'major pentatonic')).toBe('C')
    })
  })

  describe('mapPitchToScale', () => {
    it('transposes pitches preserving register and octave stability', () => {
      expect(mapPitchToScale('C3', 'C', 'major', 'C', 'minor')).toBe('C3')
      expect(mapPitchToScale('E3', 'C', 'major', 'C', 'minor')).toBe('Eb3')
      expect(mapPitchToScale('G3', 'C', 'major', 'C', 'minor')).toBe('G3')
      expect(mapPitchToScale('B3', 'C', 'major', 'C', 'minor')).toBe('Bb3')

      // Key change: C3 up to D3
      expect(mapPitchToScale('C3', 'C', 'major', 'D', 'major')).toBe('D3')
      expect(mapPitchToScale('E3', 'C', 'major', 'D', 'major')).toBe('F#3')
      expect(mapPitchToScale('G3', 'C', 'major', 'D', 'major')).toBe('A3')

      // Key change: C3 down to B2
      expect(mapPitchToScale('C3', 'C', 'major', 'B', 'major')).toBe('B2')
    })
  })

  describe('transposeChordEvent', () => {
    it('transposes C Major triad to Cm in C Minor', () => {
      const chord = sampleChord('c-1', 'C', 'I', ['C3', 'E3', 'G3'], 0, 1)
      const transposed = transposeChordEvent(chord, 'C', 'major', 'C', 'minor')

      expect(transposed.name).toBe('Cm')
      expect(transposed.roman).toBe('i')
      expect(transposed.voicing).toEqual(['C3', 'Eb3', 'G3'])
      expect(transposed.startBar).toBe(0)
      expect(transposed.durationBars).toBe(1)
    })

    it('transposes inverted chords preserving voicing order and voice leading', () => {
      // First inversion C Major: E3 - G3 - C4
      const chord = sampleChord('c-1', 'C', 'I', ['E3', 'G3', 'C4'], 0, 1, 1)
      const transposed = transposeChordEvent(chord, 'C', 'major', 'C', 'minor')

      expect(transposed.name).toBe('Cm')
      expect(transposed.voicing).toEqual(['Eb3', 'G3', 'C4'])
      expect(transposed.inversion).toBe(1)
    })

    it('transposes seventh chords accurately', () => {
      const chord = sampleChord('c-1', 'Cmaj7', 'Imaj7', ['C3', 'E3', 'G3', 'B3'], 0, 1)
      const transposed = transposeChordEvent(chord, 'C', 'major', 'C', 'minor')

      expect(transposed.name).toBe('Cm7')
      expect(transposed.voicing).toEqual(['C3', 'Eb3', 'G3', 'Bb3'])
    })
  })

  describe('transposeChordProgression', () => {
    it('transposes a standard 4-chord progression (I - V - vi - IV) from C Major to C Minor', () => {
      const chords: ChordEvent[] = [
        sampleChord('1', 'C', 'I', ['C3', 'E3', 'G3'], 0, 1),
        sampleChord('2', 'G', 'V', ['G3', 'B3', 'D4'], 1, 1),
        sampleChord('3', 'Am', 'vi', ['A3', 'C4', 'E4'], 2, 1),
        sampleChord('4', 'F', 'IV', ['F3', 'A3', 'C4'], 3, 1)
      ]

      const result = transposeChordProgression(chords, 'C', 'major', 'C', 'minor')

      expect(result).toHaveLength(4)

      // 1: C -> Cm (i)
      expect(result[0].name).toBe('Cm')
      expect(result[0].roman).toBe('i')
      expect(result[0].voicing).toEqual(['C3', 'Eb3', 'G3'])

      // 2: G -> Gm (v)
      expect(result[1].name).toBe('Gm')
      expect(result[1].roman).toBe('v')
      expect(result[1].voicing).toEqual(['G3', 'Bb3', 'D4'])

      // 3: Am -> Ab (VI)
      expect(result[2].name).toBe('Ab')
      expect(result[2].roman).toBe('VI')
      expect(result[2].voicing).toEqual(['Ab3', 'C4', 'Eb4'])

      // 4: F -> Fm (iv)
      expect(result[3].name).toBe('Fm')
      expect(result[3].roman).toBe('iv')
      expect(result[3].voicing).toEqual(['F3', 'Ab3', 'C4'])
    })

    it('transposes progression diatonically to Dorian mode', () => {
      const chords: ChordEvent[] = [
        sampleChord('1', 'C', 'I', ['C3', 'E3', 'G3'], 0, 1),
        sampleChord('2', 'G', 'V', ['G3', 'B3', 'D4'], 1, 1),
        sampleChord('3', 'Am', 'vi', ['A3', 'C4', 'E4'], 2, 1),
        sampleChord('4', 'F', 'IV', ['F3', 'A3', 'C4'], 3, 1)
      ]

      const result = transposeChordProgression(chords, 'C', 'major', 'C', 'dorian')

      // In C Dorian: degree 6 is A, so degree 6 triad is Adim (vi°)
      expect(result[0].name).toBe('Cm')
      expect(result[1].name).toBe('Gm')
      expect(result[2].name).toBe('Adim')
      expect(result[3].name).toBe('F')
      expect(result[3].roman).toBe('IV')
    })

    it('transposes progression to a new root key (C Major to D Major)', () => {
      const chords: ChordEvent[] = [
        sampleChord('1', 'C', 'I', ['C3', 'E3', 'G3'], 0, 1),
        sampleChord('2', 'G', 'V', ['G3', 'B3', 'D4'], 1, 1),
        sampleChord('3', 'Am', 'vi', ['A3', 'C4', 'E4'], 2, 1),
        sampleChord('4', 'F', 'IV', ['F3', 'A3', 'C4'], 3, 1)
      ]

      const result = transposeChordProgression(chords, 'C', 'major', 'D', 'major')

      expect(result[0].name).toBe('D')
      expect(result[0].roman).toBe('I')
      expect(result[0].voicing).toEqual(['D3', 'F#3', 'A3'])

      expect(result[1].name).toBe('A')
      expect(result[1].roman).toBe('V')
      expect(result[1].voicing).toEqual(['A3', 'C#4', 'E4'])

      expect(result[2].name).toBe('Bm')
      expect(result[2].roman).toBe('vi')
      expect(result[2].voicing).toEqual(['B3', 'D4', 'F#4'])

      expect(result[3].name).toBe('G')
      expect(result[3].roman).toBe('IV')
      expect(result[3].voicing).toEqual(['G3', 'B3', 'D4'])
    })

    it('is reversible: C Major -> C Minor -> C Major preserves the progression', () => {
      const original: ChordEvent[] = [
        sampleChord('1', 'C', 'I', ['C3', 'E3', 'G3'], 0, 1),
        sampleChord('2', 'G', 'V', ['G3', 'B3', 'D4'], 1, 1),
        sampleChord('3', 'Am', 'vi', ['A3', 'C4', 'E4'], 2, 1),
        sampleChord('4', 'F', 'IV', ['F3', 'A3', 'C4'], 3, 1)
      ]

      const minorChords = transposeChordProgression(original, 'C', 'major', 'C', 'minor')
      const restored = transposeChordProgression(minorChords, 'C', 'minor', 'C', 'major')

      expect(restored.map((c) => c.name)).toEqual(['C', 'G', 'Am', 'F'])
      expect(restored.map((c) => c.voicing)).toEqual(original.map((c) => c.voicing))
    })
  })
})
