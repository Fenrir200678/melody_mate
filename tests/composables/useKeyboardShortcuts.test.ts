import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
import { useAudioStore } from '@/stores/audio.store'
import { useHarmonyStore } from '@/stores/harmony.store'
import { useMelodyStore } from '@/stores/melody.store'
import { useProjectStore } from '@/stores/project.store'
import { useRhythmStore } from '@/stores/rhythm.store'
import { useUiStore } from '@/stores/ui.store'

interface MockKeyboardEventOptions {
  key: string
  code?: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  repeat?: boolean
  isComposing?: boolean
  target?: unknown
  defaultPrevented?: boolean
}

describe('useKeyboardShortcuts - Zoom & Viewport', () => {
  let uiStore: ReturnType<typeof useUiStore>
  let mockWindow: Window
  let keyListeners: Array<(e: KeyboardEvent) => void>

  beforeEach(() => {
    setActivePinia(createPinia())
    uiStore = useUiStore()
    uiStore.setSoundDockOpen(false)
    keyListeners = []

    mockWindow = {
      addEventListener: vi.fn((event: string, handler: (e: KeyboardEvent) => void) => {
        if (event === 'keydown') keyListeners.push(handler)
      }),
      removeEventListener: vi.fn(),
      document: {
        activeElement: null
      }
    } as unknown as Window
  })

  function dispatchKey(options: MockKeyboardEventOptions) {
    let defaultPrevented = options.defaultPrevented ?? false
    const event = {
      key: options.key,
      code: options.code ?? '',
      ctrlKey: options.ctrlKey ?? false,
      metaKey: options.metaKey ?? false,
      shiftKey: options.shiftKey ?? false,
      altKey: options.altKey ?? false,
      repeat: options.repeat ?? false,
      isComposing: options.isComposing ?? false,
      target: options.target ?? null,
      preventDefault: () => {
        defaultPrevented = true
      },
      get defaultPrevented() {
        return defaultPrevented
      }
    } as unknown as KeyboardEvent

    for (const listener of keyListeners) {
      listener(event)
    }

    return {
      event,
      get defaultPrevented() {
        return defaultPrevented
      }
    }
  }

  it('registers keydown listener on target window', () => {
    useKeyboardShortcuts({ window: mockWindow })
    expect(mockWindow.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('triggers horizontal zoom in on "+" and "=" keys', () => {
    useKeyboardShortcuts({ window: mockWindow })

    const resPlus = dispatchKey({ key: '+' })
    expect(resPlus.defaultPrevented).toBe(true)
    expect(uiStore.zoomSignal?.action).toBe('zoomInHorizontal')

    const resEqual = dispatchKey({ key: '=' })
    expect(resEqual.defaultPrevented).toBe(true)
    expect(uiStore.zoomSignal?.action).toBe('zoomInHorizontal')
  })

  it('triggers horizontal zoom out on "-" key', () => {
    useKeyboardShortcuts({ window: mockWindow })

    const resMinus = dispatchKey({ key: '-' })
    expect(resMinus.defaultPrevented).toBe(true)
    expect(uiStore.zoomSignal?.action).toBe('zoomOutHorizontal')
  })

  it('triggers vertical zoom in on "*" (German layout Shift++) and Alt + "+"', () => {
    useKeyboardShortcuts({ window: mockWindow })

    const resStar = dispatchKey({ key: '*', shiftKey: true })
    expect(resStar.defaultPrevented).toBe(true)
    expect(uiStore.zoomSignal?.action).toBe('zoomInVertical')

    const resAltPlus = dispatchKey({ key: '+', altKey: true })
    expect(resAltPlus.defaultPrevented).toBe(true)
    expect(uiStore.zoomSignal?.action).toBe('zoomInVertical')
  })

  it('triggers vertical zoom out on "_" (Shift+Minus) and Alt + "-"', () => {
    useKeyboardShortcuts({ window: mockWindow })

    const resUnder = dispatchKey({ key: '_', shiftKey: true })
    expect(resUnder.defaultPrevented).toBe(true)
    expect(uiStore.zoomSignal?.action).toBe('zoomOutVertical')

    const resAltMinus = dispatchKey({ key: '-', altKey: true })
    expect(resAltMinus.defaultPrevented).toBe(true)
    expect(uiStore.zoomSignal?.action).toBe('zoomOutVertical')
  })

  it('triggers fitLoop on plain "z" key', () => {
    useKeyboardShortcuts({ window: mockWindow })

    const resZ = dispatchKey({ key: 'z' })
    expect(resZ.defaultPrevented).toBe(true)
    expect(uiStore.zoomSignal?.action).toBe('fitLoop')
  })

  it('triggers fitHeight on Shift + "z"', () => {
    useKeyboardShortcuts({ window: mockWindow })

    const resShiftZ = dispatchKey({ key: 'z', shiftKey: true })
    expect(resShiftZ.defaultPrevented).toBe(true)
    expect(uiStore.zoomSignal?.action).toBe('fitHeight')
  })

  it('triggers resetZoom on "0" and Ctrl+"0"', () => {
    useKeyboardShortcuts({ window: mockWindow })

    const resZero = dispatchKey({ key: '0' })
    expect(resZero.defaultPrevented).toBe(true)
    expect(uiStore.zoomSignal?.action).toBe('resetZoom')

    const resCtrlZero = dispatchKey({ key: '0', ctrlKey: true })
    expect(resCtrlZero.defaultPrevented).toBe(true)
    expect(uiStore.zoomSignal?.action).toBe('resetZoom')
  })

  it('does not trigger zoom if active element is an input element', () => {
    const inputEl = { tagName: 'INPUT' } as unknown as Element
    const winWithInput = {
      ...mockWindow,
      document: { activeElement: inputEl }
    } as unknown as Window

    useKeyboardShortcuts({ window: winWithInput })

    const res = dispatchKey({ key: '+' })
    expect(res.defaultPrevented).toBe(false)
    expect(uiStore.zoomSignal).toBeNull()
  })

  describe('DAW workflow shortcuts', () => {
    it('toggles follow playhead and seeks one bar in either direction', () => {
      const audioStore = useAudioStore()
      useKeyboardShortcuts({ window: mockWindow })
      audioStore.seek(STEPS_PER_BAR)

      expect(dispatchKey({ key: 'f' }).defaultPrevented).toBe(true)
      expect(audioStore.followPlayhead).toBe(false)
      dispatchKey({ key: 'f' })
      expect(audioStore.followPlayhead).toBe(true)

      expect(dispatchKey({ key: '.', code: 'Period' }).defaultPrevented).toBe(true)
      expect(audioStore.currentStep).toBe(STEPS_PER_BAR * 2)
      dispatchKey({ key: '<', code: 'Comma', shiftKey: true })
      expect(audioStore.currentStep).toBe(STEPS_PER_BAR)
      dispatchKey({ key: ',', code: 'Comma' })
      dispatchKey({ key: ',', code: 'Comma' })
      expect(audioStore.currentStep).toBe(0)
      dispatchKey({ key: '>', code: 'Period', shiftKey: true })
      expect(audioStore.currentStep).toBe(STEPS_PER_BAR)
    })

    it('stops and rewinds to the loop start with Shift+Space', () => {
      const audioStore = useAudioStore()
      const projectStore = useProjectStore()
      projectStore.setLoop(STEPS_PER_BAR, STEPS_PER_BAR * 3)
      projectStore.setLooping(true)
      uiStore.setPlayFromLoopStart(true)
      audioStore.seek(STEPS_PER_BAR * 2)
      audioStore.isPlaying = true
      useKeyboardShortcuts({ window: mockWindow })

      expect(dispatchKey({ key: ' ', code: 'Space', shiftKey: true }).defaultPrevented).toBe(true)
      expect(audioStore.isPlaying).toBe(false)
      expect(audioStore.currentStep).toBe(projectStore.loopStartStep)

      uiStore.setPlayFromLoopStart(false)
      audioStore.seek(STEPS_PER_BAR * 2)
      dispatchKey({ key: ' ', code: 'Space', shiftKey: true })
      expect(audioStore.currentStep).toBe(0)
    })

    it('steps the snap grid through toolbar resolutions and clamps at either end', () => {
      uiStore.setSnapStep(4)
      useKeyboardShortcuts({ window: mockWindow })

      expect(dispatchKey({ key: '[', code: 'BracketLeft' }).defaultPrevented).toBe(true)
      expect(uiStore.snapStep).toBe(2)
      dispatchKey({ key: '1', ctrlKey: true })
      dispatchKey({ key: '[', code: 'BracketLeft' })
      expect(uiStore.snapStep).toBe(1)
      dispatchKey({ key: '2', ctrlKey: true })
      expect(uiStore.snapStep).toBe(2)
      dispatchKey({ key: '1', metaKey: true })
      expect(uiStore.snapStep).toBe(1)
      dispatchKey({ key: ']', code: 'BracketRight' })
      dispatchKey({ key: '2', metaKey: true })
      dispatchKey({ key: ']', code: 'BracketRight' })
      expect(uiStore.snapStep).toBe(4)
    })

    it('switches the piano-roll tool on its number and letter key', () => {
      useKeyboardShortcuts({ window: mockWindow })

      for (const [key, tool] of [
        ['4', 'pan'],
        ['h', 'pan'],
        ['5', 'lasso'],
        ['1', 'select'],
        ['p', 'pencil']
      ] as const) {
        dispatchKey({ key })
        expect(uiStore.activeTool).toBe(tool)
      }
    })

    it('toggles the sound & mix dock via "s"', () => {
      useKeyboardShortcuts({ window: mockWindow })
      uiStore.setActiveTrack('chords')
      uiStore.setActiveHistoryContext('rhythm')
      expect(uiStore.isSoundDockOpen).toBe(false)
      dispatchKey({ key: 's' })
      expect(uiStore.isSoundDockOpen).toBe(true)
      expect(uiStore.activeStudioDock).toBe('sound')
      expect(uiStore.activeTrack).toBe('chords')
      expect(uiStore.activeHistoryContext).toBe('rhythm')
      dispatchKey({ key: 's' })
      expect(uiStore.isSoundDockOpen).toBe(false)
      expect(uiStore.activeTrack).toBe('chords')
      expect(uiStore.activeHistoryContext).toBe('rhythm')
    })

    it('lets Escape close sound before clearing the active piano-roll selection', () => {
      const melodyStore = useMelodyStore()
      melodyStore.setNotes(
        [{ id: 'note', pitch: 'C4', midi: 60, step: 0, durationSteps: 2, velocity: 92, isMuted: false }],
        false
      )
      melodyStore.setSelectedNoteIds(['note'])
      uiStore.setSoundDockOpen(true)
      useKeyboardShortcuts({ window: mockWindow })

      expect(dispatchKey({ key: 'Escape' }).defaultPrevented).toBe(true)
      expect(uiStore.isSoundDockOpen).toBe(false)
      expect(melodyStore.selectedNoteIds).toEqual(['note'])

      dispatchKey({ key: 'Escape' })
      expect(melodyStore.selectedNoteIds).toEqual([])
    })

    it('ignores shortcuts already consumed by a modal, dialog, or popover', () => {
      useKeyboardShortcuts({ window: mockWindow })

      uiStore.openAbout()
      dispatchKey({ key: 's' })
      expect(uiStore.isSoundDockOpen).toBe(false)
      uiStore.closeAbout()

      const containedTarget = { closest: vi.fn(() => ({})) }
      dispatchKey({ key: 's', target: containedTarget })
      expect(uiStore.isSoundDockOpen).toBe(false)

      dispatchKey({ key: 's', defaultPrevented: true })
      expect(uiStore.isSoundDockOpen).toBe(false)
    })

    it('keeps the Sound dock open while a native select owns keyboard focus', () => {
      uiStore.setSoundDockOpen(true)
      const winWithSelect = {
        ...mockWindow,
        document: { activeElement: { tagName: 'SELECT' } }
      } as unknown as Window
      useKeyboardShortcuts({ window: winWithSelect })
      dispatchKey({ key: 'Escape' })
      dispatchKey({ key: 's' })
      expect(uiStore.isSoundDockOpen).toBe(true)
    })

    it('routes undo and redo to Rhythm history without changing the selected track', () => {
      const harmonyStore = useHarmonyStore()
      const rhythmStore = useRhythmStore()
      const rhythmUndo = vi.spyOn(rhythmStore, 'undo')
      const rhythmRedo = vi.spyOn(rhythmStore, 'redo')
      const harmonyUndo = vi.spyOn(harmonyStore, 'undo')
      const harmonyRedo = vi.spyOn(harmonyStore, 'redo')
      uiStore.setActiveTrack('chords')
      uiStore.setActiveHistoryContext('rhythm')
      uiStore.setSoundDockOpen(true)
      useKeyboardShortcuts({ window: mockWindow })

      dispatchKey({ key: 'z', ctrlKey: true })
      dispatchKey({ key: 'z', ctrlKey: true, shiftKey: true })
      dispatchKey({ key: 'y', ctrlKey: true })

      expect(rhythmUndo).toHaveBeenCalledOnce()
      expect(rhythmRedo).toHaveBeenCalledTimes(2)
      expect(harmonyUndo).not.toHaveBeenCalled()
      expect(harmonyRedo).not.toHaveBeenCalled()
      expect(uiStore.activeTrack).toBe('chords')
      expect(uiStore.activeHistoryContext).toBe('rhythm')
    })

    it('opens Sound from a focused Rhythm Studio control without changing its undo context', () => {
      uiStore.setRhythmStudioOpen(true)
      useKeyboardShortcuts({ window: mockWindow })
      dispatchKey({
        key: 's',
        target: { closest: (selector: string) => (selector === '#rhythm-studio-dock' ? {} : null) }
      })
      expect(uiStore.activeStudioDock).toBe('sound')
      expect(uiStore.activeHistoryContext).toBe('rhythm')
    })

    it('toggles audition and velocity lane without changing the selected tool', () => {
      useKeyboardShortcuts({ window: mockWindow })
      const initialAudition = uiStore.isAuditionEnabled
      const initialVelocityLane = uiStore.isVelocityLaneOpen
      uiStore.setActiveTool('pencil')

      dispatchKey({ key: 'u' })
      expect(uiStore.isAuditionEnabled).toBe(!initialAudition)
      expect(dispatchKey({ key: 'V', shiftKey: true }).defaultPrevented).toBe(true)
      expect(uiStore.isVelocityLaneOpen).toBe(!initialVelocityLane)
      dispatchKey({ key: 'u' })
      dispatchKey({ key: 'V', shiftKey: true })
      expect(uiStore.isAuditionEnabled).toBe(initialAudition)
      expect(uiStore.isVelocityLaneOpen).toBe(initialVelocityLane)
      expect(uiStore.activeTool).toBe('pencil')
    })

    it('handles G key for melody generation vs arpeggio generation based on Arp Studio state', () => {
      const melodyStore = useMelodyStore()
      const generateSpy = vi.spyOn(melodyStore, 'generate').mockImplementation(() => Promise.resolve())
      const applyArpSpy = vi.spyOn(melodyStore, 'applyArp').mockImplementation(() => Promise.resolve(true))

      useKeyboardShortcuts({ window: mockWindow })

      // When Arp Studio is closed, 'g' calls melodyStore.generate()
      expect(uiStore.isArpStudioOpen).toBe(false)
      const res1 = dispatchKey({ key: 'g' })
      expect(res1.defaultPrevented).toBe(true)
      expect(generateSpy).toHaveBeenCalledTimes(1)
      expect(applyArpSpy).not.toHaveBeenCalled()

      // When Arp Studio is open, 'g' calls melodyStore.applyArp()
      uiStore.setArpStudioOpen(true)
      expect(uiStore.isArpStudioOpen).toBe(true)
      const res2 = dispatchKey({ key: 'g' })
      expect(res2.defaultPrevented).toBe(true)
      expect(applyArpSpy).toHaveBeenCalledTimes(1)
      expect(generateSpy).toHaveBeenCalledTimes(1)
    })

    it('handles Shift+G for shuffling arpeggio only when Arp Studio is open', () => {
      const melodyStore = useMelodyStore()
      const shuffleSpy = vi.spyOn(melodyStore, 'shuffleArp').mockImplementation(() => null)

      useKeyboardShortcuts({ window: mockWindow })

      // When Arp Studio is closed, Shift+G does nothing
      expect(uiStore.isArpStudioOpen).toBe(false)
      const res1 = dispatchKey({ key: 'G', shiftKey: true })
      expect(res1.defaultPrevented).toBe(false)
      expect(shuffleSpy).not.toHaveBeenCalled()

      // When Arp Studio is open, Shift+G triggers shuffleArp()
      uiStore.setArpStudioOpen(true)
      expect(uiStore.isArpStudioOpen).toBe(true)
      const res2 = dispatchKey({ key: 'G', shiftKey: true })
      expect(res2.defaultPrevented).toBe(true)
      expect(shuffleSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Note Editing Ergonomics (Arrows, Alt, Shift, 0)', () => {
    it('navigates chronologically with ArrowLeft and ArrowRight', () => {
      const melodyStore = useMelodyStore()
      melodyStore.setNotes(
        [
          {
            id: 'n1',
            pitch: 'C4',
            midi: 60,
            step: 0,
            durationSteps: 2,
            velocity: 100,
            isMuted: false
          },
          {
            id: 'n2',
            pitch: 'E4',
            midi: 64,
            step: 4,
            durationSteps: 2,
            velocity: 100,
            isMuted: false
          }
        ],
        false
      )

      useKeyboardShortcuts({ window: mockWindow })

      // ArrowRight selects first note
      const res1 = dispatchKey({ key: 'ArrowRight' })
      expect(res1.defaultPrevented).toBe(true)
      expect(melodyStore.selectedNoteIds).toEqual(['n1'])

      // ArrowRight advances to n2
      const res2 = dispatchKey({ key: 'ArrowRight' })
      expect(res2.defaultPrevented).toBe(true)
      expect(melodyStore.selectedNoteIds).toEqual(['n2'])

      // ArrowLeft steps back to n1
      const res3 = dispatchKey({ key: 'ArrowLeft' })
      expect(res3.defaultPrevented).toBe(true)
      expect(melodyStore.selectedNoteIds).toEqual(['n1'])
    })

    it('nudges selected notes with Shift+ArrowLeft and Shift+ArrowRight by snapStep', () => {
      const melodyStore = useMelodyStore()
      uiStore.setSnapStep(2)
      melodyStore.setNotes(
        [
          {
            id: 'n1',
            pitch: 'C4',
            midi: 60,
            step: 4,
            durationSteps: 2,
            velocity: 100,
            isMuted: false
          }
        ],
        false
      )
      melodyStore.setSelectedNoteIds(['n1'])

      useKeyboardShortcuts({ window: mockWindow })

      const resRight = dispatchKey({ key: 'ArrowRight', shiftKey: true })
      expect(resRight.defaultPrevented).toBe(true)
      expect(melodyStore.notes[0].step).toBe(6)

      const resLeft = dispatchKey({ key: 'ArrowLeft', shiftKey: true })
      expect(resLeft.defaultPrevented).toBe(true)
      expect(melodyStore.notes[0].step).toBe(4)
    })

    it('adjusts duration of selected notes with Alt+ArrowLeft and Alt+ArrowRight', () => {
      const melodyStore = useMelodyStore()
      uiStore.setSnapStep(1)
      melodyStore.setNotes(
        [
          {
            id: 'n1',
            pitch: 'C4',
            midi: 60,
            step: 0,
            durationSteps: 2,
            velocity: 100,
            isMuted: false
          }
        ],
        false
      )
      melodyStore.setSelectedNoteIds(['n1'])

      useKeyboardShortcuts({ window: mockWindow })

      const resLonger = dispatchKey({ key: 'ArrowRight', altKey: true })
      expect(resLonger.defaultPrevented).toBe(true)
      expect(melodyStore.notes[0].durationSteps).toBe(3)

      const resShorter = dispatchKey({ key: 'ArrowLeft', altKey: true })
      expect(resShorter.defaultPrevented).toBe(true)
      expect(melodyStore.notes[0].durationSteps).toBe(2)
    })

    it('adjusts velocity of selected notes with Alt+ArrowUp and Alt+ArrowDown by ±5', () => {
      const melodyStore = useMelodyStore()
      melodyStore.setNotes(
        [
          {
            id: 'n1',
            pitch: 'C4',
            midi: 60,
            step: 0,
            durationSteps: 2,
            velocity: 100,
            isMuted: false
          }
        ],
        false
      )
      melodyStore.setSelectedNoteIds(['n1'])

      useKeyboardShortcuts({ window: mockWindow })

      const resUp = dispatchKey({ key: 'ArrowUp', altKey: true })
      expect(resUp.defaultPrevented).toBe(true)
      expect(melodyStore.notes[0].velocity).toBe(105)

      const resDown = dispatchKey({ key: 'ArrowDown', altKey: true })
      expect(resDown.defaultPrevented).toBe(true)
      expect(melodyStore.notes[0].velocity).toBe(100)
    })

    it('toggles mute on selected notes with "0"', () => {
      const melodyStore = useMelodyStore()
      melodyStore.setNotes(
        [
          {
            id: 'n1',
            pitch: 'C4',
            midi: 60,
            step: 0,
            durationSteps: 2,
            velocity: 100,
            isMuted: false
          }
        ],
        false
      )
      melodyStore.setSelectedNoteIds(['n1'])

      useKeyboardShortcuts({ window: mockWindow })

      const resMute = dispatchKey({ key: '0' })
      expect(resMute.defaultPrevented).toBe(true)
      expect(melodyStore.notes[0].isMuted).toBe(true)
      expect(uiStore.zoomSignal).toBeNull()

      const resUnmute = dispatchKey({ key: '0' })
      expect(resUnmute.defaultPrevented).toBe(true)
      expect(melodyStore.notes[0].isMuted).toBe(false)
    })
  })
})
