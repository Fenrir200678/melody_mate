import { describe, expect, it } from 'vitest'
import { envelopeValueAt, releaseEnd } from '../../../src/core/synth/envelope'
import { midiToHz, trackedCutoff } from '../../../src/core/synth/tuning'
import { unisonPositions } from '../../../src/core/synth/unison'
import { NATIVE_DIAGNOSTIC_PATCH } from '../../../src/core/synth/factory-patches'

describe('native voice math', () => {
  it('tracks pitch and bounds keytracked cutoff at Nyquist margin', () => {
    expect(midiToHz(69)).toBe(440)
    expect(midiToHz(69, 1200)).toBe(880)
    expect(trackedCutoff(20000, 127, 1, 48000)).toBe(21600)
  })

  it('centers unison and preserves aggregate source gain', () => {
    for (let count = 1; count <= 4; count++) {
      const positions = unisonPositions(count, 20, 0.7)
      expect(positions.reduce((sum, item) => sum + item.gain, 0)).toBeCloseTo(1)
      expect(positions.reduce((sum, item) => sum + item.pan, 0)).toBeCloseTo(0)
    }
    expect(() => unisonPositions(5, 20, 1)).toThrow()
  })

  it('computes attack, decay, sustain and release bounds', () => {
    const amp = NATIVE_DIAGNOSTIC_PATCH.amp
    expect(envelopeValueAt(0, amp)).toBe(0)
    expect(envelopeValueAt(amp.attack, amp)).toBe(1)
    expect(envelopeValueAt(amp.attack + amp.decay, amp)).toBe(amp.sustain)
    expect(releaseEnd(2, amp)).toBe(2.3)
  })
})
