import { effectScope, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChordEvent } from '../../src/core/schemas/chord.schema'
import { CHORD_TIMELINE_DRAG } from '../../src/config/ui-defaults'
import { useChordBlockDrag } from '../../src/composables/harmony/useChordBlockDrag'

const chord: ChordEvent = {
  id: 'source',
  name: 'C',
  roman: 'I',
  notes: ['C', 'E', 'G'],
  voicing: ['C3', 'E3', 'G3'],
  startBar: 2,
  durationBars: 1
}

function setup() {
  const scope = effectScope()
  const onSelect = vi.fn()
  const onCommit = vi.fn()
  const barWidth = ref(CHORD_TIMELINE_DRAG.fineSnapMinBarWidth as number)
  const chords = ref([chord])
  const scrollLeft = ref(0)
  let captured = false
  const element = {
    setPointerCapture: vi.fn(() => {
      captured = true
    }),
    hasPointerCapture: vi.fn(() => captured),
    releasePointerCapture: vi.fn(() => {
      captured = false
    })
  }
  const drag = scope.run(() =>
    useChordBlockDrag({
      chords: () => chords.value,
      barWidth: () => barWidth.value,
      totalBars: () => 8,
      scrollLeft: () => scrollLeft.value,
      onSelect,
      onCommit
    })
  )!
  function pointer(clientX: number, overrides: Partial<PointerEvent> = {}): PointerEvent {
    return {
      clientX,
      pointerId: 1,
      button: 0,
      isPrimary: true,
      altKey: false,
      currentTarget: element,
      ...overrides
    } as unknown as PointerEvent
  }
  return { scope, onSelect, onCommit, barWidth, chords, scrollLeft, element, drag, pointer }
}

describe('chord block drag interaction', () => {
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

  it('captures locally and treats movement below the threshold as a selection click', () => {
    const { drag, pointer, element, onSelect, onCommit } = fixture
    drag.onPointerDown(pointer(0), chord)
    drag.onPointerMove(pointer(CHORD_TIMELINE_DRAG.thresholdPx - 1))
    drag.onPointerUp(pointer(CHORD_TIMELINE_DRAG.thresholdPx - 1))
    drag.onClick({ detail: 1 } as MouseEvent, chord)
    expect(element.setPointerCapture).toHaveBeenCalledWith(1)
    expect(element.releasePointerCapture).toHaveBeenCalledWith(1)
    expect(onSelect).toHaveBeenCalledWith(chord)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('coalesces previews, commits once on release and suppresses the following pointer click', () => {
    const { drag, pointer, barWidth, onSelect, onCommit } = fixture
    drag.onPointerDown(pointer(0), chord)
    drag.onPointerMove(pointer(barWidth.value / 4))
    drag.onPointerMove(pointer(barWidth.value / 2))
    expect(drag.dragState.value).toBeNull()
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    frame!(0)
    expect(drag.dragState.value?.previewStartBar).toBe(2.5)
    expect(onCommit).not.toHaveBeenCalled()
    drag.onPointerUp(pointer(barWidth.value))
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(chord.id, 3, false)
    expect(drag.dragState.value).toBeNull()
    drag.onClick({ detail: 1 } as MouseEvent, chord)
    expect(onSelect).not.toHaveBeenCalled()
    drag.onClick({ detail: 0 } as MouseEvent, chord)
    expect(onSelect).toHaveBeenCalledWith(chord)
  })

  it('uses the final Alt state and scroll offset even before the preview frame runs', () => {
    const { drag, pointer, barWidth, scrollLeft, onCommit } = fixture
    drag.onPointerDown(pointer(0), chord)
    drag.onPointerMove(pointer(barWidth.value / 2))
    scrollLeft.value = barWidth.value / 2
    drag.onPointerUp(pointer(barWidth.value / 2, { altKey: true }))
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(chord.id, 3, true)
  })

  it.each(['pointer cancel', 'escape', 'unmount'] as const)('cancels without edits on %s', (reason) => {
    const { drag, pointer, barWidth, onCommit, element, scope } = fixture
    drag.onPointerDown(pointer(0), chord)
    drag.onPointerMove(pointer(barWidth.value))
    if (reason === 'pointer cancel') drag.onPointerCancel(pointer(0))
    if (reason === 'escape') drag.cancelDrag()
    if (reason === 'unmount') scope.stop()
    expect(onCommit).not.toHaveBeenCalled()
    expect(drag.dragState.value).toBeNull()
    expect(element.releasePointerCapture).toHaveBeenCalledWith(1)
    expect(frame).toBeNull()
  })

  it('ignores secondary buttons and other pointer IDs', () => {
    const { drag, pointer, element, onCommit } = fixture
    drag.onPointerDown(pointer(0, { button: 2 }), chord)
    expect(element.setPointerCapture).not.toHaveBeenCalled()
    drag.onPointerDown(pointer(0), chord)
    drag.onPointerMove(pointer(200, { pointerId: 2 }))
    drag.onPointerUp(pointer(200, { pointerId: 2 }))
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('cancels a gesture when the progression changes externally', async () => {
    const { drag, pointer, chords, onCommit } = fixture
    drag.onPointerDown(pointer(0), chord)
    drag.onPointerMove(pointer(200))
    chords.value = []
    await nextTick()
    drag.onPointerUp(pointer(200))
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('nudges and copies by the current zoom grid with keyboard actions', () => {
    const { drag, barWidth, onCommit } = fixture
    drag.nudgeChord(chord, 1, false)
    expect(onCommit).toHaveBeenLastCalledWith(chord.id, 2 + CHORD_TIMELINE_DRAG.fineSnapBars, false)
    barWidth.value = CHORD_TIMELINE_DRAG.mediumSnapMinBarWidth
    drag.nudgeChord(chord, -1, true)
    expect(onCommit).toHaveBeenLastCalledWith(chord.id, 2 - CHORD_TIMELINE_DRAG.mediumSnapBars, true)
    barWidth.value = CHORD_TIMELINE_DRAG.mediumSnapMinBarWidth - 1
    expect(drag.snapGrid.value).toBe(CHORD_TIMELINE_DRAG.coarseSnapBars)
  })
})
