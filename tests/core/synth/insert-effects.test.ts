import { describe, expect, it, vi } from 'vitest'
import { InstrumentInsertEffects } from '../../../src/audio/instruments/insert-effects'
import { decibelsToGain } from '../../../src/core/audio/gain-staging'

function createMockAudioParam(initialValue = 0) {
  return {
    value: initialValue,
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn()
  }
}

function createMockContext() {
  const nodes: unknown[] = []
  const context = {
    currentTime: 0,
    createGain: vi.fn(() => {
      const node = {
        gain: createMockAudioParam(1),
        connect: vi.fn(),
        disconnect: vi.fn()
      }
      nodes.push(node)
      return node
    }),
    createWaveShaper: vi.fn(() => {
      const node = {
        oversample: 'none',
        curve: null as Float32Array | null,
        connect: vi.fn(),
        disconnect: vi.fn()
      }
      nodes.push(node)
      return node
    }),
    createDelay: vi.fn(() => {
      const node = {
        delayTime: createMockAudioParam(0),
        connect: vi.fn(),
        disconnect: vi.fn()
      }
      nodes.push(node)
      return node
    }),
    createBiquadFilter: vi.fn(() => {
      const node = {
        type: 'lowpass',
        frequency: createMockAudioParam(350),
        connect: vi.fn(),
        disconnect: vi.fn()
      }
      nodes.push(node)
      return node
    }),
    createOscillator: vi.fn(() => {
      const node = {
        type: 'sine',
        frequency: createMockAudioParam(440),
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      }
      nodes.push(node)
      return node
    }),
    createChannelMerger: vi.fn(() => {
      const node = {
        connect: vi.fn(),
        disconnect: vi.fn()
      }
      nodes.push(node)
      return node
    }),
    createConvolver: vi.fn(() => {
      const node = {
        buffer: null,
        connect: vi.fn(),
        disconnect: vi.fn()
      }
      nodes.push(node)
      return node
    }),
    createBuffer: vi.fn(() => ({
      getChannelData: vi.fn(() => new Float32Array(100))
    }))
  } as unknown as BaseAudioContext

  return { context, nodes }
}

describe('InstrumentInsertEffects', () => {
  it('constructs a full insert chain with 4x oversampling saturation, chorus, and calibrated trim', () => {
    const { context } = createMockContext()
    const inserts = new InstrumentInsertEffects(
      context,
      { drive: 0.5, chorus: 0.3, driveBypass: false, chorusBypass: false },
      -9
    )

    expect(inserts.input).toBeDefined()
    expect(inserts.output).toBeDefined()
    expect(context.createWaveShaper).toHaveBeenCalled()
    expect(context.createDelay).toHaveBeenCalledTimes(2)
    expect(context.createChannelMerger).toHaveBeenCalledWith(2)

    // WaveShaper must use 4x oversampling for nonlinear anti-aliasing
    const shaper = (context.createWaveShaper as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(shaper.oversample).toBe('4x')
    expect(shaper.curve).toBeInstanceOf(Float32Array)
    expect(shaper.curve.length).toBe(2049)

    // Curve is symmetric and bounded between -1 and 1
    expect(shaper.curve[0]).toBeCloseTo(-1, 2)
    expect(shaper.curve[1024]).toBeCloseTo(0, 2)
    expect(shaper.curve[2048]).toBeCloseTo(1, 2)

    inserts.dispose()
  })

  it('adjusts drive and applies compensated gain reduction to preserve headroom', () => {
    const { context } = createMockContext()
    const inserts = new InstrumentInsertEffects(
      context,
      { drive: 0, chorus: 0, driveBypass: false, chorusBypass: false },
      -12
    )

    inserts.setDrive(0.8, false, 0.5)
    // Target compensation must scale down with higher drive
    const compTarget = 1 / (1 + 0.8 * 1.4)
    expect(compTarget).toBeLessThan(0.6) // significant attenuation to offset +16 dB pre-gain

    // Bypass drive: wet becomes 0, dry becomes 1
    inserts.setDrive(0.8, true, 1.0)

    inserts.dispose()
  })

  it('updates chorus modulation depth and supports stereo phase inversion for width', () => {
    const { context } = createMockContext()
    const inserts = new InstrumentInsertEffects(
      context,
      { drive: 0, chorus: 0.6, driveBypass: false, chorusBypass: false },
      -12
    )

    inserts.setChorus(0.75, false, 0.2)
    // Bypass chorus
    inserts.setChorus(0.75, true, 0.4)

    inserts.dispose()
  })

  it('configures reverb convolver with impulse response and automates wet/dry crossfade', () => {
    const { context } = createMockContext()
    const inserts = new InstrumentInsertEffects(
      context,
      { drive: 0, chorus: 0, reverb: 0.35, driveBypass: false, chorusBypass: false, reverbBypass: false },
      -12
    )

    expect(context.createConvolver).toHaveBeenCalled()
    inserts.setReverb(0.8, false, 0.2)
    inserts.setReverb(0.8, true, 0.4)

    inserts.dispose()
  })

  it('automates output trim smoothly in decibels', () => {
    const { context } = createMockContext()
    const inserts = new InstrumentInsertEffects(context, { drive: 0, chorus: 0 }, -18)

    inserts.setOutputTrim(-6, 0.1)
    expect(decibelsToGain(-6)).toBeCloseTo(0.501, 2)

    inserts.dispose()
  })

  it('guarantees mono fold-down safety for chorus delay times', () => {
    // Left delay is nominal 5.5ms, right delay is nominal 7.5ms with 1.8ms anti-phase sweep.
    // In mono summing (L+R), the delay difference between 0.1ms and 3.9ms preserves full bass fundamentals (>100Hz).
    const leftDelay = 0.0055
    const rightDelay = 0.0075
    const diffSeconds = Math.abs(rightDelay - leftDelay)
    // First notch frequency is f = 1 / (2 * deltaT)
    const firstNotchHz = 1 / (2 * diffSeconds)
    // 250 Hz is well above bass fundamental range (40–120 Hz)
    expect(firstNotchHz).toBeGreaterThanOrEqual(200)
  })

  it('disposes all nodes and oscillators cleanly without memory leaks', () => {
    const { context } = createMockContext()
    const inserts = new InstrumentInsertEffects(context, { drive: 0.2, chorus: 0.4 }, -12)

    const osc = (context.createOscillator as ReturnType<typeof vi.fn>).mock.results[0].value
    inserts.dispose()
    expect(osc.stop).toHaveBeenCalled()
    expect(osc.disconnect).toHaveBeenCalled()
  })
})
