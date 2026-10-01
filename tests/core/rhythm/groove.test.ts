import { describe, expect, it } from 'vitest'
import { getGroovedLeadStarts, getGroovedStartStep } from '@/core/rhythm/groove'
import type { AppNote } from '@/core/schemas/note.schema'

const config = { bpm: 120, swing: 0, timingLooseness: 0 }

function note(id: string, step: number): AppNote {
  return { id, step, pitch: 'C4', midi: 60, durationSteps: 1, velocity: 90, isMuted: false }
}

describe('project groove', () => {
  it('moves odd grid steps by swing while leaving downbeats locked', () => {
    const swung = { ...config, swing: 1 }
    expect(getGroovedStartStep(0, 'a', swung)).toBe(0)
    expect(getGroovedStartStep(1, 'b', swung)).toBeCloseTo(1 + 1 / 3)
    expect(getGroovedStartStep(2, 'c', swung)).toBe(2)
  })

  it('plays eighth-note offbeats as a full triplet shuffle at 100% swing', () => {
    const notes = [note('beat', 0), note('offbeat', 2), note('next-beat', 4)]
    const straight = getGroovedLeadStarts(notes, config)
    const shuffled = getGroovedLeadStarts(notes, { ...config, swing: 1 })

    expect(straight.get('offbeat')).toBe(2)
    expect(shuffled.get('beat')).toBe(0)
    expect(shuffled.get('offbeat')).toBeCloseTo(2 + 2 / 3)
    expect(shuffled.get('next-beat')).toBe(4)
    expect((shuffled.get('offbeat') ?? 0) / (4 - (shuffled.get('offbeat') ?? 0))).toBeCloseTo(2)
  })

  it('keeps sixteenth-note swing in beats with finer onsets', () => {
    const starts = getGroovedLeadStarts([note('beat', 0), note('sixteenth', 1), note('eighth', 2), note('late', 3)], {
      ...config,
      swing: 1
    })

    expect(starts.get('sixteenth')).toBeCloseTo(1 + 1 / 3)
    expect(starts.get('eighth')).toBe(2)
    expect(starts.get('late')).toBeCloseTo(3 + 1 / 3)
  })

  it('uses a stable per-note timing offset', () => {
    const loose = { ...config, timingLooseness: 1 }
    const first = getGroovedStartStep(5, 'same-note', loose)
    expect(getGroovedStartStep(5, 'same-note', loose)).toBe(first)
    expect(first).toBeGreaterThan(4.85)
    expect(first).toBeLessThan(5.15)
  })

  it('does not add swing to an existing long-short shuffle pair', () => {
    const starts = getGroovedLeadStarts([note('first', 0), note('late', 3), note('next', 4)], {
      ...config,
      swing: 1
    })
    expect(starts.get('late')).toBe(3)
  })
})
