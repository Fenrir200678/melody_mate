import { describe, expect, it, vi } from 'vitest'
import { NATIVE_DIAGNOSTIC_PATCH } from '../../../src/core/synth/factory-patches'
import type { NativeSynthPatch } from '../../../src/core/synth/patch'
import { GlobalLfoBank, VoiceModulationRuntime } from '../../../src/audio/instruments/modulation-runtime'
import type { NativeVoiceGraph } from '../../../src/audio/instruments/native-voice-graph'

function param() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn()
  }
}

function node() {
  return {
    connect: vi.fn(function (this: object) {
      return this
    }),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    offset: param(),
    frequency: param(),
    detune: param(),
    gain: param(),
    Q: param(),
    curve: null as Float32Array | null,
    type: 'sine'
  }
}

function fixture() {
  const created: ReturnType<typeof node>[] = []
  const make = () => {
    const result = node()
    created.push(result)
    return result
  }
  const context = {
    currentTime: 0,
    sampleRate: 48000,
    createOscillator: make,
    createConstantSource: make,
    createGain: make,
    createWaveShaper: make
  } as unknown as BaseAudioContext
  const filter = node()
  const oscA = node()
  const oscB = node()
  const gainA = node()
  const gainB = node()
  const graph = {
    filters: [filter],
    groups: { A: [oscA], B: [oscB] },
    sourceGains: { A: gainA, B: gainB }
  } as unknown as NativeVoiceGraph
  return { context, created, graph, filter, oscA }
}

describe('audio-node modulation routing', () => {
  it('gives each voice its own envelope and releases it at the audio timestamp', () => {
    const { context, created, graph, filter } = fixture()
    const patch: NativeSynthPatch = {
      ...structuredClone(NATIVE_DIAGNOSTIC_PATCH),
      modulation: [{ source: 'modEnv1', target: 'filter.cutoffHz', depth: 0.5, polarity: 'unipolar', curve: 'linear' }]
    }
    const globals = new GlobalLfoBank(context, patch, 120)
    const first = new VoiceModulationRuntime(context, graph, patch, 60, 0.8, 1, globals)
    const second = new VoiceModulationRuntime(context, graph, patch, 67, 0.4, 1.1, globals)
    const envelopeNodes = created.filter((item) => item.offset.linearRampToValueAtTime.mock.calls.length >= 2)
    expect(envelopeNodes).toHaveLength(2)
    expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(0, 1)
    first.release(1.5)
    expect(envelopeNodes[0].offset.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      -1,
      1.5 + patch.modEnvelopes[0].release
    )
    expect(envelopeNodes[1].offset.linearRampToValueAtTime).toHaveBeenCalledTimes(2)
    first.dispose()
    second.dispose()
    globals.dispose()
    expect(created.every((item) => item.disconnect.mock.calls.length > 0)).toBe(true)
  })

  it('shares free-running LFOs and follows explicit tempo updates', () => {
    const { context, graph, created } = fixture()
    const patch: NativeSynthPatch = {
      ...structuredClone(NATIVE_DIAGNOSTIC_PATCH),
      lfos: [{ waveform: 'sine', rate: 2, sync: true, retrigger: false }, NATIVE_DIAGNOSTIC_PATCH.lfos[1]],
      modulation: [{ source: 'lfo1', target: 'oscA.detuneCents', depth: 0.1, polarity: 'bipolar', curve: 'linear' }]
    }
    const globals = new GlobalLfoBank(context, patch, 120)
    const voice = new VoiceModulationRuntime(context, graph, patch, 60, 1, 0, globals)
    const oscillator = created.find((item) => item.start.mock.calls.length > 0 && item.frequency.value === 4)!
    expect(oscillator).toBeDefined()
    globals.setTempo(90, 2)
    expect(oscillator.frequency.setTargetAtTime).toHaveBeenCalledWith(3, 2, 0.01)
    voice.dispose()
    expect(oscillator.stop).not.toHaveBeenCalled()
    expect(oscillator.disconnect).toHaveBeenCalled()
    globals.dispose()
    expect(oscillator.stop).toHaveBeenCalledTimes(1)
  })
})
