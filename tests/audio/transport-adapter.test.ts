import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_AUDIO_LATENCY_HINT, DEFAULT_AUDIO_LOOKAHEAD, MAX_SAFE_AUDIO_SAMPLE_RATE } from '@/config/defaults'

// Hoist mocks for Tone.js
const { mockToneGetContext, mockToneSetContext, mockToneStart, mockToneImmediate, mockTransport } = vi.hoisted(() => {
  const mockTransport = {
    bpm: { value: 120, rampTo: vi.fn() },
    timeSignature: 4,
    start: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    state: 'stopped',
    position: 0,
    seconds: 1.5,
    getSecondsAtTime: vi.fn((_t?: number) => 1.25)
  }
  return {
    mockToneGetContext: vi.fn(),
    mockToneSetContext: vi.fn(),
    mockToneStart: vi.fn(),
    mockToneImmediate: vi.fn(() => 10.0),
    mockTransport
  }
})

vi.mock('tone', () => ({
  getContext: mockToneGetContext,
  setContext: mockToneSetContext,
  start: mockToneStart,
  now: vi.fn(() => 0),
  immediate: mockToneImmediate,
  Time: vi.fn(() => ({ toSeconds: () => 0.5 })),
  getTransport: vi.fn(() => mockTransport)
}))

import {
  ensureAudioContextRunning,
  ensureConfiguredAudioContext,
  getAudibleTransportSeconds,
  getAudioSampleRate,
  getTransportSeconds,
  resetAudioContextConfigurationForTesting
} from '@/audio/transport-adapter'

describe('transport-adapter audio context configuration & latency management', () => {
  const originalGlobalWindow = (globalThis as unknown as { window?: unknown }).window

  beforeEach(() => {
    vi.clearAllMocks()
    resetAudioContextConfigurationForTesting()
  })

  afterEach(() => {
    if (originalGlobalWindow !== undefined) {
      ;(globalThis as unknown as { window: unknown }).window = originalGlobalWindow
    } else {
      delete (globalThis as unknown as { window?: unknown }).window
    }
  })

  it('does nothing when running in a non-browser environment (no window)', () => {
    delete (globalThis as unknown as { window?: unknown }).window

    ensureConfiguredAudioContext()

    expect(mockToneGetContext).not.toHaveBeenCalled()
    expect(mockToneSetContext).not.toHaveBeenCalled()
  })

  it('configures custom context with balanced latencyHint and 48 kHz cap on cold start', () => {
    const mockContext = {
      sampleRate: 48000,
      lookAhead: 0.1,
      state: 'suspended'
    }
    mockToneGetContext.mockReturnValue(mockContext)

    const constructorCalls: AudioContextOptions[] = []
    class MockAudioContext {
      sampleRate = 48000
      state = 'suspended'
      constructor(options?: AudioContextOptions) {
        if (options) constructorCalls.push(options)
      }
    }
    ;(globalThis as unknown as { window: unknown }).window = {
      AudioContext: MockAudioContext
    }

    ensureConfiguredAudioContext()

    expect(constructorCalls.length).toBe(1)
    expect(constructorCalls[0].sampleRate).toBe(MAX_SAFE_AUDIO_SAMPLE_RATE)
    expect(constructorCalls[0].latencyHint).toBe(DEFAULT_AUDIO_LATENCY_HINT)
    expect(mockToneSetContext).toHaveBeenCalledTimes(1)
    expect(mockToneSetContext).toHaveBeenCalledWith(expect.any(MockAudioContext), true)
    expect(mockContext.lookAhead).toBe(DEFAULT_AUDIO_LOOKAHEAD)
  })

  it('keeps existing configured context on subsequent calls if sample rate <= 48 kHz', () => {
    const mockContext = {
      sampleRate: 48000,
      lookAhead: DEFAULT_AUDIO_LOOKAHEAD,
      state: 'running'
    }
    mockToneGetContext.mockReturnValue(mockContext)

    const constructorCalls: AudioContextOptions[] = []
    class MockAudioContext {
      sampleRate = 48000
      state = 'running'
      constructor(options?: AudioContextOptions) {
        if (options) constructorCalls.push(options)
      }
    }
    ;(globalThis as unknown as { window: unknown }).window = {
      AudioContext: MockAudioContext
    }

    // First call: configures context
    ensureConfiguredAudioContext()
    expect(constructorCalls.length).toBe(1)

    // Second call: already configured and safe, should not re-instantiate
    ensureConfiguredAudioContext()
    expect(constructorCalls.length).toBe(1)
    expect(mockToneSetContext).toHaveBeenCalledTimes(1)
  })

  it('clamps context to 48 kHz if sample rate is at 96 kHz or 192 kHz', () => {
    const mockContext = {
      sampleRate: 96000,
      lookAhead: 0.1,
      state: 'suspended'
    }
    mockToneGetContext.mockReturnValue(mockContext)

    const constructorCalls: AudioContextOptions[] = []
    class MockAudioContext {
      sampleRate = 48000
      state = 'suspended'
      constructor(options?: AudioContextOptions) {
        if (options) constructorCalls.push(options)
      }
    }
    ;(globalThis as unknown as { window: unknown }).window = {
      AudioContext: MockAudioContext
    }

    ensureConfiguredAudioContext()

    expect(constructorCalls.length).toBe(1)
    expect(constructorCalls[0].sampleRate).toBe(MAX_SAFE_AUDIO_SAMPLE_RATE)
    expect(constructorCalls[0].latencyHint).toBe(DEFAULT_AUDIO_LATENCY_HINT)
    expect(mockToneSetContext).toHaveBeenCalledTimes(1)
    expect(mockToneSetContext).toHaveBeenCalledWith(expect.any(MockAudioContext), true)
  })

  it('falls back gracefully if browser rejects explicit sampleRate in constructor options', () => {
    const mockContext = {
      sampleRate: 192000,
      lookAhead: 0.1,
      state: 'suspended'
    }
    mockToneGetContext.mockReturnValue(mockContext)

    const constructorCalls: (AudioContextOptions | undefined)[] = []
    class MockAudioContext {
      sampleRate = 192000
      state = 'suspended'
      constructor(options?: AudioContextOptions) {
        constructorCalls.push(options)
        if (options?.sampleRate) {
          throw new Error('NotSupportedError: sampleRate not supported')
        }
      }
    }
    ;(globalThis as unknown as { window: unknown }).window = {
      AudioContext: MockAudioContext
    }

    ensureConfiguredAudioContext()

    expect(constructorCalls.length).toBe(2)
    expect(constructorCalls[0]?.sampleRate).toBe(MAX_SAFE_AUDIO_SAMPLE_RATE)
    expect(constructorCalls[0]?.latencyHint).toBe(DEFAULT_AUDIO_LATENCY_HINT)
    expect(constructorCalls[1]?.sampleRate).toBeUndefined()
    expect(constructorCalls[1]?.latencyHint).toBe(DEFAULT_AUDIO_LATENCY_HINT)
    expect(mockToneSetContext).toHaveBeenCalledTimes(1)
    expect(mockToneSetContext).toHaveBeenCalledWith(expect.any(MockAudioContext), true)
  })

  it('ensures context is started and returns true on running state', async () => {
    delete (globalThis as unknown as { window?: unknown }).window
    const mockContext = {
      sampleRate: 48000,
      state: 'suspended'
    }
    mockToneGetContext.mockReturnValue(mockContext)
    mockToneStart.mockImplementation(async () => {
      mockContext.state = 'running'
    })

    const result = await ensureAudioContextRunning()

    expect(mockToneStart).toHaveBeenCalledTimes(1)
    expect(result).toBe(true)
  })

  it('reads current sample rate from Tone context', () => {
    mockToneGetContext.mockReturnValue({ sampleRate: 48000 })
    expect(getAudioSampleRate()).toBe(48000)

    mockToneGetContext.mockReturnValue(undefined)
    expect(getAudioSampleRate()).toBe(0)
  })

  it('reads raw transport seconds from Tone.getTransport().seconds', () => {
    mockTransport.seconds = 3.25
    expect(getTransportSeconds()).toBe(3.25)
  })

  it('evaluates audible transport seconds using Tone.immediate when playing', () => {
    mockTransport.state = 'started'
    mockTransport.seconds = 3.5
    mockToneImmediate.mockReturnValue(15.0)
    mockTransport.getSecondsAtTime.mockReturnValue(3.25)

    const result = getAudibleTransportSeconds()
    expect(mockTransport.getSecondsAtTime).toHaveBeenCalledWith(15.0)
    expect(result).toBe(3.25)
  })

  it('falls back to transport.seconds when transport is stopped or paused', () => {
    mockTransport.state = 'stopped'
    mockTransport.seconds = 2.0
    expect(getAudibleTransportSeconds()).toBe(2.0)

    mockTransport.state = 'paused'
    mockTransport.seconds = 1.0
    expect(getAudibleTransportSeconds()).toBe(1.0)
  })

  it('gracefully falls back to transport.seconds if getSecondsAtTime throws or returns non-numeric', () => {
    mockTransport.state = 'started'
    mockTransport.seconds = 4.0
    mockTransport.getSecondsAtTime.mockImplementationOnce(() => {
      throw new Error('Clock calculation failed')
    })
    expect(getAudibleTransportSeconds()).toBe(4.0)

    mockTransport.getSecondsAtTime.mockReturnValueOnce(NaN)
    expect(getAudibleTransportSeconds()).toBe(4.0)
  })
})
