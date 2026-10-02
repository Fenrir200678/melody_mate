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

  it('makes fallback explicit, invalidates suspended anchors and does not map until resampled after reset', () => {
    const fake = setup()
    fake.bridge.sample()
    fake.change({ outputTimestamp: { contextTimeSeconds: 0, performanceTimeMs: 0 } })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 1, changed: true, anchor: { mode: 'estimated' } })
    fake.change({ running: false })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 2, anchor: null })
    expect(() => fake.bridge.map(10.1, 0)).toThrow('not running')
    fake.change({ running: true, performanceTimeMs: 1500 })
    expect(fake.bridge.sample()).toMatchObject({ epoch: 3, changed: true })
    fake.bridge.reset()
    expect(() => fake.bridge.map(10.1, 0)).toThrow('not running')
    expect(fake.bridge.sample()).toMatchObject({ epoch: 4, anchor: { mode: 'estimated' } })
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
      expect(bridge.sample().anchor?.mode).toBe('estimated')
    } finally {
      now.mockRestore()
    }
  })
})
