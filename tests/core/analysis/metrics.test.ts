import { describe, expect, it } from 'vitest'
import { computeMelodyMetrics, type MelodyAnalysisContext } from '@/core/analysis'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import type { AppNote } from '@/core/schemas/note.schema'
import { getChordNotes, midiToPitch } from '@/core/theory'

const chord = (name = 'C', startBar = 0, durationBars = 4): ChordEvent => ({
  id: `${name}-${startBar}`,
  name,
  roman: 'I',
  notes: getChordNotes(name),
  voicing: getChordNotes(name, 3),
  startBar,
  durationBars
})
const context: MelodyAnalysisContext = {
  key: 'C',
  scale: 'major',
  chords: [chord()],
  stepsPerBar: 16,
  snapStep: 1,
  minOctave: 3,
  maxOctave: 4
}
const note = (midi: number, step: number, durationSteps = 1): AppNote => ({
  id: `${midi}-${step}`,
  midi,
  pitch: midiToPitch(midi),
  step,
  durationSteps,
  velocity: 100,
  isMuted: false
})
const line = (pitches: number[], spacing = 4, startStep = 0): AppNote[] =>
  pitches.map((midi, index) => note(midi, startStep + index * spacing))
const analyze = (notes: readonly AppNote[], patch: Partial<MelodyAnalysisContext> = {}) =>
  computeMelodyMetrics(notes, { ...context, ...patch })

describe('computeMelodyMetrics', () => {
  it('returns empty metrics without harmonic evidence for empty melodies and muted rests', () => {
    const expected = {
      rangeSemitones: 0,
      rangeLabel: '–',
      motionBalance: { steps: 0, leaps: 0, repeats: 0 },
      syncopationRatio: 0,
      chordToneRatio: null,
      repetitionScore: 0,
      tensionPerBar: [0, 0, 0, 0],
      contourClarity: 0,
      rhythmPredictability: 0,
      resolution: null
    }
    expect(analyze([], { bars: 4 })).toEqual(expected)
    expect(analyze([{ ...note(60, 0), isMuted: true }], { bars: 4 })).toEqual(expected)
    expect(analyze([]).tensionPerBar).toEqual([])
  })

  it.each([
    [[60, 62, 64, 65], { steps: 1, leaps: 0, repeats: 0 }],
    [[60, 64, 67, 72], { steps: 0, leaps: 1, repeats: 0 }],
    [[60, 60, 60, 60], { steps: 0, leaps: 0, repeats: 1 }],
    [[60, 62, 67, 67], { steps: 1 / 3, leaps: 1 / 3, repeats: 1 / 3 }]
  ])('classifies motion for %j', (pitches, expected) => {
    const metrics = analyze(line(pitches as number[]))
    expect(metrics.motionBalance).toEqual(expected)
    expect(Object.values(metrics.motionBalance).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1)
  })

  it('keeps original pitch spellings in the range label', () => {
    const notes = [
      { ...note(51, 0), pitch: 'Eb3' },
      { ...note(70, 4), pitch: 'Bb4' }
    ]
    expect(analyze(notes)).toMatchObject({ rangeSemitones: 19, rangeLabel: 'Eb3 – Bb4' })
  })

  it('measures off-quarter onsets independently of editing snap', () => {
    expect(analyze(line([60, 62, 64, 65])).syncopationRatio).toBe(0)
    expect(analyze(line([60, 62, 64, 65], 2)).syncopationRatio).toBe(0.5)
    const offbeats = line([60, 62, 64, 65], 4, 2)
    expect(analyze(offbeats, { snapStep: 2 }).syncopationRatio).toBe(1)
    expect(analyze(offbeats, { beatSteps: 2 }).syncopationRatio).toBe(0)
  })

  it('uses active chords, symbol fallback and enharmonic pitch classes', () => {
    const chords = [chord('C', 0, 1), { ...chord('Db', 1, 1), notes: [] }]
    const notes = [note(60, 0), note(62, 4), { ...note(61, 16), pitch: 'C#4' }, note(65, 20)]
    expect(analyze(notes, { chords }).chordToneRatio).toBe(0.75)
    expect(analyze(notes, { chords: [] }).chordToneRatio).toBeNull()
  })

  it('recognizes returning ABAB bigrams and distinguishes four different bars', () => {
    const abab = [
      ...line([60, 62, 64, 65]),
      ...line([67, 69, 71, 72], 4, 16),
      ...line([60, 62, 64, 65], 4, 32),
      ...line([67, 69, 71, 72], 4, 48)
    ]
    const different = [
      ...line([60, 62, 64, 65]),
      ...line([67, 69, 71, 72], 4, 16),
      ...line([61, 63, 66, 68], 4, 32),
      ...line([70, 73, 75, 77], 4, 48)
    ]
    expect(analyze(abab).repetitionScore).toBe(1)
    expect(analyze(different).repetitionScore).toBe(0)
    expect(analyze(abab.slice(0, 4)).repetitionScore).toBe(0)
  })

  it('compares ordered pairs rather than unordered notes and does not score silence as a hook', () => {
    const reversed = [...line([60, 64, 67]), ...line([67, 64, 60], 4, 16)]
    expect(analyze(reversed).repetitionScore).toBe(0)
    expect(analyze([note(60, 0), note(60, 16)], { bars: 4 }).repetitionScore).toBe(0)
    const repeated = [...line([60, 64, 67]), ...line([60, 64, 67], 4, 32)]
    expect(analyze(repeated, { bars: 4 }).repetitionScore).toBe(0.5)
  })

  it('computes partial bigram Jaccard overlap and distinguishes rhythm changes', () => {
    const partial = [...line([60, 62, 64]), ...line([60, 62, 65], 4, 16)]
    expect(analyze(partial).repetitionScore).toBeCloseTo(1 / 3)
    const shifted = [...line([60, 62, 64]), ...line([60, 62, 64], 4, 18)]
    expect(analyze(shifted).repetitionScore).toBe(0)
  })

  it('scores chromatic dissonance above consonant chord tones', () => {
    const consonant = analyze(line([60, 64, 67, 64])).tensionPerBar[0]!
    const chromatic = analyze(line([61, 63, 66, 68])).tensionPerBar[0]!
    expect(chromatic).toBeGreaterThan(consonant + 0.5)
  })

  it('adds 0.3 register tension from the lower to the upper octave boundary', () => {
    const metrics = analyze([note(48, 0), note(71, 16)], { chords: [chord('Cmaj7')] })
    expect(metrics.tensionPerBar).toEqual([0, 0.3])
    expect(analyze([note(90, 0)], { chords: [] }).tensionPerBar).toEqual([0.3])
  })

  it('preserves silent bar positions and detects a constructed flat tension curve', () => {
    expect(analyze([note(60, 16)], { bars: 3 }).tensionPerBar).toEqual([0, expect.any(Number), 0])
    const metrics = analyze([note(60, 0), note(60, 16), note(60, 32), note(60, 48)])
    expect(new Set(metrics.tensionPerBar).size).toBe(1)
  })

  it('distinguishes clear contours from alternating directions and ignores repeated pitch direction', () => {
    expect(analyze(line([60, 62, 64, 65])).contourClarity).toBe(1)
    expect(analyze(line([60, 62, 60, 62])).contourClarity).toBe(0)
    expect(analyze(line([60, 62, 62, 60])).contourClarity).toBe(0)
    expect(analyze([note(60, 0)]).contourClarity).toBe(0)
  })

  it('normalizes onset-delta entropy and handles insufficient rhythm evidence', () => {
    expect(analyze(line([60, 62, 64, 65])).rhythmPredictability).toBe(1)
    expect(analyze([note(60, 0), note(62, 1), note(64, 3), note(65, 6)]).rhythmPredictability).toBeCloseTo(0)
    expect(analyze([note(60, 0)]).rhythmPredictability).toBe(0)
  })

  it.each([
    [60, 1],
    [64, 0.5],
    [62, 0]
  ])('resolves closing MIDI %i to %f', (midi, expected) => {
    expect(analyze([note(midi, 12)]).resolution).toBe(expected)
  })

  it('evaluates the closing chord of the region even when the melody stops earlier', () => {
    const chords = [chord('C', 0, 1), chord('D', 1, 1)]
    expect(analyze([note(60, 0)], { chords, bars: 2 }).resolution).toBe(0)
    expect(analyze([note(62, 16)], { chords, bars: 2, key: 'D' }).resolution).toBe(1)
    expect(analyze([note(60, 0)], { chords: [] }).resolution).toBeNull()
  })

  it('does not count notes without chord coverage as failed chord tones', () => {
    const metrics = analyze([note(60, 0), note(62, 16)], { chords: [chord('C', 0, 1)], bars: 2 })
    expect(metrics.chordToneRatio).toBe(1)
    expect(metrics.resolution).toBeNull()
    const uncovered = analyze([note(62, 16)], { chords: [chord('C', 0, 1)], bars: 2 })
    expect(uncovered.chordToneRatio).toBeNull()
    expect(uncovered.resolution).toBeNull()
  })

  it('supports a bar-aligned selection with absolute chord positions and immutable inputs', () => {
    const input = Object.freeze([Object.freeze(note(60, 0)), Object.freeze(note(65, 16)), Object.freeze(note(67, 32))])
    const metrics = analyze(input, { startStep: 16, bars: 1, chords: [chord('F', 1, 1)] })
    expect(metrics.rangeSemitones).toBe(0)
    expect(metrics.chordToneRatio).toBe(1)
    expect(metrics.tensionPerBar).toHaveLength(1)
    expect(input.map((item) => item.step)).toEqual([0, 16, 32])
  })

  it('sorts onsets without mutating the melody and ignores invalid note data', () => {
    const input = [note(64, 8), note(60, 0), note(62, 4), note(NaN, 12)]
    expect(analyze(input).motionBalance).toEqual({ steps: 1, leaps: 0, repeats: 0 })
    expect(input[0]!.step).toBe(8)
  })

  it.each([{ snapStep: 0 }, { stepsPerBar: NaN }, { beatSteps: 0 }, { bars: -1 }, { startStep: 1 }])(
    'rejects invalid context %j',
    (patch) => expect(() => analyze([], patch)).toThrow(RangeError)
  )
})
