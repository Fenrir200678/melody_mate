import { describe, expect, it } from 'vitest'
import { generateMelody } from '../../../src/core/generator/melody.generator'
import { createRng } from '../../../src/core/generator/rng'
import { GeneratorParamsSchema } from '../../../src/core/schemas/generator.schema'
import { ProjectSchema, PROJECT_SCHEMA_VERSION } from '../../../src/core/schemas/project.schema'
import { RHYTHM_PRESETS } from '../../../src/core/rhythm/presets'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import type { AppNote } from '../../../src/core/schemas/note.schema'

const project = ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, key: 'C', scale: 'major', bars: 4 })
const chords: ChordEvent[] = [
  { id: 'am', name: 'Am', notes: ['A', 'C', 'E'], roman: 'vi', voicing: [], startBar: 0, durationBars: 1 },
  { id: 'f', name: 'F', notes: ['F', 'A', 'C'], roman: 'IV', voicing: [], startBar: 1, durationBars: 1 },
  { id: 'c', name: 'C', notes: ['C', 'E', 'G'], roman: 'I', voicing: [], startBar: 2, durationBars: 1 },
  { id: 'g', name: 'G', notes: ['G', 'B', 'D'], roman: 'V', voicing: [], startBar: 3, durationBars: 1 }
]
const generator = GeneratorParamsSchema.parse({
  rhythmMode: 'preset',
  restProbability: 0,
  minOctave: 4,
  maxOctave: 4,
  motif: 'FREE',
  callAndResponse: false,
  contour: 'free',
  motifVariation: 0.65,
  answerVariation: 0.65
})
const rhythmPreset = RHYTHM_PRESETS.find((preset) => preset.id === 'syncopated-lead')!

function longestRun(notes: AppNote[]): number {
  let run = 1
  let longest = 1
  for (let index = 1; index < notes.length; index++) {
    run = notes[index].midi === notes[index - 1].midi ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  return longest
}

describe('structured melody pitch diversity', () => {
  it.each(['ABAB', 'AABA', 'AAAB', 'ABAC', 'AABC', 'ABCB'] as const)(
    'avoids long quantized runs for %s across variation strengths',
    (motif) => {
      for (const motifVariation of [0, 0.65, 1]) {
        for (let seed = 1; seed <= 32; seed++) {
          const notes = generateMelody({
            project,
            chords,
            rhythmPreset,
            chordAdherence: 0.5,
            generator: { ...generator, motif, motifVariation },
            rng: createRng(seed)
          })
          expect(longestRun(notes), `${motif}, variation ${motifVariation}, seed ${seed}`).toBeLessThanOrEqual(3)
          expect(notes.every((note) => note.midi >= 60 && note.midi <= 71)).toBe(true)
        }
      }
    }
  )

  it.each(['echo', 'continue', 'contrast'] as const)('keeps %s answers moving across fixed seeds', (answerStyle) => {
    for (let seed = 1; seed <= 128; seed++) {
      const notes = generateMelody({
        project,
        chords,
        rhythmPreset,
        chordAdherence: 0.5,
        generator: { ...generator, callAndResponse: true, answerStyle },
        rng: createRng(seed)
      })
      expect(longestRun(notes)).toBeLessThanOrEqual(3)
    }
  })

  it.each([false, true])(
    'preserves custom rhythm while avoiding pitch plateaus with response=%s',
    (callAndResponse) => {
      const customPattern = {
        bars: 1 as const,
        events: [0, 3, 6, 8, 11].map((step) => ({ step, lengthSteps: 2, velocity: 90 }))
      }
      for (let seed = 1; seed <= 32; seed++) {
        const notes = generateMelody({
          project,
          chords,
          chordAdherence: 0.5,
          customPattern,
          generator: { ...generator, rhythmMode: 'custom', motif: 'AAAB', callAndResponse },
          rng: createRng(seed)
        })
        expect(notes.map((note) => [note.step, note.durationSteps])).toEqual(
          [0, 16, 32, 48].flatMap((offset) =>
            customPattern.events.map((event) => [event.step + offset, event.lengthSteps])
          )
        )
        expect(longestRun(notes)).toBeLessThanOrEqual(4)
      }
    }
  )
})
