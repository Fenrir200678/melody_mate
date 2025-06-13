import type { Melody, AppNote, RhythmPattern, AppScale } from '@/ts/models'
import type { MelodyGenerationOptions } from '@/ts/types/melody.types'
import { STEPS_PER_16N, STEPS_PER_32N, STEPS_PER_4N, STEPS_PER_8N } from '@/ts/consts'
import { buildMarkovTable, type MarkovTable } from '@/utils/markov'
import { getNextPitch } from '@/utils/pitch'
import { calculateVelocity } from '@/utils/velocity'
import { motifs } from '@/data/motifs'
import { Chord, Note, Scale } from 'tonal'

/**
 * Creates training data for the Markov chain.
 * @param scale - The scale object to create training data from.
 * @param useMotifs - Flag to indicate whether to use motifs for training.
 * @returns Array of sequences for training.
 */
function createTrainingData(scale: AppScale, useMotifs = false): string[][] {
  const sequences: string[][] = []
  const { name } = scale
  const nameParts = name.split(' ')
  const key = nameParts[0]
  const type = nameParts.slice(1).join(' ')

  // Skalen- und Akkordnoten mit tonal.js holen
  const scaleNotes = Scale.get(name).notes.map((n) => Note.pitchClass(n))
  const tonic = scaleNotes[0]
  const dominant = scaleNotes[4] // 5. Stufe
  const leadingTone = scaleNotes[scaleNotes.length - 1]

  // 1. Ascending und Descending Scale (mit Auflösung auf Tonic)
  if (scaleNotes.length >= 5) {
    sequences.push([...scaleNotes, tonic])
    sequences.push([[...scaleNotes].reverse(), tonic].flat())

    // 2. Arpeggios (1-3-5) auf- und absteigend
    const chordType = type.toLowerCase().includes('minor') ? 'm' : 'M'
    const triadNotes = Chord.get(key + chordType).notes.map((n) => Note.pitchClass(n))
    if (triadNotes.length > 0) {
      sequences.push([...triadNotes, tonic])
      sequences.push([[...triadNotes].reverse(), tonic].flat())
    }

    // 3. Turn patterns (z.B. upper turn auf der zweiten Stufe)
    if (scaleNotes.length > 2) {
      const upperTurnOnSecond = [scaleNotes[1], scaleNotes[2], scaleNotes[1], scaleNotes[0], scaleNotes[1]]
      sequences.push(upperTurnOnSecond)
    }

    // 4. V-I Kadenz (5-1 und 7-1)
    sequences.push([dominant, tonic])
    sequences.push([leadingTone, tonic])

    // 5. Stepwise fragments
    for (let i = 0; i < scaleNotes.length - 2; i++) {
      sequences.push([scaleNotes[i], scaleNotes[i + 1], scaleNotes[i + 2]])
      sequences.push([scaleNotes[i + 2], scaleNotes[i + 1], scaleNotes[i]])
    }

    // 6. Betonung der Dominante
    sequences.push([tonic, dominant, tonic])
  }

  // 2. Motive aus motifs, falls gewünscht
  if (useMotifs) {
    const stripOctave = (pitch: string): string => Note.pitchClass(pitch)
    motifs.forEach((motif) => {
      sequences.push(motif.notes.map(stripOctave))
    })
  }

  return sequences
}

/**
 * Converts steps to a duration format compatible with midi-writer-js.
 * Uses tick-based durations where T128 = 1 quarter note (beat).
 * @param steps - Number of steps for the duration.
 * @param subdivision - The subdivision (e.g., '16n', '8n', '4n', '32n').
 * @returns Duration in midi-writer-js tick format (e.g., 'T64').
 */
function convertStepsToDuration(steps: number, subdivision: string): string {
  // MIDI-Writer-JS uses T128 = 1 quarter note (beat)
  // Tick values per step for different subdivisions
  const ticksPerStep: Record<string, number> = {
    '64n': 8, // 64th note = 8 ticks per step (128/16)
    '32n': 16, // 32nd note = 16 ticks per step (128/8)
    '16n': 32, // 16th note = 32 ticks per step (128/4)
    '8n': 64, // 8th note = 64 ticks per step (128/2)
    '4n': 128 // quarter note = 128 ticks per step
  }

  const ticksForOneStep = ticksPerStep[subdivision]
  if (!ticksForOneStep) {
    console.warn(`Unsupported subdivision: ${subdivision}. Falling back to 16n (32 ticks per step).`)
    return `T${steps * 32}`
  }

  const totalTicks = steps * ticksForOneStep
  return `T${totalTicks}`
}

function normalizeRhythm(rhythm: RhythmPattern): RhythmPattern {
  if (rhythm.pattern && rhythm.pattern.length > 0) {
    return { ...rhythm, subdivision: rhythm.subdivision || '16n' }
  }

  // Determine the subdivision for the pattern. Fallback to '16n' if not specified.
  const subdivision = rhythm.subdivision || '16n'

  const STEPS_MAPS = {
    '4n': STEPS_PER_4N,
    '8n': STEPS_PER_8N,
    '16n': STEPS_PER_16N,
    '32n': STEPS_PER_32N
  }
  const stepsMap = STEPS_MAPS[subdivision as keyof typeof STEPS_MAPS] || STEPS_PER_16N

  const pattern: (0 | 1)[] = []
  let totalSteps = 0

  for (const duration of rhythm.steps) {
    const stepsForNote = stepsMap[duration as keyof typeof stepsMap] || 0
    if (stepsForNote > 0) {
      pattern.push(1)
      if (stepsForNote > 1) {
        pattern.push(...new Array(stepsForNote - 1).fill(0))
      }
      totalSteps += stepsForNote
    }
  }

  return {
    ...rhythm,
    pattern,
    subdivision,
    steps: new Array(totalSteps).fill(subdivision)
  }
}

/**
 * Generates a melody based on the given scale, rhythm, and parameters.
 * @param options - The melody generation options.
 * @returns The generated melody.
 */
export function generateMelody(options: MelodyGenerationOptions): Melody {
  const { scale, useNGrams } = options
  const rhythm = normalizeRhythm(options.rhythm)

  if (!scale.notes.length || !rhythm.pattern || !rhythm.pattern.length) {
    return { notes: [] }
  }

  const normalizedOptions = { ...options, rhythm }

  if (useNGrams) {
    return _generateNGramMelody(normalizedOptions)
  } else {
    return _generateSimpleMelody(normalizedOptions)
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
    startWithRootNote = false,
    restProbability,
    useMotifTrainingData
  } = options

  const trainingData = createTrainingData(scale, useMotifTrainingData)
  const markovTable = buildMarkovTable(trainingData, 1)

  const rhythmPattern = rhythm.pattern!
  const stepsInRhythmPattern = rhythmPattern.length
  const subdivision = rhythm.subdivision!

  // Calculate steps per bar based on subdivision
  const subdivisionToStepsPerBar: Record<string, number> = {
    '32n': 32,
    '16n': 16,
    '8n': 8,
    '4n': 4
  }
  const STEPS_PER_BAR = subdivisionToStepsPerBar[subdivision] || 16
  const totalSteps = bars * STEPS_PER_BAR

  const noteSteps: number[] = []
  for (let i = 0; i < totalSteps; i++) {
    if (rhythmPattern[i % stepsInRhythmPattern] === 1) {
      noteSteps.push(i)
    }
  }

  if (noteSteps.length === 0) return { notes: [] }

  if (useMotifRepetition && bars >= 4) {
    // Generate the first two bars as the motif
    const motifEndStep = STEPS_PER_BAR * 2
    const motifSteps = noteSteps.filter((step) => step < motifEndStep)
    if (motifSteps.length === 0) {
      // No notes in the first two bars, so fall back to normal generation
      return _generateNotesForSteps(noteSteps, totalSteps, scale, markovTable, octave, subdivision, {
        useFixedVelocity,
        fixedVelocity,
        startWithRootNote,
        restProbability
      })
    }

    const motifNotesResult = _generateNotesForSteps(motifSteps, motifEndStep, scale, markovTable, octave, subdivision, {
      useFixedVelocity,
      fixedVelocity,
      startWithRootNote,
      restProbability
    })
    const motif = motifNotesResult.notes
    const lastMotifPitch = motifNotesResult.lastPitch

    // The third bar is a repetition of the first bar of the motif
    const firstBarStepsInMotif = motif.length > 0 ? motifSteps.filter((s) => s < STEPS_PER_BAR) : []
    const notesInFirstBarOfMotif = firstBarStepsInMotif.length

    const bar3Notes = motif.slice(0, notesInFirstBarOfMotif)

    // Notes for the final bar (bar 4)
    const bar4StartStep = STEPS_PER_BAR * 3
    const bar4Steps = noteSteps.filter((step) => step >= bar4StartStep)
    const finalBarNotes = _generateNotesForSteps(
      bar4Steps,
      totalSteps,
      scale,
      markovTable,
      octave,
      subdivision,
      { useFixedVelocity, fixedVelocity, restProbability },
      lastMotifPitch
    ).notes

    return { notes: [...motif, ...bar3Notes, ...finalBarNotes] }
  }

  return _generateNotesForSteps(noteSteps, totalSteps, scale, markovTable, octave, subdivision, {
    useFixedVelocity,
    fixedVelocity,
    startWithRootNote,
    restProbability
  })
}

/**
 * Generates an N-gram melody based on the given scale, rhythm, and parameters.
 * @param options - The melody generation options.
 * @returns The generated melody.
 */
function _generateNGramMelody(options: MelodyGenerationOptions): Melody {
  const {
    scale,
    rhythm,
    bars,
    octave,
    useFixedVelocity,
    fixedVelocity,
    startWithRootNote = false,
    restProbability,
    useMotifTrainingData,
    n = 2
  } = options

  const trainingData = createTrainingData(scale, useMotifTrainingData)
  const markovTable = buildMarkovTable(trainingData, n)

  const rhythmPattern = rhythm.pattern!
  const subdivision = rhythm.subdivision!

  // Calculate steps per bar based on subdivision
  const subdivisionToStepsPerBar: Record<string, number> = {
    '32n': 32,
    '16n': 16,
    '8n': 8,
    '4n': 4
  }
  const STEPS_PER_BAR = subdivisionToStepsPerBar[subdivision] || 16
  const totalSteps = bars * STEPS_PER_BAR

  const noteSteps: number[] = []
  for (let i = 0; i < totalSteps; i++) {
    if (rhythmPattern[i % rhythmPattern.length] === 1) {
      noteSteps.push(i)
    }
  }

  if (noteSteps.length === 0) return { notes: [] }

  return _generateNotesForSteps(noteSteps, totalSteps, scale, markovTable, octave, subdivision, {
    useFixedVelocity,
    fixedVelocity,
    startWithRootNote,
    restProbability
  })
}

/**
 * Generates notes for the given steps.
 * @private
 */
function _generateNotesForSteps(
  noteSteps: number[],
  totalSteps: number,
  scale: AppScale,
  markovTable: MarkovTable,
  octave: number,
  subdivision: string,
  options: {
    useFixedVelocity: boolean
    fixedVelocity: number
    startWithRootNote?: boolean
    restProbability?: number
    n?: number
  },
  initialPitch?: string
): { notes: AppNote[]; lastPitch: string } {
  const notes: AppNote[] = []
  if (noteSteps.length === 0) return { notes, lastPitch: initialPitch || scale.notes[0] }

  const { useFixedVelocity, fixedVelocity, startWithRootNote, restProbability = 0, n = 1 } = options

  // State for n-gram context
  let context: string[] = []
  if (initialPitch) {
    context = [initialPitch]
  } else {
    context = [scale.notes[0]]
  }

  let lastPitch = context[context.length - 1]
  if (startWithRootNote && !initialPitch) {
    lastPitch = scale.notes[0]
    context = [scale.notes[0]]
  }

  let lastActualPitch = lastPitch
  let consecutiveRests = 0

  for (let i = 0; i < noteSteps.length; i++) {
    const currentStep = noteSteps[i]
    const durationInSteps = i < noteSteps.length - 1 ? noteSteps[i + 1] - currentStep : totalSteps - currentStep
    const duration = convertStepsToDuration(durationInSteps, subdivision)

    // Prevent more than 2 rests in a row
    const forceNote = consecutiveRests >= 2
    const shouldBeRest = !forceNote && Math.random() < restProbability

    if (shouldBeRest) {
      notes.push({
        pitch: null,
        duration,
        velocity: 0
      })
      consecutiveRests++
      // context bleibt gleich
    } else {
      // It's a note
      let nextPitch: string
      if (i === 0 && startWithRootNote && !initialPitch) {
        nextPitch = scale.notes[0]
      } else {
        // Kontext: die letzten n-1 Noten (ohne nulls)
        const contextForNGram = context.slice(-Math.max(1, n - 1)).filter(Boolean)
        nextPitch = getNextPitch(contextForNGram, markovTable, scale, lastActualPitch)
      }

      const velocity = calculateVelocity({ useFixed: useFixedVelocity, fixedValue: fixedVelocity })
      const pitchWithOctave = getPitchWithOctave(nextPitch, octave)

      notes.push({
        pitch: pitchWithOctave,
        duration,
        velocity
      })
      lastActualPitch = nextPitch
      context.push(nextPitch)
      consecutiveRests = 0
    }
  }

  return { notes, lastPitch: lastActualPitch }
}

/**
 * Gets the pitch with the octave from the pitch string.
 * @param pitch - The pitch string to get the octave from.
 * @param octave - The octave to add to the pitch.
 * @returns The pitch with the octave.
 */
function getPitchWithOctave(pitch: string, octave: number): string {
  const parsed = Note.get(pitch)
  if (!parsed || !parsed.pc) {
    return pitch.replace(/[0-9]+$/, '') + octave
  }
  return parsed.pc + octave
}
