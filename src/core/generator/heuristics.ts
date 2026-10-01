import { Note } from 'tonal'
import type { Contour } from '../schemas/generator.schema'
import { getScaleDegree, getScaleNotes, pitchToMidi } from '../theory/scale.engine'
import { scoreContour, scoreContourMotion } from './contour-plan'
import { getMarkovProbability, type MarkovTable } from './markov.engine'
import type { PitchClassEncoder } from './trained-markov'

export interface CandidateNote {
  pitch: string // e.g. 'E4'
  midi: number // e.g. 64
  pitchClass: string // e.g. 'E'
  degree: number | null // 1-based scale degree or null
  isChordTone: boolean
}

export interface HeuristicContext {
  history: CandidateNote[]
  stepInBar: number
  stepsPerBar: number
  contourProgress: number
  contourMinMidi: number
  contourMaxMidi: number
  contour: Contour
  contourStrength: number
  minOctave: number
  maxOctave: number
  targetOctave: number
  pentatonicMode: boolean
  chordAdherence: number // 0.0 to 1.0
  markovTable?: MarkovTable
  markovOrder?: number
  // Trained artifacts live in tonic-relative chroma symbols; when present,
  // this encoder projects pitch classes into that space before table lookups.
  markovSymbolEncoder?: PitchClassEncoder
  temperature?: number // default: 1.0
}

export interface HeuristicWeights {
  stepwiseMotion: number
  leapRecovery: number
  repetitionPenalty: number
  contourAdherence: number
  rangeAwareness: number
  chordAdherence: number
  markovPrior: number
}

export const DEFAULT_HEURISTIC_WEIGHTS: HeuristicWeights = {
  stepwiseMotion: 1.5,
  leapRecovery: 1.2,
  repetitionPenalty: 1.8,
  contourAdherence: 1.0,
  rangeAwareness: 1.2,
  chordAdherence: 1.4,
  markovPrior: 1.0
}

/** Includes chromatic chord tones so an altered dominant can guide the melody. */
export function buildCandidatePool(
  root: string,
  scaleName: string,
  minOctave: number,
  maxOctave: number,
  currentChordNotes: string[]
): CandidateNote[] {
  const rootPc = Note.pitchClass(root) || root
  const scaleNotes = getScaleNotes(rootPc, scaleName)
  const chordChromas = new Set(
    currentChordNotes.map((cn) => Note.chroma(cn)).filter((c): c is number => c !== undefined)
  )
  const scaleChromas = new Set(scaleNotes.map((note) => Note.chroma(note)))
  const chromaticChordNotes = currentChordNotes.filter((note) => {
    const chroma = Note.chroma(note)
    return chroma !== undefined && !scaleChromas.has(chroma)
  })
  const candidateNotes = [...scaleNotes, ...chromaticChordNotes]

  const candidates: CandidateNote[] = []
  const startOct = Math.min(minOctave, maxOctave)
  const endOct = Math.max(minOctave, maxOctave)

  for (let oct = startOct; oct <= endOct; oct++) {
    for (const noteName of candidateNotes) {
      const pc = Note.pitchClass(noteName) || noteName
      const pitch = `${pc}${oct}`
      const midi = pitchToMidi(pitch)
      const chroma = Note.chroma(pitch)
      const isChordTone = chroma !== undefined && chordChromas.has(chroma)
      const degree = getScaleDegree(pitch, rootPc, scaleName)

      candidates.push({
        pitch,
        midi,
        pitchClass: pc,
        degree,
        isChordTone
      })
    }
  }

  // Sort candidates ascending by MIDI pitch
  return candidates.sort((a, b) => a.midi - b.midi)
}

/**
 * Evaluates stepwise melodic motion.
 * Strong vocal melodies consist of 70-80% stepwise motion (+1/-1 or +2/-2 semitones).
 */
export function scoreStepwiseMotion(
  candidate: CandidateNote,
  previousNote?: CandidateNote,
  isPentatonic: boolean = false
): number {
  if (!previousNote) {
    return 0.0
  }

  const delta = Math.abs(candidate.midi - previousNote.midi)

  // Unison (repetition is handled separately by scoreRepetition)
  if (delta === 0) {
    return 0.0
  }

  // Semitone or whole tone step: optimal melodic flow (or minor 3rd in pentatonic mode where it is an adjacent step)
  if (delta === 1 || delta === 2 || (isPentatonic && delta === 3)) {
    return 1.0
  }

  // Minor 3rd: natural melodic skip
  if (delta === 3) {
    return 0.2
  }

  // Major 3rd: neutral skip
  if (delta === 4) {
    return 0.0
  }

  // Moderate leap (4th to 5th)
  if (delta >= 5 && delta <= 7) {
    return -0.4
  }

  // Large leap (> 7 semitones)
  return -1.0
}

/**
 * Evaluates leap recovery.
 * Following a leap of >= 5 semitones, contrary motion (preferably stepwise) is rewarded,
 * while compounding leaps in the same direction are heavily penalized.
 * Arpeggiated chord tones in the same direction are allowed as neutral.
 */
export function scoreLeapRecovery(candidate: CandidateNote, history: CandidateNote[]): number {
  if (history.length < 2) {
    return 0.0
  }

  const lastNote = history[history.length - 1]
  const prevNote = history[history.length - 2]
  const prevLeap = lastNote.midi - prevNote.midi

  // Only trigger if previous interval was a leap (>= 5 semitones)
  if (Math.abs(prevLeap) < 5) {
    return 0.0
  }

  const currentMove = candidate.midi - lastNote.midi

  // Contrary motion: signs differ
  if ((prevLeap > 0 && currentMove < 0) || (prevLeap < 0 && currentMove > 0)) {
    const moveDist = Math.abs(currentMove)
    // Stepwise contrary motion: textbook melodic resolution
    if (moveDist <= 2) {
      return 1.0
    }
    // Small skip contrary motion
    if (moveDist <= 4) {
      return 0.5
    }
    return 0.1
  }

  // Same direction movement
  if ((prevLeap > 0 && currentMove > 0) || (prevLeap < 0 && currentMove < 0)) {
    // Chord arpeggio exception: both are chord tones within an octave
    if (candidate.isChordTone && lastNote.isChordTone && Math.abs(currentMove) <= 4) {
      return 0.0
    }
    // Compounding large leap in same direction
    if (Math.abs(currentMove) >= 5) {
      return -1.0
    }
    return -0.4
  }

  return 0.0
}

/**
 * Penalizes excessive pitch repetition to prevent monotonous runs.
 * 1 repetition: slight boost (+0.1) for rhythmic drive.
 * 2 repetitions: penalized (-0.8).
 * 3+ repetitions: heavily suppressed (-2.0).
 */
export function scoreRepetition(candidate: CandidateNote, history: CandidateNote[]): number {
  if (history.length === 0) {
    return 0.0
  }

  let count = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].midi === candidate.midi) {
      count++
    } else {
      break
    }
  }

  if (count === 0) return 0.0
  if (count === 1) return 0.1
  if (count === 2) return -0.8
  return -2.0
}

/**
 * Centered Gaussian distribution around the target octave register.
 * Returns -Infinity if candidate is outside [minMidi, maxMidi].
 */
export function scoreRangeAwareness(
  candidate: CandidateNote,
  minMidi: number,
  maxMidi: number,
  targetOctave: number
): number {
  if (candidate.midi < minMidi || candidate.midi > maxMidi) {
    return -Infinity
  }

  // Middle pitch of target octave (F# of target octave)
  const centerMidi = pitchToMidi(`C${targetOctave}`) + 6
  const sigma = 7.0 // ~one octave dispersion

  const distance = candidate.midi - centerMidi
  const gaussian = Math.exp(-(distance * distance) / (2 * sigma * sigma))

  // Map gaussian (0.0 to 1.0) to [-1.0, +1.0]
  return 2.0 * gaussian - 1.0
}

/**
 * Evaluates chord adherence depending on beat metric strength.
 * Strong beats (1 & 3) strongly prefer chord tones; offbeats allow passing tones.
 */
export function scoreChordAdherence(candidate: CandidateNote, isStrongBeat: boolean, adherenceFactor: number): number {
  const factor = Math.max(0, Math.min(1, adherenceFactor))
  if (factor === 0) {
    return 0.0
  }

  if (candidate.isChordTone) {
    return isStrongBeat ? 1.0 * factor : 0.5 * factor
  } else {
    // Non-chord tones are heavily damped on strong beats, but permitted as passing tones on offbeats
    return isStrongBeat ? -0.9 * factor : 0.2 * factor
  }
}

/**
 * Evaluates transition probability from the Markov table as a prior.
 * `recentPitchClasses` must be the already pitch-class-normalized tail of the
 * history (at most the last `order` entries) to keep per-candidate cost flat.
 * `encodePitchClass` projects into the table's symbol space when the table was
 * trained offline in tonic-relative chroma symbols.
 */
export function scoreMarkovPrior(
  candidate: CandidateNote,
  recentPitchClasses: string[],
  table?: MarkovTable,
  order: number = 2,
  encodePitchClass?: PitchClassEncoder
): number {
  if (!table || table.size === 0) {
    return 0.0
  }

  const target = encodePitchClass ? encodePitchClass(candidate.pitchClass) : candidate.pitchClass
  const baseline = getMarkovProbability([], target, table, order)
  if (baseline <= 0) {
    // Neither the synthetic scale corpus nor the trained model has examples
    // of this pitch class, e.g. altered chord tones outside the training key.
    return candidate.isChordTone && candidate.degree === null ? 0 : -0.5
  }

  const probability = getMarkovProbability(recentPitchClasses, target, table, order)
  return Math.max(-1, Math.min(1, Math.log(probability / baseline)))
}

/**
 * Computes composite scores for all candidates using the heuristic weights,
 * transforms them via Softmax with temperature T, and performs a weighted sampling.
 */
export function evaluateAndPickCandidate(
  candidates: CandidateNote[],
  context: HeuristicContext,
  weights: Partial<HeuristicWeights> = {},
  rng: () => number = Math.random
): CandidateNote {
  if (candidates.length === 0) {
    throw new Error('Candidate pool cannot be empty')
  }
  if (candidates.length === 1) {
    return candidates[0]
  }

  const w: HeuristicWeights = { ...DEFAULT_HEURISTIC_WEIGHTS, ...weights }
  const minMidi = pitchToMidi(`C${context.minOctave}`)
  const maxMidi = pitchToMidi(`B${context.maxOctave}`)
  const previousNote = context.history[context.history.length - 1]

  // Only the last `order` pitch classes can influence the Markov prior,
  // so the normalized history tail is built once for all candidates
  const markovOrder = Math.max(1, Math.min(4, Math.round(context.markovOrder ?? 2)))
  const encodePitchClass = context.markovSymbolEncoder
  const recentPitchClasses = context.history
    .slice(-markovOrder)
    .map((h) => (encodePitchClass ? encodePitchClass(h.pitchClass) : h.pitchClass))

  // Metric position: beats 1 and 3 (bar start and mid-bar) are strong
  const halfBarSteps = Math.max(1, Math.round(context.stepsPerBar / 2))
  const isStrongBeat = context.stepInBar % halfBarSteps === 0

  const scores: number[] = new Array(candidates.length)

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i]

    const rangeScore = scoreRangeAwareness(cand, minMidi, maxMidi, context.targetOctave)
    if (rangeScore === -Infinity) {
      scores[i] = -Infinity
      continue
    }

    const stepScore = scoreStepwiseMotion(cand, previousNote, context.pentatonicMode)
    const leapScore = scoreLeapRecovery(cand, context.history)
    const repScore = scoreRepetition(cand, context.history)
    const contScore = scoreContour(
      cand,
      context.contourProgress,
      context.contour,
      context.contourMinMidi,
      context.contourMaxMidi
    )
    const contourMotion = scoreContourMotion(cand, previousNote, context.contourProgress, context.contour)
    const chordScore = scoreChordAdherence(cand, isStrongBeat, context.chordAdherence)
    const markovScore = scoreMarkovPrior(cand, recentPitchClasses, context.markovTable, markovOrder, encodePitchClass)

    scores[i] =
      w.stepwiseMotion * stepScore +
      w.leapRecovery * leapScore +
      w.repetitionPenalty * repScore +
      w.contourAdherence * Math.max(0, Math.min(1, context.contourStrength)) * (2 * contScore + contourMotion) +
      w.rangeAwareness * rangeScore +
      w.chordAdherence * chordScore +
      w.markovPrior * markovScore
  }

  // Softmax with temperature T
  let maxScore = -Infinity
  for (const s of scores) {
    if (s > maxScore) {
      maxScore = s
    }
  }

  // If all candidates are invalid (-Infinity), pick center candidate
  if (maxScore === -Infinity) {
    return candidates[Math.floor(candidates.length / 2)]
  }

  const temperature = Math.max(0.05, context.temperature ?? 1.0)
  const expWeights: number[] = new Array(candidates.length)
  let sumExp = 0

  for (let i = 0; i < candidates.length; i++) {
    if (scores[i] === -Infinity) {
      expWeights[i] = 0
    } else {
      const expVal = Math.exp((scores[i] - maxScore) / temperature)
      expWeights[i] = expVal
      sumExp += expVal
    }
  }

  if (sumExp === 0) {
    return candidates[Math.floor(candidates.length / 2)]
  }

  // Weighted random selection
  const randVal = rng() * sumExp
  let cumulative = 0

  for (let i = 0; i < candidates.length; i++) {
    cumulative += expWeights[i]
    if (randVal <= cumulative) {
      return candidates[i]
    }
  }

  return candidates[candidates.length - 1]
}
