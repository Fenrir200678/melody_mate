import { describe, expect, it } from 'vitest'
import { buildSectionVariationContext, resolveSectionVariation } from '../../../src/core/generator/motif-variation'
import type { MotifSection } from '../../../src/core/generator/motif-sections'
import type { AppNote } from '../../../src/core/schemas/note.schema'
import { createRng } from '../../../src/core/generator/rng'
import { mutateNotes } from '../../../src/core/variation/mutate'
import { isNoteInScale } from '../../../src/core/theory/scale.engine'

const section: MotifSection = {
  letter: 'B',
  bar: 3,
  startStep: 48,
  endStep: 64,
  role: 'contrast',
  sourceBar: 0
}

const sourceNotes: AppNote[] = [
  { id: 'a', pitch: 'C4', midi: 60, step: 48, durationSteps: 2, velocity: 90, isMuted: false },
  { id: 'b', pitch: 'D4', midi: 62, step: 52, durationSteps: 2, velocity: 90, isMuted: false },
  { id: 'c', pitch: 'E4', midi: 64, step: 56, durationSteps: 2, velocity: 90, isMuted: false },
  { id: 'd', pitch: 'G4', midi: 67, step: 60, durationSteps: 2, velocity: 90, isMuted: false }
]

describe('resolveSectionVariation', () => {
  const strengths = {
    source: [0, 0, 0, 0, 0],
    repeat: [0, 0.15, 0.3, 0.45, 0.6],
    contrast: [0.25, 0.4375, 0.625, 0.8125, 1]
  }
  for (const role of ['source', 'repeat', 'contrast'] as const) {
    for (const rhythmLocked of [false, true]) {
      it.each([0, 0.25, 0.5, 0.75, 1])(`resolves ${role} with rhythmLocked=${rhythmLocked} at %s`, (intensity) => {
        const axes = {
          rhythm: role === 'repeat' && !rhythmLocked,
          pitch: role !== 'source',
          ornament: role === 'contrast' && !rhythmLocked,
          simplify: false
        }
        const resolved = resolveSectionVariation(role, intensity, { rhythmLocked })
        expect(resolved.axes).toEqual(axes)
        expect(resolved.strength).toBeCloseTo(strengths[role][intensity * 4], 12)
      })
    }
  }

  it('keeps contrast above its floor and repeat below its cap', () => {
    for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
      expect(resolveSectionVariation('contrast', intensity, { rhythmLocked: false }).strength).toBeGreaterThanOrEqual(
        0.25
      )
      expect(resolveSectionVariation('repeat', intensity, { rhythmLocked: false }).strength).toBeLessThanOrEqual(0.6)
    }
  })

  it('increases mean seeded pitch drift monotonically as intensity rises', () => {
    const intensities = [0, 0.25, 0.5, 0.75, 1]
    for (const role of ['repeat', 'contrast'] as const) {
      const drifts = intensities.map((intensity) => {
        const { axes, strength } = resolveSectionVariation(role, intensity, { rhythmLocked: false })
        let totalDrift = 0
        for (let seed = 1; seed <= 64; seed++) {
          const context = buildSectionVariationContext(section, 'C', 'major', 3, 5, 16)
          const changed = mutateNotes(sourceNotes, axes, strength, context, createRng(seed))
          const byId = new Map(changed.map((note) => [note.id, note]))
          totalDrift += sourceNotes.reduce(
            (sum, note) => sum + Math.abs((byId.get(note.id)?.midi ?? note.midi) - note.midi),
            0
          )
        }
        return totalDrift / (64 * sourceNotes.length)
      })
      for (let index = 1; index < drifts.length; index++)
        expect(drifts[index]).toBeGreaterThanOrEqual(drifts[index - 1])
    }
  })
})

describe('buildSectionVariationContext', () => {
  it('uses section bounds and a fixed eighth-note snap independent of the viewport', () => {
    expect(buildSectionVariationContext(section, 'C', 'major', 3, 5, 16)).toEqual({
      key: 'C',
      scale: 'major',
      minOctave: 3,
      maxOctave: 5,
      snapStep: 2,
      regionStartStep: 48,
      regionEndStep: 64
    })
    expect(buildSectionVariationContext(section, 'C', 'major', 3, 5, 1).snapStep).toBe(1)
  })

  it('supports a narrow register in Hungarian minor', () => {
    const context = buildSectionVariationContext(section, 'F#', 'hungarian minor', 4, 4, 16)
    const changed = mutateNotes(
      sourceNotes,
      { rhythm: false, pitch: true, ornament: false, simplify: false },
      1,
      context,
      createRng(7)
    )
    for (const note of changed) {
      expect(note.midi).toBeGreaterThanOrEqual(60)
      expect(note.midi).toBeLessThan(72)
      expect(isNoteInScale(note.pitch, 'F#', 'hungarian minor')).toBe(true)
    }
  })
})
