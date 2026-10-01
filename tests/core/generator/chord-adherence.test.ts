import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import { generateMelody } from '../../../src/core/generator/melody.generator'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import { GeneratorParamsSchema } from '../../../src/core/schemas/generator.schema'
import { ProjectSchema, PROJECT_SCHEMA_VERSION } from '../../../src/core/schemas/project.schema'

/**
 * Deterministic mulberry32 PRNG so identical seeds produce identical generations.
 */
function seededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('chordAdherence option', () => {
  const project = ProjectSchema.parse({
    version: PROJECT_SCHEMA_VERSION,
    key: 'C',
    scale: 'major',
    bars: 8,
    timingLooseness: 0
  })

  const generator = GeneratorParamsSchema.parse({
    minOctave: 3,
    maxOctave: 4,
    rhythmMode: 'euclidean',
    motif: 'FREE',
    callAndResponse: false,
    markovOrder: 2,
    euclideanPulses: 8,
    euclideanSteps: 16,
    euclideanRotation: 0,
    restProbability: 0,
    contour: 'free',
    pentatonicMode: false
  })

  const chords: ChordEvent[] = [
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
      name: 'F',
      roman: 'IV',
      notes: ['F', 'A', 'C'],
      voicing: ['F3', 'A3', 'C4'],
      startBar: 2,
      durationBars: 2
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'G',
      roman: 'V',
      notes: ['G', 'B', 'D'],
      voicing: ['G3', 'B3', 'D4'],
      startBar: 4,
      durationBars: 2
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'C',
      roman: 'I',
      notes: ['C', 'E', 'G'],
      voicing: ['C3', 'E3', 'G3'],
      startBar: 6,
      durationBars: 2
    }
  ]

  const stepsPerBar = 16

  function chordAtStep(step: number): ChordEvent | undefined {
    const bar = Math.floor(step / stepsPerBar)
    return chords.find((c) => bar >= c.startBar && bar < c.startBar + c.durationBars)
  }

  function isChordTone(step: number, midi: number): boolean {
    const chord = chordAtStep(step)
    if (!chord) return true
    const chroma = Note.chroma(Note.fromMidi(midi) ?? '')
    const chordChromas = new Set(chord.notes.map((n) => Note.chroma(n)).filter((c): c is number => c !== undefined))
    return chroma !== undefined && chordChromas.has(chroma)
  }

  /**
   * Fraction of notes landing on chord tones at strong beats (1 & 3).
   */
  function strongBeatChordToneRatio(chordAdherence: number, seeds: number[]): number {
    let strongTotal = 0
    let strongChordTones = 0

    for (const seed of seeds) {
      const notes = generateMelody({
        project,
        generator,
        chords,
        chordAdherence,
        rng: seededRng(seed)
      })

      for (const note of notes) {
        // Strong beats: bar downbeat and mid-bar (matches scoreChordAdherence metric logic)
        const isStrong = note.step % 8 === 0
        if (!isStrong) continue
        strongTotal++
        if (isChordTone(note.step, note.midi)) strongChordTones++
      }
    }

    return strongTotal > 0 ? strongChordTones / strongTotal : 0
  }

  it('is deterministic for identical seeds and parameters', () => {
    const a = generateMelody({ project, generator, chords, chordAdherence: 0.5, rng: seededRng(42) })
    const b = generateMelody({ project, generator, chords, chordAdherence: 0.5, rng: seededRng(42) })

    expect(a.map((n) => n.midi)).toEqual(b.map((n) => n.midi))
    expect(a.map((n) => n.step)).toEqual(b.map((n) => n.step))
  })

  it('uses generator adherence when the option is omitted', () => {
    const withDefault = generateMelody({ project, generator, chords, rng: seededRng(7) })
    const withExplicit = generateMelody({
      project,
      generator,
      chords,
      chordAdherence: generator.chordAdherence,
      rng: seededRng(7)
    })

    expect(withDefault.map((n) => n.midi)).toEqual(withExplicit.map((n) => n.midi))
  })

  it('produces a distinctly higher strong-beat chord-tone ratio at adherence 1.0 than at 0', () => {
    const seeds = Array.from({ length: 25 }, (_, i) => i * 977 + 13)

    const highRatio = strongBeatChordToneRatio(1.0, seeds)
    const zeroRatio = strongBeatChordToneRatio(0, seeds)

    expect(highRatio).toBeGreaterThan(0.8)
    expect(zeroRatio).toBeLessThan(highRatio - 0.1)
  })
})
