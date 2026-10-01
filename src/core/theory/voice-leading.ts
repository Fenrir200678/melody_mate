import { Note } from 'tonal'
import type { ChordEvent } from '../schemas/chord.schema'
import { buildChordVoicing, getChordInversion, getChordNotes } from './chord.engine'
import { pitchToMidi } from './scale.engine'

/**
 * Optimizes voice leading between two chords by testing all chord inversions and octave
 * transpositions, selecting the configuration that minimizes total semitone voice movement.
 */
export function optimizeVoiceLeading(previousChordNotes: string[], nextChordNotes: string[]): string[] {
  if (!previousChordNotes || previousChordNotes.length === 0) {
    return [...nextChordNotes]
  }
  if (!nextChordNotes || nextChordNotes.length === 0) {
    return []
  }

  const prevHasOctave = Note.get(previousChordNotes[0]).oct !== undefined
  const nextHasOctave = Note.get(nextChordNotes[0]).oct !== undefined

  // Voicing next chord ascendingly if no octaves were supplied
  let voicedNext = [...nextChordNotes]
  if (!nextHasOctave) {
    const baseOct = prevHasOctave ? (Note.get(previousChordNotes[0]).oct ?? 4) : 4
    let currentOct = baseOct
    let lastMidi = -1

    voicedNext = nextChordNotes.map((pc) => {
      let pitch = `${pc}${currentOct}`
      let midiVal = Note.midi(pitch)
      if (lastMidi !== -1 && midiVal !== null && midiVal <= lastMidi) {
        currentOct++
        pitch = `${pc}${currentOct}`
        midiVal = Note.midi(pitch)
      }
      lastMidi = midiVal ?? lastMidi
      return pitch
    })
  }

  let voicedPrev = [...previousChordNotes]
  if (!prevHasOctave) {
    voicedPrev = previousChordNotes.map((pc) => `${pc}4`)
  }

  const prevMidis = voicedPrev.map((n) => Note.midi(n) || 60)

  let bestVoicing = voicedNext
  let minDistance = Infinity

  const chordLength = voicedNext.length
  // Test all inversions: 0 .. length - 1
  for (let inv = 0; inv < chordLength; inv++) {
    const inverted = getChordInversion(voicedNext, inv as 0 | 1 | 2 | 3)

    // Evaluate transpositions within +/- 2 octaves to align registers
    for (const shift of [-24, -12, 0, 12, 24]) {
      const candidate = inverted.map((note) => {
        const m = Note.midi(note)
        return m !== null ? Note.fromMidi(m + shift) : note
      })

      const candMidis = candidate.map((n) => Note.midi(n) || 60)
      let totalDistance = 0
      const comparisonLength = Math.min(prevMidis.length, candMidis.length)

      for (let i = 0; i < comparisonLength; i++) {
        totalDistance += Math.abs(candMidis[i] - prevMidis[i])
      }

      if (totalDistance < minDistance) {
        minDistance = totalDistance
        bestVoicing = candidate
      }
    }
  }

  // If both inputs were raw pitch classes, strip octave numbers from result
  if (!nextHasOctave && !prevHasOctave) {
    return bestVoicing.map((n) => Note.pitchClass(n) || n)
  }

  return bestVoicing
}

/**
 * Places a target pitch class into the octave that minimizes semitone distance to the preceding pitch,
 * preventing unnatural melodic register jumps. Falls back to targetOctave on ties or missing previous pitch.
 */
export function getPitchInNearestOctave(pitchClass: string, targetOctave: number, previousPitch?: string): string {
  const pc = Note.pitchClass(pitchClass) || pitchClass
  if (!previousPitch) {
    return `${pc}${targetOctave}`
  }

  const prevParsed = Note.get(previousPitch)
  if (prevParsed.empty || prevParsed.midi === null) {
    return `${pc}${targetOctave}`
  }

  const prevMidi = prevParsed.midi
  const prevOct = prevParsed.oct ?? targetOctave

  // Search octaves in range around previous pitch
  const candidateOctaves = [prevOct - 2, prevOct - 1, prevOct, prevOct + 1, prevOct + 2]
  let bestPitch = `${pc}${targetOctave}`
  let minDiff = Infinity

  for (const oct of candidateOctaves) {
    if (oct < 0 || oct > 9) continue
    const candidate = `${pc}${oct}`
    const candMidi = Note.midi(candidate)
    if (candMidi === null) continue

    const diff = Math.abs(candMidi - prevMidi)

    if (diff < minDiff) {
      minDiff = diff
      bestPitch = candidate
    } else if (diff === minDiff) {
      // Tie breaker: prefer octave closer to the designated targetOctave
      const candidateDistanceToTarget = Math.abs(oct - targetOctave)
      const currentDistanceToTarget = Math.abs((Note.get(bestPitch).oct ?? targetOctave) - targetOctave)
      if (candidateDistanceToTarget < currentDistanceToTarget) {
        bestPitch = candidate
      }
    }
  }

  return bestPitch
}

/**
 * Mean semitone movement per shared voice between two voicings.
 * Both sides are sorted by pitch so the comparison pairs voices bottom-up
 * rather than by array position, which would misalign inverted voicings.
 */
export function voiceLeadingDistance(voicingA: string[], voicingB: string[]): number {
  if (!voicingA.length || !voicingB.length) return 0

  const midisA = voicingA.map(pitchToMidi).sort((a, b) => a - b)
  const midisB = voicingB.map(pitchToMidi).sort((a, b) => a - b)
  const count = Math.min(midisA.length, midisB.length)
  if (count === 0) return 0

  let sum = 0
  for (let i = 0; i < count; i++) {
    sum += Math.abs(midisB[i] - midisA[i])
  }
  return Number((sum / count).toFixed(1))
}

export function optimizeInsertedChordVoiceLeading(
  chords: ChordEvent[],
  chordId: string,
  register: number
): ChordEvent[] {
  const index = chords.findIndex((chord) => chord.id === chordId)
  if (index <= 0) return chords
  // Gap fills must preserve existing voicings, so only the new chord follows its predecessor.
  const [, optimized] = optimizeProgressionVoiceLeading([chords[index - 1], chords[index]], register)
  return chords.map((chord) => (chord.id === chordId ? optimized : chord))
}

/**
 * Optimizes the voice leading for an entire chord progression.
 * For each successive chord, evaluates all musical inversions (0..3) and register alignments,
 * choosing the configuration that minimizes voice-movement semitone distance, preserves
 * common tones (Liegetöne), and avoids unnecessary octave drift.
 */
export function optimizeProgressionVoiceLeading(chords: ChordEvent[], register = 3): ChordEvent[] {
  if (!chords || chords.length === 0) {
    return []
  }
  if (chords.length === 1) {
    return [{ ...chords[0] }]
  }

  const result: ChordEvent[] = []

  // Ensure first chord has an initialized voicing
  const firstChord = chords[0]
  let firstVoicing = [...firstChord.voicing]
  if (firstVoicing.length === 0) {
    firstVoicing = buildChordVoicing(firstChord.name, register, (firstChord.inversion as 0 | 1 | 2 | 3) ?? 0)
  }
  result.push({
    ...firstChord,
    voicing: firstVoicing
  })

  const targetCenterMidi = (register + 1) * 12 + 4

  for (let i = 1; i < chords.length; i++) {
    const chord = chords[i]
    const prevChord = result[i - 1]
    const prevVoicing = prevChord.voicing
    const prevMidis = prevVoicing.map((n) => Note.midi(n) ?? 60)

    const baseNotes = getChordNotes(chord.name)
    const effectiveBase = baseNotes.length > 0 ? baseNotes : chord.notes
    const maxInversions = Math.min(4, Math.max(1, effectiveBase.length))

    let bestScore = Infinity
    let bestInversion = 0
    let bestVoicing: string[] = []
    let bestNotes: string[] = []

    for (let inv = 0; inv < maxInversions; inv++) {
      const invNotes = getChordInversion(effectiveBase, inv as 0 | 1 | 2 | 3)
      const baseVoiced = buildChordVoicing(chord.name, register, inv as 0 | 1 | 2 | 3)
      const candidateVoiced = baseVoiced.length > 0 ? baseVoiced : invNotes.map((n) => `${n}${register}`)

      // Evaluate octave shifts within +/- 2 octaves
      for (const shift of [-24, -12, 0, 12, 24]) {
        const shifted = candidateVoiced.map((note) => {
          const m = Note.midi(note)
          return m !== null ? Note.fromMidi(m + shift) : note
        })

        const candMidis = shifted.map((n) => Note.midi(n) ?? 60)

        // Prevent pushing notes into unplayable extreme registers
        if (candMidis.some((m) => m < 24 || m > 108)) {
          continue
        }

        const compLen = Math.min(prevMidis.length, candMidis.length)
        let distance = 0
        let commonTones = 0

        for (let k = 0; k < compLen; k++) {
          const diff = Math.abs(candMidis[k] - prevMidis[k])
          distance += diff
          if (diff === 0) {
            commonTones++
          }
        }

        // Voice count mismatch penalty
        if (candMidis.length !== prevMidis.length) {
          distance += Math.abs(candMidis.length - prevMidis.length) * 3
        }

        // Bonus for common tones / Liegetöne
        const commonToneBonus = commonTones * 0.75

        // Gentle register centering penalty to avoid infinite register drift
        const avgMidi = candMidis.reduce((sum, m) => sum + m, 0) / candMidis.length
        const registerDriftPenalty = Math.abs(avgMidi - targetCenterMidi) * 0.05

        const score = distance - commonToneBonus + registerDriftPenalty

        if (score < bestScore) {
          bestScore = score
          bestInversion = inv
          bestVoicing = shifted
          bestNotes = invNotes
        }
      }
    }

    result.push({
      ...chord,
      inversion: bestInversion,
      voicing: bestVoicing.length > 0 ? bestVoicing : chord.voicing,
      notes: bestNotes.length > 0 ? bestNotes : chord.notes
    })
  }

  return result
}
