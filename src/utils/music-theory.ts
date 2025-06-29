import { useGenerationStore } from '@/stores/generation.store'
import { Interval } from 'tonal'
import { getPitchWithOctave } from '@/services/melody/pitch-utils.service'
import { noteNameToMidi } from '@/utils/scales'

/**
 * Context for musical weighting calculations
 */
interface MusicalWeightingContext {
  currentNote: string
  nextNote: string
  scaleNotes: readonly string[]
  rhythmDegreeWeights?: Record<number, number>
  currentChordNotes?: readonly string[]
  melodyProgress?: number
  currentStep?: number
  subdivision?: string
  chordAdherence?: number
  melodicContour?: string
  minOctave?: number
  maxOctave?: number
}

/**
 * Calculates the interval between two notes within a given scale.
 * The interval is returned in "scale steps" (e.g., C to D in C-Major is 1 step).
 *
 * @param noteA - The starting note.
 * @param noteB - The ending note.
 * @param scaleNotes - An array of notes representing the scale.
 * @returns The interval size in scale steps (absolute value).
 */
export function getIntervalInSteps(noteA: string, noteB: string, scaleNotes: readonly string[]): number {
  const indexA = scaleNotes.indexOf(noteA)
  const indexB = scaleNotes.indexOf(noteB)

  if (indexA === -1 || indexB === -1) {
    // One of the notes is not in the scale, cannot determine interval.
    // Return a large value to penalize this heavily.
    return 99
  }

  return Math.abs(indexA - indexB)
}

/**
 * Calculates the chromatic interval in semitones between two notes using tonal.js
 * @param noteA - The starting note
 * @param noteB - The ending note  
 * @returns The interval size in semitones (absolute value)
 */
function getChromaticInterval(noteA: string, noteB: string): number {
  try {
    // Add default octave for chromatic interval calculation
    const noteAWithOctave = noteA.includes('4') ? noteA : `${noteA}4`
    const noteBWithOctave = noteB.includes('4') ? noteB : `${noteB}4`
    
    const interval = Interval.distance(noteAWithOctave, noteBWithOctave)
    const semitones = Interval.semitones(interval)
    return Math.abs(semitones || 0)
  } catch (error) {
    console.warn('Failed to calculate chromatic interval:', noteA, noteB, error)
    return 0
  }
}

/**
 * Checks if an interval is a tritone (6 semitones)
 * @param noteA - The starting note
 * @param noteB - The ending note
 * @returns True if the interval is a tritone
 */
function isTritone(noteA: string, noteB: string): boolean {
  const semitones = getChromaticInterval(noteA, noteB)
  return semitones === 6
}

/**
 * Helper to determine if a step is on a strong beat
 */
function isStrongBeat(step: number, subdivision: string): boolean {
  if (subdivision === '16n') {
    return step % 4 === 0 // Every quarter note beat (0, 4, 8, 12)
  } else if (subdivision === '8n') {
    return step % 2 === 0 // Every quarter note beat (0, 2, 4, 6)
  } else if (subdivision === '4n') {
    return step % 1 === 0 // Every beat (0, 1, 2, 3)
  }
  return false
}

/**
 * Rule 1: Interval Weighting - Penalizes large melodic leaps
 */
function applyIntervalWeighting(weight: number, context: MusicalWeightingContext): number {
  const { currentNote, nextNote, scaleNotes } = context
  const scaleInterval = getIntervalInSteps(currentNote, nextNote, scaleNotes)
  const chromaticInterval = getChromaticInterval(currentNote, nextNote)
  
  // Penalize large leaps more severely based on chromatic distance
  if (chromaticInterval > 4) { // More than a major third
    const penalty = Math.min(chromaticInterval / 3, 5) // Cap penalty at 5x
    weight /= penalty
  } else if (scaleInterval === 0) {
    // Slightly penalize staying on the same note to avoid getting stuck
    weight *= 0.6
  }
  
  return weight
}

/**
 * Rule 2: Scale-Degree Weighting - Favors stable scale degrees
 */
function applyScaleDegreeWeighting(weight: number, context: MusicalWeightingContext): number {
  const { nextNote, scaleNotes, rhythmDegreeWeights } = context
  
  // Use the provided rhythm-specific degree weights, or fall back to the default.
  const degreeWeights = rhythmDegreeWeights || {
    0: 2.0, // 1st (Tonic)
    4: 2.0, // 5th (Dominant)
    2: 1.8, // 3rd (Mediant)
    6: 1.5 // 7th (Leading Tone)
  }

  const noteIndex = scaleNotes.indexOf(nextNote)
  const degreeWeight = degreeWeights[noteIndex]

  if (degreeWeight) {
    // Boost weight for favored degrees.
    weight *= degreeWeight
  } else {
    // Slightly penalize non-chord tones (2nd, 4th, 6th) to make them passing notes.
    weight *= 0.8
  }
  
  return weight
}

/**
 * Rule 3: Chord-Tone Weighting - Favors current chord tones
 */
function applyChordToneWeighting(weight: number, context: MusicalWeightingContext): number {
  const { nextNote, currentChordNotes, chordAdherence } = context
  
  if (currentChordNotes && currentChordNotes.length > 0) {
    const isChordTone = currentChordNotes.includes(nextNote)
    const adherence = chordAdherence ?? 0.75
    const adherenceFactor = 1 + adherence * 2 // Max factor of 3
    const penaltyFactor = 1 - adherence * 0.75 // Max penalty of 0.25

    if (isChordTone) {
      // Strongly favor notes that are in the current chord.
      weight *= adherenceFactor
    } else {
      // Penalize notes that are not in the current chord.
      weight *= penaltyFactor
    }
  }
  
  return weight
}

/**
 * Rule 4: Melodic Contour Weighting - Shapes melodic direction
 */
function applyMelodicContourWeighting(weight: number, context: MusicalWeightingContext): number {
  const { currentNote, nextNote, scaleNotes, melodicContour, melodyProgress } = context
  
  if (melodicContour !== 'random' && melodyProgress !== undefined) {
    const intervalDirection = scaleNotes.indexOf(nextNote) - scaleNotes.indexOf(currentNote)

    let contourFactor = 1.0
    switch (melodicContour) {
      case 'ascending':
        if (intervalDirection > 0) contourFactor = 1 + melodyProgress * 0.5
        else if (intervalDirection < 0) contourFactor = 1 - melodyProgress * 0.5
        break
      case 'descending':
        if (intervalDirection < 0) contourFactor = 1 + melodyProgress * 0.5
        else if (intervalDirection > 0) contourFactor = 1 - melodyProgress * 0.5
        break
      case 'arc':
        const peak = 0.5 // Peak of the arc is at 50% progress
        const arcProgress = 1 - Math.abs(melodyProgress - peak) / peak
        if (melodyProgress < peak) {
          // Ascending part of the arc
          if (intervalDirection > 0) contourFactor = 1 + arcProgress * 0.5
          else if (intervalDirection < 0) contourFactor = 1 - arcProgress * 0.5
        } else {
          // Descending part of the arc
          if (intervalDirection < 0) contourFactor = 1 + arcProgress * 0.5
          else if (intervalDirection > 0) contourFactor = 1 - arcProgress * 0.5
        }
        break
    }
    weight *= contourFactor
  }
  
  return weight
}

/**
 * Rule 5: Beat Strength Weighting - Favors chord tones on strong beats
 */
function applyBeatStrengthWeighting(weight: number, context: MusicalWeightingContext): number {
  const { nextNote, scaleNotes, currentChordNotes, currentStep, subdivision } = context
  
  if (currentStep !== undefined && subdivision) {
    if (isStrongBeat(currentStep, subdivision)) {
      // On strong beats, favor chord tones and stable scale degrees more
      if (currentChordNotes && currentChordNotes.includes(nextNote)) {
        weight *= 1.2 // Further boost for chord tones on strong beats
      } else if (scaleNotes.indexOf(nextNote) === 0 || scaleNotes.indexOf(nextNote) === 4) {
        // Tonic or Dominant
        weight *= 1.1 // Boost for stable scale degrees on strong beats
      }
    } else {
      // On weak beats, allow more melodic freedom (less penalty for non-chord tones/leaps)
      if (currentChordNotes && !currentChordNotes.includes(nextNote)) {
        weight *= 1.1 // Slightly reduce penalty for non-chord tones on weak beats
      }
    }
  }
  
  return weight
}

/**
 * Rule 6: Voice Leading Weighting - Implements classical voice leading rules
 */
function applyVoiceLeadingWeighting(weight: number, context: MusicalWeightingContext): number {
  const { currentNote, nextNote, scaleNotes, currentChordNotes } = context
  const currentNoteIndex = scaleNotes.indexOf(currentNote)
  const nextNoteIndex = scaleNotes.indexOf(nextNote)
  const scaleInterval = getIntervalInSteps(currentNote, nextNote, scaleNotes)
  
  // Leading tone resolution: 7th degree strongly wants to resolve to tonic
  if (currentNoteIndex === 6 && nextNoteIndex === 0) {
    weight *= 2.5 // Strong resolution tendency
  }
  
  // Favor stepwise motion when resolving dissonances (non-chord tones)
  if (currentChordNotes && !currentChordNotes.includes(currentNote)) {
    if (scaleInterval <= 1) {
      weight *= 1.3 // Favor stepwise resolution of non-chord tones
    }
  }
  
  // Penalize tritone leaps using proper chromatic interval detection
  if (isTritone(currentNote, nextNote)) {
    weight *= 0.3 // Strong penalty for tritone leaps
  }
  
  return weight
}

/**
 * Rule 7: Range Awareness Weighting - Keeps melody in reasonable range
 */
function applyRangeWeighting(weight: number, context: MusicalWeightingContext): number {
  const { currentNote, nextNote, minOctave = 3, maxOctave = 6 } = context
  
  try {
    const currentPitchWithOctave = getPitchWithOctave(currentNote, minOctave, maxOctave)
    const nextPitchWithOctave = getPitchWithOctave(nextNote, minOctave, maxOctave)
    const currentMidi = noteNameToMidi(currentPitchWithOctave)
    const nextMidi = noteNameToMidi(nextPitchWithOctave)

    if (currentMidi && nextMidi) {
      // Avoid extreme registers
      if (nextMidi > 84 || nextMidi < 48) { // Above C6 or below C3
        weight *= 0.5
      }
      
      // Favor returning to middle register from extremes
      if ((currentMidi > 80 && nextMidi < currentMidi) || 
          (currentMidi < 52 && nextMidi > currentMidi)) {
        weight *= 1.3
      }
    }
  } catch (error) {
    // If MIDI conversion fails, don't apply range weighting
    console.warn('Range weighting failed for notes:', currentNote, nextNote, error)
  }
  
  return weight
}

/**
 * Applies musical rules to weight the probabilities of the next possible notes.
 * This is the main orchestrating function that applies all weighting rules.
 *
 * @param transitions - A map of possible next notes to their raw counts from the Markov chain.
 * @param currentNote - The note from which the transition originates.
 * @param scaleNotes - An array of notes representing the scale.
 * @param rhythmDegreeWeights - Optional rhythm-specific degree weights.
 * @returns An object containing an array of the notes and an array of their new calculated weights.
 */
export function applyMusicalWeighting(
  transitions: Map<string, number>,
  currentNote: string,
  scaleNotes: readonly string[],
  rhythmDegreeWeights?: Record<number, number>,
  currentChordNotes?: readonly string[],
  melodyProgress?: number,
  currentStep?: number,
  subdivision?: string,
  minOctave?: number,
  maxOctave?: number
): { notes: string[]; weights: number[] } {
  const generationStore = useGenerationStore()
  const { 
    chordAdherence, 
    melodicContour,
    enableIntervalWeighting,
    enableScaleDegreeWeighting,
    enableChordToneWeighting,
    enableMelodicContourWeighting,
    enableBeatStrengthWeighting,
    enableVoiceLeadingWeighting,
    enableRangeWeighting
  } = generationStore

  const possibleNotes = Array.from(transitions.keys())
  const initialWeights = Array.from(transitions.values())
  const newWeights: number[] = []

  for (let i = 0; i < possibleNotes.length; i++) {
    const nextNote = possibleNotes[i]
    let weight = initialWeights[i]

    const context: MusicalWeightingContext = {
      currentNote,
      nextNote,
      scaleNotes,
      rhythmDegreeWeights,
      currentChordNotes,
      melodyProgress,
      currentStep,
      subdivision,
      chordAdherence,
      melodicContour,
      minOctave,
      maxOctave
    }

    // Apply weighting rules conditionally based on store flags
    if (enableIntervalWeighting) {
      weight = applyIntervalWeighting(weight, context)
    }
    if (enableScaleDegreeWeighting) {
      weight = applyScaleDegreeWeighting(weight, context)
    }
    if (enableChordToneWeighting) {
      weight = applyChordToneWeighting(weight, context)
    }
    if (enableMelodicContourWeighting) {
      weight = applyMelodicContourWeighting(weight, context)
    }
    if (enableBeatStrengthWeighting) {
      weight = applyBeatStrengthWeighting(weight, context)
    }
    if (enableVoiceLeadingWeighting) {
      weight = applyVoiceLeadingWeighting(weight, context)
    }
    if (enableRangeWeighting) {
      weight = applyRangeWeighting(weight, context)
    }

    newWeights.push(Math.max(0.1, weight)) // Ensure weight is not zero.
  }

  return { notes: possibleNotes, weights: newWeights }
}
