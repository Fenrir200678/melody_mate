import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_SAFE_AUDIO_SAMPLE_RATE } from '@/config/defaults'

// Hoist mocks for Tone.js
const { mockToneGetContext, mockToneSetContext, mockToneStart } = vi.hoisted(() => {
  return {
    mockToneGetContext: vi.fn(),
    mockToneSetContext: vi.fn(),
    mockToneStart: vi.fn()
  }
})

vi.mock('tone', () => ({
  getContext: mockToneGetContext,
  setContext: mockToneSetContext,
  start: mockToneStart,
  now: vi.fn(() => 0),
  Time: vi.fn(() => ({ toSeconds: () => 0.5 })),
  getTransport: vi.fn(() => ({
    bpm: { value: 120, rampTo: vi.fn() },
    timeSignature: 4,
    start: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    state: 'stopped',
    position: 0
  }))
}))

import {
  ensureAudioContextRunning,
  ensureConfiguredAudioContext,
  getAudioSampleRate
} from '@/audio/transport-adapter'

describe('transport-adapter sample rate management', () => {
  const originalGlobalWindow = (globalThis as unknown as { window?: unknown }).window

  beforeEach(() => {
    vi.clearAllMocks()
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

  it('keeps existing context if sample rate is already <= MAX_SAFE_AUDIO_SAMPLE_RATE (48 kHz)', () => {
    mockToneGetContext.mockReturnValue({
      sampleRate: 44100,
      state: 'running'
    })

    const constructorCalls: AudioContextOptions[] = []
    class MockAudioContext {
      constructor(options?: AudioContextOptions) {
        if (options) constructorCalls.push(options)
      }
    }
    ;(globalThis as unknown as { window: unknown }).window = {
      AudioContext: MockAudioContext
    }

    ensureConfiguredAudioContext()

    expect(constructorCalls.length).toBe(0)
    expect(mockToneSetContext).not.toHaveBeenCalled()
  })

  it('clamps context to 48 kHz if existing context runs at 96 kHz or 192 kHz', () => {
    mockToneGetContext.mockReturnValue({
      sampleRate: 96000,
      state: 'suspended'
    })

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
    expect(constructorCalls[0].latencyHint).toBe('interactive')
    expect(mockToneSetContext).toHaveBeenCalledTimes(1)
    expect(mockToneSetContext).toHaveBeenCalledWith(expect.any(MockAudioContext), true)
  })

  it('falls back gracefully if browser rejects explicit sampleRate in constructor options', () => {
    mockToneGetContext.mockReturnValue({
      sampleRate: 192000,
      state: 'suspended'
    })

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
    expect(constructorCalls[1]?.sampleRate).toBeUndefined()
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
})
