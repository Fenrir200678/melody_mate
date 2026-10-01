import { effectScope, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChordEvent } from '../../src/core/schemas/chord.schema'
import { useChordBlockResize } from '../../src/composables/harmony/useChordBlockResize'

const chord: ChordEvent = {
  id: 'source',
  name: 'C',
  roman: 'I',
  notes: ['C', 'E', 'G'],
  voicing: ['C3', 'E3', 'G3'],
  startBar: 0,
  durationBars: 1
}

function setup() {
  const scope = effectScope()
  const onCommit = vi.fn()
  const chords = ref([chord, { ...chord, id: 'next', startBar: 3 }])
  const scrollLeft = ref(0)
  const barWidth = ref(200)
  let captured = false
  const element = {
    focus: vi.fn(),
    setPointerCapture: vi.fn(() => {
      captured = true
    }),
    hasPointerCapture: vi.fn(() => captured),
    releasePointerCapture: vi.fn(() => {
      captured = false
    })
  }
  const resize = scope.run(() =>
    useChordBlockResize({
      chords: () => chords.value,
      barWidth: () => barWidth.value,
      totalBars: () => 8,
      scrollLeft: () => scrollLeft.value,
      onCommit
    })
  )!
  const pointer = (clientX: number, overrides: Partial<PointerEvent> = {}) =>
    ({
      clientX,
      pointerId: 1,
      button: 0,
      isPrimary: true,
      currentTarget: element,
      ...overrides
    }) as unknown as PointerEvent
  return { scope, onCommit, chords, scrollLeft, barWidth, element, resize, pointer }
}

describe('chord block edge resize interaction', () => {
  let fixture: ReturnType<typeof setup>
  let frame: FrameRequestCallback | null
  beforeEach(() => {
    frame = null
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frame = callback
        return 1
      })
    )
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn(() => {
        frame = null
      })
    )
    fixture = setup()
  })
  afterEach(() => {
    fixture.scope.stop()
    vi.unstubAllGlobals()
  })

  it('captures locally, coalesces previews and commits only the final duration once', () => {
    const { resize, pointer, element, onCommit } = fixture
    resize.onPointerDown(pointer(0), chord)
    resize.onPointerMove(pointer(50))
    resize.onPointerMove(pointer(100))
    expect(element.setPointerCapture).toHaveBeenCalledWith(1)
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    expect(resize.resizeState.value?.previewDurationBars).toBe(1)
    frame!(0)
    expect(resize.resizeState.value?.previewDurationBars).toBe(1.5)
    expect(onCommit).not.toHaveBeenCalled()
    resize.onPointerUp(pointer(150))
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(chord.id, 1.75)
    expect(resize.resizeState.value).toBeNull()
    expect(element.releasePointerCapture).toHaveBeenCalledWith(1)
  })

  it('includes scroll movement in the final position even before RAF runs', () => {
    const { resize, pointer, scrollLeft, onCommit } = fixture
    resize.onPointerDown(pointer(0), chord)
    resize.onPointerMove(pointer(50))
    scrollLeft.value = 50
    resize.onPointerUp(pointer(50))
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(chord.id, 1.5)
  })

  it.each(['pointer cancel', 'escape', 'unmount', 'external edit', 'zoom'] as const)(
    'cancels without a commit on %s',
    (reason) => {
      const { resize, pointer, scope, chords, barWidth, element, onCommit } = fixture
      resize.onPointerDown(pointer(0), chord)
      resize.onPointerMove(pointer(100))
      if (reason === 'pointer cancel') resize.onPointerCancel(pointer(0))
      if (reason === 'escape') resize.cancelResize()
      if (reason === 'unmount') scope.stop()
      if (reason === 'external edit') chords.value = []
      if (reason === 'zoom') barWidth.value = 300
      resize.onPointerUp(pointer(100))
      expect(onCommit).not.toHaveBeenCalled()
      expect(resize.resizeState.value).toBeNull()
      expect(element.releasePointerCapture).toHaveBeenCalledWith(1)
      expect(frame).toBeNull()
    }
  )

  it('ignores other pointers and skips undo-producing commits for unchanged duration', () => {
    const { resize, pointer, element, onCommit } = fixture
    resize.onPointerDown(pointer(0, { button: 2 }), chord)
    resize.onPointerDown(pointer(0, { isPrimary: false }), chord)
    expect(element.setPointerCapture).not.toHaveBeenCalled()
    resize.onPointerDown(pointer(0), chord)
    resize.onPointerMove(pointer(100, { pointerId: 2 }))
    resize.onPointerUp(pointer(100, { pointerId: 2 }))
    expect(resize.resizeState.value?.previewDurationBars).toBe(chord.durationBars)
    resize.onPointerUp(pointer(0))
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('provides quarter-bar keyboard steps and respects the following chord', () => {
    const { resize, onCommit, chords } = fixture
    resize.nudgeDuration(chord, -1)
    expect(onCommit).toHaveBeenLastCalledWith(chord.id, 0.75)
    const touching = { ...chord, durationBars: 3 }
    chords.value = [touching, { ...chord, id: 'next', startBar: 3 }]
    onCommit.mockClear()
    resize.nudgeDuration(touching, 1)
    expect(onCommit).not.toHaveBeenCalled()
  })
})
