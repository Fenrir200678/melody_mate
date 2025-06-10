import type { Melody, Note, RhythmPattern, Scale } from '@/ts/models'
import type { MelodyGenerationOptions } from '@/ts/types/melody.types'
import { STEPS_PER_4N, STEPS_PER_8N, STEPS_PER_16N, STEPS_PER_32N, DURATION_MAP } from '@/ts/consts'
import { buildMarkovTable, type MarkovTable } from '@/utils/markov'
import { getNextPitch } from '@/utils/pitch'
import { calculateVelocity } from '@/utils/velocity'
import { motifs, snippets } from '@/data/motifs'

/**
 * Creates training data for the Markov chain.
 * @param notes - Array of notes to create training data from.
 * @param useMotifs - Flag to indicate whether to use motifs for training.
 * @returns Array of sequences for training.
 */
function createTrainingData(notes: string[], useMotifs = false): string[][] {
  const sequences: string[][] = []

  // 1. Generate sequences from the provided scale notes
  if (notes.length >= 5) {
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
  }

  // 2. Add sequences from predefined motifs and snippets if requested
  if (useMotifs) {
    const stripOctave = (pitch: string): string => pitch.replace(/[0-9#b]+$/, '')

    motifs.forEach((motif) => {
      sequences.push(motif.notes.map(stripOctave))
    })

    snippets.forEach((snippet) => {
      if (Array.isArray(snippet.notes[0])) {
        // It's string[][]
        ;(snippet.notes as string[][]).forEach((phrase) => {
          sequences.push(phrase.map(stripOctave))
        })
      } else {
        // It's string[]
        sequences.push((snippet.notes as string[]).map(stripOctave))
      }
    })
  }

  return sequences
}

function convertStepsToDuration(steps: number, subdivision: string): string {
  const mapForSubdivision = DURATION_MAP[subdivision as keyof typeof DURATION_MAP]

  if (!mapForSubdivision) {
    console.error(`Unsupported subdivision for duration conversion: ${subdivision}`)
    // Fallback to a raw tick value that is proportional to the subdivision
    const subdivisionToBase16n: Record<string, number> = { '64n': 0.25, '32n': 0.5, '16n': 1, '8n': 2, '4n': 4 }
    const multiplier = subdivisionToBase16n[subdivision] || 1
    const ticks = steps * multiplier * 32 // 32 ticks per 16n note
    return `T${ticks}`
  }

  const notation = mapForSubdivision[steps as keyof typeof mapForSubdivision]

  if (notation) {
    return notation
  }

  // If a direct notation doesn't exist, fall back to a tick-based value
  console.warn(`No direct notation for ${steps} steps with ${subdivision} subdivision. Using tick-based duration.`)
  const subdivisionToBase16n: Record<string, number> = { '64n': 0.25, '32n': 0.5, '16n': 1, '8n': 2, '4n': 4 }
  const multiplier = subdivisionToBase16n[subdivision] || 1
  const ticks = steps * multiplier * 32 // 32 ticks per 16n note
  return `T${ticks}`
}

function normalizeRhythm(rhythm: RhythmPattern): RhythmPattern {
  if (rhythm.pattern && rhythm.pattern.length > 0) {
    return { ...rhythm, subdivision: rhythm.subdivision || '16n' }
  }

  // Determine the subdivision for the pattern. Fallback to '16n' if not specified.
  const subdivision = rhythm.subdivision || '16n'
  const noteDurations = rhythm.steps

  const STEPS_MAPS = {
    '4n': STEPS_PER_4N,
    '8n': STEPS_PER_8N,
    '16n': STEPS_PER_16N,
    '32n': STEPS_PER_32N
  }
  const stepsMap = STEPS_MAPS[subdivision as keyof typeof STEPS_MAPS] || STEPS_PER_16N

  const pattern: (0 | 1)[] = []
  let totalSteps = 0

  for (const duration of noteDurations) {
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
    noteDurations,
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
    useMotifTrainingData,
    seedWithMotif
  } = options

  const trainingData = createTrainingData(scale.notes, useMotifTrainingData)
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

  // New: Seed melody with a motif
  if (seedWithMotif && motifs.length > 0) {
    const motif = motifs[Math.floor(Math.random() * motifs.length)]
    const motifNotesCount = motif.notes.length

    if (noteSteps.length > motifNotesCount) {
      const seededNotes: Note[] = []
      const motifSteps = noteSteps.slice(0, motifNotesCount)
      const lastMotifPitch = motif.notes[motifNotesCount - 1].replace(/[0-9#b]+$/, '')

      for (let i = 0; i < motifNotesCount; i++) {
        const currentStep = motifSteps[i]
        const durationInSteps =
          i < motifNotesCount - 1 ? motifSteps[i + 1] - currentStep : noteSteps[motifNotesCount] - currentStep
        const duration = convertStepsToDuration(durationInSteps, subdivision)
        const velocity = calculateVelocity({ useFixed: useFixedVelocity, fixedValue: fixedVelocity })

        seededNotes.push({
          pitch: motif.notes[i],
          duration,
          velocity
        })
      }

      const remainingSteps = noteSteps.slice(motifNotesCount)
      const remainingNotesResult = _generateNotesForSteps(
        remainingSteps,
        totalSteps,
        scale,
        markovTable,
        octave,
        subdivision,
        { useFixedVelocity, fixedVelocity, restProbability },
        lastMotifPitch
      )

      return { notes: [...seededNotes, ...remainingNotesResult.notes] }
    }
  }

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

  const trainingData = createTrainingData(scale.notes, useMotifTrainingData)
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
  scale: Scale,
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
): { notes: Note[]; lastPitch: string } {
  const notes: Note[] = []
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
  return pitch.replace(/[0-9#b]+$/, '') + octave
}
