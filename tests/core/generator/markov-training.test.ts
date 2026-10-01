import { Note } from 'tonal'
import { describe, expect, it } from 'vitest'
import { generateScaleTrainingSequences } from '../../../src/core/generator/markov-training'

describe('generateScaleTrainingSequences', () => {
  it('covers C major pentatonic and uses its chromatic dominant cadence', () => {
    const sequences = generateScaleTrainingSequences('C', 'major pentatonic')

    expect(sequences[0]).toEqual(['C', 'D', 'E', 'G', 'A', 'C'])
    expect(sequences).toContainEqual(['G', 'C'])
    expect(sequences).toContainEqual(['D', 'G', 'C'])
    expect(sequences).not.toContainEqual(['B', 'C'])
    for (const pitch of ['C', 'D', 'E', 'G', 'A']) {
      expect(sequences.some((sequence) => sequence.includes(pitch))).toBe(true)
    }

    const scaleChromas = new Set(['C', 'D', 'E', 'G', 'A'].map((note) => Note.chroma(note)))
    const generatedTriads = sequences.filter((sequence) => sequence.length === 4 && sequence[0] === sequence[3])
    expect(generatedTriads.length).toBeGreaterThan(0)
    for (const sequence of generatedTriads) {
      const root = Note.chroma(sequence[0]) ?? 0
      const third = ((Note.chroma(sequence[1]) ?? 0) - root + 12) % 12
      const fifth = ((Note.chroma(sequence[2]) ?? 0) - root + 12) % 12
      expect(scaleChromas.has(Note.chroma(sequence[0]))).toBe(true)
      expect(scaleChromas.has(Note.chroma(sequence[1]))).toBe(true)
      expect(scaleChromas.has(Note.chroma(sequence[2]))).toBe(true)
      expect([
        [4, 7],
        [3, 7],
        [3, 6]
      ]).toContainEqual([third, fifth])
    }
  })

  it('covers whole-tone degrees without inventing dominant cadences or tertian triads', () => {
    const sequences = generateScaleTrainingSequences('C', 'whole tone')
    const wholeToneNotes = ['C', 'D', 'E', 'F#', 'G#', 'A#']

    expect(sequences[0]).toEqual([...wholeToneNotes, 'C'])
    for (const pitch of wholeToneNotes) {
      expect(sequences.some((sequence) => sequence.includes(pitch))).toBe(true)
    }
    expect(sequences).not.toContainEqual(['G', 'C'])
    expect(sequences).not.toContainEqual(['B', 'C'])
    expect(sequences.some((sequence) => sequence.length === 4 && sequence[0] === sequence[3])).toBe(false)
  })
})
