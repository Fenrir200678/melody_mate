import { describe, expect, it } from 'vitest'
import { generateMelody } from '../../../src/core/generator/melody.generator'
import { generateRhythmOnsets } from '../../../src/core/generator/rhythm-onsets'
import { copyPreset, expandPattern } from '../../../src/core/rhythm/custom-pattern'
import { getRhythmPresetById, getRhythmPresetCycleSteps, RHYTHM_PRESETS } from '../../../src/core/rhythm/presets'
import { GeneratorParamsSchema } from '../../../src/core/schemas/generator.schema'
import { PROJECT_SCHEMA_VERSION, ProjectSchema } from '../../../src/core/schemas/project.schema'

const generator = GeneratorParamsSchema.parse({
  rhythmMode: 'preset',
  restProbability: 0,
  noteLength: 1,
  velocityVariation: 0,
  motif: 'FREE'
})
const project = ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, bars: 4 })

function onsets(id: string, start = 0, end = 64) {
  return generateRhythmOnsets({
    generator,
    rhythmPreset: getRhythmPresetById(id),
    rangeStartStep: start,
    rangeEndStep: end,
    rng: () => 0.5
  }).map((note) => [note.step + start, note.durationSteps])
}

describe('factory rhythm phrasing', () => {
  it('places son and rumba clave across two 4/4 bars with the delayed rumba stroke', () => {
    expect(onsets('son-clave', 0, 32).map(([step]) => step)).toEqual([0, 6, 12, 20, 24])
    expect(onsets('rumba-clave', 0, 32).map(([step]) => step)).toEqual([0, 6, 14, 20, 24])
  })

  it('keeps pickups off the downbeat and resolves into the following bar', () => {
    expect(onsets('pickup-hook', 0, 32)).toEqual([
      [12, 2],
      [14, 2],
      [16, 4],
      [20, 2],
      [22, 2],
      [24, 4]
    ])
    expect(onsets('anticipated-bass', 0, 32)).toEqual([
      [14, 2],
      [16, 6],
      [24, 4]
    ])
  })

  it('leaves deliberate space in ballad, broken eighths, and sparse offbeat patterns', () => {
    expect(onsets('pop-ballad', 0, 16)).toEqual([
      [0, 2],
      [2, 2],
      [8, 4]
    ])
    expect(onsets('broken-eighths', 0, 16).map(([step]) => step)).toEqual([0, 2, 6, 8, 10, 12])
    expect(onsets('sparse-offbeat-lead', 0, 16)).toEqual([
      [2, 1],
      [6, 1],
      [10, 2]
    ])
  })

  it('repeats the complete question and answer instead of repeating its first bar', () => {
    expect(onsets('two-bar-question-answer')).toEqual([
      [0, 2],
      [2, 2],
      [4, 4],
      [18, 2],
      [20, 4],
      [24, 8],
      [32, 2],
      [34, 2],
      [36, 4],
      [50, 2],
      [52, 4],
      [56, 8]
    ])
  })

  it('anchors multi-bar cycles to project start and clips at partial loop ends', () => {
    expect(onsets('two-bar-question-answer', 17, 38)).toEqual([
      [18, 2],
      [20, 4],
      [24, 8],
      [32, 2],
      [34, 2],
      [36, 2]
    ])
    expect(onsets('sustained-phrase', 0, 32)).toEqual([
      [0, 8],
      [8, 12],
      [20, 4]
    ])
    expect(onsets('sustained-phrase', 17, 38)).toEqual([
      [20, 4],
      [32, 6]
    ])
  })

  it.each(RHYTHM_PRESETS)('imports $name into Rhythm Studio without changing its cycle', (preset) => {
    const bars = (getRhythmPresetCycleSteps(preset) / 16) as 1 | 2 | 3 | 4
    const copied = copyPreset(preset, bars)
    expect(copied.ok).toBe(true)
    if (!copied.ok) throw new Error(copied.error)
    const expanded = expandPattern(copied.pattern, { startStep: 0, endStep: 64 })
    expect(expanded.map((event) => [event.absoluteStep, event.lengthSteps])).toEqual(onsets(preset.id))
  })

  it.each(['two-bar-question-answer', 'sustained-phrase', 'son-clave'])(
    'preserves %s phrasing through motifs and all answer styles',
    (id) => {
      const rhythmPreset = getRhythmPresetById(id)!
      for (const controls of [
        { motif: 'ABAB' as const, callAndResponse: false },
        ...(['echo', 'continue', 'contrast'] as const).map((answerStyle) => ({ callAndResponse: true, answerStyle }))
      ]) {
        const notes = generateMelody({
          project,
          generator: { ...generator, ...controls },
          rhythmPreset,
          rng: () => 0.5
        })
        expect(notes.map((note) => [note.step, note.durationSteps])).toEqual(onsets(id))
      }
    }
  )

  it('still applies the note-length control to multi-bar presets', () => {
    const notes = generateMelody({
      project,
      generator: { ...generator, motif: 'ABAB', noteLength: 0.5 },
      rhythmPreset: getRhythmPresetById('sustained-phrase'),
      rng: () => 0.5
    })
    expect(notes.map((note) => [note.step, note.durationSteps])).toEqual(
      onsets('sustained-phrase').map(([step, duration]) => [step, duration * 0.5])
    )
  })
})
