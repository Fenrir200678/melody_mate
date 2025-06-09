import type { Melody, Note, RhythmPattern, Scale } from '@/models'
import { buildMarkovTable } from '@/utils/markov'
import { choose } from '@/utils/random-chooser'
import { getNextPitch } from '@/utils/pitch'
import { calculateVelocity } from '@/utils/velocity'

/**
 * Creates training data for the Markov chain.
 * @param notes - Array of notes to create training data from.
 * @returns Array of sequences for training.
 */
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

export type MelodyGenerationOptions = {
  scale: Scale
  rhythm: RhythmPattern
  bars: number
  octave: number
  useMotifRepetition: boolean
  useNGrams: boolean
  useFixedVelocity: boolean
  fixedVelocity: number
  startWithRootNote?: boolean
}

/**
 * Generates a melody based on the given scale, rhythm, and parameters.
 * @param options - The melody generation options.
 * @returns The generated melody.
 */
export function generateMelody(options: MelodyGenerationOptions): Melody {
  const { scale, rhythm, useNGrams } = options

  if (!scale.notes.length || !rhythm.steps.length) {
    return { notes: [] }
  }

  if (useNGrams) {
    return _generateNGramMelody(options)
  } else {
    return _generateSimpleMelody(options)
  }
}

/**
 * Generates a simple melody based on the given scale, rhythm, and parameters.
 * @param options - The melody generation options.
 * @returns The generated melody.
 */
function _generateSimpleMelody(options: MelodyGenerationOptions): Melody {
  const {
    scale,
    rhythm,
    bars,
    useMotifRepetition,
    octave,
    useFixedVelocity,
    fixedVelocity,
    startWithRootNote = false
  } = options

  const notes: Note[] = []
  const trainingData = createTrainingData(scale.notes)
  const markovTable = buildMarkovTable(trainingData, 1)
  let currentPitch = startWithRootNote ? scale.notes[0] : choose(scale.notes)
  const motif: Note[] = []

  // Check if rhythm has binary pattern (new format) or just steps (old format)
  const hasPattern = rhythm.pattern && rhythm.pattern.length > 0
  const stepsPerBar = hasPattern ? rhythm.pattern!.length : rhythm.steps.length

  for (let i = 0; i < bars; i++) {
    if (useMotifRepetition && i === 2 && motif.length > 0) {
      notes.push(...motif)
      if (motif.length > 0) {
        // BUG FIX: Strip octave from the full pitch string to get the scale note
        currentPitch = motif[motif.length - 1].pitch.replace(/[0-9]+$/, '')
      }
      continue
    }

    const currentBarNotes: Note[] = []
    let noteIndex = 0 // Track which note we're generating for duration lookup

    for (let j = 0; j < stepsPerBar; j++) {
      const shouldPlayNote = hasPattern ? rhythm.pattern![j] === 1 : true

      if (shouldPlayNote) {
        // Use the calculated note duration for this specific note (cycle through pattern for multiple bars)
        const duration =
          hasPattern && rhythm.noteDurations
            ? rhythm.noteDurations[noteIndex % rhythm.noteDurations.length]
            : rhythm.steps[j] || rhythm.subdivision || '16n'

        // For all notes after the first, generate the next pitch using Markov chain
        if (notes.length > 0 || currentBarNotes.length > 0) {
          currentPitch = getNextPitch([currentPitch], markovTable, scale, currentPitch)
        }

        const notePitch = getPitchWithOctave(currentPitch, octave)
        const velocity = calculateVelocity({ useFixed: useFixedVelocity, fixedValue: fixedVelocity })
        const newNote: Note = {
          pitch: notePitch,
          duration,
          velocity
        }
        currentBarNotes.push(newNote)
        noteIndex++ // Increment for next note duration
      }
      // If shouldPlayNote is false, we skip this step (rest)
    }

    if (useMotifRepetition && i === 0) {
      motif.push(...currentBarNotes)
    }
    notes.push(...currentBarNotes)
  }
  return { notes }
}

/**
 * Generates an N-gram melody based on the given scale, rhythm, and parameters.
 * @param options - The melody generation options.
 * @returns The generated melody.
 */
function _generateNGramMelody(options: MelodyGenerationOptions): Melody {
  const { scale, rhythm, bars, octave, useFixedVelocity, fixedVelocity, startWithRootNote = false } = options

  const notes: Note[] = []
  const trainingData = createTrainingData(scale.notes)
  const markovTable = buildMarkovTable(trainingData, 2)
  const simpleMarkovTable = buildMarkovTable(trainingData, 1)

  // Check if rhythm has binary pattern (new format) or just steps (old format)
  const hasPattern = rhythm.pattern && rhythm.pattern.length > 0
  const stepsPerBar = hasPattern ? rhythm.pattern!.length : rhythm.steps.length

  const pitchHistory: string[] = [startWithRootNote ? scale.notes[0] : choose(scale.notes)]
  let noteIndex = 0 // Track which note we're generating for duration lookup

  // Handle the very first note separately to simplify the main loop
  const firstStepShouldPlay = hasPattern ? rhythm.pattern![0] === 1 : true
  if (firstStepShouldPlay) {
    const duration =
      hasPattern && rhythm.noteDurations
        ? rhythm.noteDurations[noteIndex % rhythm.noteDurations.length]
        : rhythm.steps[0] || rhythm.subdivision || '4n'

    const velocity = calculateVelocity({ useFixed: useFixedVelocity, fixedValue: fixedVelocity })

    notes.push({
      pitch: getPitchWithOctave(pitchHistory[0], octave),
      duration,
      velocity
    })
    noteIndex++
  }

  // Generate the rest of the notes starting from the second step
  const totalStepsToGenerate = bars * stepsPerBar
  for (let currentStepIndex = 1; currentStepIndex < totalStepsToGenerate; currentStepIndex++) {
    const stepInBar = currentStepIndex % stepsPerBar
    const shouldPlayNote = hasPattern ? rhythm.pattern![stepInBar] === 1 : true

    if (shouldPlayNote) {
      const state = pitchHistory.length >= 2 ? pitchHistory.slice(-2) : pitchHistory.slice(-1)
      const tableToUse = pitchHistory.length >= 2 ? markovTable : simpleMarkovTable
      const currentPitchForWeighting = pitchHistory[pitchHistory.length - 1]

      const nextPitch = getNextPitch(state, tableToUse, scale, currentPitchForWeighting)

      pitchHistory.push(nextPitch)
      if (pitchHistory.length > 2) {
        pitchHistory.shift()
      }

      const duration =
        hasPattern && rhythm.noteDurations
          ? rhythm.noteDurations[noteIndex % rhythm.noteDurations.length]
          : rhythm.steps[stepInBar] || rhythm.subdivision || '16n'

      const velocity = calculateVelocity({ useFixed: useFixedVelocity, fixedValue: fixedVelocity })

      notes.push({
        pitch: getPitchWithOctave(nextPitch, octave),
        duration,
        velocity
      })
      noteIndex++ // Increment for next note duration
    }
  }

  return { notes }
}

/**
 * Gets the pitch with the octave from the pitch string.
 * @param pitch - The pitch string to get the octave from.
 * @param octave - The octave to add to the pitch.
 * @returns The pitch with the octave.
 */
function getPitchWithOctave(pitch: string, octave: number): string {
  return pitch.replace(/[0-9]+$/, '') + octave
}
