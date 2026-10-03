import { describe, expect, it, vi } from 'vitest'
import { MidiClockBridge, createToneMidiClockBridge } from '../../../src/audio/midi/clock-bridge'
import type { OutputClockReading } from '../../../src/core/transport/output-timing'

const tone = vi.hoisted(() => ({ getContext: vi.fn() }))
vi.mock('tone', () => ({ getContext: tone.getContext }))

function setup() {
  let reading: OutputClockReading = {
    running: true,
    contextTimeSeconds: 10,
    performanceTimeMs: 1000,
    outputTimestamp: { contextTimeSeconds: 9.98, performanceTimeMs: 980 }
  }
  const bridge = new MidiClockBridge(
    { read: () => reading, signalPathLatencySeconds: () => 0.005 },
    { maxSampleAgeMs: 200, maxClockJumpMs: 40 }
  )
  return {
    bridge,
    read: () => reading,
    change: (next: Partial<OutputClockReading>) => {
      reading = { ...reading, ...next }
    }
  }
}

describe('audio/performance clock bridge', () => {
  it('accepts initial output calibration without invalidating the running timeline', () => {
    const fake = setup()
    fake.change({ outputTimestamp: undefined })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 0, changed: false, anchor: { mode: 'estimated' } })
    fake.change({
      contextTimeSeconds: 10.02,
      performanceTimeMs: 1020,
      outputTimestamp: { contextTimeSeconds: 9.92, performanceTimeMs: 1000 }
    })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 0, changed: false, anchor: { mode: 'output' } })
    expect(fake.bridge.map(10.02, 0)).toBeCloseTo(1105)
  })

  it('preserves calibrated timing through a missing output timestamp while the clocks advance normally', () => {
    const fake = setup()
    fake.change({ outputTimestamp: { contextTimeSeconds: 9.9, performanceTimeMs: 980 } })
    fake.bridge.sample()
    fake.change({ contextTimeSeconds: 10.02, performanceTimeMs: 1020, outputTimestamp: undefined })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 0, changed: false, anchor: { mode: 'output' } })
    expect(fake.bridge.map(10.02, 0)).toBeCloseTo(1105)
    fake.change({
      contextTimeSeconds: 10.04,
      performanceTimeMs: 1040,
      outputTimestamp: { contextTimeSeconds: 9.94, performanceTimeMs: 1020 }
    })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 0, changed: false })
    expect(fake.bridge.map(10.04, 0)).toBeCloseTo(1125)
  })

  it('anchors output timestamps, applies latency exactly once and reanchors on clock jumps', () => {
    const fake = setup()
    expect(fake.bridge.sample()).toMatchObject({ epoch: 0, changed: false, anchor: { mode: 'output' } })
    expect(fake.bridge.map(10.01, -8)).toBeCloseTo(1007)
    fake.change({ contextTimeSeconds: 10.01, performanceTimeMs: 1010 })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 0, changed: false })
    fake.change({
      contextTimeSeconds: 10.02,
      performanceTimeMs: 1200,
      outputTimestamp: { contextTimeSeconds: 10.01, performanceTimeMs: 1190 }
    })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 1, changed: true })
    expect(fake.bridge.map(10.02, 0)).toBeCloseTo(1205)
  })

  it('invalidates a changed output calibration even when the raw clocks advance normally', () => {
    const fake = setup()
    fake.bridge.sample()
    fake.change({
      contextTimeSeconds: 10.02,
      performanceTimeMs: 1020,
      outputTimestamp: { contextTimeSeconds: 9.9, performanceTimeMs: 1010 }
    })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 1, changed: true, anchor: { mode: 'output' } })
  })

  it('makes fallback explicit, invalidates suspended anchors and does not map until resampled after reset', () => {
    const fake = setup()
    fake.change({ outputTimestamp: { contextTimeSeconds: 0, performanceTimeMs: 0 } })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 0, changed: false, anchor: { mode: 'estimated' } })
    fake.change({ running: false })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 1, anchor: null })
    expect(() => fake.bridge.map(10.1, 0)).toThrow('not running')
    fake.change({ running: true, performanceTimeMs: 1500 })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 2, changed: true })
    fake.bridge.reset()
    expect(() => fake.bridge.map(10.1, 0)).toThrow('not running')
    expect(fake.bridge.sample()).toMatchObject({ epoch: 3, anchor: { mode: 'estimated' } })
  })

  it('uses the existing raw Tone context without lookahead or double-counted device latency', () => {
    tone.getContext.mockReturnValue({
      lookAhead: 0.1,
      rawContext: {
        state: 'running',
        currentTime: 10,
        baseLatency: 0.1,
        outputLatency: 0.2,
        getOutputTimestamp: () => ({ contextTime: 9.98, performanceTime: 980 })
      }
    })
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)
    try {
      const bridge = createToneMidiClockBridge(() => 0.005)
      expect(bridge.sample().anchor?.mode).toBe('output')
      expect(bridge.map(10.01, 0)).toBeCloseTo(1015)
      tone.getContext.mockReturnValue({
        rawContext: {
          state: 'running',
          currentTime: 10,
          getOutputTimestamp: () => {
            throw new Error('Unavailable')
          }
        }
      })
      expect(bridge.sample()).toMatchObject({ epoch: 0, changed: false, anchor: { mode: 'output' } })
      expect(bridge.map(10.01, 0)).toBeCloseTo(1015)
    } finally {
      now.mockRestore()
    }
  })
})
