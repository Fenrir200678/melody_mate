import { Chord, Interval, Note } from 'tonal'
import type { ChordEvent } from '../schemas/chord.schema'
import { getScaleDegree, getScaleNotes } from './scale.engine'

export const MIN_CHORD_DURATION_BARS = 0.25

export interface DiatonicChord {
  degree: number
  roman: string
  romanSeventh: string
  triadName: string
  triadNotes: string[]
  seventhName: string
  seventhNotes: string[]
  triad: {
    name: string
    notes: string[]
    roman: string
  }
  seventh: {
    name: string
    notes: string[]
    roman: string
  }
}

const ROMAN_UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
const ROMAN_LOWER = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii']

/**
 * Derives triad chord quality, clean name, and Roman numeral formatting.
 */
function analyzeTriadQuality(root: string, notes: string[], degreeIndex: number): { name: string; roman: string } {
  if (notes.length < 3) {
    return { name: root, roman: ROMAN_UPPER[degreeIndex] || `${degreeIndex + 1}` }
  }

  const iv3 = Interval.distance(notes[0], notes[1])
  const iv5 = Interval.distance(notes[0], notes[2])
  const s3 = (((Interval.semitones(iv3) || 0) % 12) + 12) % 12
  const s5 = (((Interval.semitones(iv5) || 0) % 12) + 12) % 12

  const baseUpper = ROMAN_UPPER[degreeIndex] || `${degreeIndex + 1}`
  const baseLower = ROMAN_LOWER[degreeIndex] || `${degreeIndex + 1}`

  // Minor triad: minor 3rd (3 semitones) + perfect 5th (7 semitones)
  if (s3 === 3 && s5 === 7) {
    return { name: `${root}m`, roman: baseLower }
  }

  // Diminished triad: minor 3rd (3 semitones) + diminished 5th (6 semitones)
  if (s3 === 3 && s5 === 6) {
    return { name: `${root}dim`, roman: `${baseLower}°` }
  }

  // Augmented triad: major 3rd (4 semitones) + augmented 5th (8 semitones)
  if (s3 === 4 && s5 === 8) {
    return { name: `${root}aug`, roman: `${baseUpper}+` }
  }

  // Default to Major triad: major 3rd (4 semitones) + perfect 5th (7 semitones)
  return { name: root, roman: baseUpper }
}

/**
 * Derives seventh chord quality, clean name, and Roman numeral formatting.
 */
function analyzeSeventhQuality(root: string, notes: string[], degreeIndex: number): { name: string; roman: string } {
  if (notes.length < 4) {
    return { name: `${root}7`, roman: `${ROMAN_UPPER[degreeIndex] || degreeIndex + 1}7` }
  }

  const iv3 = Interval.distance(notes[0], notes[1])
  const iv5 = Interval.distance(notes[0], notes[2])
  const iv7 = Interval.distance(notes[0], notes[3])

  const s3 = (((Interval.semitones(iv3) || 0) % 12) + 12) % 12
  const s5 = (((Interval.semitones(iv5) || 0) % 12) + 12) % 12
  const s7 = (((Interval.semitones(iv7) || 0) % 12) + 12) % 12

  const baseUpper = ROMAN_UPPER[degreeIndex] || `${degreeIndex + 1}`
  const baseLower = ROMAN_LOWER[degreeIndex] || `${degreeIndex + 1}`

  // Major 7th: Major triad + major 7th (11 semitones)
  if (s3 === 4 && s5 === 7 && s7 === 11) {
    return { name: `${root}maj7`, roman: `${baseUpper}maj7` }
  }

  // Dominant 7th: Major triad + minor 7th (10 semitones)
  if (s3 === 4 && s5 === 7 && s7 === 10) {
    return { name: `${root}7`, roman: `${baseUpper}7` }
  }

  // Minor 7th: Minor triad + minor 7th (10 semitones)
  if (s3 === 3 && s5 === 7 && s7 === 10) {
    return { name: `${root}m7`, roman: `${baseLower}7` }
  }

  // Minor-Major 7th: Minor triad + major 7th (11 semitones)
  if (s3 === 3 && s5 === 7 && s7 === 11) {
    return { name: `${root}mMaj7`, roman: `${baseLower}mMaj7` }
  }

  // Half-Diminished 7th: Diminished triad + minor 7th (10 semitones)
  if (s3 === 3 && s5 === 6 && s7 === 10) {
    return { name: `${root}m7b5`, roman: `${baseLower}ø7` }
  }

  // Diminished 7th: Diminished triad + diminished 7th (9 semitones)
  if (s3 === 3 && s5 === 6 && s7 === 9) {
    return { name: `${root}dim7`, roman: `${baseLower}°7` }
  }

  // Augmented 7th: Augmented triad + major 7th (11 semitones)
  if (s3 === 4 && s5 === 8 && s7 === 11) {
    return { name: `${root}maj7#5`, roman: `${baseUpper}+maj7` }
  }

  // Augmented Dominant: Augmented triad + minor 7th (10 semitones)
  if (s3 === 4 && s5 === 8 && s7 === 10) {
    return { name: `${root}7#5`, roman: `${baseUpper}+7` }
  }

  // Fallback: detected or generic 7th
  const detected = Chord.detect(notes)
  const cleanDetected = detected.find((d) => !d.includes('/')) || `${root}7`
  return { name: cleanDetected, roman: `${baseUpper}7` }
}

/**
 * Returns the diatonic chords (triads and 7ths with Roman numerals) for each degree of a scale.
 */
export function getDiatonicChords(root: string, scaleName: string): DiatonicChord[] {
  const rootPc = Note.pitchClass(root) || root
  const scaleNotes = getScaleNotes(rootPc, scaleName)
  const len = scaleNotes.length
  if (len === 0) return []

  const diatonicChords: DiatonicChord[] = []

  for (let i = 0; i < len; i++) {
    const chordRoot = scaleNotes[i]
    const triadNotes = [scaleNotes[i], scaleNotes[(i + 2) % len], scaleNotes[(i + 4) % len]]
    const seventhNotes = [
      scaleNotes[i],
      scaleNotes[(i + 2) % len],
      scaleNotes[(i + 4) % len],
      scaleNotes[(i + 6) % len]
    ]

    const triadInfo = analyzeTriadQuality(chordRoot, triadNotes, i)
    const seventhInfo = analyzeSeventhQuality(chordRoot, seventhNotes, i)

    diatonicChords.push({
      degree: i + 1,
      roman: triadInfo.roman,
      romanSeventh: seventhInfo.roman,
      triadName: triadInfo.name,
      triadNotes,
      seventhName: seventhInfo.name,
      seventhNotes,
      triad: {
        name: triadInfo.name,
        notes: triadNotes,
        roman: triadInfo.roman
      },
      seventh: {
        name: seventhInfo.name,
        notes: seventhNotes,
        roman: seventhInfo.roman
      }
    })
  }

  return diatonicChords
}

/** Whether a palette entry is presented as a plain triad or as a seventh chord. */
export type ChordMode = 'triad' | 'seventh'

export function chordNameFor(chord: DiatonicChord, mode: ChordMode): string {
  return mode === 'seventh' ? chord.seventhName : chord.triadName
}

export function chordRomanFor(chord: DiatonicChord, mode: ChordMode): string {
  return mode === 'seventh' ? chord.romanSeventh : chord.roman
}

export function chordNotesFor(chord: DiatonicChord, mode: ChordMode): string[] {
  return mode === 'seventh' ? chord.seventhNotes : chord.triadNotes
}

/**
 * Resolves chord note names from a chord symbol.
 * If an octave is specified, notes are voiced in ascending pitch order starting from that octave.
 */
export function getChordNotes(chordName: string, octave?: number): string[] {
  const chord = Chord.get(chordName)
  if (chord.empty || chord.notes.length === 0) {
    return []
  }

  if (octave === undefined) {
    return chord.notes
  }

  const tonic = chord.tonic || chord.notes[0]
  const rootWithOctave = `${tonic}${octave}`
  return chord.intervals.map((interval) => Note.transpose(rootWithOctave, interval))
}

export type VoicingStyle = 'close' | 'drop-2' | 'bass-triad'

/**
 * Applies a chord voicing style (Close, Drop-2, Bass + Triad) to an ascending array of chord notes.
 */
export function applyVoicingStyle(voicing: string[], style: VoicingStyle = 'close', rootPitch?: string): string[] {
  if (!voicing || voicing.length === 0 || style === 'close') {
    return [...voicing]
  }

  const sorted = [...voicing].sort((a, b) => (Note.midi(a) ?? 0) - (Note.midi(b) ?? 0))

  if (style === 'drop-2') {
    // Drop-2: take the 2nd highest note from the top and lower it by 1 octave
    if (sorted.length < 3) {
      return sorted
    }
    const targetIdx = sorted.length - 2
    const targetNote = sorted[targetIdx]
    const hasOct = Note.get(targetNote).oct !== undefined
    const loweredNote = hasOct ? Note.transpose(targetNote, '-8P') : targetNote
    const modified = sorted.map((n, idx) => (idx === targetIdx ? loweredNote : n))
    return modified.sort((a, b) => (Note.midi(a) ?? 0) - (Note.midi(b) ?? 0))
  }

  if (style === 'bass-triad') {
    // Bass + Triad: add a solid bass root note in octave 1 or 2 (below the chord)
    const rootPc = rootPitch ? Note.pitchClass(rootPitch) || rootPitch : Note.pitchClass(sorted[0]) || sorted[0]

    // Determine bass octave: 1 or 2 octaves below lowest chord note, clamped to 1..2
    const lowestOct = Note.get(sorted[0]).oct ?? 3
    const bassOct = Math.max(1, Math.min(2, lowestOct - 1))
    const bassNote = `${rootPc}${bassOct}`

    // Prepend bass note if not already identically present
    const bassMidi = Note.midi(bassNote)
    if (bassMidi !== null && !sorted.some((n) => Note.midi(n) === bassMidi)) {
      return [bassNote, ...sorted].sort((a, b) => (Note.midi(a) ?? 0) - (Note.midi(b) ?? 0))
    }
    return sorted
  }

  return sorted
}

/**
 * Builds a chord voicing with real octave numbers starting at `baseOctave`,
 * supporting inversions and voicing styles (Close, Drop-2, Bass + Triad).
 * Result is always sorted ascending by MIDI pitch. Returns an empty array for unresolvable chord names.
 */
export function buildChordVoicing(
  chordName: string,
  baseOctave: number,
  inversion: 0 | 1 | 2 | 3 = 0,
  style: VoicingStyle = 'close'
): string[] {
  const withOctaves = getChordNotes(chordName, baseOctave)
  if (withOctaves.length === 0) {
    return []
  }
  const inverted = getChordInversion(withOctaves, inversion)
  const close = inverted.slice().sort((a, b) => (Note.midi(a) ?? 0) - (Note.midi(b) ?? 0))
  return applyVoicingStyle(close, style, withOctaves[0])
}

/**
 * Inverts an array of chord notes by shifting the lowest note up one octave per inversion level.
 * Supports both notes with octave numbers (e.g. 'C4') and bare pitch classes (e.g. 'C').
 */
export function getChordInversion(notes: string[], inversion: 0 | 1 | 2 | 3): string[] {
  if (!notes || notes.length === 0 || inversion === 0) {
    return [...notes]
  }

  let result = [...notes]
  const effectiveInversion = inversion % result.length

  for (let i = 0; i < effectiveInversion; i++) {
    const bottomNote = result[0]
    const hasOctave = Note.get(bottomNote).oct !== undefined
    // If pitch has an octave, shift it up 1 octave (+12 semitones); otherwise rotate
    const elevatedNote = hasOctave ? Note.transpose(bottomNote, '8P') : bottomNote
    result = [...result.slice(1), elevatedNote]
  }

  return result
}

function uniquePitchClasses(pitches: string[]): string[] {
  const seen = new Set<number>()
  const result: string[] = []
  for (const pitch of pitches) {
    const pc = Note.pitchClass(pitch)
    if (!pc) continue
    const chroma = Note.chroma(pc)
    if (chroma === undefined || seen.has(chroma)) continue
    seen.add(chroma)
    result.push(pc)
  }
  return result
}

function sameChromaSet(notes: string[], chromas: Set<number>): boolean {
  if (notes.length !== chromas.size) return false
  return notes.every((n) => {
    const chroma = Note.chroma(n)
    return chroma !== undefined && chromas.has(chroma)
  })
}

function isMinorishQuality(chordName: string): boolean {
  const lower = chordName.toLowerCase()
  return (
    lower.includes('dim') ||
    lower.includes('ø') ||
    lower.includes('°') ||
    (lower.includes('m') && !lower.includes('maj') && !lower.includes('m7b5')) ||
    lower.includes('m7b5')
  )
}

function romanForRoot(rootPc: string, chordName: string, key: string, scaleName: string): string {
  const degree = getScaleDegree(rootPc, key, scaleName)
  if (degree === null || degree < 1 || degree > 8) return '–'

  const table = isMinorishQuality(chordName) ? ROMAN_LOWER : ROMAN_UPPER
  return table[degree - 1] || `${degree}`
}

export interface ChordIdentity {
  name: string
  roman: string
  notes: string[]
}

/**
 * Derives chord name, Roman numeral and pitch-class identity from an arbitrary voicing.
 * Prefers exact diatonic palette matches in the active key, falls back to Chord.detect,
 * and finally to 'Custom' for unrecognized clusters so `notes` never drifts from `voicing`.
 */
export function deriveChordIdentity(
  voicing: string[],
  palette: DiatonicChord[],
  key: string,
  scaleName: string
): ChordIdentity {
  const pcs = uniquePitchClasses(voicing)
  if (pcs.length === 0) {
    return { name: 'Custom', roman: '–', notes: [] }
  }

  const chromas = new Set(pcs.map((pc) => Note.chroma(pc)).filter((c): c is number => c !== undefined))

  for (const d of palette) {
    if (sameChromaSet(d.triadNotes, chromas)) {
      return { name: d.triadName, roman: d.roman, notes: pcs }
    }
    if (sameChromaSet(d.seventhNotes, chromas)) {
      return { name: d.seventhName, roman: d.romanSeventh, notes: pcs }
    }
  }

  if (pcs.length === 1) {
    return { name: pcs[0], roman: romanForRoot(pcs[0], '', key, scaleName), notes: pcs }
  }

  const detected = Chord.detect(pcs)
  if (detected.length === 0) {
    return { name: 'Custom', roman: '–', notes: pcs }
  }

  // For inverted voicings Tonal may propose exotic non-slash spellings (e.g. 'Em#5' for
  // an inverted C major). A slash entry whose bass matches the lowest sounding note is
  // the musically correct reading, so its base name wins over the first non-slash entry.
  let lowestPc: string | null = null
  let lowestMidi = Infinity
  for (const pitch of voicing) {
    const midi = Note.midi(pitch)
    if (midi !== null && midi < lowestMidi) {
      lowestMidi = midi
      lowestPc = Note.pitchClass(pitch)
    }
  }

  const invertedReading = detected.find((d) => {
    const slashIndex = d.lastIndexOf('/')
    return slashIndex > -1 && lowestPc !== null && Note.pitchClass(d.slice(slashIndex + 1)) === lowestPc
  })

  const detectedName = invertedReading
    ? invertedReading.slice(0, invertedReading.lastIndexOf('/'))
    : (detected.find((d) => !d.includes('/')) ?? detected[0])

  if (!detectedName) {
    return { name: 'Custom', roman: '–', notes: pcs }
  }

  const detectedChord = Chord.get(detectedName)
  if (detectedChord.empty) {
    return { name: detectedName, roman: '–', notes: pcs }
  }
  const rootPc = detectedChord.tonic || pcs[0]
  const notes = detectedChord.notes.length > 0 ? detectedChord.notes : pcs
  const roman = romanForRoot(rootPc, detectedName, key, scaleName)

  return { name: detectedName, roman, notes }
}

/**
 * Enforces non-overlapping chord timeline: each chord is trimmed to the start of its
 * successor; chords fully covered by a successor are dropped.
 */
export function resolveChordOverlaps(chords: ChordEvent[]): ChordEvent[] {
  const sorted = [...chords].sort((a, b) => a.startBar - b.startBar)
  const result: ChordEvent[] = []

  for (let i = 0; i < sorted.length; i++) {
    const chord = sorted[i]
    const next = sorted[i + 1]

    if (!next) {
      result.push(chord)
      continue
    }

    const end = chord.startBar + chord.durationBars
    if (end > next.startBar) {
      const trimmed = next.startBar - chord.startBar
      if (trimmed >= MIN_CHORD_DURATION_BARS) {
        result.push({ ...chord, durationBars: trimmed })
      }
      continue
    }

    result.push(chord)
  }

  return result
}
