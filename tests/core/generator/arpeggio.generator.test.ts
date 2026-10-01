import { describe, expect, it } from 'vitest'
import { DEFAULT_GENERATOR_PARAMS } from '../../../src/config/defaults'
import {
  generateArpeggio,
  isArpChordTone,
  type ArpeggioGeneratorOptions
} from '../../../src/core/generator/arpeggio.generator'
import { patternIndex } from '../../../src/core/generator/arp-pattern'
import { varyArpNotes } from '../../../src/core/generator/arp-variation'
import { calculateArpVelocity, maskArpBarSteps } from '../../../src/core/generator/arp-rhythm'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import { ArpOctaveModeEnum, GeneratorParamsSchema } from '../../../src/core/schemas/generator.schema'
import { AppNoteSchema } from '../../../src/core/schemas/note.schema'
import { STEPS_PER_BAR } from '../../../src/core/schemas/project.schema'
import { TRAINED_ARTIFACT_VERSION, TrainedMarkovArtifactSchema } from '../../../src/core/schemas/trained-markov.schema'
import { isNoteInScale, midiToPitch } from '../../../src/core/theory/scale.engine'

const cChord: ChordEvent = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'C',
  roman: 'I',
  notes: ['C', 'E', 'G'],
  voicing: ['C3', 'E3', 'G3'],
  startBar: 0,
  durationBars: 1
}

const gChord: ChordEvent = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'G',
  roman: 'V',
  notes: ['G', 'B', 'D'],
  voicing: ['G3', 'B3', 'D4'],
  startBar: 1,
  durationBars: 1
}

const base: ArpeggioGeneratorOptions = {
  key: 'C',
  scale: 'major',
  range: { startStep: 0, endStep: STEPS_PER_BAR },
  pattern: 'up',
  rate: '1/4',
  octaveRange: 1,
  seed: 0,
  chords: [cChord]
}

const preferredGModel = TrainedMarkovArtifactSchema.parse({
  artifactVersion: TRAINED_ARTIFACT_VERSION,
  kind: 'melodymate-markov',
  id: 'arp-preferred-g',
  role: 'arp',
  style: 'test',
  representation: { type: 'tonic-relative-chroma', symbolCount: 12 },
  maxOrder: 1,
  backoffStrength: 4,
  configHash: '0123456789abcdef',
  manifestHash: '0123456789abcdef',
  stats: { files: 1, tracks: 1, sequences: 1, notes: 101003, contexts: 2, transitions: 101003 },
  counts: { '': { '0': 1, '2': 100000, '4': 1, '7': 1000 }, '0': { '2': 100000, '4': 1, '7': 1000 } }
})

describe('generateArpeggio', () => {
  it.each([
    ['up', [60, 64, 67, 60]],
    ['down', [67, 64, 60, 67]],
    ['up-down', [60, 64, 67, 64]],
    ['down-up', [67, 64, 60, 64]],
    ['pedal-bass', [60, 64, 60, 67]],
    ['pinky-top', [67, 60, 67, 64]],
    ['converge', [60, 67, 64, 60]],
    ['diverge', [64, 67, 60, 64]]
  ] as const)('follows the %s broken-chord pattern', (pattern, expected) => {
    const notes = generateArpeggio({ ...base, pattern })
    expect(notes.map((note) => note.midi)).toEqual(expected)
    expect(notes.every((note) => AppNoteSchema.safeParse(note).success)).toBe(true)
  })

  it.each([
    ['1/4', 4],
    ['1/8', 2],
    ['1/16', 1]
  ] as const)('uses the %s rate on the sequencer grid', (rate, stride) => {
    const notes = generateArpeggio({ ...base, rate, gate: 100 })
    expect(notes).toHaveLength(STEPS_PER_BAR / stride)
    expect(notes.map((note) => note.step)).toEqual(
      Array.from({ length: STEPS_PER_BAR / stride }, (_, index) => index * stride)
    )
    expect(notes.every((note) => note.durationSteps === stride)).toBe(true)
  })

  it('switches to the active chord at the exact chord boundary', () => {
    const notes = generateArpeggio({
      ...base,
      rate: '1/8',
      range: { startStep: 0, endStep: 2 * STEPS_PER_BAR },
      chords: [cChord, gChord]
    })
    const firstBar = notes.filter((note) => note.step < STEPS_PER_BAR)
    const secondBar = notes.filter((note) => note.step >= STEPS_PER_BAR)
    expect(new Set(firstBar.map((note) => note.midi % 12))).toEqual(new Set([0, 4, 7]))
    expect(new Set(secondBar.map((note) => note.midi % 12))).toEqual(new Set([2, 7, 11]))
    expect(secondBar[0].step).toBe(STEPS_PER_BAR)
  })

  it('keeps an altered explicit chord tone outside the project scale', () => {
    const notes = generateArpeggio({
      ...base,
      key: 'A',
      scale: 'minor',
      rate: '1/16',
      chords: [{ ...cChord, name: 'E', notes: ['E', 'G#', 'B'] }]
    })
    expect(new Set(notes.map((note) => note.midi % 12))).toEqual(new Set([4, 8, 11]))
  })

  it('creates coherent diatonic triads for an empty chord track', () => {
    const notes = generateArpeggio({
      ...base,
      rate: '1/16',
      range: { startStep: 0, endStep: 2 * STEPS_PER_BAR },
      chords: []
    })
    for (let bar = 0; bar < 2; bar++) {
      const barNotes = notes.filter((note) => Math.floor(note.step / STEPS_PER_BAR) === bar)
      expect(new Set(barNotes.map((note) => note.midi % 12)).size).toBe(3)
      expect(barNotes.every((note) => isNoteInScale(note.pitch, 'C', 'major'))).toBe(true)
    }
    expect(new Set(notes.slice(0, STEPS_PER_BAR).map((note) => note.midi % 12))).not.toEqual(
      new Set(notes.slice(STEPS_PER_BAR).map((note) => note.midi % 12))
    )
  })

  it('fills only uncovered spans with temporary harmony without changing the chord track', () => {
    const chords = [{ ...gChord, startBar: 1, durationBars: 0.5 }]
    const before = structuredClone(chords)
    const notes = generateArpeggio({
      ...base,
      rate: '1/16',
      range: { startStep: 0, endStep: 2 * STEPS_PER_BAR },
      chords
    })
    const occupied = notes.filter((note) => note.step >= STEPS_PER_BAR && note.step < STEPS_PER_BAR * 1.5)
    const gap = notes.filter((note) => note.step >= STEPS_PER_BAR * 1.5)
    expect(occupied.every((note) => [2, 7, 11].includes(note.midi % 12))).toBe(true)
    expect(gap.length).toBeGreaterThan(0)
    expect(gap.every((note) => isNoteInScale(note.pitch, 'C', 'major'))).toBe(true)
    expect(chords).toEqual(before)
  })

  it('keeps starts and tails within an arbitrary work range', () => {
    const range = { startStep: 3, endStep: 18 }
    const notes = generateArpeggio({ ...base, range, chords: [cChord, gChord] })
    expect(notes[0].step).toBe(range.startStep)
    expect(notes.every((note) => note.step >= range.startStep && note.step + note.durationSteps <= range.endStep)).toBe(
      true
    )
    expect(generateArpeggio({ ...base, range: { startStep: 8, endStep: 8 } })).toEqual([])
  })

  it('repeats the same random phrase and note IDs from the same seed', () => {
    const options = { ...base, rate: '1/16' as const, pattern: 'random' as const }
    const first = generateArpeggio(options)
    const repeated = generateArpeggio(options)
    const changed = generateArpeggio({ ...options, seed: 17 })
    expect(repeated).toEqual(first)
    expect(changed.map((note) => note.midi)).not.toEqual(first.map((note) => note.midi))
    expect(new Set(first.map((note) => note.id)).size).toBe(first.length)
    expect(first.every((note) => [0, 4, 7].includes(note.midi % 12))).toBe(true)
    expect(first.slice(1).every((note, index) => Math.abs(note.midi - first[index].midi) <= 7)).toBe(true)
  })

  it('uses an arp model as a pitch prior while preserving chord tones and rhythm', () => {
    const fallback = generateArpeggio(base)
    const trained = generateArpeggio({ ...base, trainedModel: preferredGModel })
    expect(trained[1].midi).toBe(67)
    expect(trained[1].midi).not.toBe(fallback[1].midi)
    expect(trained.map((note) => note.step)).toEqual(fallback.map((note) => note.step))
    expect(trained.every((note) => [0, 4, 7].includes(note.midi % 12))).toBe(true)
    expect(generateArpeggio({ ...base, trainedModel: null })).toEqual(fallback)
  })

  it('generates notes in the specified baseOctave and octaveRange', () => {
    // baseOctave: 2, octaveRange: 1 -> C2 (36) to B2 (47)
    const bassArp = generateArpeggio({ ...base, baseOctave: 2, octaveRange: 1 })
    expect(bassArp.every((note) => note.midi >= 36 && note.midi <= 47)).toBe(true)
    expect(bassArp[0].midi).toBe(36) // C2

    // baseOctave: 5, octaveRange: 2 -> C5 (72) to B6 (95)
    const leadArp = generateArpeggio({ ...base, baseOctave: 5, octaveRange: 2 })
    expect(leadArp.every((note) => note.midi >= 72 && note.midi <= 95)).toBe(true)
    expect(leadArp[0].midi).toBe(72) // C5
  })

  describe('octave traversal', () => {
    const wide: ArpeggioGeneratorOptions = {
      ...base,
      baseOctave: 4,
      octaveRange: 3,
      rate: '1/16',
      adherence: 100,
      density: 100,
      range: { startStep: 0, endStep: 18 },
      chords: [{ ...cChord, durationBars: 4 }]
    }

    it.each([
      ['up', [60, 64, 67, 72, 76, 79, 84, 88, 91, 60, 64, 67, 72, 76, 79]],
      ['down', [84, 88, 91, 72, 76, 79, 60, 64, 67, 84, 88, 91, 72, 76, 79]],
      ['alternate', [60, 64, 67, 72, 76, 79, 84, 88, 91, 72, 76, 79, 60, 64, 67]],
      ['zigzag', [60, 76, 91, 72, 64, 79, 84, 76, 67, 72, 88, 79, 60, 76, 91]]
    ] as const)('sequences the %s octave mode independently of chord tones', (octaveMode, expected) => {
      const notes = generateArpeggio({ ...wide, octaveMode })
      expect(notes.slice(0, expected.length).map((note) => note.midi)).toEqual(expected)
    })

    it('uses the configured default mode when omitted', () => {
      expect(generateArpeggio(wide)).toEqual(
        generateArpeggio({ ...wide, octaveMode: DEFAULT_GENERATOR_PARAMS.arpOctaveMode })
      )
    })

    it.each([
      [2, [60, 72, 60, 72, 60, 72, 60, 72]],
      [4, [60, 72, 84, 96, 84, 72, 60, 72]]
    ] as const)('turns cleanly at both ends of a %s-octave pendulum', (octaveRange, roots) => {
      const notes = generateArpeggio({
        ...wide,
        octaveMode: 'alternate',
        octaveRange,
        range: { startStep: 0, endStep: 24 }
      })
      expect(notes.filter((_, index) => index % 3 === 0).map((note) => note.midi)).toEqual(roots)
    })

    it.each([
      ['down', [67, 64, 60, 79, 76, 72]],
      ['up-down', [60, 64, 67, 64, 72, 76, 79, 76]],
      ['down-up', [67, 64, 60, 64, 79, 76, 72, 76]],
      ['pedal-bass', [60, 64, 60, 67, 72, 76, 72, 79]],
      ['pinky-top', [67, 60, 67, 64, 79, 72, 79, 76]],
      ['converge', [60, 67, 64, 72, 79, 76]],
      ['diverge', [64, 67, 60, 76, 79, 72]]
    ] as const)('completes the %s pattern before moving to the next octave', (pattern, expected) => {
      const notes = generateArpeggio({ ...wide, pattern, octaveMode: 'up' })
      expect(notes.slice(0, expected.length).map((note) => note.midi)).toEqual(expected)
    })

    it.each(ArpOctaveModeEnum.options)('leaves every one-octave pattern identical in %s mode', (octaveMode) => {
      for (const pattern of ['up', 'down', 'up-down', 'pedal-bass', 'random', 'brown', 'chord-rhythm'] as const) {
        const options = { ...wide, octaveRange: 1, pattern, adherence: 50, density: 75 }
        expect(generateArpeggio({ ...options, octaveMode })).toEqual(generateArpeggio({ ...options, octaveMode: 'up' }))
      }
    })

    it.each(ArpOctaveModeEnum.options)('ignores %s mode for absolute voicings and their fallback', (octaveMode) => {
      for (const chords of [wide.chords, []]) {
        const options = { ...wide, pitchSource: 'chord-voicing' as const, chords }
        expect(generateArpeggio({ ...options, octaveMode })).toEqual(generateArpeggio({ ...options, octaveMode: 'up' }))
      }
    })

    it('advances chord-rhythm pulses through octave-local chords', () => {
      const notes = generateArpeggio({ ...wide, pattern: 'chord-rhythm', octaveMode: 'down' })
      expect(notes.filter((note) => note.step === 0).map((note) => note.midi)).toEqual([84, 88, 91])
      expect(notes.filter((note) => note.step === 1).map((note) => note.midi)).toEqual([72, 76, 79])
      expect(notes.filter((note) => note.step === 2).map((note) => note.midi)).toEqual([60, 64, 67])
    })

    it('starts a fresh octave sequence at a chord change', () => {
      const notes = generateArpeggio({ ...wide, octaveMode: 'down', chords: [cChord, gChord] })
      expect(notes.find((note) => note.step === STEPS_PER_BAR)?.midi).toBe(86)
    })

    it('advances only on sounding steps when density inserts rests', () => {
      const notes = generateArpeggio({ ...wide, octaveMode: 'alternate', density: 50 })
      const full = generateArpeggio({ ...wide, octaveMode: 'alternate' })
      expect(notes.length).toBeLessThan(full.length)
      expect(notes.map((note) => note.midi)).toEqual(full.slice(0, notes.length).map((note) => note.midi))
    })

    it.each(ArpOctaveModeEnum.options)(
      'keeps diatonic passing tones within the selected %s octave layer',
      (octaveMode) => {
        const options = { ...wide, octaveMode, pattern: 'down' as const }
        const chordTones = generateArpeggio(options)
        const decorated = generateArpeggio({ ...options, adherence: 0 })
        expect(decorated.some((note) => ![0, 4, 7].includes(note.midi % 12))).toBe(true)
        expect(decorated.map((note) => Math.floor(note.midi / 12))).toEqual(
          chordTones.map((note) => Math.floor(note.midi / 12))
        )
      }
    )

    it.each(ArpOctaveModeEnum.options)(
      'reproduces randomized %s output and note IDs with the same seed',
      (octaveMode) => {
        for (const pattern of ['random', 'brown'] as const) {
          const options = { ...wide, octaveMode, pattern, adherence: 50, density: 75, seed: 12345 }
          const notes = generateArpeggio(options)
          expect(notes).toEqual(generateArpeggio(options))
          for (const variation of ['pitches', 'feel'] as const) {
            expect(varyArpNotes(notes, options, variation, 9876)).toEqual(varyArpNotes(notes, options, variation, 9876))
          }
        }
      }
    )

    it('validates all octave modes and applies the centralized schema default', () => {
      expect(GeneratorParamsSchema.parse({}).arpOctaveMode).toBe(DEFAULT_GENERATOR_PARAMS.arpOctaveMode)
      for (const arpOctaveMode of ArpOctaveModeEnum.options) {
        expect(GeneratorParamsSchema.parse({ arpOctaveMode }).arpOctaveMode).toBe(arpOctaveMode)
      }
      expect(GeneratorParamsSchema.safeParse({ arpOctaveMode: 'sideways' }).success).toBe(false)
    })
  })

  describe('inversion cycling', () => {
    const cycling: ArpeggioGeneratorOptions = {
      ...base,
      baseOctave: 4,
      pattern: 'up',
      rate: '1/4',
      adherence: 100,
      density: 100,
      gate: 100,
      inversionCycling: true,
      range: { startStep: 0, endStep: 4 * STEPS_PER_BAR },
      chords: [{ ...cChord, durationBars: 4 }]
    }

    it.each([
      [
        'pitch-classes',
        [
          [60, 64, 67],
          [64, 67, 72],
          [55, 60, 64],
          [60, 64, 67]
        ]
      ],
      [
        'chord-voicing',
        [
          [48, 52, 55],
          [52, 55, 60],
          [43, 48, 52],
          [48, 52, 55]
        ]
      ]
    ] as const)('rotates a held triad and wraps back to its root position in %s mode', (pitchSource, pools) => {
      const chords = structuredClone(cycling.chords!)
      const before = structuredClone(chords)
      const notes = generateArpeggio({ ...cycling, pitchSource, chords })
      const bars = [0, 1, 2, 3].map((bar) =>
        notes.filter((note) => Math.floor(note.step / STEPS_PER_BAR) === bar).map((note) => note.midi)
      )
      expect(bars).toEqual(pools.map((pool) => [...pool, pool[0]]))
      expect(chords).toEqual(before)
      expect(notes.every((note) => AppNoteSchema.safeParse(note).success)).toBe(true)
    })

    it.each(['pitch-classes', 'chord-voicing'] as const)(
      'starts from the existing first inversion without applying it twice in %s mode',
      (pitchSource) => {
        const notes = generateArpeggio({
          ...cycling,
          pitchSource,
          chords: [{ ...cChord, inversion: 1, voicing: ['E3', 'G3', 'C4'], durationBars: 4 }]
        })
        expect(notes.filter((note) => note.step % STEPS_PER_BAR === 0).map((note) => note.midi % 12)).toEqual([
          4, 7, 0, 4
        ])
      }
    )

    it('shares a cycle across adjacent equivalent chords with different IDs and note spellings', () => {
      const chords = [
        { ...cChord, name: 'C#', notes: ['C#', 'F', 'G#'], voicing: ['C#3', 'F3', 'G#3'] },
        {
          ...cChord,
          id: gChord.id,
          name: 'Db',
          notes: ['Ab', 'Db', 'F'],
          voicing: ['Db3', 'F3', 'Ab3'],
          startBar: 1,
          durationBars: 3
        }
      ]
      const notes = generateArpeggio({ ...cycling, chords: [...chords].reverse() })
      expect(notes.filter((note) => note.step % STEPS_PER_BAR === 0).map((note) => note.midi % 12)).toEqual([
        1, 5, 8, 1
      ])
    })

    it('resets at a different harmony and when an identical chord returns after a gap', () => {
      const notes = generateArpeggio({
        ...cycling,
        range: { startStep: 0, endStep: 7 * STEPS_PER_BAR },
        chords: [
          { ...cChord, durationBars: 2 },
          { ...gChord, startBar: 2, durationBars: 2 },
          { ...cChord, id: 'return-c', startBar: 4 },
          { ...cChord, id: 'after-gap', startBar: 6 }
        ]
      })
      const bassAt = (bar: number) => notes.find((note) => note.step === bar * STEPS_PER_BAR)!.midi % 12
      expect([0, 1, 2, 3, 4, 6].map(bassAt)).toEqual([0, 4, 7, 11, 0, 0])
    })

    it('uses absolute bar boundaries for fractional chord starts and late work ranges', () => {
      const options = {
        ...cycling,
        chords: [{ ...cChord, startBar: 0.5, durationBars: 4 }],
        range: { startStep: 24, endStep: 36 }
      }
      const notes = generateArpeggio(options)
      expect(notes.map((note) => note.midi)).toEqual([64, 67, 55])
      expect(notes.map((note) => note.step)).toEqual([24, 28, 32])
    })

    it('cycles seventh chords through all four inversions', () => {
      const notes = generateArpeggio({
        ...cycling,
        range: { startStep: 0, endStep: 5 * STEPS_PER_BAR },
        chords: [{ ...cChord, name: 'Cmaj7', notes: ['C', 'E', 'G', 'B'], durationBars: 5 }]
      })
      expect(notes.filter((note) => note.step % STEPS_PER_BAR === 0).map((note) => note.midi % 12)).toEqual([
        0, 4, 7, 11, 0
      ])
    })

    it.each(['pitch-classes', 'chord-voicing'] as const)(
      'cycles synthetic diatonic triads in %s fallback mode',
      (pitchSource) => {
        const notes = generateArpeggio({ ...cycling, seed: 1, pitchSource, chords: [] })
        expect(notes.filter((note) => note.step % STEPS_PER_BAR === 0).map((note) => note.midi % 12)).toEqual([
          9, 9, 2, 0
        ])
        expect(notes.every((note) => isNoteInScale(note.pitch, 'C', 'major'))).toBe(true)
      }
    )

    it('keeps open voicings ordered, cycles distinct bass tones and centers each pool', () => {
      const notes = generateArpeggio({
        ...cycling,
        pitchSource: 'chord-voicing',
        pattern: 'chord-rhythm',
        chords: [{ ...cChord, voicing: ['C3', 'G3', 'E4', 'C5'], durationBars: 4 }]
      })
      const pools = [0, 1, 2, 3].map((bar) =>
        notes.filter((note) => note.step === bar * STEPS_PER_BAR).map((note) => note.midi)
      )
      expect(pools.map((pool) => pool[0] % 12)).toEqual([0, 4, 7, 0])
      for (const pool of pools) {
        expect(pool).toHaveLength(4)
        expect(pool).toEqual([...pool].sort((a, b) => a - b))
        expect(new Set(pool).size).toBe(4)
        expect(Math.abs(pool.reduce((sum, midi) => sum + midi, 0) / pool.length - 59.75)).toBeLessThanOrEqual(6)
      }
    })

    it.each([
      ['C-1', 'E-1', 'G-1'],
      ['C9', 'E9', 'G9']
    ])('keeps inversions of %s / %s / %s within MIDI bounds', (...voicing) => {
      const notes = generateArpeggio({
        ...cycling,
        pitchSource: 'chord-voicing',
        chords: [{ ...cChord, voicing, durationBars: 4 }]
      })
      expect(notes.filter((note) => note.step % STEPS_PER_BAR === 0).map((note) => note.midi % 12)).toEqual([
        0, 4, 7, 0
      ])
      expect(notes.every((note) => Number.isFinite(note.midi) && note.midi >= 0 && note.midi <= 127)).toBe(true)
      expect(notes.every((note) => AppNoteSchema.safeParse(note).success)).toBe(true)
    })

    it.each(ArpOctaveModeEnum.options)('preserves chord tones at the maximum register in %s mode', (octaveMode) => {
      const notes = generateArpeggio({
        ...cycling,
        octaveMode,
        baseOctave: 6,
        octaveRange: 4,
        pattern: 'chord-rhythm',
        rate: '1/16',
        chords: [{ ...cChord, name: 'D', notes: ['D', 'F#', 'A'], durationBars: 4 }]
      })
      for (const step of new Set(notes.map((note) => note.step))) {
        const pulse = notes.filter((note) => note.step === step)
        expect(pulse).toHaveLength(3)
        expect(new Set(pulse.map((note) => note.midi % 12))).toEqual(new Set([2, 6, 9]))
      }
      expect(notes.every((note) => AppNoteSchema.safeParse(note).success)).toBe(true)
    })

    it.each(ArpOctaveModeEnum.options)(
      'preserves full inverted chords while traversing %s octave layers',
      (octaveMode) => {
        const notes = generateArpeggio({ ...cycling, octaveMode, octaveRange: 3, pattern: 'chord-rhythm' })
        for (const step of new Set(notes.map((note) => note.step))) {
          const pulse = notes.filter((note) => note.step === step)
          expect(pulse).toHaveLength(3)
          expect(new Set(pulse.map((note) => note.midi % 12))).toEqual(new Set([0, 4, 7]))
          expect(pulse[0].midi % 12).toBe([0, 4, 7, 0][Math.floor(step / STEPS_PER_BAR)])
        }
      }
    )

    it.each(['1/8d', '1/4d'] as const)('keeps %s note timing and cross-bar tails unchanged', (rate) => {
      const notes = generateArpeggio({ ...cycling, rate })
      const original = generateArpeggio({ ...cycling, rate, inversionCycling: false })
      const timing = (events: typeof notes) =>
        events.map(({ step, durationSteps, velocity, id }) => ({ step, durationSteps, velocity, id }))
      expect(timing(notes)).toEqual(timing(original))
      expect(
        notes.some(
          (note) =>
            Math.floor(note.step / STEPS_PER_BAR) !==
            Math.floor((note.step + note.durationSteps - 0.25) / STEPS_PER_BAR)
        )
      ).toBe(true)
      expect(
        notes.slice(1).every((note, index) => original[index].step + original[index].durationSteps <= note.step)
      ).toBe(true)
    })

    it('keeps the rotation tied to bars when density adds rests', () => {
      const notes = generateArpeggio({ ...cycling, rate: '1/16', density: 50 })
      expect(notes.filter((note) => note.step % STEPS_PER_BAR === 0).map((note) => note.midi % 12)).toEqual([
        0, 4, 7, 0
      ])
    })

    it.each(['random', 'brown'] as const)('reproduces cycled %s pitches and IDs for the same seed', (pattern) => {
      const options = { ...cycling, pattern, adherence: 50, density: 75, seed: 12345 }
      expect(generateArpeggio(options)).toEqual(generateArpeggio(options))
    })

    it.each(['pitch-classes', 'chord-voicing'] as const)(
      'leaves disabled output identical across patterns in %s mode',
      (pitchSource) => {
        for (const pattern of [
          'up',
          'down',
          'up-down',
          'down-up',
          'pedal-bass',
          'pinky-top',
          'converge',
          'diverge',
          'random',
          'brown',
          'chord-rhythm'
        ] as const) {
          const inputs = { ...cycling, inversionCycling: undefined, pattern, pitchSource, adherence: 50, density: 75 }
          expect(generateArpeggio({ ...inputs, inversionCycling: false })).toEqual(generateArpeggio(inputs))
        }
      }
    )

    it('validates the centralized default and preserves inversion cycling in serialized parameters', () => {
      expect(GeneratorParamsSchema.parse({}).arpInversionCycling).toBe(DEFAULT_GENERATOR_PARAMS.arpInversionCycling)
      const enabled = GeneratorParamsSchema.parse({ arpInversionCycling: true })
      expect(GeneratorParamsSchema.parse(JSON.parse(JSON.stringify(enabled))).arpInversionCycling).toBe(true)
      expect(GeneratorParamsSchema.parse({ arpInversionCycling: false }).arpInversionCycling).toBe(false)
      expect(GeneratorParamsSchema.safeParse({ arpInversionCycling: 'true' }).success).toBe(false)
    })
  })

  describe('gate and articulation scaling', () => {
    it('scales durationSteps proportionally to gate percentage', () => {
      // 100% gate at 1/16 gives 1 step
      const full = generateArpeggio({ ...base, rate: '1/16', gate: 100 })
      expect(full.every((note) => note.durationSteps === 1)).toBe(true)

      // 50% gate at 1/16 gives 0.5 steps
      const half = generateArpeggio({ ...base, rate: '1/16', gate: 50 })
      expect(half.every((note) => note.durationSteps === 0.5)).toBe(true)

      // 25% gate at 1/4 (stride = 4) gives 1 step
      const quarter = generateArpeggio({ ...base, rate: '1/4', gate: 25 })
      expect(quarter.every((note) => note.durationSteps === 1)).toBe(true)
    })

    it('falls back to DEFAULT_GENERATOR_PARAMS.arpGate when gate is omitted or non-finite', () => {
      const omitted = generateArpeggio({ ...base, rate: '1/16' })
      const expectedDuration = (1 * DEFAULT_GENERATOR_PARAMS.arpGate) / 100
      expect(omitted.every((note) => note.durationSteps === expectedDuration)).toBe(true)

      const nonFinite = generateArpeggio({ ...base, rate: '1/16', gate: Number.NaN })
      expect(nonFinite.every((note) => note.durationSteps === expectedDuration)).toBe(true)
    })

    it('clamps gate to minimum 20% and maximum 100%', () => {
      // Gate < 20 clamped to 20: at 1/4 (stride = 4), 20% gives 0.8 steps
      const belowMin = generateArpeggio({ ...base, rate: '1/4', gate: 5 })
      expect(belowMin.every((note) => note.durationSteps === 0.8)).toBe(true)

      // Gate > 100 clamped to 100: at 1/4 (stride = 4), 100% gives 4 steps
      const aboveMax = generateArpeggio({ ...base, rate: '1/4', gate: 150 })
      expect(aboveMax.every((note) => note.durationSteps === 4)).toBe(true)
    })

    it('enforces a minimum duration of 0.25 steps (64th note)', () => {
      // At 1/16 (stride = 1), 20% would be 0.2, but minimum is 0.25
      const staccato = generateArpeggio({ ...base, rate: '1/16', gate: 20 })
      expect(staccato.every((note) => note.durationSteps === 0.25)).toBe(true)
    })

    it('clamps duration to work range end and chord boundaries even with 100% gate', () => {
      const range = { startStep: 0, endStep: 3 }
      // Rate 1/4 is 4 steps, but range ends at step 3 -> duration clamped to 3
      const notes = generateArpeggio({ ...base, range, rate: '1/4', gate: 100 })
      expect(notes).toHaveLength(1)
      expect(notes[0].step).toBe(0)
      expect(notes[0].durationSteps).toBe(3)
    })

    it('validates arpGate in GeneratorParamsSchema', () => {
      const parsedDefault = GeneratorParamsSchema.parse({})
      expect(parsedDefault.arpGate).toBe(DEFAULT_GENERATOR_PARAMS.arpGate)

      expect(GeneratorParamsSchema.parse({ arpGate: 20 }).arpGate).toBe(20)
      expect(GeneratorParamsSchema.parse({ arpGate: 100 }).arpGate).toBe(100)
      expect(GeneratorParamsSchema.parse({ arpGate: 50 }).arpGate).toBe(50)

      expect(() => GeneratorParamsSchema.parse({ arpGate: 19 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ arpGate: 101 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ arpGate: 50.5 })).toThrow()
    })
  })

  describe('chord adherence and melodic passing tones', () => {
    it('delivers 100% strict chord tones when adherence is 100 or omitted', () => {
      const omitted = generateArpeggio({ ...base, rate: '1/16' })
      const explicit100 = generateArpeggio({ ...base, rate: '1/16', adherence: 100 })

      expect(omitted).toEqual(explicit100)
      expect(explicit100.every((note) => [0, 4, 7].includes(note.midi % 12))).toBe(true)
    })

    it('anchors the downbeat on step 0 to a chord tone with adherence: 50', () => {
      const notes = generateArpeggio({ ...base, rate: '1/16', adherence: 50 })
      const downbeatNote = notes.find((note) => note.step === 0)
      expect(downbeatNote).toBeDefined()
      expect([0, 4, 7].includes(downbeatNote!.midi % 12)).toBe(true)
    })

    it('strictly enforces downbeats when adherence is 60 or higher', () => {
      for (let seed = 0; seed < 10; seed++) {
        const notes = generateArpeggio({ ...base, rate: '1/16', adherence: 60, seed })
        const downbeat1 = notes.find((note) => note.step === 0)
        const downbeat3 = notes.find((note) => note.step === 8)
        expect([0, 4, 7].includes(downbeat1!.midi % 12)).toBe(true)
        expect([0, 4, 7].includes(downbeat3!.midi % 12)).toBe(true)
      }
    })

    it('introduces diatonic scale passing tones on weak beats when adherence is reduced', () => {
      const notes = generateArpeggio({ ...base, rate: '1/16', adherence: 0, seed: 42 })
      const nonChordNotes = notes.filter((note) => ![0, 4, 7].includes(note.midi % 12))

      // At 0% adherence on offbeats, melodic passing tones must emerge
      expect(nonChordNotes.length).toBeGreaterThan(0)
      // All passing tones are diatonic to C major (D, F, A, B)
      expect(nonChordNotes.every((note) => isNoteInScale(note.pitch, 'C', 'major'))).toBe(true)
    })

    it('guarantees that all generated notes at any adherence value belong to the project scale', () => {
      for (const adherence of [0, 20, 50, 75, 100]) {
        const notes = generateArpeggio({ ...base, rate: '1/16', adherence, seed: 123 })
        expect(notes.every((note) => isNoteInScale(note.pitch, 'C', 'major'))).toBe(true)
      }
    })

    it('ensures passing tones stay in close stepwise motion (1–2 semitones from chord tones)', () => {
      const notes = generateArpeggio({ ...base, rate: '1/16', adherence: 25, seed: 99 })
      const chordMidis = [60, 64, 67] // C4, E4, G4 in octave 1

      for (const note of notes) {
        const isChord = [0, 4, 7].includes(note.midi % 12)
        if (!isChord) {
          // Distance to the nearest chord tone in the pool should be 1 or 2 semitones
          const minDistance = Math.min(...chordMidis.map((cm) => Math.abs(cm - note.midi)))
          expect(minDistance).toBeLessThanOrEqual(2)
        }
      }
    })

    it('produces deterministic output for the same seed and adherence', () => {
      const first = generateArpeggio({ ...base, rate: '1/16', adherence: 70, seed: 777 })
      const second = generateArpeggio({ ...base, rate: '1/16', adherence: 70, seed: 777 })
      const differentSeed = generateArpeggio({ ...base, rate: '1/16', adherence: 70, seed: 888 })

      expect(first).toEqual(second)
      expect(first.map((n) => n.midi)).not.toEqual(differentSeed.map((n) => n.midi))
    })

    it('biases passing tones along the audible travel, not the pattern direction state', () => {
      const notes = generateArpeggio({
        ...base,
        pattern: 'down',
        rate: '1/16',
        adherence: 0,
        pitchSource: 'chord-voicing',
        chords: [{ ...cChord, voicing: ['C4', 'E4', 'G4'] }]
      })
      // 'down' cycles G4 -> E4 -> C4 -> G4; at 0% adherence steps 1-3 always take a passing tone.
      // Descents must lean below the decorated chord tone (E4->D4, C4->B3) while the octave wrap
      // back up to G4 must lean above it (G4->A4) — for every seed.
      expect(notes[1].midi).toBe(62)
      expect(notes[2].midi).toBe(59)
      expect(notes[3].midi).toBe(69)
    })

    it('correctly identifies chord tones vs passing tones using isArpChordTone', () => {
      const opts = { key: 'C', scale: 'major', seed: 0, chords: [cChord] }
      // C4 (60), E4 (64), G4 (67) are chord tones of C major
      expect(isArpChordTone(0, 60, opts)).toBe(true)
      expect(isArpChordTone(0, 64, opts)).toBe(true)
      expect(isArpChordTone(0, 67, opts)).toBe(true)

      // D4 (62), F4 (65), A4 (69), B4 (71) are non-chord passing tones
      expect(isArpChordTone(0, 62, opts)).toBe(false)
      expect(isArpChordTone(0, 65, opts)).toBe(false)
      expect(isArpChordTone(0, 69, opts)).toBe(false)
      expect(isArpChordTone(0, 71, opts)).toBe(false)

      // Synthetic fallback test when chords are omitted
      const syntheticOpts = { key: 'C', scale: 'major', seed: 1, chords: [] }
      const isCChordTone = isArpChordTone(0, 60, syntheticOpts)
      expect(typeof isCChordTone).toBe('boolean')
    })

    it('validates arpAdherence in GeneratorParamsSchema', () => {
      const parsedDefault = GeneratorParamsSchema.parse({})
      expect(parsedDefault.arpAdherence).toBe(DEFAULT_GENERATOR_PARAMS.arpAdherence)

      expect(GeneratorParamsSchema.parse({ arpAdherence: 0 }).arpAdherence).toBe(0)
      expect(GeneratorParamsSchema.parse({ arpAdherence: 50 }).arpAdherence).toBe(50)
      expect(GeneratorParamsSchema.parse({ arpAdherence: 100 }).arpAdherence).toBe(100)

      expect(() => GeneratorParamsSchema.parse({ arpAdherence: -1 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ arpAdherence: 101 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ arpAdherence: 50.5 })).toThrow()
    })
  })

  describe('velocity dynamics and accent contour', () => {
    it('produces uniform, flat velocity (92) for all notes when accent is 0', () => {
      const flatNotes = generateArpeggio({ ...base, rate: '1/16', accent: 0 })
      expect(flatNotes).toHaveLength(STEPS_PER_BAR)
      expect(flatNotes.every((note) => note.velocity === 92)).toBe(true)
    })

    it('produces metric dynamic spread between downbeats and offbeats when accent is 100', () => {
      const accentedNotes = generateArpeggio({ ...base, rate: '1/16', accent: 100 })
      const downbeat = accentedNotes.find((note) => note.step % 16 === 0)
      const offbeat = accentedNotes.find((note) => note.step % 16 === 1)

      expect(downbeat).toBeDefined()
      expect(offbeat).toBeDefined()
      expect(downbeat!.velocity).toBe(118)
      expect(offbeat!.velocity).toBe(71)
      expect(downbeat!.velocity - offbeat!.velocity).toBeGreaterThanOrEqual(40)
    })

    it('strictly bounds all generated velocities within the valid MIDI range [1, 127]', () => {
      for (const accent of [-50, 0, 25, 50, 75, 100, 150]) {
        const notes = generateArpeggio({
          ...base,
          rate: '1/16',
          range: { startStep: 0, endStep: 2 * STEPS_PER_BAR },
          accent
        })
        expect(notes.every((note) => note.velocity >= 1 && note.velocity <= 127)).toBe(true)
      }
    })

    it('falls back to DEFAULT_GENERATOR_PARAMS.arpAccent when accent is omitted or non-finite', () => {
      const omitted = generateArpeggio({ ...base, rate: '1/16' })
      const explicitDefault = generateArpeggio({
        ...base,
        rate: '1/16',
        accent: DEFAULT_GENERATOR_PARAMS.arpAccent
      })
      const nonFinite = generateArpeggio({ ...base, rate: '1/16', accent: Number.NaN })

      expect(omitted.map((n) => n.velocity)).toEqual(explicitDefault.map((n) => n.velocity))
      expect(nonFinite.map((n) => n.velocity)).toEqual(explicitDefault.map((n) => n.velocity))
    })

    it('produces deterministic velocities for the same seed and accent', () => {
      const first = generateArpeggio({ ...base, rate: '1/16', accent: 80, seed: 1234 })
      const second = generateArpeggio({ ...base, rate: '1/16', accent: 80, seed: 1234 })

      expect(first.map((n) => n.velocity)).toEqual(second.map((n) => n.velocity))
    })

    it('computes accurate metric velocities across all step positions in calculateArpVelocity', () => {
      // Accent 0%: flat 92 across all 16 steps
      for (let step = 0; step < 16; step++) {
        expect(calculateArpVelocity(step, 0)).toBe(92)
      }

      // Accent 100%:
      // Beat 1 (step 0): 118
      expect(calculateArpVelocity(0, 100)).toBe(118)
      // Beat 3 (step 8): 105
      expect(calculateArpVelocity(8, 100)).toBe(105)
      // Beats 2 & 4 (steps 4, 12): 97
      expect(calculateArpVelocity(4, 100)).toBe(97)
      expect(calculateArpVelocity(12, 100)).toBe(97)
      // 8th-note offbeats (steps 2, 6, 10, 14): 92
      for (const step of [2, 6, 10, 14]) {
        expect(calculateArpVelocity(step, 100)).toBe(92)
      }
      // 16th-note offbeats (steps 1, 3, 5, 7, 9, 11, 13, 15): 71
      for (const step of [1, 3, 5, 7, 9, 11, 13, 15]) {
        expect(calculateArpVelocity(step, 100)).toBe(71)
      }
    })

    it('validates arpAccent in GeneratorParamsSchema', () => {
      const parsedDefault = GeneratorParamsSchema.parse({})
      expect(parsedDefault.arpAccent).toBe(DEFAULT_GENERATOR_PARAMS.arpAccent)

      expect(GeneratorParamsSchema.parse({ arpAccent: 0 }).arpAccent).toBe(0)
      expect(GeneratorParamsSchema.parse({ arpAccent: 50 }).arpAccent).toBe(50)
      expect(GeneratorParamsSchema.parse({ arpAccent: 100 }).arpAccent).toBe(100)

      expect(() => GeneratorParamsSchema.parse({ arpAccent: -1 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ arpAccent: 101 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ arpAccent: 50.5 })).toThrow()
    })
  })

  describe('chord voicing pitch source', () => {
    const rootPosition: ChordEvent = { ...cChord, voicing: ['C3', 'E3', 'G3'] }
    const firstInversion: ChordEvent = { ...cChord, voicing: ['E3', 'G3', 'C4'], inversion: 1 }
    const highVoicing: ChordEvent = { ...cChord, voicing: ['C5', 'E5', 'G5'] }

    it('arpeggiates the exact absolute voicing pitches at 100% adherence', () => {
      const notes = generateArpeggio({
        ...base,
        chords: [rootPosition],
        pitchSource: 'chord-voicing',
        adherence: 100,
        rate: '1/16'
      })

      expect(notes).toHaveLength(STEPS_PER_BAR)
      expect(notes.every((note) => rootPosition.voicing.includes(note.pitch))).toBe(true)
    })

    it('distinguishes inversions and registers that share the same pitch classes', () => {
      const shared: ArpeggioGeneratorOptions = { ...base, rate: '1/16', adherence: 100, pitchSource: 'chord-voicing' }

      const rootMidis = generateArpeggio({ ...shared, chords: [rootPosition] }).map((n) => n.midi)
      const inversionMidis = generateArpeggio({ ...shared, chords: [firstInversion] }).map((n) => n.midi)
      const highMidis = generateArpeggio({ ...shared, chords: [highVoicing] }).map((n) => n.midi)

      expect(new Set(inversionMidis).size).toBeGreaterThan(0)
      expect(inversionMidis).not.toEqual(rootMidis)
      expect(highMidis).not.toEqual(rootMidis)
      expect(Math.min(...inversionMidis)).toBe(52)
      expect(Math.min(...highMidis)).toBe(72)
    })

    it('ignores the register knobs so the voicing is never transposed or octave-duplicated', () => {
      const wide = generateArpeggio({
        ...base,
        chords: [rootPosition],
        pitchSource: 'chord-voicing',
        octaveRange: 4,
        baseOctave: 1
      })
      const narrow = generateArpeggio({
        ...base,
        chords: [rootPosition],
        pitchSource: 'chord-voicing',
        octaveRange: 1,
        baseOctave: 6
      })

      expect(wide.map((n) => n.midi)).toEqual(narrow.map((n) => n.midi))
      expect(Math.max(...wide.map((n) => n.midi))).toBeLessThan(72)
    })

    it('uses each chord its own voicing pool across chord changes', () => {
      const notes = generateArpeggio({
        ...base,
        chords: [rootPosition, { ...gChord, voicing: ['G4', 'B4', 'D5'] }],
        pitchSource: 'chord-voicing',
        adherence: 100,
        range: { startStep: 0, endStep: 2 * STEPS_PER_BAR }
      })

      const firstBar = notes.filter((note) => note.step < STEPS_PER_BAR).map((note) => note.midi)
      const secondBar = notes.filter((note) => note.step >= STEPS_PER_BAR).map((note) => note.midi)

      expect(firstBar.every((midi) => rootPosition.voicing.includes(midiToPitch(midi)))).toBe(true)
      expect(secondBar.every((midi) => ['G4', 'B4', 'D5'].includes(midiToPitch(midi)))).toBe(true)
    })

    it('keeps sub-100% passing tones local to the voicing pitch and scale conform', () => {
      const notes = generateArpeggio({
        ...base,
        chords: [rootPosition],
        pitchSource: 'chord-voicing',
        adherence: 0,
        rate: '1/16'
      })

      const nonChord = notes.filter((note) => !rootPosition.voicing.includes(note.pitch))
      expect(nonChord.length).toBeGreaterThan(0)
      expect(nonChord.every((note) => isNoteInScale(note.pitch, 'C', 'major'))).toBe(true)
      expect(nonChord.every((note) => note.midi >= 46 && note.midi <= 57)).toBe(true)
    })

    it('falls back to the synthetic pitch-class pool when chords are disabled or missing', () => {
      const range = { startStep: 0, endStep: 2 * STEPS_PER_BAR }
      const withoutChords = generateArpeggio({
        ...base,
        chords: undefined,
        pitchSource: 'chord-voicing',
        range
      })
      const pitchClassMode = generateArpeggio({
        ...base,
        chords: undefined,
        pitchSource: 'pitch-classes',
        range
      })

      expect(withoutChords.map((n) => n.midi)).toEqual(pitchClassMode.map((n) => n.midi))
      expect(withoutChords.length).toBeGreaterThan(0)
    })

    it('keeps the default pitch-classes result unchanged for identical inputs', () => {
      const implicit = generateArpeggio({ ...base, chords: [rootPosition] })
      const explicit = generateArpeggio({ ...base, chords: [rootPosition], pitchSource: 'pitch-classes' })
      const configured = GeneratorParamsSchema.parse({})

      expect(configured.arpPitchSource).toBe(DEFAULT_GENERATOR_PARAMS.arpPitchSource)
      expect(implicit.map((n) => n.midi)).toEqual(explicit.map((n) => n.midi))
    })

    it('validates arpPitchSource in GeneratorParamsSchema', () => {
      expect(GeneratorParamsSchema.parse({}).arpPitchSource).toBe(DEFAULT_GENERATOR_PARAMS.arpPitchSource)
      expect(GeneratorParamsSchema.parse({ arpPitchSource: 'chord-voicing' }).arpPitchSource).toBe('chord-voicing')
      expect(GeneratorParamsSchema.parse({ arpPitchSource: 'pitch-classes' }).arpPitchSource).toBe('pitch-classes')
      expect(() => GeneratorParamsSchema.parse({ arpPitchSource: 'scale' })).toThrow()
    })
  })

  describe('density and metric rhythmic rest masking', () => {
    it('produces full note counts for all rates when density is 100 or omitted', () => {
      // 1/16: 16 notes per bar
      const sixteenths = generateArpeggio({ ...base, rate: '1/16', density: 100 })
      expect(sixteenths).toHaveLength(STEPS_PER_BAR)

      // 1/8: 8 notes per bar
      const eighths = generateArpeggio({ ...base, rate: '1/8', density: 100 })
      expect(eighths).toHaveLength(STEPS_PER_BAR / 2)

      // 1/4: 4 notes per bar
      const quarters = generateArpeggio({ ...base, rate: '1/4', density: 100 })
      expect(quarters).toHaveLength(STEPS_PER_BAR / 4)

      // Omitted density defaults to 100%
      const omitted = generateArpeggio({ ...base, rate: '1/16' })
      expect(omitted).toHaveLength(STEPS_PER_BAR)
    })

    it('produces exactly 12 notes per bar at 75% density with 1/16 rate', () => {
      const notes = generateArpeggio({ ...base, rate: '1/16', density: 75 })
      expect(notes).toHaveLength(12)
    })

    it('produces exactly 8 notes per bar at 50% density with 1/16 rate', () => {
      const notes = generateArpeggio({ ...base, rate: '1/16', density: 50 })
      expect(notes).toHaveLength(8)
      // At 50% density with 1/16, all 8 muted steps are 16th-note offbeats; active notes fall on eighth-note steps
      expect(notes.map((n) => n.step)).toEqual([0, 2, 4, 6, 8, 10, 12, 14])
    })

    it('produces proportional note counts for 1/8 rate at 75% and 50% density', () => {
      // 1/8 has 8 total steps: 75% = 6 notes, 50% = 4 notes
      const notes75 = generateArpeggio({ ...base, rate: '1/8', density: 75 })
      expect(notes75).toHaveLength(6)

      const notes50 = generateArpeggio({ ...base, rate: '1/8', density: 50 })
      expect(notes50).toHaveLength(4)
      expect(notes50.map((n) => n.step)).toEqual([0, 4, 8, 12])
    })

    it('guarantees that Beat 1 (step % STEPS_PER_BAR === 0) is NEVER muted across all density levels', () => {
      for (const density of [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]) {
        for (let seed = 0; seed < 5; seed++) {
          const notes = generateArpeggio({
            ...base,
            rate: '1/16',
            range: { startStep: 0, endStep: 2 * STEPS_PER_BAR },
            density,
            seed
          })
          // Downbeat on bar 0 (step 0) and bar 1 (step 16) must always be present
          expect(notes.some((n) => n.step === 0)).toBe(true)
          expect(notes.some((n) => n.step === STEPS_PER_BAR)).toBe(true)
        }
      }
    })

    it('produces deterministic rest positions for identical density and seed', () => {
      const first = generateArpeggio({ ...base, rate: '1/16', density: 75, seed: 42 })
      const second = generateArpeggio({ ...base, rate: '1/16', density: 75, seed: 42 })
      expect(first.map((n) => n.step)).toEqual(second.map((n) => n.step))
      expect(first).toEqual(second)
    })

    it('varies the selection of dropped offbeats across bars and seeds', () => {
      const notes = generateArpeggio({
        ...base,
        rate: '1/16',
        range: { startStep: 0, endStep: 2 * STEPS_PER_BAR },
        density: 75,
        seed: 101
      })
      const bar0Steps = notes.filter((n) => n.step < STEPS_PER_BAR).map((n) => n.step)
      const bar1Steps = notes.filter((n) => n.step >= STEPS_PER_BAR).map((n) => n.step - STEPS_PER_BAR)
      // Both bars have 12 notes (4 dropped)
      expect(bar0Steps).toHaveLength(12)
      expect(bar1Steps).toHaveLength(12)
      // Seed variation gives varied offbeat patterns across bars
      expect(bar0Steps).not.toEqual(bar1Steps)
    })

    it('falls back to DEFAULT_GENERATOR_PARAMS.arpDensity when density is omitted or non-finite', () => {
      const omitted = generateArpeggio({ ...base, rate: '1/16' })
      const explicitDefault = generateArpeggio({
        ...base,
        rate: '1/16',
        density: DEFAULT_GENERATOR_PARAMS.arpDensity
      })
      const nonFinite = generateArpeggio({ ...base, rate: '1/16', density: Number.NaN })

      expect(omitted.map((n) => n.step)).toEqual(explicitDefault.map((n) => n.step))
      expect(nonFinite.map((n) => n.step)).toEqual(explicitDefault.map((n) => n.step))
    })

    it('clamps density to minimum 50% and maximum 100%', () => {
      const belowMin = generateArpeggio({ ...base, rate: '1/16', density: 20 })
      const exactMin = generateArpeggio({ ...base, rate: '1/16', density: 50 })
      expect(belowMin.map((n) => n.step)).toEqual(exactMin.map((n) => n.step))

      const aboveMax = generateArpeggio({ ...base, rate: '1/16', density: 150 })
      const exactMax = generateArpeggio({ ...base, rate: '1/16', density: 100 })
      expect(aboveMax.map((n) => n.step)).toEqual(exactMax.map((n) => n.step))
    })

    it('evaluates active steps accurately in maskArpBarSteps', () => {
      const barSteps = Array.from({ length: STEPS_PER_BAR }, (_, step) => step)

      // At density 100: all steps active
      const fullSteps = maskArpBarSteps(barSteps, 100, 0, 0)
      expect(fullSteps.size).toBe(STEPS_PER_BAR)

      // At density 50 with 1/16: exactly 8 steps active, all are even steps
      const halfSteps = maskArpBarSteps(barSteps, 50, 0, 0)
      expect(halfSteps.size).toBe(8)
      expect(Array.from(halfSteps).sort((a, b) => a - b)).toEqual([0, 2, 4, 6, 8, 10, 12, 14])

      // Step 0 is always active
      expect(maskArpBarSteps(barSteps, 50, 0, 0).has(0)).toBe(true)
      expect(maskArpBarSteps(barSteps, 75, 0, 0).has(0)).toBe(true)
    })

    it('keeps every rate sounding when the work range starts off the global rate grid', () => {
      const longChord = [{ ...cChord, durationBars: 8 }]
      for (const rate of ['1/16', '1/8', '1/8d', '1/4', '1/4d'] as const) {
        for (const startStep of [0, 3, 6, 16, 20]) {
          const range = { startStep, endStep: startStep + 2 * STEPS_PER_BAR }
          const label = `rate ${rate}, start ${startStep}`
          const full = generateArpeggio({ ...base, rate, density: 100, range, chords: longChord })
          const masked = generateArpeggio({ ...base, rate, density: 50, range, chords: longChord })

          expect(full.length, label).toBeGreaterThan(0)
          expect(masked.length, label).toBeGreaterThan(0)
          expect(masked.length, label).toBeLessThanOrEqual(full.length)
          expect(
            masked.every((note) => note.step >= range.startStep && note.step < range.endStep),
            label
          ).toBe(true)
          // Rest masking keeps at least one anchor per bar the rate grid reaches: a bar that
          // sounds at full density must never go silent at reduced density.
          const fullBars = new Set(full.map((note) => Math.floor(note.step / STEPS_PER_BAR)))
          const maskedBars = new Set(masked.map((note) => Math.floor(note.step / STEPS_PER_BAR)))
          for (const bar of fullBars) {
            expect(maskedBars.has(bar), `${label}: bar ${bar} is silent at 50% density`).toBe(true)
          }
        }
      }
    })

    it('validates arpDensity in GeneratorParamsSchema', () => {
      const parsedDefault = GeneratorParamsSchema.parse({})
      expect(parsedDefault.arpDensity).toBe(DEFAULT_GENERATOR_PARAMS.arpDensity)

      expect(GeneratorParamsSchema.parse({ arpDensity: 50 }).arpDensity).toBe(50)
      expect(GeneratorParamsSchema.parse({ arpDensity: 75 }).arpDensity).toBe(75)
      expect(GeneratorParamsSchema.parse({ arpDensity: 100 }).arpDensity).toBe(100)

      expect(() => GeneratorParamsSchema.parse({ arpDensity: 49 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ arpDensity: 101 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ arpDensity: 50.5 })).toThrow()
    })
  })

  describe('advanced arp patterns (pedal-bass and converge)', () => {
    it('generates the exact pedal-bass pattern for a 3-tone pool [60, 64, 67]', () => {
      const pool = [60, 64, 67]
      let previous: number | null = null
      let direction = 1
      const sequence: number[] = []
      for (let i = 0; i < 8; i++) {
        const target = patternIndex('pedal-bass', pool, previous, direction, Math.random)
        sequence.push(pool[target.preferred])
        previous = target.preferred
        direction = target.direction
      }
      expect(sequence).toEqual([60, 64, 60, 67, 60, 64, 60, 67])
    })

    it('generates the exact converge pattern for a 4-tone pool [60, 64, 67, 72]', () => {
      const pool = [60, 64, 67, 72]
      let previous: number | null = null
      let direction = 1
      const sequence: number[] = []
      for (let i = 0; i < 8; i++) {
        const target = patternIndex('converge', pool, previous, direction, Math.random)
        sequence.push(pool[target.preferred])
        previous = target.preferred
        direction = target.direction
      }
      expect(sequence).toEqual([60, 72, 64, 67, 60, 72, 64, 67])
    })

    it('generates pedal-bass 8-note sequence via generateArpeggio across 1 bar at 1/8 rate', () => {
      const notes = generateArpeggio({
        ...base,
        pattern: 'pedal-bass',
        rate: '1/8'
      })
      expect(notes.map((n) => n.midi)).toEqual([60, 64, 60, 67, 60, 64, 60, 67])
      expect(notes.every((n) => AppNoteSchema.safeParse(n).success)).toBe(true)
    })

    it('keeps pedal roots in the base octave across chord changes', () => {
      const chords: ChordEvent[] = [
        cChord,
        gChord,
        { ...cChord, id: '44444444-4444-4444-8444-444444444444', name: 'Am', notes: ['A', 'C', 'E'], startBar: 2 },
        { ...cChord, id: '55555555-5555-4555-8555-555555555555', name: 'F', notes: ['F', 'A', 'C'], startBar: 3 }
      ].map((chord) => ({ ...chord, durationBars: 1 }))
      const notes = generateArpeggio({
        ...base,
        pattern: 'pedal-bass',
        rate: '1/8',
        baseOctave: 4,
        octaveRange: 1,
        pitchSource: 'pitch-classes',
        adherence: 100,
        density: 100,
        range: { startStep: 0, endStep: 4 * STEPS_PER_BAR },
        chords
      })
      const bars = [0, 1, 2, 3].map((bar) =>
        notes.filter((note) => Math.floor(note.step / STEPS_PER_BAR) === bar).map((note) => note.midi)
      )
      const pedalNotes = bars.map((bar) => bar.filter((_, index) => index % 2 === 0))
      expect(pedalNotes).toEqual([
        [60, 60, 60, 60],
        [67, 67, 67, 67],
        [69, 69, 69, 69],
        [65, 65, 65, 65]
      ])
      expect(notes.every((note) => note.midi >= 60 && note.midi <= 71)).toBe(true)
    })

    it.each([
      [2, 1, [45, 45, 45, 45, 45, 45, 45, 45], 36, 47],
      [4, 2, [69, 69, 81, 81, 69, 69, 81, 81], 60, 83],
      [5, 2, [81, 81, 93, 93, 81, 81, 93, 93], 72, 95]
    ] as const)(
      'keeps the pedal root in each active octave from base octave %s with %s octaves',
      (baseOctave, octaveRange, roots, low, high) => {
        const notes = generateArpeggio({
          ...base,
          pattern: 'pedal-bass',
          rate: '1/16',
          baseOctave,
          octaveRange,
          adherence: 100,
          density: 100,
          chords: [{ ...cChord, name: 'Am', notes: ['A', 'C', 'E'] }]
        })
        expect(notes.filter((_, index) => index % 2 === 0).map((note) => note.midi)).toEqual(roots)
        expect(notes.every((note) => note.midi >= low && note.midi <= high)).toBe(true)
      }
    )

    it('keeps the voiced pedal root at its absolute pitch in an inversion', () => {
      const notes = generateArpeggio({
        ...base,
        pattern: 'pedal-bass',
        pitchSource: 'chord-voicing',
        rate: '1/8',
        baseOctave: 6,
        adherence: 100,
        density: 100,
        chords: [{ ...cChord, voicing: ['E3', 'G3', 'C4'], inversion: 1 }]
      })
      expect(notes.map((note) => note.midi)).toEqual([60, 52, 60, 55, 60, 52, 60, 55])
    })

    it('generates converge 8-note sequence via generateArpeggio across 1 bar at 1/8 rate with a 4-note chord', () => {
      const cMaj7Chord: ChordEvent = {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Cmaj7',
        roman: 'Imaj7',
        notes: ['C', 'E', 'G', 'B'],
        voicing: ['C4', 'E4', 'G4', 'B4'],
        startBar: 0,
        durationBars: 1
      }
      const notes = generateArpeggio({
        ...base,
        pattern: 'converge',
        rate: '1/8',
        chords: [cMaj7Chord]
      })
      expect(notes.map((n) => n.midi)).toEqual([60, 71, 64, 67, 60, 71, 64, 67])
      expect(notes.every((n) => AppNoteSchema.safeParse(n).success)).toBe(true)
    })

    it('generates the exact pinky-top pattern for a 3-tone pool [60, 64, 67]', () => {
      const pool = [60, 64, 67]
      let previous: number | null = null
      let direction = 1
      const sequence: number[] = []
      for (let i = 0; i < 8; i++) {
        const target = patternIndex('pinky-top', pool, previous, direction, Math.random)
        sequence.push(pool[target.preferred])
        previous = target.preferred
        direction = target.direction
      }
      expect(sequence).toEqual([67, 60, 67, 64, 67, 60, 67, 64])
    })

    it('generates the exact diverge pattern for a 4-tone pool [60, 64, 67, 72]', () => {
      const pool = [60, 64, 67, 72]
      let previous: number | null = null
      let direction = 1
      const sequence: number[] = []
      for (let i = 0; i < 8; i++) {
        const target = patternIndex('diverge', pool, previous, direction, Math.random)
        sequence.push(pool[target.preferred])
        previous = target.preferred
        direction = target.direction
      }
      expect(sequence).toEqual([64, 67, 60, 72, 64, 67, 60, 72])
    })

    it('generates the exact down-up pattern for a 3-tone pool [60, 64, 67]', () => {
      const pool = [60, 64, 67]
      let previous: number | null = null
      let direction = 1
      const sequence: number[] = []
      for (let i = 0; i < 8; i++) {
        const target = patternIndex('down-up', pool, previous, direction, Math.random)
        sequence.push(pool[target.preferred])
        previous = target.preferred
        direction = target.direction
      }
      expect(sequence).toEqual([67, 64, 60, 64, 67, 64, 60, 64])
    })

    it('generates polyphonic chord-rhythm stabs across all steps in the bar', () => {
      const notes = generateArpeggio({
        ...base,
        pattern: 'chord-rhythm',
        rate: '1/4'
      })
      expect(notes).toHaveLength(12)
      expect(notes.filter((n) => n.step === 0).map((n) => n.midi)).toEqual([60, 64, 67])
      expect(notes.filter((n) => n.step === 4).map((n) => n.midi)).toEqual([60, 64, 67])
      expect(notes.filter((n) => n.step === 8).map((n) => n.midi)).toEqual([60, 64, 67])
      expect(notes.filter((n) => n.step === 12).map((n) => n.midi)).toEqual([60, 64, 67])
      expect(notes.every((n) => AppNoteSchema.safeParse(n).success)).toBe(true)
    })

    it('handles single-tone and empty pools safely without runtime errors', () => {
      const single = [60]
      expect(patternIndex('pedal-bass', single, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('pinky-top', single, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('converge', single, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('diverge', single, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('down-up', single, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('chord-rhythm', single, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('brown', single, null, 1, Math.random).preferred).toBe(0)

      const empty: number[] = []
      expect(patternIndex('pedal-bass', empty, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('pinky-top', empty, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('converge', empty, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('diverge', empty, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('down-up', empty, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('chord-rhythm', empty, null, 1, Math.random).preferred).toBe(0)
      expect(patternIndex('brown', empty, null, 1, Math.random).preferred).toBe(0)
    })
  })

  describe('dotted arp rates (1/8d, 1/4d) and polyrhythmic cross-bar phrasing', () => {
    it('generates the exact 3-step polyrhythmic sequence for 1/8d across 4 bars (64 steps)', () => {
      const notes = generateArpeggio({
        ...base,
        rate: '1/8d',
        range: { startStep: 0, endStep: 4 * STEPS_PER_BAR },
        gate: 100
      })
      const expectedSteps = [
        0,
        3,
        6,
        9,
        12,
        15, // Bar 0
        18,
        21,
        24,
        27,
        30, // Bar 1
        33,
        36,
        39,
        42,
        45, // Bar 2
        48,
        51,
        54,
        57,
        60,
        63 // Bar 3
      ]
      expect(notes.map((n) => n.step)).toEqual(expectedSteps)
      expect(notes).toHaveLength(22)
      expect(notes.every((n) => AppNoteSchema.safeParse(n).success)).toBe(true)
    })

    it('generates the exact 6-step wide chord sweep sequence for 1/4d across 4 bars (64 steps)', () => {
      const notes = generateArpeggio({
        ...base,
        rate: '1/4d',
        range: { startStep: 0, endStep: 4 * STEPS_PER_BAR },
        gate: 100
      })
      const expectedSteps = [
        0,
        6,
        12, // Bar 0
        18,
        24,
        30, // Bar 1
        36,
        42, // Bar 2
        48,
        54,
        60 // Bar 3
      ]
      expect(notes.map((n) => n.step)).toEqual(expectedSteps)
      expect(notes).toHaveLength(11)
      expect(notes.every((n) => AppNoteSchema.safeParse(n).success)).toBe(true)
    })

    it('scales gate correctly for 1/8d notes and clamps boundary note at bar end', () => {
      // 1-bar preview (16 steps): notes at 0, 3, 6, 9, 12, 15
      const notes100 = generateArpeggio({
        ...base,
        rate: '1/8d',
        gate: 100
      })
      expect(notes100).toHaveLength(6)
      // Notes 0, 3, 6, 9, 12 have full duration 3
      expect(notes100.slice(0, 5).every((n) => n.durationSteps === 3)).toBe(true)
      // Note at step 15 is clamped to 1 step at bar boundary (16 - 15 = 1)
      expect(notes100[5].step).toBe(15)
      expect(notes100[5].durationSteps).toBe(1)

      // At 50% gate: rawDuration is 3 * 0.5 = 1.5 steps
      const notes50 = generateArpeggio({
        ...base,
        rate: '1/8d',
        gate: 50
      })
      expect(notes50.slice(0, 5).every((n) => n.durationSteps === 1.5)).toBe(true)
      // Note at 15 is clamped to range end: Math.min(1.5, 16 - 15) = 1
      expect(notes50[5].durationSteps).toBe(1)
    })

    it('sustains 1/8d notes across bar lines in multi-bar ranges without artificial chopping', () => {
      const notes = generateArpeggio({
        ...base,
        rate: '1/8d',
        range: { startStep: 0, endStep: 4 * STEPS_PER_BAR },
        chords: [cChord, gChord],
        gate: 100
      })
      // Note at step 15 (end of bar 1) must sustain across the bar line up to the next note at step 18
      const noteAt15 = notes.find((n) => n.step === 15)
      expect(noteAt15).toBeDefined()
      expect(noteAt15!.durationSteps).toBe(3)

      // Note at step 30 (bar 2) must sustain across the bar line up to step 33
      const noteAt30 = notes.find((n) => n.step === 30)
      expect(noteAt30).toBeDefined()
      expect(noteAt30!.durationSteps).toBe(3)

      // Only the final note at step 63 is clamped to the work range end (64 - 63 = 1)
      const noteAt63 = notes.find((n) => n.step === 63)
      expect(noteAt63).toBeDefined()
      expect(noteAt63!.durationSteps).toBe(1)
    })

    it('scales gate correctly for 1/4d notes and clamps boundary note at bar end', () => {
      // 1-bar preview (16 steps): notes at 0, 6, 12
      const notes100 = generateArpeggio({
        ...base,
        rate: '1/4d',
        gate: 100
      })
      expect(notes100).toHaveLength(3)
      // Notes at 0, 6 have full duration 6
      expect(notes100[0].durationSteps).toBe(6)
      expect(notes100[1].durationSteps).toBe(6)
      // Note at step 12 is clamped to 4 steps at bar boundary (16 - 12 = 4)
      expect(notes100[2].step).toBe(12)
      expect(notes100[2].durationSteps).toBe(4)
    })

    it('masks the visited steps of a phase-shifted bar instead of the global rate grid', () => {
      // A work range starting at step 16 with rate 1/8d visits bar-local {0,3,6,9,12,15},
      // while the global 3-grid sits at {2,5,8,11,14}. The mask must judge the visited steps.
      const visited = [0, 3, 6, 9, 12, 15]
      const active = maskArpBarSteps(visited, 50, 0, 1)
      expect(active.has(0)).toBe(true)
      expect(active.size).toBe(3)
      expect(Array.from(active).every((step) => visited.includes(step))).toBe(true)
    })

    it('retains step 0 on bar 0 while dropping offbeats under 50% density for 1/8d rate', () => {
      // In Bar 0, rateSteps 3 has 6 steps: [0, 3, 6, 9, 12, 15]
      // At 50% density: 3 active steps. 16th offbeats [3, 9, 15] are dropped first.
      const activeSteps = maskArpBarSteps([0, 3, 6, 9, 12, 15], 50, 0, 0)
      expect(activeSteps).toEqual(new Set([0, 6, 12]))
      expect(activeSteps.has(0)).toBe(true)

      const notes = generateArpeggio({
        ...base,
        rate: '1/8d',
        density: 50
      })
      expect(notes).toHaveLength(3)
      expect(notes.map((n) => n.step)).toEqual([0, 6, 12])
      expect(notes.some((n) => n.step === 0)).toBe(true)
    })

    it('preserves metric integrity across all 4 bars under 50% density for 1/8d rate', () => {
      const notes = generateArpeggio({
        ...base,
        rate: '1/8d',
        range: { startStep: 0, endStep: 4 * STEPS_PER_BAR },
        density: 50
      })
      // Bar 0 downbeat on step 0 must be present
      expect(notes.some((n) => n.step === 0)).toBe(true)
      // Total notes should be less than the full 22 notes
      expect(notes.length).toBeLessThan(22)
      expect(notes.length).toBeGreaterThanOrEqual(11)
      // Every active note belongs to the valid 3-step grid
      notes.forEach((note) => {
        expect(note.step % 3).toBe(0)
      })
    })
  })
})
