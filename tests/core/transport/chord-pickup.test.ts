import { describe, expect, it } from 'vitest'
import { getActiveChordPickup } from '../../../src/core/transport/chord-pickup'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'

describe('active chord pickup', () => {
  const chord: ChordEvent = {
    id: 'chord',
    name: 'C',
    roman: 'I',
    notes: ['C3', 'E3', 'G3'],
    voicing: ['G2', 'C4', 'E5'],
    startBar: 1,
    durationBars: 2
  }

  it('uses the active voiced chord and its remaining duration at the supplied tempo', () => {
    const pickup = getActiveChordPickup([chord], 120, 20)!
    expect(pickup.chord).toBe(chord)
    expect(pickup.durationSeconds).toBe(3.5)
    expect(pickup.stepDurationSeconds).toBe(0.125)
    expect(getActiveChordPickup([chord], 60, 20)!.durationSeconds).toBe(7)
  })

  it('does not chase across a rest or beyond the chord end', () => {
    expect(getActiveChordPickup([chord], 120, 15)).toBeNull()
    expect(getActiveChordPickup([chord], 120, 48)).toBeNull()
    expect(getActiveChordPickup([chord], 120, 49)).toBeNull()
    expect(getActiveChordPickup([{ ...chord, voicing: [] }], 120, 20)).toBeNull()
  })

  it('avoids an inaudibly short pickup immediately before the chord end', () => {
    expect(getActiveChordPickup([chord], 120, 47.8)).toBeNull()
    expect(getActiveChordPickup([chord], 120, 47)!.durationSeconds).toBe(0.125)
  })
})
