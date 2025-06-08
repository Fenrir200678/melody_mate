import type { Melody, Note, RhythmPattern, Scale } from '@/models'
import { buildMarkovTable, getNextState } from '@/utils/markov'
import { choose } from '@/utils/random'

function createTrainingData(notes: string[]): string[][] {
  if (notes.length < 2) {
    return [notes]
  }

  const sequences: string[][] = []

  // 1. Ascending sequence
  sequences.push([...notes, notes[0]])

  // 2. Descending sequence
  sequences.push([...[...notes].reverse(), notes[notes.length - 1]])

  // 3. Arpeggios (thirds)
  const arpeggio: string[] = []
  for (let i = 0; i < notes.length; i += 2) {
    arpeggio.push(notes[i])
  }
  arpeggio.push(notes[1]) // Add second degree to lead back
  arpeggio.push(notes[0]) // Resolve to tonic
  sequences.push(arpeggio)

  return sequences
}

export function generateMelody(scale: Scale, rhythm: RhythmPattern, bars: number): Melody {
  const notes: Note[] = []
  if (!scale.notes.length || !rhythm.steps.length) {
    return { notes }
  }

  const trainingData = createTrainingData(scale.notes)
  const markovTable = buildMarkovTable(trainingData)

  let currentPitch = choose(scale.notes)

  for (let i = 0; i < bars; i++) {
    for (const duration of rhythm.steps) {
      const nextPitch = getNextState(markovTable, currentPitch)
      currentPitch = nextPitch ?? choose(scale.notes)

      notes.push({
        pitch: currentPitch,
        duration,
        velocity: 0.8 + Math.random() * 0.2 // slight variation
      })
    }
  }

  return { notes }
}
