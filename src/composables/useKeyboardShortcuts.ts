import { tryOnScopeDispose } from '@vueuse/core'
import { chordNoteKey } from '../core/schemas/chord.schema'
import { STEPS_PER_BAR } from '../core/schemas/project.schema'
import { computeLoopRangeFromSelection } from '../core/transport/loop.range'
import { useAudioStore } from '../stores/audio.store'
import { useHarmonyStore } from '../stores/harmony.store'
import { useMelodyStore } from '../stores/melody.store'
import { useProjectStore } from '../stores/project.store'
import { useUiStore } from '../stores/ui.store'
import { SHORTCUT_DEFINITIONS } from './shortcutDefinitions'

export interface KeyboardShortcutsOptions {
  window?: Window
}

/**
 * Shared editing API of both track stores (melody notes and chord voicing notes).
 */
interface TrackEditingActions {
  undo(): void
  redo(): void
  duplicateSelected(): void
  deleteSelected(): void
  clearSelection(): void
  transposeSelected(semitones: number): void
  selectNextNote(): void
  selectPreviousNote(): void
  nudgeSelected(deltaSteps: number): void
  adjustSelectedDuration(deltaSteps: number): void
  adjustSelectedVelocity(deltaVelocity: number): void
  toggleSelectedMute(): void
}

/**
 * Determines whether an element is an interactive text input where shortcuts must be ignored.
 */
function isInputElement(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName.toUpperCase()
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable
}

/**
 * Checks whether a key event has the primary platform modifier (Cmd on macOS, Ctrl on Windows/Linux).
 */
function hasPrimaryModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey
}

/**
 * Registers and orchestrates global DAW keyboard shortcuts.
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const audioStore = useAudioStore()
  const melodyStore = useMelodyStore()
  const harmonyStore = useHarmonyStore()
  const projectStore = useProjectStore()
  const uiStore = useUiStore()

  const targetWindow = options.window ?? (typeof window !== 'undefined' ? window : (globalThis as unknown as Window))

  // Resolved on every keypress so track switches (Tab) are picked up live
  function getActiveTrackStore(): TrackEditingActions {
    return uiStore.activeTrack === 'chords' ? harmonyStore : melodyStore
  }

  function setLoopFromSelection(): void {
    const range = computeLoopRangeFromSelection(
      melodyStore.selectedNotes,
      uiStore.snapStep,
      projectStore.bars * STEPS_PER_BAR
    )
    if (!range) return

    projectStore.setLoop(range.startStep, range.endStep)
    if (!projectStore.isLooping) {
      projectStore.setLooping(true)
    }
    audioStore.applyLoop()
  }

  function handleTransport(e: KeyboardEvent, key: string, isModifier: boolean): boolean {
    if (e.code === 'Space' || key === ' ') {
      e.preventDefault()
      if (e.shiftKey && !isModifier && !e.altKey) {
        audioStore.stop()
        audioStore.seek(uiStore.playFromLoopStart && projectStore.isLooping ? projectStore.loopStartStep : 0)
      } else if (audioStore.isPlaying) {
        audioStore.pause()
      } else {
        void audioStore.play()
      }
      return true
    }

    if (e.code === 'Home') {
      e.preventDefault()
      const targetStep =
        uiStore.playFromLoopStart && projectStore.isLooping
          ? audioStore.currentStep === projectStore.loopStartStep
            ? 0
            : projectStore.loopStartStep
          : 0
      audioStore.seek(targetStep)
      return true
    }

    if (!isModifier && !e.altKey) {
      if (key === 'f' && !e.shiftKey) {
        e.preventDefault()
        audioStore.toggleFollowPlayhead()
        return true
      }

      if (key === ',' || key === '<') {
        e.preventDefault()
        audioStore.seekRelativeBars(-1)
        return true
      }

      if (key === '.' || key === '>') {
        e.preventDefault()
        audioStore.seekRelativeBars(1)
        return true
      }
    }

    if (isModifier && key === 'l' && !e.shiftKey) {
      e.preventDefault()
      setLoopFromSelection()
      return true
    }

    if (!isModifier && !e.altKey && key === 'l') {
      e.preventDefault()
      const next = !projectStore.isLooping
      projectStore.setLooping(next)
      audioStore.setLooping(next)
      return true
    }

    return false
  }

  function handleTools(e: KeyboardEvent, key: string, isModifier: boolean): boolean {
    if (isModifier && !e.shiftKey && !e.altKey && (key === '1' || key === '2')) {
      e.preventDefault()
      uiStore.cycleSnapGrid(key === '1' ? 'finer' : 'coarser')
      return true
    }

    if (isModifier || e.altKey) return false

    if (key === 'v' && e.shiftKey) return false

    if (key === '[' || key === ']') {
      e.preventDefault()
      uiStore.cycleSnapGrid(key === '[' ? 'finer' : 'coarser')
      return true
    }

    switch (key) {
      case '1':
      case 'v':
        uiStore.setActiveTool('select')
        return true
      case '2':
      case 'p':
        uiStore.setActiveTool('pencil')
        return true
      case '3':
      case 'e':
        uiStore.setActiveTool('eraser')
        return true
      case '4':
      case 'h':
        uiStore.setActiveTool('pan')
        return true
      case '5':
        uiStore.setActiveTool('lasso')
        return true
    }
    return false
  }

  function handleEditing(e: KeyboardEvent, key: string, isModifier: boolean): boolean {
    const track = getActiveTrackStore()

    if (isModifier) {
      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          track.redo()
        } else {
          track.undo()
        }
        return true
      }

      if (key === 'y' && !e.shiftKey) {
        e.preventDefault()
        track.redo()
        return true
      }

      if (key === 'a' && !e.shiftKey) {
        e.preventDefault()
        if (uiStore.activeTrack === 'chords') {
          const allKeys = harmonyStore.chords.flatMap((chord) =>
            chord.voicing.map((_, index) => chordNoteKey(chord.id, index))
          )
          harmonyStore.setSelectedChordNoteIds(allKeys)
        } else {
          melodyStore.selectAll()
        }
        return true
      }

      if (key === 'd' && !e.shiftKey) {
        e.preventDefault()
        track.duplicateSelected()
        return true
      }

      return false
    }

    if (e.altKey) {
      if (key === 'arrowleft' || key === 'arrowright') {
        e.preventDefault()
        const delta = (key === 'arrowright' ? 1 : -1) * uiStore.snapStep
        track.adjustSelectedDuration(delta)
        return true
      }

      if (key === 'arrowup' || key === 'arrowdown') {
        e.preventDefault()
        const delta = key === 'arrowup' ? 5 : -5
        track.adjustSelectedVelocity(delta)
        return true
      }

      return false
    }

    if (key === 'escape') {
      e.preventDefault()
      if (uiStore.isSoundDockOpen) {
        uiStore.setSoundDockOpen(false)
        return true
      }
      track.clearSelection()
      return true
    }

    if (key === 'backspace' || key === 'delete') {
      e.preventDefault()
      if (uiStore.isChordStudioOpen && harmonyStore.selectedChordId) {
        harmonyStore.removeChord(harmonyStore.selectedChordId)
        return true
      }
      track.deleteSelected()
      return true
    }

    if (key === 'd') {
      track.duplicateSelected()
      return true
    }

    if (key === '0' && !e.shiftKey) {
      const hasSelection =
        uiStore.activeTrack === 'chords'
          ? harmonyStore.selectedChordNoteIds.length > 0 || !!harmonyStore.selectedChordId
          : melodyStore.selectedNoteIds.length > 0
      if (hasSelection) {
        e.preventDefault()
        track.toggleSelectedMute()
        return true
      }
      return false
    }

    if (key === 'arrowleft' || key === 'arrowright') {
      e.preventDefault()
      if (e.shiftKey) {
        const delta = (key === 'arrowright' ? 1 : -1) * uiStore.snapStep
        track.nudgeSelected(delta)
      } else {
        if (key === 'arrowright') {
          track.selectNextNote()
        } else {
          track.selectPreviousNote()
        }
      }
      return true
    }

    if (key === 'arrowup' || key === 'arrowdown') {
      e.preventDefault()
      const delta = (key === 'arrowup' ? 1 : -1) * (e.shiftKey ? 12 : 1)
      track.transposeSelected(delta)
      return true
    }

    return false
  }

  function handleTrackAndSound(e: KeyboardEvent, key: string, isModifier: boolean): boolean {
    if (e.key === 'Tab' && !e.shiftKey) {
      const targetEl = e.target as Element | null
      if (typeof targetEl?.closest === 'function' && targetEl.closest('[role="dialog"]')) {
        return false
      }
      e.preventDefault()
      uiStore.setActiveTrack(uiStore.activeTrack === 'melody' ? 'chords' : 'melody')
      return true
    }

    if (isModifier || e.altKey) return false

    switch (key) {
      case 'g':
        if (e.shiftKey) {
          if (uiStore.isArpStudioOpen) {
            e.preventDefault()
            melodyStore.shuffleArp()
            return true
          }
          return false
        }
        e.preventDefault()
        if (uiStore.isArpStudioOpen) {
          void melodyStore.applyArp()
          return true
        }
        void melodyStore.generate()
        return true
      case 'k':
        uiStore.toggleScaleLocked()
        return true
      case 'u':
        if (e.shiftKey) return false
        uiStore.toggleAudition()
        return true
    }

    return false
  }

  function handleView(e: KeyboardEvent, key: string, isModifier: boolean): boolean {
    if (isModifier || e.altKey) return false

    if (key === 'v' && e.shiftKey) {
      e.preventDefault()
      uiStore.toggleVelocityLane()
      return true
    }

    switch (key) {
      case 'b':
        uiStore.toggleLeftSidebar()
        return true
      case 'i':
        uiStore.toggleRightSidebar()
        return true
      case 'r':
        if (!uiStore.isRhythmStudioOpen) {
          melodyStore.setRhythmMode('custom')
        } else {
          uiStore.setRhythmStudioOpen(false)
        }
        return true
      case 'a':
        uiStore.toggleArpStudio()
        return true
      case 'c':
        uiStore.toggleChordStudio()
        return true
      case 's':
        uiStore.toggleSoundDock()
        return true
      case '?':
      case 'f1':
        e.preventDefault()
        uiStore.toggleShortcuts()
        return true
    }

    return false
  }

  function handleZoom(e: KeyboardEvent, key: string, isModifier: boolean): boolean {
    // Reset Zoom: Ctrl+0, Cmd+0, Alt+0, or plain 0
    if (key === '0') {
      e.preventDefault()
      uiStore.resetZoom()
      return true
    }

    // Fit Loop / Fit Height: Z or Shift+Z (without Primary Modifier Ctrl/Cmd, as Ctrl+Z is Undo)
    if (!isModifier && !e.altKey && key === 'z') {
      e.preventDefault()
      if (e.shiftKey) {
        uiStore.fitHeight()
      } else {
        uiStore.fitLoop()
      }
      return true
    }

    // Vertical Zoom In: German layout Shift++ ('*'), NumpadAdd with Shift, or Alt + Plus/Equal
    const isVerticalZoomIn =
      key === '*' ||
      (e.shiftKey && e.code === 'NumpadAdd') ||
      (e.altKey && (key === '+' || key === '=' || e.code === 'NumpadAdd'))

    if (isVerticalZoomIn) {
      e.preventDefault()
      uiStore.zoomInVertical()
      return true
    }

    // Vertical Zoom Out: Shift + Minus ('_'), NumpadSubtract with Shift, or Alt + Minus
    const isVerticalZoomOut =
      key === '_' ||
      (e.shiftKey && e.code === 'NumpadSubtract') ||
      (e.altKey && (key === '-' || e.code === 'NumpadSubtract'))

    if (isVerticalZoomOut) {
      e.preventDefault()
      uiStore.zoomOutVertical()
      return true
    }

    // Horizontal Zoom In: '+' or '=' or NumpadAdd (with or without primary modifier)
    if ((key === '+' || key === '=' || e.code === 'NumpadAdd') && !e.altKey) {
      e.preventDefault()
      uiStore.zoomInHorizontal()
      return true
    }

    // Horizontal Zoom Out: '-' or NumpadSubtract (with or without primary modifier)
    if ((key === '-' || e.code === 'NumpadSubtract') && !e.altKey && !e.shiftKey) {
      e.preventDefault()
      uiStore.zoomOutHorizontal()
      return true
    }

    return false
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.isComposing) return
    if ((e.target as Element | null)?.closest?.('#rhythm-studio-dock')) return

    const targetDoc = targetWindow?.document ?? (typeof document !== 'undefined' ? document : null)
    if (isInputElement(targetDoc?.activeElement ?? null)) {
      return
    }

    if (e.repeat) return

    const key = e.key.toLowerCase()
    const isModifier = hasPrimaryModifier(e)

    if (handleTransport(e, key, isModifier)) return
    if (handleTrackAndSound(e, key, isModifier)) return
    if (handleEditing(e, key, isModifier)) return
    if (handleTools(e, key, isModifier)) return
    if (handleZoom(e, key, isModifier)) return
    if (handleView(e, key, isModifier)) return
  }

  if (targetWindow && typeof targetWindow.addEventListener === 'function') {
    targetWindow.addEventListener('keydown', handleKeyDown)
  }

  tryOnScopeDispose(() => {
    if (targetWindow && typeof targetWindow.removeEventListener === 'function') {
      targetWindow.removeEventListener('keydown', handleKeyDown)
    }
  })

  return {
    handleKeyDown,
    shortcuts: SHORTCUT_DEFINITIONS
  }
}
