import { ALL_CHORD_PROGRESSIONS } from '../presets/chords'
import type { ChordEvent } from '../schemas/chord.schema'
import { ChordEventSchema } from '../schemas/chord.schema'
import { buildChordVoicing, getChordNotes, getDiatonicChords, type VoicingStyle } from './chord.engine'
import type { PredefinedProgression, PresetChord, ProgressionCategory } from './progressions.types'
import { resolvePresetTiming } from './progression-timing'

export * from './progressions.types'

export const PREDEFINED_PROGRESSIONS: readonly PredefinedProgression[] = ALL_CHORD_PROGRESSIONS

/**
 * Returns all available chord progressions.
 */
export function getProgressions(): readonly PredefinedProgression[] {
  return PREDEFINED_PROGRESSIONS
}

/**
 * Looks up a progression preset by its ID.
 */
export function getProgressionById(id: string): PredefinedProgression | undefined {
  return PREDEFINED_PROGRESSIONS.find((p) => p.id === id)
}

/**
 * Filters progressions by musical category.
 */
export function getProgressionsByCategory(category: ProgressionCategory): PredefinedProgression[] {
  return PREDEFINED_PROGRESSIONS.filter((p) => p.category === category)
}

function chordRoman(chord: PresetChord): string {
  if (/\d|ø|sus|add/.test(chord.roman)) return chord.roman
  const suffix: Partial<Record<PresetChord['quality'], string>> = {
    dominant7: '7',
    major7: 'maj7',
    minor7: '7',
    halfDiminished7: 'ø7',
    major9: 'maj9',
    minor9: '9',
    power: '5',
    sus4: 'sus4',
    add9: 'add9'
  }
  return `${chord.roman}${suffix[chord.quality] ?? ''}`
}

export function getProgressionRoman(progression: PredefinedProgression): string[] {
  const roman = progression.chords.map(chordRoman)
  return roman.filter((symbol, index) => index === 0 || symbol !== roman[index - 1])
}

/**
 * Picks a random progression ID from candidate presets or the global progression pool.
 */
export function pickRandomProgressionId(
  candidateProgressions?: readonly { id: string }[],
  rng: () => number = Math.random
): string | undefined {
  const pool =
    candidateProgressions && candidateProgressions.length > 0 ? candidateProgressions : PREDEFINED_PROGRESSIONS
  if (pool.length === 0) return undefined
  const randomIndex = Math.floor(rng() * pool.length)
  return pool[randomIndex].id
}

const QUALITY_SUFFIX: Partial<Record<PresetChord['quality'], string>> = {
  dominant7: '7',
  major7: 'maj7',
  minor7: 'm7',
  halfDiminished7: 'm7b5',
  major9: 'maj9',
  minor9: 'm9',
  power: '5',
  sus4: 'sus4',
  add9: 'add9'
}

function resolveChordName(chord: PresetChord, key: string, scale: string): string {
  const diatonic = getDiatonicChords(key, scale)
  if (!Number.isInteger(chord.degree) || chord.degree < 0 || chord.degree >= diatonic.length) {
    throw new Error(`Invalid chord degree: ${chord.degree}`)
  }

  const degree = diatonic[chord.degree]
  if (chord.quality === 'triad') return degree.triadName

  const suffix = QUALITY_SUFFIX[chord.quality]
  if (!suffix) throw new Error(`Unsupported chord quality: ${chord.quality}`)
  return `${degree.triadNotes[0]}${suffix}`
}

/** Repeats a fixed phrase without stretching its harmonic rhythm; clips the final repetition. */
export function createProgressionChords(
  progressionId: string,
  key: string,
  bars: number,
  baseOctave = 3,
  voicingStyle: VoicingStyle = 'close'
): ChordEvent[] {
  const progression = getProgressionById(progressionId)
  if (!progression) throw new Error(`Unknown progression ID: "${progressionId}"`)
  if (!Number.isInteger(bars) || bars < 1) throw new Error('Progression target bars must be a positive integer')
  const timeline = resolvePresetTiming(progression)

  const result: ChordEvent[] = []
  for (let phraseStart = 0; phraseStart < bars; phraseStart += progression.bars) {
    for (const { chord, startBar: onset } of timeline) {
      const startBar = phraseStart + onset
      if (startBar >= bars) break
      const durationBars = Math.min(chord.durationBars, bars - startBar)
      const name = resolveChordName(chord, key, progression.scale)
      const notes = getChordNotes(name)
      const voicing = buildChordVoicing(name, baseOctave, 0, voicingStyle)
      if (notes.length === 0 || voicing.length === 0) {
        throw new Error(`Cannot resolve chord ${name} in progression ${progression.id}`)
      }
      result.push(
        ChordEventSchema.parse({
          id: crypto.randomUUID(),
          name,
          roman: chordRoman(chord),
          notes,
          voicing,
          startBar,
          durationBars,
          inversion: 0
        })
      )
    }
  }
  return result
}
