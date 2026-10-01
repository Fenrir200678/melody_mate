import { describe, expect, it } from 'vitest'
import { ChordEventSchema } from '../../../src/core/schemas/chord.schema'
import { STEPS_PER_BAR } from '../../../src/core/schemas/project.schema'
import { resolvePresetTiming } from '../../../src/core/theory/progression-timing'
import {
  createProgressionChords,
  getProgressionById,
  getProgressionRoman,
  getProgressions,
  getProgressionsByCategory,
  pickRandomProgressionId,
  PREDEFINED_PROGRESSIONS,
  type ProgressionCategory
} from '../../../src/core/theory/progressions'

describe('progressions', () => {
  it('offers distinct, valid presets in every category', () => {
    expect(PREDEFINED_PROGRESSIONS.length).toBeGreaterThanOrEqual(50)
    expect(new Set(PREDEFINED_PROGRESSIONS.map((preset) => preset.id)).size).toBe(PREDEFINED_PROGRESSIONS.length)
    const signatures = PREDEFINED_PROGRESSIONS.map((preset) =>
      JSON.stringify([
        preset.scale,
        preset.bars,
        resolvePresetTiming(preset).map(({ chord, startBar }) => [
          startBar,
          chord.degree,
          chord.quality,
          chord.durationBars
        ])
      ])
    )
    expect(new Set(signatures).size).toBe(PREDEFINED_PROGRESSIONS.length)

    const categories: ProgressionCategory[] = ['pop', 'electronic', 'dark', 'jazz-soul', 'rock']
    for (const category of categories) {
      expect(getProgressionsByCategory(category).length).toBeGreaterThanOrEqual(10)
    }

    for (const preset of PREDEFINED_PROGRESSIONS) {
      expect(preset.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(preset.name.trim()).not.toBe('')
      expect(preset.scale.trim()).not.toBe('')
      expect(preset.bars).toBeGreaterThan(0)
      expect(preset.chords.length).toBeGreaterThanOrEqual(2)
      expect(resolvePresetTiming(preset)).toHaveLength(preset.chords.length)
      for (const chord of preset.chords) {
        expect(chord.roman.trim()).not.toBe('')
        expect(Number.isInteger(chord.degree)).toBe(true)
        expect(chord.durationBars * STEPS_PER_BAR).toBeGreaterThanOrEqual(1)
        expect(Number.isInteger(chord.durationBars * STEPS_PER_BAR)).toBe(true)
      }
    }
  })

  it('resolves every preset to playable chords on the sixteenth-note grid', () => {
    for (const preset of PREDEFINED_PROGRESSIONS) {
      for (const key of ['C', 'F#', 'Bb']) {
        const chords = createProgressionChords(preset.id, key, preset.bars)
        expect(chords, `${preset.id} in ${key}`).toHaveLength(preset.chords.length)
        expect(chords.at(-1)!.startBar + chords.at(-1)!.durationBars, `${preset.id} in ${key}`).toBeLessThanOrEqual(
          preset.bars
        )
        for (const chord of chords) {
          expect(ChordEventSchema.safeParse(chord).success, `${preset.id} in ${key}`).toBe(true)
          expect(Number.isInteger(chord.startBar * STEPS_PER_BAR), `${preset.id} in ${key}`).toBe(true)
          expect(Number.isInteger(chord.durationBars * STEPS_PER_BAR), `${preset.id} in ${key}`).toBe(true)
          expect(chord.notes.length, `${preset.id} in ${key}`).toBeGreaterThan(0)
          expect(chord.voicing.length, `${preset.id} in ${key}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('keeps the simple pop loop as an accessible starting point', () => {
    const chords = createProgressionChords('pop-standard', 'C', 4)
    expect(chords.map((chord) => chord.name)).toEqual(['C', 'G', 'Am', 'F'])
    expect(chords.map((chord) => chord.startBar)).toEqual([0, 1, 2, 3])
    expect(chords.map((chord) => chord.durationBars)).toEqual([1, 1, 1, 1])
    expect(chords[0].voicing).toEqual(['C3', 'E3', 'G3'])
  })

  it('repeats its fixed phrase without stretching chord durations', () => {
    const phrase = createProgressionChords('pop-standard', 'C', 4)
    const repeated = createProgressionChords('pop-standard', 'C', 8)
    expect(repeated).toHaveLength(phrase.length * 2)
    expect(repeated.slice(4).map((chord) => chord.startBar)).toEqual(phrase.map((chord) => chord.startBar + 4))
    expect(repeated.map((chord) => chord.durationBars)).toEqual([
      ...phrase.map((chord) => chord.durationBars),
      ...phrase.map((chord) => chord.durationBars)
    ])
  })

  it('clips a final repetition at the requested project length', () => {
    const chords = createProgressionChords('pop-standard', 'C', 5)
    expect(chords).toHaveLength(5)
    expect(chords.at(-1)!.startBar).toBe(4)
    expect(chords.at(-1)!.durationBars).toBe(1)
  })

  it('uses extended chords and half-bar changes in the jazz cadence', () => {
    const chords = createProgressionChords('jazz-cadence', 'C', 4)
    expect(chords.map((chord) => chord.startBar)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3])
    expect(chords.map((chord) => chord.name)).toEqual(['Dm7', 'G7', 'Cmaj9', 'Am7', 'Dm7', 'G7', 'Cmaj9'])
    expect(chords[2].notes).toHaveLength(5)
    expect(chords.slice(0, 3).map((chord) => chord.roman)).toEqual(['ii7', 'V7', 'Imaj9'])
    expect(getProgressionRoman(getProgressionById('jazz-cadence')!).slice(0, 3)).toEqual(['ii7', 'V7', 'Imaj9'])
  })

  it('supports four chords within one bar', () => {
    const chords = createProgressionChords('bossa-breeze', 'C', 4)
    expect(chords.slice(0, 4).map((chord) => chord.startBar)).toEqual([0, 0.25, 0.5, 0.75])
    expect(chords.slice(0, 4).map((chord) => chord.durationBars)).toEqual([0.25, 0.25, 0.25, 0.25])
  })

  it('uses a raised-third dominant in the Andalusian cadence', () => {
    const chords = createProgressionChords('andalusian', 'A', 4)
    expect(chords.map((chord) => chord.name)).toEqual(['Am', 'G', 'F', 'E7'])
    expect(chords[3].notes).toContain('G#')
  })

  it('labels the flattened roots in modal power-chord presets', () => {
    const mixolydian = createProgressionChords('classic-rock', 'C', 4)
    expect(mixolydian[1].name).toBe('Bb5')
    expect(mixolydian[1].roman).toBe('bVII5')
    const phrygian = createProgressionChords('phrygian-shadow', 'E', 4)
    expect(phrygian[1].name).toBe('F5')
    expect(phrygian[1].roman).toBe('bII5')
    expect(phrygian[3].name).toBe('D5')
    expect(phrygian[3].roman).toBe('bVII5')
  })

  it('provides a full twelve-bar blues', () => {
    const chords = createProgressionChords('blues-turnaround', 'C', 12)
    expect(chords).toHaveLength(12)
    expect(chords.map((chord) => chord.name)).toEqual([
      'C7',
      'C7',
      'C7',
      'C7',
      'F7',
      'F7',
      'C7',
      'C7',
      'G7',
      'F7',
      'C7',
      'G7'
    ])
  })

  it('honors the selected base octave', () => {
    expect(createProgressionChords('pop-standard', 'C', 4, 5)[0].voicing).toEqual(['C5', 'E5', 'G5'])
  })

  it('rejects unknown presets and invalid project lengths', () => {
    expect(() => createProgressionChords('non-existent-prog', 'C', 4)).toThrow(/Unknown progression ID/)
    expect(() => createProgressionChords('pop-standard', 'C', 0)).toThrow(/positive integer/)
  })

  it('exposes lookup and random selection helpers', () => {
    expect(getProgressions()).toEqual(PREDEFINED_PROGRESSIONS)
    expect(getProgressionById('royal-road')?.category).toBe('pop')
    const id = pickRandomProgressionId()
    expect(PREDEFINED_PROGRESSIONS.some((preset) => preset.id === id)).toBe(true)
    const subset = PREDEFINED_PROGRESSIONS.slice(0, 2)
    const pickedSubset = pickRandomProgressionId(subset)
    expect(subset.some((preset) => preset.id === pickedSubset)).toBe(true)
  })
})
