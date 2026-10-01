import { describe, expect, it } from 'vitest'
import { resolvePresetTiming } from '../../../src/core/theory/progression-timing'
import type { PredefinedProgression, PresetChord } from '../../../src/core/theory/progressions.types'

const chord = (durationBars: number, startBar?: number): PresetChord => ({
  degree: 0,
  roman: 'I',
  quality: 'triad',
  durationBars,
  startBar
})
const phrase = (chords: PresetChord[], bars = 1): PredefinedProgression => ({
  id: 'timing-fixture',
  name: 'Timing fixture',
  category: 'pop',
  scale: 'major',
  bars,
  chords
})

describe('preset phrase timing', () => {
  it('resolves sequential sixteenths and mixed explicit onsets without stretching', () => {
    const sequential = Array.from({ length: 16 }, () => chord(1 / 16))
    expect(resolvePresetTiming(phrase(sequential)).map((entry) => entry.startBar)).toEqual(
      Array.from({ length: 16 }, (_, step) => step / 16)
    )
    expect(
      resolvePresetTiming(phrase([chord(1 / 16, 2 / 16), chord(1 / 16), chord(1 / 16, 10 / 16)])).map(
        (entry) => entry.startBar
      )
    ).toEqual([2 / 16, 3 / 16, 10 / 16])
  })

  it('retains leading, internal and trailing silence in explicitly positioned phrases', () => {
    const timeline = resolvePresetTiming(phrase([chord(1 / 16, 2 / 16), chord(1 / 16, 10 / 16)]))
    expect(timeline.map((entry) => entry.startBar)).toEqual([2 / 16, 10 / 16])
    expect(timeline.map((entry) => entry.chord.durationBars)).toEqual([1 / 16, 1 / 16])
  })

  it.each([0, 1 / 32, 0.1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid duration %s', (duration) => {
    expect(() => resolvePresetTiming(phrase([chord(duration, 0)]))).toThrow(/duration/)
  })

  it.each([-1 / 16, 1 / 32, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid onset %s', (onset) => {
    expect(() => resolvePresetTiming(phrase([chord(1 / 16, onset)]))).toThrow(/onset/)
  })

  it('rejects overlaps, unsorted events, phrase overflow and unfilled sequential phrases', () => {
    expect(() => resolvePresetTiming(phrase([chord(0.25, 0), chord(0.25, 1 / 16)]))).toThrow(/overlapping/)
    expect(() => resolvePresetTiming(phrase([chord(1 / 16, 0.5), chord(1 / 16, 0)]))).toThrow(/onset/)
    expect(() => resolvePresetTiming(phrase([chord(0.25, 15 / 16)]))).toThrow(/exceeds/)
    expect(() => resolvePresetTiming(phrase([chord(0.25)]))).toThrow(/do not fill/)
  })

  it('rejects empty phrases and invalid bar lengths', () => {
    expect(() => resolvePresetTiming(phrase([]))).toThrow(/length/)
    expect(() => resolvePresetTiming(phrase([chord(1)], 0))).toThrow(/length/)
    expect(() => resolvePresetTiming(phrase([chord(1)], 1.5))).toThrow(/length/)
  })
})
