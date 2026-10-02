import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NativeSynthPatch } from '../../../src/core/synth/patch'
import { NATIVE_DIAGNOSTIC_PATCH } from '../../../src/core/synth/factory-patches'

const { voices } = vi.hoisted(() => ({
  voices: [] as Array<{
    trigger: ReturnType<typeof vi.fn>
    release: ReturnType<typeof vi.fn>
    fadeOut: ReturnType<typeof vi.fn>
    glideTo: ReturnType<typeof vi.fn>
    setMacro: ReturnType<typeof vi.fn>
    setParameter: ReturnType<typeof vi.fn>
    patch: NativeSynthPatch
  }>
}))
vi.mock('tone', () => ({ getTransport: () => ({ bpm: { value: 120 } }) }))
vi.mock('../../../src/audio/instruments/native-voice', () => ({
  NativeVoice: class {
    trigger = vi.fn()
    release = vi.fn()
    fadeOut = vi.fn()
    glideTo = vi.fn()
    setMacro = vi.fn()
    connect = vi.fn()
    setParameter = vi.fn()
    patch: NativeSynthPatch
    constructor(_context: unknown, patch: NativeSynthPatch) {
      this.patch = patch
      voices.push(this)
    }
  }
}))

import { NativeInstrument } from '../../../src/audio/instruments/native-instrument'

const context = {
  currentTime: 0,
  createGain: () => ({ connect: vi.fn(), disconnect: vi.fn() })
} as unknown as BaseAudioContext
const patch = (voice: Partial<NativeSynthPatch['voice']>): NativeSynthPatch => ({
  ...structuredClone(NATIVE_DIAGNOSTIC_PATCH),
  voice: { ...NATIVE_DIAGNOSTIC_PATCH.voice, ...voice }
})

beforeEach(() => {
  voices.length = 0
  vi.useRealTimers()
})

describe('NativeInstrument orchestration', () => {
  it('preserves a short explicit gate at a loop boundary', () => {
    vi.useFakeTimers()
    const instrument = new NativeInstrument(patch({ mode: 'poly' }), context)
    instrument.playNote('loop-gate', 'C4', 0.02, 0.08, 0.8)
    vi.runAllTimers()
    expect(voices[0].trigger).toHaveBeenCalledWith(60, 0.8, 0.08)
    expect(voices[0].release).toHaveBeenCalledWith(0.1)
    instrument.dispose()
  })

  it('releases identical pitches by unique IDs', () => {
    const instrument = new NativeInstrument(patch({ mode: 'poly', maxVoices: 2 }), context)
    instrument.noteOn('first', 'C4', 0, 0.8)
    instrument.noteOn('second', 'C4', 0.1, 0.7)
    instrument.noteOff('first', 0.2)
    expect(voices[0].release).toHaveBeenCalledWith(0.2)
    expect(voices[1].release).not.toHaveBeenCalled()
    instrument.dispose()
  })

  it('steals a released voice and fades it before starting another', () => {
    const instrument = new NativeInstrument(patch({ mode: 'poly', maxVoices: 2 }), context)
    instrument.noteOn('first', 'C4', 0, 0.8)
    instrument.noteOn('second', 'E4', 0, 0.8)
    instrument.noteOff('first', 0.2)
    instrument.noteOn('third', 'G4', 0, 0.8)
    expect(voices[0].fadeOut).toHaveBeenCalledWith(0, 0.005)
    expect(voices[1].fadeOut).not.toHaveBeenCalled()
    instrument.dispose()
  })

  it('glides without envelope retrigger in mono legato and cancels the old release', () => {
    vi.useFakeTimers()
    const instrument = new NativeInstrument(
      patch({ mode: 'mono', legato: true, retrigger: false, glideSeconds: 0.1 }),
      context
    )
    instrument.playNote('first', 'C4', 1, 0, 0.8)
    instrument.noteOn('second', 'D4', 0.05, 0.8)
    expect(voices).toHaveLength(1)
    expect(voices[0].glideTo).toHaveBeenCalledWith(62, 0.05, 0.1)
    vi.runAllTimers()
    expect(voices[0].release).not.toHaveBeenCalled()
    instrument.noteOff('second', 1.5)
    expect(voices[0].release).toHaveBeenCalledWith(1.5)
    instrument.dispose()
  })

  it('enforces the track note budget separately from oscillator unison', () => {
    const instrument = new NativeInstrument(patch({ mode: 'poly', maxVoices: 16 }), context, 8)
    expect(instrument.capabilities.maxNotes).toBe(8)
    expect(instrument.capabilities.maxUnisonPerOscillator).toBe(4)
    for (let index = 0; index < 9; index++) instrument.noteOn(`note-${index}`, 'C4', 0, 0.8)
    expect(voices).toHaveLength(9)
    expect(voices[0].fadeOut).toHaveBeenCalledWith(0, 0.005)
    instrument.dispose()
    expect(voices.slice(1).every((voice) => voice.fadeOut.mock.calls.length > 0)).toBe(true)
  })

  it('applies continuous parameters to subsequent notes', () => {
    const instrument = new NativeInstrument(patch({ mode: 'poly' }), context)
    instrument.setParameter('filter.cutoffHz', 1200, 0.1)
    instrument.noteOn('next', 'C4', 0, 0.8)
    expect(voices[0].patch.filter.cutoffHz).toBe(1200)
    instrument.dispose()
  })

  it('updates macro mappings on sounding and subsequent voices', () => {
    const configured = patch({ mode: 'poly' })
    configured.modulation = [
      { source: 'macro1', target: 'filter.cutoffHz', depth: 0.5, polarity: 'unipolar', curve: 'linear' }
    ]
    const instrument = new NativeInstrument(configured, context)
    instrument.noteOn('first', 'C4', 0, 0.8)
    instrument.setParameter('macro1', 0.75, 0.2)
    expect(voices[0].setMacro).toHaveBeenCalledWith(0, 0.75, 0.2)
    instrument.noteOn('second', 'D4', 0.05, 0.8)
    expect(voices[1].patch.macros[0]).toBe(0.75)
    instrument.dispose()
  })

  it('cancels queued releases on panic', () => {
    vi.useFakeTimers()
    const instrument = new NativeInstrument(patch({ mode: 'poly' }), context)
    instrument.playNote('future', 'C4', 1, 1, 0.8)
    instrument.panic(0.1)
    vi.runAllTimers()
    expect(voices).toHaveLength(0)
    instrument.dispose()
  })

  it('updates unisonDetuneCents on active and future voices', () => {
    const instrument = new NativeInstrument(patch({ mode: 'poly' }), context)
    instrument.noteOn('first', 'C4', 0, 0.8)
    instrument.setParameter('oscA.unisonDetuneCents', 28, 0.1)
    expect(voices[0].setParameter).toHaveBeenCalledWith('oscA.unisonDetuneCents', 28, 0.1)
    instrument.noteOn('second', 'E4', 0.05, 0.8)
    expect(voices[1].patch.oscillators.A.unisonDetuneCents).toBe(28)
    instrument.dispose()
  })
})
