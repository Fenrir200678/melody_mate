import type { Melody, Note, RhythmPattern, Scale } from '@/models'
import { buildMarkovTable, getTransitions } from '@/utils/markov'
import { choose, chooseWeighted } from '@/utils/random'
import { applyMusicalWeighting } from '@/utils/music-theory'

function createTrainingData(notes: string[]): string[][] {
  if (notes.length < 5) {
    // Need at least 5 notes for some patterns
    return [notes, [...notes].reverse()]
  }

  const sequences: string[][] = []
  const tonic = notes[0]
  const dominant = notes[4]
  const leadingTone = notes[notes.length - 1]

  // 1. Ascending and Descending Scale (resolving to tonic)
  sequences.push([...notes, tonic])
  sequences.push([...[...notes].reverse(), tonic])

  // 2. Arpeggios (1-3-5) up and down
  const triad = [notes[0], notes[2], notes[4], tonic]
  sequences.push(triad)
  sequences.push([...triad].reverse())

  // 3. Turn patterns (e.g., upper turn on the second degree)
  const upperTurnOnSecond = [notes[1], notes[2], notes[1], notes[0], notes[1]]
  sequences.push(upperTurnOnSecond)

  // 4. V-I Cadence based patterns (e.g., 2-5-1 and 7-1)
  sequences.push([notes[1], dominant, tonic])
  sequences.push([leadingTone, tonic])

  // 5. Short stepwise fragments
  for (let i = 0; i < notes.length - 2; i++) {
    sequences.push([notes[i], notes[i + 1], notes[i + 2]]) // 3-note ascending
    sequences.push([notes[i + 2], notes[i + 1], notes[i]]) // 3-note descending
  }

  // 6. Add the original simple arpeggio for more variety
  const arpeggio: string[] = []
  for (let i = 0; i < notes.length; i += 2) {
    arpeggio.push(notes[i])
  }
  arpeggio.push(notes[1]) // Add second degree to lead back
  arpeggio.push(tonic) // Resolve to tonic
  sequences.push(arpeggio)

  return sequences
}

export function generateMelody(scale: Scale, rhythm: RhythmPattern, bars: number, useMotifRepetition: boolean): Melody {
  const notes: Note[] = []
  if (!scale.notes.length || !rhythm.steps.length) {
    return { notes }
  }

  const trainingData = createTrainingData(scale.notes)
  const markovTable = buildMarkovTable(trainingData)

  let currentPitch = choose(scale.notes)
  const motif: Note[] = []

  for (let i = 0; i < bars; i++) {
    // On bar 3 (index 2), repeat the motif if it exists and the option is enabled
    if (useMotifRepetition && i === 2 && motif.length > 0) {
      notes.push(...motif)
      // Update the current pitch to the last note of the motif to ensure smooth transition
      currentPitch = motif[motif.length - 1].pitch
      continue // Skip generation for this bar
    }

    const currentBarNotes: Note[] = []
    for (const duration of rhythm.steps) {
      const transitions = getTransitions(markovTable, currentPitch)
      let nextPitch: string

      if (!transitions) {
        // No learned transition from this note, pick a random one from the scale
        nextPitch = choose(scale.notes)
      } else {
        const { notes: possibleNotes, weights: newWeights } = applyMusicalWeighting(
          transitions,
          currentPitch,
          scale.notes
        )
        nextPitch = chooseWeighted(possibleNotes, newWeights)
      }
      currentPitch = nextPitch

      const newNote: Note = {
        pitch: currentPitch,
        duration,
        velocity: 0.8 + Math.random() * 0.2 // slight variation
      }
      currentBarNotes.push(newNote)
    }

    // Save the first bar as the motif if the option is enabled
    if (useMotifRepetition && i === 0) {
      motif.push(...currentBarNotes)
    }
    notes.push(...currentBarNotes)
  }

  return { notes }
}
