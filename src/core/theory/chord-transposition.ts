import { Note } from 'tonal'
import type { ChordEvent } from '../schemas/chord.schema'
import { deriveChordIdentity, getDiatonicChords, type DiatonicChord } from './chord.engine'
import { getScaleNotes, pitchToMidi } from './scale.engine'

/**
 * Calculates the shortest chromatic distance in semitones (-6 to +6) between two root keys.
 * Ensures transposition stays in the nearest octave rather than jumping by up to 11 semitones.
 */
export function getShortestKeyDistance(fromKey: string, toKey: string): number {
  const fromChroma = Note.chroma(fromKey) ?? 0
  const toChroma = Note.chroma(toKey) ?? 0
  let diff = (toChroma - fromChroma) % 12
  if (diff < 0) diff += 12
  if (diff > 6) {
    diff -= 12
  }
  return diff
}

/**
 * Finds the octave number (0-8) for a given pitch class that brings its MIDI value closest
 * to targetMidi, preventing octave jumps when changing keys or modes.
 */
export function findClosestOctavePitch(pitchClass: string, targetMidi: number): string {
  let closestPitch = `${pitchClass}3`
  let minDiff = Infinity

  for (let oct = 0; oct <= 8; oct++) {
    const candidate = `${pitchClass}${oct}`
    const m = Note.midi(candidate)
    if (m === null) continue
    const diff = Math.abs(m - targetMidi)
    if (diff < minDiff) {
      minDiff = diff
      closestPitch = candidate
    }
  }

  return closestPitch
}

/**
 * Maps an individual pitch class from (oldKey, oldScale) to the corresponding pitch class
 * in (newKey, newScale).
 *
 * 1. If old pitch is diatonic and both scales share the same length (e.g. 7-note to 7-note),
 *    maps by scale degree.
 * 2. Otherwise maps by relative chromatic interval from root, snapping to the closest
 *    available pitch in the target scale.
 */
export function resolvePitchClassToScale(
  oldPc: string,
  oldKey: string,
  oldScale: string,
  newKey: string,
  newScale: string
): string {
  const oldNotes = getScaleNotes(oldKey, oldScale)
  const newNotes = getScaleNotes(newKey, newScale)
  if (oldNotes.length === 0 || newNotes.length === 0) return oldPc

  const oldChroma = Note.chroma(oldPc)
  if (oldChroma === undefined) return oldPc

  // 1. Exact scale degree mapping for equal-length scales (e.g. heptatonic major/minor/modes)
  const oldIndex = oldNotes.findIndex((n) => Note.chroma(n) === oldChroma)
  if (oldIndex !== -1 && oldNotes.length === newNotes.length) {
    return newNotes[oldIndex]
  }

  // 2. Relative interval from root
  const oldKeyChroma = Note.chroma(oldKey) ?? 0
  const newKeyChroma = Note.chroma(newKey) ?? 0
  const oldInterval = (oldChroma - oldKeyChroma + 12) % 12
  const targetChroma = (newKeyChroma + oldInterval) % 12

  // Exact match in target scale
  const exactMatch = newNotes.find((n) => Note.chroma(n) === targetChroma)
  if (exactMatch) return exactMatch

  // Snap to closest scale chroma
  let bestNote = newNotes[0]
  let minDiff = Infinity
  for (const n of newNotes) {
    const c = Note.chroma(n)
    if (c === undefined) continue
    let d = Math.abs(c - targetChroma)
    if (d > 6) d = 12 - d
    if (d < minDiff) {
      minDiff = d
      bestNote = n
    }
  }
  return bestNote
}

/**
 * Transposes an absolute pitch (e.g. 'C3', 'E3', 'G3') to the target scale and key,
 * selecting the optimal octave to preserve register stability and voice-leading contours.
 */
export function mapPitchToScale(
  pitch: string,
  oldKey: string,
  oldScale: string,
  newKey: string,
  newScale: string
): string {
  const oldPc = Note.pitchClass(pitch)
  if (!oldPc) return pitch

  const oldMidi = pitchToMidi(pitch)
  const targetPc = resolvePitchClassToScale(oldPc, oldKey, oldScale, newKey, newScale)
  const keyDist = getShortestKeyDistance(oldKey, newKey)
  const targetMidi = oldMidi + keyDist

  return findClosestOctavePitch(targetPc, targetMidi)
}

/**
 * Transposes a single ChordEvent from an old scale/key to a new scale/key.
 * Preserves startBar, durationBars, and inversion while re-deriving identity
 * (name, roman, notes) via deriveChordIdentity in the new scale context.
 */
export function transposeChordEvent(
  chord: ChordEvent,
  oldKey: string,
  oldScale: string,
  newKey: string,
  newScale: string,
  newPalette?: DiatonicChord[]
): ChordEvent {
  if (!chord.voicing || chord.voicing.length === 0) return { ...chord }

  const newVoicing = chord.voicing.map((p) => mapPitchToScale(p, oldKey, oldScale, newKey, newScale))

  // Sort pitches ascending by MIDI
  const sortedVoicing = [...newVoicing].sort((a, b) => pitchToMidi(a) - pitchToMidi(b))

  // Remove potential duplicate pitches in case of scale compression
  const uniqueVoicing: string[] = []
  for (const p of sortedVoicing) {
    if (uniqueVoicing.length === 0 || pitchToMidi(uniqueVoicing[uniqueVoicing.length - 1]) !== pitchToMidi(p)) {
      uniqueVoicing.push(p)
    }
  }

  const effectiveVoicing = uniqueVoicing.length > 0 ? uniqueVoicing : sortedVoicing
  const palette = newPalette ?? getDiatonicChords(newKey, newScale)
  const identity = deriveChordIdentity(effectiveVoicing, palette, newKey, newScale)

  return {
    ...chord,
    voicing: effectiveVoicing,
    name: identity.name,
    roman: identity.roman,
    notes: identity.notes
  }
}

/**
 * Transposes an array of ChordEvents to a new key and scale.
 */
export function transposeChordProgression(
  chords: ChordEvent[],
  oldKey: string,
  oldScale: string,
  newKey: string,
  newScale: string,
  newPalette?: DiatonicChord[]
): ChordEvent[] {
  const palette = newPalette ?? getDiatonicChords(newKey, newScale)
  return chords.map((c) => transposeChordEvent(c, oldKey, oldScale, newKey, newScale, palette))
}
