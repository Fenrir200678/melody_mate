import { describe, expect, it } from 'vitest'
import { generateMelody } from '../../../src/core/generator/melody.generator'
import { createRng } from '../../../src/core/generator/rng'
import { RHYTHM_PRESETS } from '../../../src/core/rhythm/presets'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import { GeneratorParamsSchema } from '../../../src/core/schemas/generator.schema'
import { AppNoteSchema } from '../../../src/core/schemas/note.schema'
import { ProjectSchema, PROJECT_SCHEMA_VERSION } from '../../../src/core/schemas/project.schema'
import { isNoteInScale, pitchToMidi } from '../../../src/core/theory/scale.engine'

describe('melody.generator', () => {
  const defaultProject = ProjectSchema.parse({
    version: PROJECT_SCHEMA_VERSION,
    key: 'C',
    scale: 'major',
    bars: 4,
    timingLooseness: 0.1
  })

  const defaultGenerator = GeneratorParamsSchema.parse({
    rhythmMode: 'euclidean',
    motif: 'FREE',
    callAndResponse: false,
    markovOrder: 2,
    euclideanPulses: 6,
    euclideanSteps: 16,
    euclideanRotation: 0,
    restProbability: 0,
    contour: 'free',
    pentatonicMode: false
  })

  const sampleChords: ChordEvent[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'C',
      roman: 'I',
      notes: ['C', 'E', 'G'],
      voicing: ['C3', 'E3', 'G3'],
      startBar: 0,
      durationBars: 2
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'G',
      roman: 'V',
      notes: ['G', 'B', 'D'],
      voicing: ['G3', 'B3', 'D4'],
      startBar: 2,
      durationBars: 2
    }
  ]

  it('generates the same musical notes from the same seed', () => {
    const generate = (seed: number) =>
      generateMelody({
        project: defaultProject,
        generator: { ...defaultGenerator, restProbability: 0.15, velocityVariation: 0.4 },
        chords: sampleChords,
        rng: createRng(seed)
      }).map(({ id: _id, ...note }) => note)

    expect(generate(1842271613)).toEqual(generate(1842271613))
    expect(generate(1842271613)).not.toEqual(generate(1842271614))
  })

  it('generates a sequence of notes matching AppNoteSchema using Euclidean rhythm', () => {
    const notes = generateMelody({
      project: defaultProject,
      generator: defaultGenerator,
      chords: sampleChords
    })

    expect(notes.length).toBeGreaterThan(0)

    // Every note must pass AppNoteSchema validation
    notes.forEach((n) => {
      const parsed = AppNoteSchema.safeParse(n)
      expect(parsed.success).toBe(true)
      expect(n.step).toBeGreaterThanOrEqual(0)
      expect(n.durationSteps).toBeGreaterThanOrEqual(1)
      expect(n.velocity).toBeGreaterThanOrEqual(1)
      expect(n.velocity).toBeLessThanOrEqual(127)
    })

    // All note IDs must be distinct
    const ids = new Set(notes.map((n) => n.id))
    expect(ids.size).toBe(notes.length)
  })

  it('generates notes with 8n Euclidean subdivision aligned to 8th note grid steps', () => {
    const notes = generateMelody({
      project: defaultProject,
      generator: {
        ...defaultGenerator,
        rhythmMode: 'euclidean',
        euclideanPulses: 3,
        euclideanSteps: 8,
        euclideanRotation: 0,
        euclideanSubdivision: '8n',
        restProbability: 0
      },
      chords: sampleChords
    })

    expect(notes.length).toBeGreaterThan(0)
    // With an 8n Euclidean subdivision on the sixteenth-note project grid, all onsets must start on even step numbers (0, 2, 4, ...)
    notes.forEach((n) => {
      expect(n.step % 2).toBe(0)
    })
  })

  it('generates notes from a RhythmPreset', () => {
    const syncopatedPreset = RHYTHM_PRESETS.find((p) => p.id === 'syncopated-lead')!
    expect(syncopatedPreset).toBeDefined()

    const notes = generateMelody({
      project: defaultProject,
      generator: { ...defaultGenerator, rhythmMode: 'preset' },
      rhythmPreset: syncopatedPreset,
      chords: sampleChords
    })

    expect(notes.length).toBeGreaterThan(0)
    notes.forEach((n) => {
      expect(AppNoteSchema.safeParse(n).success).toBe(true)
    })
  })

  it('enforces startWithRoot and endWithRoot constraints', () => {
    const notes = generateMelody({
      project: defaultProject,
      generator: defaultGenerator,
      startWithRoot: true,
      endWithRoot: true,
      minOctave: 4,
      maxOctave: 4
    })

    expect(notes.length).toBeGreaterThan(1)

    // First note must be C4
    expect(notes[0].pitch).toBe('C4')
    expect(notes[0].midi).toBe(60)

    // Last note must resolve to C4
    const lastNote = notes[notes.length - 1]
    expect(lastNote.pitch).toBe('C4')
    expect(lastNote.midi).toBe(60)
  })

  it('enforces startWithRoot and endWithRoot configured directly on generatorParams', () => {
    const notes = generateMelody({
      project: defaultProject,
      generator: {
        ...defaultGenerator,
        startWithRoot: true,
        endWithRoot: true
      },
      minOctave: 4,
      maxOctave: 4
    })

    expect(notes.length).toBeGreaterThan(1)
    expect(notes[0].pitch).toBe('C4')
    expect(notes[0].midi).toBe(60)

    const lastNote = notes[notes.length - 1]
    expect(lastNote.pitch).toBe('C4')
    expect(lastNote.midi).toBe(60)
  })

  it('respects minOctave and maxOctave boundaries strictly', () => {
    const minOctave = 3
    const maxOctave = 4
    const minMidi = pitchToMidi('C3')
    const maxMidi = pitchToMidi('B4')

    const notes = generateMelody({
      project: defaultProject,
      generator: defaultGenerator,
      minOctave,
      maxOctave
    })

    expect(notes.length).toBeGreaterThan(0)
    notes.forEach((n) => {
      expect(n.midi).toBeGreaterThanOrEqual(minMidi)
      expect(n.midi).toBeLessThanOrEqual(maxMidi)
    })
  })

  it('uses both octaves across seeded melodies instead of favoring the upper octave', () => {
    const generator = {
      ...defaultGenerator,
      minOctave: 4,
      maxOctave: 5,
      rhythmMode: 'preset' as const,
      chordAdherence: 0.75,
      startWithRoot: false,
      endWithRoot: false,
      velocityVariation: 0,
      noteLength: 1,
      accentStrength: 1
    }
    const rhythmPreset = RHYTHM_PRESETS.find((preset) => preset.id === 'pentatonic-hook')!
    const notes = Array.from({ length: 64 }, (_, seed) =>
      generateMelody({
        project: defaultProject,
        generator,
        rhythmPreset,
        chords: sampleChords,
        rng: createRng(seed + 1)
      })
    ).flat()
    const upperOctaveShare = notes.filter((note) => note.midi >= pitchToMidi('C5')).length / notes.length

    expect(upperOctaveShare).toBeGreaterThan(0.35)
    expect(upperOctaveShare).toBeLessThan(0.65)
  })

  it('keeps forced tonic notes nearest the register midpoint after motif transformations', () => {
    const notes = generateMelody({
      project: { ...defaultProject, key: 'B', scale: 'major' },
      generator: {
        ...defaultGenerator,
        minOctave: 4,
        maxOctave: 5,
        startWithRoot: true,
        endWithRoot: true,
        motif: 'ABAB'
      },
      rng: createRng(914)
    })

    expect(notes[0].pitch).toBe('B4')
    expect(notes[notes.length - 1].pitch).toBe('B4')
  })

  it('applies motif structure (ABAB) across bars', () => {
    const notes = generateMelody({
      project: defaultProject,
      generator: {
        ...defaultGenerator,
        motif: 'ABAB'
      },
      chords: sampleChords
    })

    expect(notes.length).toBeGreaterThan(0)

    // Check unique IDs even with phrase repetition
    const ids = new Set(notes.map((n) => n.id))
    expect(ids.size).toBe(notes.length)
  })

  it('applies Call and Response with bounded phrases and an open intermediate ending', () => {
    const notes = generateMelody({
      project: defaultProject,
      generator: {
        ...defaultGenerator,
        callAndResponse: true,
        motif: 'ABAB' // Should be overridden/bypassed by Call & Response
      },
      chords: sampleChords
    })

    expect(notes.length).toBeGreaterThan(0)
    notes.forEach((n) => {
      expect(AppNoteSchema.safeParse(n).success).toBe(true)
    })

    // Varying breath length still keeps call notes inside their bar.
    const bar0Notes = notes.filter((n) => n.step < 16)
    bar0Notes.forEach((n) => {
      expect(n.step + n.durationSteps).toBeLessThanOrEqual(16)
    })

    // Bar 1 stays open so the second phrase pair can provide the final cadence.
    const bar1Notes = notes.filter((n) => n.step >= 16 && n.step < 32)
    if (bar1Notes.length > 0) {
      const lastBar1Note = bar1Notes[bar1Notes.length - 1]
      expect(['E', 'G']).toContain(lastBar1Note.pitch.replace(/\d/g, ''))
    }
  })

  it('passes the selected answer style into phrase generation', () => {
    const project = { ...defaultProject, bars: 2 }
    const generate = (answerStyle: 'echo' | 'continue') =>
      generateMelody({
        project,
        generator: {
          ...defaultGenerator,
          callAndResponse: true,
          answerStyle,
          answerVariation: 0
        },
        rng: () => 0.5
      })
    const echo = generate('echo')
      .filter((note) => note.step >= 16)
      .map((note) => note.step)
    const continued = generate('continue')
      .filter((note) => note.step >= 16)
      .map((note) => note.step)

    expect(echo.length).toBeGreaterThan(0)
    expect(continued.length).toBeGreaterThan(0)
    expect(continued).not.toEqual(echo)
  })

  it.each([false, true])('applies contour strength with Call & Response set to %s', (callAndResponse) => {
    const generatePitches = (
      contour: 'free' | 'ascending',
      contourStrength: number,
      seed: number,
      motif: 'FREE' | 'ABAB' = 'FREE'
    ) => {
      let state = seed
      const rng = () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 0x100000000
      }
      return generateMelody({
        project: defaultProject,
        generator: { ...defaultGenerator, contour, contourStrength, callAndResponse, motif },
        rng
      }).map((note) => note.midi)
    }

    for (const seed of [1, 7, 23]) {
      expect(generatePitches('ascending', 0, seed)).toEqual(generatePitches('free', 0, seed))
    }
    expect(
      [1, 7, 23].some((seed) => {
        const shaped = generatePitches('ascending', 1, seed)
        const free = generatePitches('free', 0, seed)
        return shaped.some((pitch, index) => pitch !== free[index])
      })
    ).toBe(true)

    if (!callAndResponse) {
      expect(
        [1, 7, 23].some((seed) => {
          const shaped = generatePitches('ascending', 1, seed, 'ABAB')
          const free = generatePitches('free', 0, seed, 'ABAB')
          return shaped.some((pitch, index) => pitch !== free[index])
        })
      ).toBe(true)
    }
  })

  it('builds an upward register trend across phrases without Call & Response', () => {
    let totalRise = 0

    for (const seed of [1, 3, 7, 11, 19, 23, 29, 31]) {
      let state = seed
      const rng = () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 0x100000000
      }
      const notes = generateMelody({
        project: defaultProject,
        generator: { ...defaultGenerator, contour: 'ascending', contourStrength: 1 },
        rng
      })
      const meanPitch = (bar: number) => {
        const barNotes = notes.filter((note) => Math.floor(note.step / 16) === bar)
        return barNotes.reduce((sum, note) => sum + note.midi, 0) / barNotes.length
      }
      totalRise += meanPitch(3) - meanPitch(0)
    }

    expect(totalRise / 8).toBeGreaterThan(2)
  })

  it('returns empty array when pulses is 0', () => {
    const notes = generateMelody({
      project: defaultProject,
      generator: {
        ...defaultGenerator,
        euclideanPulses: 0
      }
    })

    expect(notes).toEqual([])
  })

  it('respects restProbability when using a RhythmPreset', () => {
    const syncopatedPreset = RHYTHM_PRESETS.find((p) => p.id === 'syncopated-lead')!

    const notesWithoutRest = generateMelody({
      project: defaultProject,
      generator: {
        ...defaultGenerator,
        rhythmMode: 'preset',
        restProbability: 0
      },
      rhythmPreset: syncopatedPreset,
      chords: sampleChords
    })

    const notesWithHighRest = generateMelody({
      project: defaultProject,
      generator: {
        ...defaultGenerator,
        rhythmMode: 'preset',
        restProbability: 0.9
      },
      rhythmPreset: syncopatedPreset,
      chords: sampleChords,
      rng: () => 0.2 // 0.2 < 0.9 -> triggers rests
    })

    expect(notesWithoutRest.length).toBeGreaterThan(notesWithHighRest.length)
    // Fallback guarantees at least one note remains
    expect(notesWithHighRest.length).toBeGreaterThanOrEqual(1)
  })

  it('keeps phrase anchors and at least two notes per bar at maximum breath', () => {
    const preset = RHYTHM_PRESETS.find((p) => p.id === 'arpeggio-flow')!
    const notes = generateMelody({
      project: defaultProject,
      generator: { ...defaultGenerator, rhythmMode: 'preset', restProbability: 1 },
      rhythmPreset: preset,
      rng: () => 0
    })
    for (let bar = 0; bar < defaultProject.bars; bar++) {
      const barNotes = notes.filter((note) => note.step >= bar * 16 && note.step < (bar + 1) * 16)
      expect(barNotes.length).toBeGreaterThanOrEqual(2)
      expect(barNotes.some((note) => note.step === bar * 16)).toBe(true)
    }
  })

  it('uses an eighth-note preset at the correct sixteenth-note positions', () => {
    const preset = RHYTHM_PRESETS.find((p) => p.id === 'floating-fifths')!
    const notes = generateMelody({
      project: defaultProject,
      generator: { ...defaultGenerator, rhythmMode: 'preset', restProbability: 0 },
      rhythmPreset: preset,
      rng: () => 0.5
    })
    expect(notes.slice(0, 6).map((note) => note.step)).toEqual([0, 2, 4, 8, 10, 12])
  })

  it('controls accent strength and generated note length independently', () => {
    const preset = RHYTHM_PRESETS.find((p) => p.id === 'syncopated-lead')!
    const plain = generateMelody({
      project: defaultProject,
      generator: { ...defaultGenerator, rhythmMode: 'preset', accentStrength: 0, velocityVariation: 0, noteLength: 1 },
      rhythmPreset: preset,
      rng: () => 0.5
    })
    const shaped = generateMelody({
      project: defaultProject,
      generator: {
        ...defaultGenerator,
        rhythmMode: 'preset',
        accentStrength: 1,
        velocityVariation: 0,
        noteLength: 0.25
      },
      rhythmPreset: preset,
      rng: () => 0.5
    })
    expect(plain.every((note) => note.velocity === 86)).toBe(true)
    expect(shaped[0].velocity).toBe(106)
    expect(shaped.map((note) => note.step)).toEqual(plain.map((note) => note.step))
    expect(shaped.every((note, index) => note.durationSteps < plain[index].durationSteps)).toBe(true)
  })

  it('applies humanized velocities to repeated motif sections', () => {
    const notes = generateMelody({
      project: defaultProject,
      generator: {
        ...defaultGenerator,
        motif: 'ABAB',
        velocityVariation: 0.8
      },
      chords: sampleChords
    })

    expect(notes.length).toBeGreaterThan(0)
    notes.forEach((n) => {
      expect(n.velocity).toBeGreaterThanOrEqual(1)
      expect(n.velocity).toBeLessThanOrEqual(127)
    })
  })

  it('strictly restricts all pitches to the pentatonic scale when pentatonicMode is enabled', () => {
    // Test Major Pentatonic in C Major with chords
    const majorNotes = generateMelody({
      project: defaultProject,
      generator: {
        ...defaultGenerator,
        pentatonicMode: true,
        motif: 'ABAB'
      },
      chords: sampleChords
    })

    expect(majorNotes.length).toBeGreaterThan(0)
    majorNotes.forEach((n) => {
      expect(isNoteInScale(n.pitch, 'C', 'major pentatonic')).toBe(true)
    })

    // Test Minor Pentatonic in A Dorian with Call & Response
    const minorProject = ProjectSchema.parse({
      ...defaultProject,
      key: 'A',
      scale: 'dorian'
    })
    const minorNotes = generateMelody({
      project: minorProject,
      generator: {
        ...defaultGenerator,
        pentatonicMode: true,
        callAndResponse: true
      }
    })

    expect(minorNotes.length).toBeGreaterThan(0)
    minorNotes.forEach((n) => {
      expect(isNoteInScale(n.pitch, 'A', 'minor pentatonic')).toBe(true)
    })
  })

  it('preserves altered chord tones through final pitch validation', () => {
    const project = ProjectSchema.parse({ ...defaultProject, key: 'A', scale: 'minor' })
    const chords: ChordEvent[] = [
      {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'E7',
        roman: 'V7',
        notes: ['E', 'G#', 'B', 'D'],
        voicing: ['E3', 'G#3', 'B3', 'D4'],
        startBar: 0,
        durationBars: 4
      }
    ]

    const notes = Array.from({ length: 16 }, (_, seed) => {
      let state = seed + 1
      const rng = (): number => {
        state = (Math.imul(1664525, state) + 1013904223) >>> 0
        return state / 4294967296
      }
      return generateMelody({ project, generator: defaultGenerator, chords, rng })
    }).flat()

    expect(notes.some((note) => note.midi % 12 === 8)).toBe(true)
    for (const note of notes) {
      if (!isNoteInScale(note.pitch, 'A', 'minor')) {
        expect(note.midi % 12).toBe(8)
      }
    }
  })

  it('generates melody strictly within the specified rangeStartStep and rangeEndStep', () => {
    // 4-bar project (64 steps), but generate only for Bar 2 (steps 32 to 48)
    const rangeNotes = generateMelody({
      project: defaultProject,
      generator: {
        ...defaultGenerator,
        euclideanPulses: 4,
        euclideanSteps: 16
      },
      rangeStartStep: 32,
      rangeEndStep: 48,
      chords: sampleChords
    })

    expect(rangeNotes.length).toBeGreaterThan(0)
    rangeNotes.forEach((n) => {
      expect(n.step).toBeGreaterThanOrEqual(32)
      expect(n.step).toBeLessThan(48)
      expect(n.step + n.durationSteps).toBeLessThanOrEqual(48)
    })
  })

  it('preserves custom rhythm events exactly at zero and full motif variation', () => {
    const project = { ...defaultProject, bars: 4 }
    const generator = {
      ...defaultGenerator,
      rhythmMode: 'custom' as const,
      motif: 'ABAB' as const,
      restProbability: 0,
      velocityVariation: 0
    }
    const customPattern = {
      bars: 2 as const,
      events: [
        { step: 0, lengthSteps: 3, velocity: 101 },
        { step: 5, lengthSteps: 2, velocity: 87 },
        { step: 11, lengthSteps: 7, velocity: 93 },
        { step: 19, lengthSteps: 3, velocity: 99 },
        { step: 25, lengthSteps: 2, velocity: 85 }
      ]
    }
    const generate = (motifVariation: number) =>
      generateMelody({
        project,
        generator: { ...generator, motifVariation },
        customPattern,
        rng: createRng(914)
      })
    const quiet = generate(0)
    const full = generate(1)

    const rhythm = (notes: typeof quiet) => notes.map(({ step, durationSteps }) => [step, durationSteps])
    const expected = [0, 32].flatMap((offset) =>
      customPattern.events.map((event) => [offset + event.step, event.lengthSteps])
    )
    expect(rhythm(quiet)).toEqual(expected)
    expect(rhythm(full)).toEqual(expected)
  })
})
