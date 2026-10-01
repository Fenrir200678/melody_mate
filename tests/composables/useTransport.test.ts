import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransport } from '../../src/composables/useTransport'
import type { PlaybackEngine } from '../../src/audio/playback-engine'
import { useAudioStore } from '../../src/stores/audio.store'
import { useProjectStore } from '../../src/stores/project.store'

// Polyfill requestAnimationFrame in Node test environment for useRafFn
;(globalThis as unknown as { window: unknown }).window = {
  requestAnimationFrame: (cb: FrameRequestCallback): number => Number(setTimeout(() => cb(performance.now()), 16)),
  cancelAnimationFrame: (id: number): void => clearTimeout(id)
}
;(globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = (
  cb: FrameRequestCallback
): number => Number(setTimeout(() => cb(performance.now()), 16))
;(globalThis as unknown as { cancelAnimationFrame: unknown }).cancelAnimationFrame = (id: number): void =>
  clearTimeout(id)

describe('useTransport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('updates currentStep and currentTime on step changes', () => {
    const audioStore = useAudioStore()
    const projectStore = useProjectStore()
    projectStore.setBpm(120)

    let currentMockStep = 0
    let currentMockSeconds = 0.0

    const mockEngine = {
      getCurrentStep: vi.fn(() => currentMockStep),
      getCurrentTimeSeconds: vi.fn(() => currentMockSeconds)
    } as unknown as PlaybackEngine

    audioStore.setPlaybackEngine(mockEngine)

    const transport = useTransport({ autoStart: false })

    // 1. Initial playhead update at step 0
    transport.updatePlayhead()
    expect(audioStore.currentStep).toBe(0)
    expect(audioStore.currentTime).toBe(0.0)

    // 2. Playhead update while still at step 0 (Step-Guarding)
    currentMockSeconds = 0.05
    transport.updatePlayhead()
    expect(audioStore.currentStep).toBe(0)
    expect(audioStore.currentTime).toBe(0.05)

    // 3. Playhead advances to step 1
    currentMockStep = 1
    currentMockSeconds = 0.125
    transport.updatePlayhead()
    expect(audioStore.currentStep).toBe(1)
    expect(audioStore.currentTime).toBe(0.125)
  })

  it('controls RAF loop active state via audioStore.isPlaying', async () => {
    const audioStore = useAudioStore()
    const transport = useTransport({ autoStart: true })

    expect(transport.isActive.value).toBe(false)

    // Simulate starting playback
    audioStore.isPlaying = true
    await vi.waitFor(() => {
      expect(transport.isActive.value).toBe(true)
    })

    // Simulate stopping playback
    audioStore.isPlaying = false
    await vi.waitFor(() => {
      expect(transport.isActive.value).toBe(false)
    })
  })

  it('allows manual pause and resume of tracking', () => {
    const transport = useTransport({ autoStart: false })

    expect(transport.isActive.value).toBe(false)
    transport.resume()
    expect(transport.isActive.value).toBe(true)
    transport.pause()
    expect(transport.isActive.value).toBe(false)
  })

  it('drives the markRaw playhead clock with continuous fractional steps', () => {
    const audioStore = useAudioStore()
    const projectStore = useProjectStore()
    projectStore.setBpm(120)

    let currentMockStep = 0
    let currentMockPlayhead = 0

    const mockEngine = {
      getCurrentStep: vi.fn(() => currentMockStep),
      getCurrentTimeSeconds: vi.fn(() => currentMockStep * 0.125),
      getPlayheadStep: vi.fn(() => currentMockPlayhead)
    } as unknown as PlaybackEngine

    audioStore.setPlaybackEngine(mockEngine)

    const transport = useTransport({ autoStart: false })

    // Still on step 0 but mid-way into the (future) 16th: clock moves, guarded step does not
    currentMockPlayhead = 0.35
    transport.updatePlayhead()
    expect(audioStore.playhead.step).toBeCloseTo(0.35, 5)
    expect(audioStore.currentStep).toBe(0)

    // Crossing into step 1 updates both integer and float
    currentMockStep = 1
    currentMockPlayhead = 1.5
    transport.updatePlayhead()
    expect(audioStore.currentStep).toBe(1)
    expect(audioStore.playhead.step).toBeCloseTo(1.5, 5)
  })
})
