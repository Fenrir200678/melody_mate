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

export function generateMelody(
  scale: Scale,
  rhythm: RhythmPattern,
  bars: number,
  useMotifRepetition: boolean,
  useNGrams: boolean,
  octave: number,
  useFixedVelocity: boolean,
  fixedVelocity: number,
  startWithRootNote: boolean = false
): Melody {
  const notes: Note[] = []
  if (!scale.notes.length || !rhythm.steps.length) {
    return { notes }
  }

  if (useNGrams) {
    return generateNGramMelody(scale, rhythm, bars, octave, useFixedVelocity, fixedVelocity, startWithRootNote)
  } else {
    return generateSimpleMelody(
      scale,
      rhythm,
      bars,
      useMotifRepetition,
      octave,
      useFixedVelocity,
      fixedVelocity,
      startWithRootNote
    )
  }
}

function generateSimpleMelody(
  scale: Scale,
  rhythm: RhythmPattern,
  bars: number,
  useMotifRepetition: boolean,
  octave: number,
  useFixedVelocity: boolean,
  fixedVelocity: number,
  startWithRootNote: boolean = false
): Melody {
  const notes: Note[] = []
  const trainingData = createTrainingData(scale.notes)
  const markovTable = buildMarkovTable(trainingData, 1)
  let currentPitch = startWithRootNote ? scale.notes[0] : choose(scale.notes)
  const motif: Note[] = []

  for (let i = 0; i < bars; i++) {
    if (useMotifRepetition && i === 2 && motif.length > 0) {
      notes.push(...motif)
      currentPitch = motif[motif.length - 1].pitch
      continue
    }

    const currentBarNotes: Note[] = []
    for (let j = 0; j < rhythm.steps.length; j++) {
      const duration = rhythm.steps[j]

      // For the very first note, use the initial currentPitch (which might be root note)
      // For all subsequent notes, generate the next pitch using Markov chain
      if (!(i === 0 && j === 0)) {
        const transitions = getTransitions(markovTable, [currentPitch])
        let nextPitch: string

        if (!transitions) {
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
      }

      const notePitch = getPitchWithOctave(currentPitch, octave)
      const velocity = useFixedVelocity ? fixedVelocity / 127 : 0.8 + Math.random() * 0.2
      const newNote: Note = {
        pitch: notePitch,
        duration,
        velocity
      }
      currentBarNotes.push(newNote)
    }

    if (useMotifRepetition && i === 0) {
      motif.push(...currentBarNotes)
    }
    notes.push(...currentBarNotes)
  }
  return { notes }
}

function generateNGramMelody(
  scale: Scale,
  rhythm: RhythmPattern,
  bars: number,
  octave: number,
  useFixedVelocity: boolean,
  fixedVelocity: number,
  startWithRootNote: boolean = false
): Melody {
  const notes: Note[] = []
  const trainingData = createTrainingData(scale.notes)
  const markovTable = buildMarkovTable(trainingData, 2)
  const simpleMarkovTable = buildMarkovTable(trainingData, 1)

  const pitchHistory: string[] = [startWithRootNote ? scale.notes[0] : choose(scale.notes)]
  notes.push({
    pitch: getPitchWithOctave(pitchHistory[0], octave),
    duration: rhythm.steps[0] || '4n',
    velocity: useFixedVelocity ? fixedVelocity / 127 : 0.8 + Math.random() * 0.2
  })

  // This loop needs to account for the first note already being added.
  const totalNotesToGenerate = bars * rhythm.steps.length
  let generatedNotesCount = 1

  while (generatedNotesCount < totalNotesToGenerate) {
    const currentStepIndex = (generatedNotesCount - 1) % rhythm.steps.length

    const state = pitchHistory.length >= 2 ? pitchHistory.slice(-2) : pitchHistory.slice(-1)
    const tableToUse = pitchHistory.length >= 2 ? markovTable : simpleMarkovTable
    const currentPitchForWeighting = pitchHistory[pitchHistory.length - 1]
    const duration = rhythm.steps[currentStepIndex]

    const transitions = getTransitions(tableToUse, state)
    let nextPitch: string

    if (!transitions) {
      nextPitch = choose(scale.notes)
    } else {
      const { notes: possibleNotes, weights: newWeights } = applyMusicalWeighting(
        transitions,
        currentPitchForWeighting,
        scale.notes
      )
      nextPitch = chooseWeighted(possibleNotes, newWeights)
    }

    pitchHistory.push(nextPitch)
    if (pitchHistory.length > 2) {
      pitchHistory.shift()
    }

    notes.push({
      pitch: getPitchWithOctave(nextPitch, octave),
      duration,
      velocity: useFixedVelocity ? fixedVelocity / 127 : 0.8 + Math.random() * 0.2
    })
    generatedNotesCount++
  }

  return { notes }
}

function getPitchWithOctave(pitch: string, octave: number): string {
  // Entfernt alle Ziffern am Ende (Oktave) und hängt die gewünschte Oktave an
  return pitch.replace(/[0-9]+$/, '') + octave
}
