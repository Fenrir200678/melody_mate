import { describe, expect, it, vi } from 'vitest'
import { createRenderer, h, ref, type Ref } from 'vue'
import type { AppNote } from '@/core/schemas/note.schema'
import type { WorkRange } from '@/core/generator/work-range'
import { createGestureSession } from '@/composables/pianoroll/gestureSession'
import { createPianoRollInteractionContext } from '@/composables/pianoroll/interactionContext'
import type { ToolMode } from '@/composables/pianoroll/noteOps'
import { useNoteGestures } from '@/composables/pianoroll/useNoteGestures'
import {
  usePianoRollInteractions,
  type UsePianoRollInteractionsOptions
} from '@/composables/pianoroll/usePianoRollInteractions'
import { resolveEmptySpaceGesture, useWorkRangeGestures } from '@/composables/pianoroll/useWorkRangeGestures'

// Canvas 800x600, keyboard 100px, stepWidth 10px, rowHeight 10px, snap 4 steps.
// Pixel X -> step: (x - 100) / 10; pixel Y -> midi: 127 - floor(y / 10).
const INITIAL_WORK_RANGE: WorkRange = { startStep: 4, endStep: 12 }
const TRANSFORM = { stepWidth: 10, rowHeight: 10, scrollX: 0, scrollY: 0, keyboardWidth: 100, maxMidi: 127 }

function makeNote(id: string, step: number, midi: number, durationSteps = 2): AppNote {
  return { id, pitch: `N${midi}`, midi, step, durationSteps, velocity: 100, isMuted: false }
}

interface PointerOptions {
  pointerId?: number
  clientY?: number
  button?: number
  modifier?: boolean
  shiftKey?: boolean
}

function pointerEvent(type: string, clientX: number, options: PointerOptions = {}): PointerEvent {
  const event = new Event(type, { cancelable: true })
  return Object.assign(event, {
    pointerId: options.pointerId ?? 1,
    clientX,
    clientY: options.clientY ?? 100,
    button: options.button ?? 0,
    shiftKey: options.shiftKey ?? false,
    metaKey: Boolean(options.modifier),
    ctrlKey: false,
    altKey: false
  }) as unknown as PointerEvent
}

function dispatchPointer(canvas: HTMLCanvasElement, type: string, clientX: number, options: PointerOptions = {}): void {
  canvas.dispatchEvent(pointerEvent(type, clientX, options))
}

type TestNode = { type: string; children: TestNode[]; parent: TestNode | null; text: string }

/** Canvas stand-in with pointer-capture bookkeeping plus EventTarget dispatch. */
function createCanvasStub(): HTMLCanvasElement {
  const capturedPointers = new Set<number>()
  return Object.assign(new EventTarget(), {
    style: { width: '800px', height: '600px', cursor: '' },
    width: 800,
    height: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    hasPointerCapture: vi.fn((pointerId: number) => capturedPointers.has(pointerId)),
    setPointerCapture: vi.fn((pointerId: number) => {
      capturedPointers.add(pointerId)
    }),
    releasePointerCapture: vi.fn((pointerId: number) => capturedPointers.delete(pointerId))
  }) as unknown as HTMLCanvasElement
}

function createInteractionOptions(
  canvas: Ref<HTMLCanvasElement | null>,
  notes: Ref<AppNote[]> = ref([]),
  workRange: Ref<WorkRange> = ref({ ...INITIAL_WORK_RANGE }),
  activeTool: ToolMode = 'select'
) {
  const selectedNoteIds = ref<string[]>([])
  const onUpdateNotes = vi.fn()
  const onUpdateSelectedNoteIds = vi.fn((ids: string[]) => {
    selectedNoteIds.value = ids
  })
  const onUpdateWorkRange = vi.fn((next: WorkRange) => {
    workRange.value = next
  })

  const options: UsePianoRollInteractionsOptions = {
    canvasRef: canvas,
    notes,
    selectedNoteIds,
    activeTool: ref<ToolMode>(activeTool),
    snapStep: ref(4),
    rootKey: ref('C'),
    scale: ref('major'),
    isAuditionEnabled: ref(false),
    scrollX: ref(0),
    scrollY: ref(0),
    stepWidth: ref(10),
    rowHeight: ref(10),
    keyboardWidth: ref(100),
    minMidi: ref(0),
    maxMidi: ref(127),
    workRange,
    onUpdateNotes,
    onUpdateSelectedNoteIds,
    onUpdateWorkRange
  }

  return { options, workRange, notes, selectedNoteIds, onUpdateNotes, onUpdateSelectedNoteIds, onUpdateWorkRange }
}

/** Mounts the interactions composable so its canvas pointer listeners become active. */
function mountInteractions(options: UsePianoRollInteractionsOptions): () => void {
  const renderer = createRenderer<TestNode, TestNode>({
    createElement: (type) => ({ type, children: [], parent: null, text: '' }),
    createText: (text) => ({ type: '#text', children: [], parent: null, text }),
    createComment: (text) => ({ type: '#comment', children: [], parent: null, text }),
    setText: (node, text) => {
      node.text = text
    },
    setElementText: (node, text) => {
      node.text = text
    },
    patchProp: () => {},
    insert: (node, parent, anchor) => {
      node.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      if (index < 0) parent.children.push(node)
      else parent.children.splice(index, 0, node)
    },
    remove: (node) => {
      if (node.parent) node.parent.children = node.parent.children.filter((child) => child !== node)
      node.parent = null
    },
    parentNode: (node) => node.parent,
    nextSibling: (node) => {
      if (!node.parent) return null
      return node.parent.children[node.parent.children.indexOf(node) + 1] ?? null
    }
  })
  const app = renderer.createApp({
    setup() {
      usePianoRollInteractions(options)
      return () => h('root')
    }
  })
  const root: TestNode = { type: 'root', children: [], parent: null, text: '' }
  app.mount(root)
  return () => app.unmount()
}

describe('piano-roll empty-space gestures', () => {
  it('routes empty select drags to the work range and modifier or lasso-tool drags to the marquee', () => {
    expect(
      resolveEmptySpaceGesture({ button: 0, tool: 'select', empty: true, modifier: false, hasWorkRange: true })
    ).toBe('work-range')
    expect(
      resolveEmptySpaceGesture({ button: 0, tool: 'select', empty: true, modifier: true, hasWorkRange: true })
    ).toBe('lasso')
    expect(
      resolveEmptySpaceGesture({ button: 0, tool: 'lasso', empty: true, modifier: false, hasWorkRange: true })
    ).toBe('lasso')
    expect(
      resolveEmptySpaceGesture({ button: 0, tool: 'lasso', empty: false, modifier: false, hasWorkRange: true })
    ).toBeNull()
    expect(
      resolveEmptySpaceGesture({ button: 0, tool: 'pencil', empty: true, modifier: true, hasWorkRange: true })
    ).toBe('lasso')
    expect(
      resolveEmptySpaceGesture({ button: 0, tool: 'pencil', empty: true, modifier: false, hasWorkRange: true })
    ).toBeNull()
    expect(
      resolveEmptySpaceGesture({ button: 0, tool: 'select', empty: false, modifier: true, hasWorkRange: true })
    ).toBeNull()
    expect(
      resolveEmptySpaceGesture({ button: 2, tool: 'select', empty: true, modifier: false, hasWorkRange: true })
    ).toBeNull()
  })

  it('leaves click-only ranges unchanged and restores the range when a drag is cancelled', () => {
    const original: WorkRange = { ...INITIAL_WORK_RANGE }
    const workRange = ref(original)
    const updateWorkRange = vi.fn((next: WorkRange) => {
      workRange.value = next
    })
    const { options } = createInteractionOptions(ref(null), ref([]), workRange)
    const ctx = createPianoRollInteractionContext(options)
    const session = createGestureSession(ctx.dragState)
    const gestures = useWorkRangeGestures(ctx, session)
    const canvas = createCanvasStub()

    gestures.start(canvas, 7, 120, TRANSFORM)
    gestures.update(121, TRANSFORM)
    expect(updateWorkRange).not.toHaveBeenCalled()
    expect(workRange.value).toEqual(original)

    gestures.update(230, TRANSFORM)
    expect(workRange.value).toEqual({ startStep: 0, endStep: 16 })
    gestures.cancel()
    expect(workRange.value).toEqual(original)
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(7)
  })

  it('ignores pointer moves from pointers other than the one that began the gesture', () => {
    const canvas = createCanvasStub()
    const { options, workRange } = createInteractionOptions(ref(canvas))
    const unmount = mountInteractions(options)

    // Click outside a narrowed range targets the whole project again
    dispatchPointer(canvas, 'pointerdown', 240)
    dispatchPointer(canvas, 'pointerup', 240)
    expect(workRange.value).toEqual({ startStep: 0, endStep: 64 })

    workRange.value = { ...INITIAL_WORK_RANGE }
    dispatchPointer(canvas, 'pointerdown', 180)
    dispatchPointer(canvas, 'pointerup', 180)
    expect(workRange.value).toEqual(INITIAL_WORK_RANGE)

    // Move inside the range, one step per 10px
    dispatchPointer(canvas, 'pointerdown', 180)
    dispatchPointer(canvas, 'pointermove', 190, { pointerId: 2 })
    expect(workRange.value).toEqual(INITIAL_WORK_RANGE)
    dispatchPointer(canvas, 'pointermove', 184)
    expect(workRange.value).toEqual(INITIAL_WORK_RANGE)
    dispatchPointer(canvas, 'pointermove', 186)
    expect(workRange.value).toEqual({ startStep: 5, endStep: 13 })
    dispatchPointer(canvas, 'pointerup', 186)

    dispatchPointer(canvas, 'pointerdown', 180)
    dispatchPointer(canvas, 'pointermove', 220)
    expect(workRange.value).toEqual({ startStep: 9, endStep: 17 })
    dispatchPointer(canvas, 'pointercancel', 220)
    expect(workRange.value).toEqual({ startStep: 5, endStep: 13 })

    // Create a fresh range outside the current one
    dispatchPointer(canvas, 'pointerdown', 120)
    dispatchPointer(canvas, 'pointermove', 230)
    expect(workRange.value).toEqual({ startStep: 0, endStep: 16 })
    dispatchPointer(canvas, 'pointerup', 230)

    workRange.value = { ...INITIAL_WORK_RANGE }

    // Edge grips resize by single steps and a click on one keeps the range
    dispatchPointer(canvas, 'pointermove', 140)
    expect(canvas.style.cursor).toBe('ew-resize')
    dispatchPointer(canvas, 'pointerdown', 136)
    dispatchPointer(canvas, 'pointerup', 136)
    expect(workRange.value).toEqual(INITIAL_WORK_RANGE)

    dispatchPointer(canvas, 'pointerdown', 140)
    dispatchPointer(canvas, 'pointermove', 160)
    expect(workRange.value).toEqual({ startStep: 6, endStep: 12 })
    dispatchPointer(canvas, 'pointerup', 160)

    dispatchPointer(canvas, 'pointerdown', 220)
    dispatchPointer(canvas, 'pointermove', 250)
    expect(workRange.value).toEqual({ startStep: 6, endStep: 15 })
    dispatchPointer(canvas, 'pointerup', 250)

    dispatchPointer(canvas, 'pointerdown', 250)
    dispatchPointer(canvas, 'pointermove', 230)
    expect(workRange.value).toEqual({ startStep: 6, endStep: 13 })
    dispatchPointer(canvas, 'pointercancel', 230)
    expect(workRange.value).toEqual({ startStep: 6, endStep: 15 })

    dispatchPointer(canvas, 'pointerdown', 160)
    dispatchPointer(canvas, 'pointermove', 300)
    expect(workRange.value).toEqual({ startStep: 14, endStep: 15 })
    dispatchPointer(canvas, 'pointerup', 300)

    unmount()
  })
})

describe('piano-roll marquee selection', () => {
  it('keeps the select tool on the work range and lasso-draws only with the modifier', () => {
    const canvas = createCanvasStub()
    const inside = makeNote('note-1', 12, 117)
    const outsideTime = makeNote('note-2', 30, 117)
    const { options, workRange, selectedNoteIds } = createInteractionOptions(ref(canvas), ref([inside, outsideTime]))
    const unmount = mountInteractions(options)

    // Cmd/Ctrl + drag over empty space selects notes instead of re-targeting the range
    dispatchPointer(canvas, 'pointerdown', 200, { modifier: true })
    dispatchPointer(canvas, 'pointermove', 300, { modifier: true })
    expect(selectedNoteIds.value).toEqual(['note-1'])
    expect(workRange.value).toEqual(INITIAL_WORK_RANGE)
    dispatchPointer(canvas, 'pointerup', 300, { modifier: true })

    unmount()
  })

  it('drags a marquee on any press while the lasso tool is active', () => {
    const canvas = createCanvasStub()
    const row = makeNote('note-1', 12, 117)
    const otherPitch = makeNote('note-2', 14, 100)
    const later = makeNote('note-3', 30, 117)
    const { options, workRange, selectedNoteIds, onUpdateNotes, onUpdateWorkRange } = createInteractionOptions(
      ref(canvas),
      ref([row, otherPitch, later]),
      ref({ ...INITIAL_WORK_RANGE }),
      'lasso'
    )
    const unmount = mountInteractions(options)
    const marquee = (fromX: number, toX: number, shiftKey = false) => {
      dispatchPointer(canvas, 'pointerdown', fromX, { shiftKey })
      dispatchPointer(canvas, 'pointermove', toX, { shiftKey })
      dispatchPointer(canvas, 'pointerup', toX, { shiftKey })
    }

    // Plain click in empty space clears the selection, the range stays as it is
    dispatchPointer(canvas, 'pointerdown', 200)
    dispatchPointer(canvas, 'pointerup', 200)
    expect(selectedNoteIds.value).toEqual([])

    marquee(200, 300)
    expect(selectedNoteIds.value).toEqual(['note-1'])
    expect(onUpdateWorkRange).not.toHaveBeenCalled()
    expect(workRange.value).toEqual(INITIAL_WORK_RANGE)

    // Shift adds to the running selection instead of replacing it
    marquee(390, 450, true)
    expect(selectedNoteIds.value).toEqual(['note-1', 'note-3'])

    // A press starting on a note still drags a marquee and seeds it with that note
    dispatchPointer(canvas, 'pointerdown', 410)
    expect(selectedNoteIds.value).toEqual(['note-3'])
    dispatchPointer(canvas, 'pointermove', 230)
    expect(selectedNoteIds.value).toEqual(['note-3', 'note-1'])
    dispatchPointer(canvas, 'pointerup', 230)

    // The Lasso tool never mutates note material, not even on double click
    dispatchPointer(canvas, 'dblclick', 230)
    expect(selectedNoteIds.value).toEqual(['note-1'])
    expect(onUpdateNotes).not.toHaveBeenCalled()

    // Notes show the marquee cursor instead of move and resize affordances
    dispatchPointer(canvas, 'pointermove', 230)
    expect(canvas.style.cursor).toBe('crosshair')

    unmount()
  })

  it('seeds the marquee with the pressed note and never mutates note material', () => {
    const inside = makeNote('note-1', 12, 117)
    const workRange = ref({ ...INITIAL_WORK_RANGE })
    const { options, selectedNoteIds, onUpdateNotes } = createInteractionOptions(
      ref(null),
      ref([inside]),
      workRange,
      'lasso'
    )
    const ctx = createPianoRollInteractionContext(options)
    const session = createGestureSession(ctx.dragState)
    const gestures = useNoteGestures(ctx, session)
    const canvas = createCanvasStub()

    gestures.handleNotePointerDown(canvas, pointerEvent('pointerdown', 230), 230, 100, TRANSFORM)
    expect(ctx.dragState.value.mode).toBe('lasso')
    expect(selectedNoteIds.value).toEqual(['note-1'])

    gestures.handleNoteDragMove(pointerEvent('pointermove', 260), 260, 100, TRANSFORM)
    expect(onUpdateNotes).not.toHaveBeenCalled()
    expect(workRange.value).toEqual(INITIAL_WORK_RANGE)
    expect(ctx.dragState.value.lassoRect).toEqual({ x: 230, y: 100, width: 30, height: 0 })
  })
})
