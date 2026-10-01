import { vi } from 'vitest'

export interface ToneMockOptions {
  /** Value returned by `MockMeter.getValue()` so level assertions stay configurable. */
  meterValue?: number | number[]
}

/**
 * Deterministic Tone namespace double shared by the audio tests. It records connections so tests
 * can assert routing topology, and it implements the parameter-automation methods the runtime
 * uses for audio-clock ramps. It proves orchestration only; it never renders audio.
 */
export function createToneMock(options: ToneMockOptions = {}) {
  const connectedTargets = () => (globalThis as { __connections?: unknown[] }).__connections ?? []

  class MockAudioNode {
    connect = vi.fn()
    disconnect = vi.fn()
    dispose = vi.fn()
    toDestination = vi.fn()

    constructor() {
      const record = (target: unknown) => {
        const connections = connectedTargets()
        connections.push({ node: this, target })
      }
      this.connect.mockImplementation((target: unknown) => {
        record(target)
        return this
      })
    }

    /** Every target this node was connected to, in call order. */
    connectedTo(): unknown[] {
      return this.connect.mock.calls.map((call) => call[0])
    }

    isConnectedTo(target: unknown): boolean {
      return this.connectedTo().includes(target)
    }
  }

  class MockGain extends MockAudioNode {
    gain = {
      value: 1,
      rampTo: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
      getValueAtTime: vi.fn(() => 1)
    }
  }

  class MockFilter extends MockAudioNode {
    frequency = {
      value: 1000,
      rampTo: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
      getValueAtTime: vi.fn(() => 1000)
    }
    Q = {
      value: 1,
      rampTo: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
      getValueAtTime: vi.fn(() => 1)
    }
  }

  class MockFreeverb extends MockAudioNode {}
  class MockFeedbackDelay extends MockAudioNode {}

  class MockChorus extends MockAudioNode {
    start = vi.fn().mockReturnThis()
    stop = vi.fn().mockReturnThis()
  }

  class MockLimiter extends MockAudioNode {}
  class MockCompressor extends MockAudioNode {}
  class MockWaveShaper extends MockAudioNode {}

  class MockMeter extends MockAudioNode {
    getValue = vi.fn(() => options.meterValue ?? -10)
  }

  class MockPolySynth extends MockAudioNode {
    static instances: MockPolySynth[] = []
    volume = { value: 0 }
    set = vi.fn()
    triggerAttack = vi.fn()
    triggerRelease = vi.fn()
    triggerAttackRelease = vi.fn()
    releaseAll = vi.fn()

    constructor(...args: unknown[]) {
      super()
      void args
      MockPolySynth.instances.push(this)
    }
  }

  const mockTransportSchedule = vi.fn(() => 99)
  const mockTransportClear = vi.fn()

  const transport = {
    PPQ: 192,
    bpm: { value: 120, rampTo: vi.fn() },
    start: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    schedule: mockTransportSchedule,
    clear: mockTransportClear,
    position: 0,
    seconds: 2.0,
    ticks: 1024,
    loopStart: '0:0:0',
    loopEnd: '4:0:0',
    loop: true,
    timeSignature: 4,
    state: 'stopped' as string
  }

  const toneMock = {
    Gain: MockGain,
    Filter: MockFilter,
    Freeverb: MockFreeverb,
    FeedbackDelay: MockFeedbackDelay,
    Chorus: MockChorus,
    Limiter: MockLimiter,
    Compressor: MockCompressor,
    WaveShaper: MockWaveShaper,
    Meter: MockMeter,
    PolySynth: MockPolySynth,
    Synth: vi.fn(),
    MonoSynth: vi.fn(),
    AMSynth: vi.fn(),
    FMSynth: vi.fn(),
    getTransport: vi.fn(() => transport),
    now: vi.fn(() => 0),
    Time: vi.fn(() => ({ toSeconds: () => 0.25 })),
    getContext: vi.fn(() => ({
      rawContext: { state: 'running', resume: vi.fn() },
      state: 'running',
      resume: vi.fn(),
      createAudioWorkletNode: vi.fn()
    })),
    start: vi.fn().mockResolvedValue(undefined)
  }

  return {
    MockAudioNode,
    MockGain,
    MockFilter,
    MockFreeverb,
    MockFeedbackDelay,
    MockChorus,
    MockLimiter,
    MockCompressor,
    MockWaveShaper,
    MockMeter,
    MockPolySynth,
    mockTransportSchedule,
    mockTransportClear,
    transport,
    toneMock
  }
}

export type ToneMock = ReturnType<typeof createToneMock>

export function resetMockAudioNodes(): void {
  ;(globalThis as { __connections?: unknown[] }).__connections = []
}
