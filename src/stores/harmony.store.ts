import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useHistory } from '../composables/useHistory'
import { useHarmonyChordPositioning } from '../composables/harmony/useHarmonyChordPositioning'
import type { ChordEvent } from '../core/schemas/chord.schema'
import { STEPS_PER_BAR } from '../core/schemas/project.schema'
import {
  deriveChordIdentity,
  getDiatonicChords,
  resolveChordOverlaps,
  type DiatonicChord,
  type VoicingStyle
} from '../core/theory/chord.engine'
import { fitAndMergeProgression } from '../core/theory/progression-range'
import { closeProgressionGaps as closeProgressionGapsCore, hasProgressionGaps } from '../core/theory/progression-gaps'
import { optimizeInsertedChordVoiceLeading, optimizeProgressionVoiceLeading } from '../core/theory/voice-leading'
import {
  addVoicingNote as addVoicingNoteCore,
  duplicateChordEvent,
  generateProgressionChords,
  removeVoicingNote as removeVoicingNoteCore,
  renameChordFromVoicing,
  setChordInversion,
  transposeProgressionToScale,
  transposeVoicingNote as transposeVoicingNoteCore,
  transposeVoicingOctave
} from '../core/theory/chord-mutations'
import {
  createChordDraft,
  moveChordsByBars,
  realignChordsAfterDurationChange,
  reorderChordInProgression,
  setChordDurationBars
} from '../composables/pianoroll/chordOps'
import { useHarmonyChordNoteSelection } from '../composables/useHarmonyChordNoteSelection'
import { DEFAULT_HARMONY_SETTINGS } from '../config/defaults'
import { useAudioStore } from './audio.store'
import { useProjectStore } from './project.store'
import { useUiStore } from './ui.store'

export const MIN_CHORD_REGISTER = 1
export const MAX_CHORD_REGISTER = 6

export type PaletteClickMode = 'preview' | 'insert'

export const useHarmonyStore = defineStore('harmony', () => {
  const projectStore = useProjectStore()

  const chords = ref<ChordEvent[]>([])
  const useChords = ref<boolean>(DEFAULT_HARMONY_SETTINGS.useChords)
  const backingVolume = ref<number>(DEFAULT_HARMONY_SETTINGS.backingVolume)
  const isMuted = ref<boolean>(DEFAULT_HARMONY_SETTINGS.isMuted)
  const adherence = ref<number>(DEFAULT_HARMONY_SETTINGS.adherence)
  const chordRegister = ref<number>(DEFAULT_HARMONY_SETTINGS.chordRegister)
  const defaultChordDuration = ref<number>(DEFAULT_HARMONY_SETTINGS.defaultChordDuration)
  const voicingStyle = ref<VoicingStyle>(DEFAULT_HARMONY_SETTINGS.voicingStyle)
  const autoSmooth = ref<boolean>(DEFAULT_HARMONY_SETTINGS.autoSmooth)
  const paletteClickMode = ref<PaletteClickMode>(DEFAULT_HARMONY_SETTINGS.paletteClickMode)
  const selectedChordId = ref<string | null>(null)
  const selectedProgressionId = ref<string | null>(null)

  const history = useHistory<ChordEvent[]>({ maxDepth: 50 })
  const canUndo = computed(() => history.canUndo.value)
  const canRedo = computed(() => history.canRedo.value)

  const selectedChord = computed<ChordEvent | null>(() => {
    if (!selectedChordId.value) return null
    return chords.value.find((c) => c.id === selectedChordId.value) ?? null
  })

  const selectChord = (id: string | null): void => {
    selectedChordId.value = id
  }

  const setPaletteClickMode = (mode: PaletteClickMode): void => {
    paletteClickMode.value = mode
  }

  const diatonicPalette = computed<DiatonicChord[]>(() => {
    return getDiatonicChords(projectStore.key, projectStore.scale)
  })

  function syncAudioIfActive(): void {
    const audioStore = useAudioStore()
    if (audioStore.isPlaying || audioStore.isPaused) {
      audioStore.syncChordSchedule()
    }
  }

  const clearProgressionSelection = (): void => {
    selectedProgressionId.value = null
  }

  const {
    selectedChordNoteIds,
    pruneSelectedChordNoteIds,
    setSelectedChordNoteIds,
    clearSelection,
    duplicateSelected,
    transposeSelected,
    deleteSelected,
    selectNextNote,
    selectPreviousNote,
    nudgeSelected,
    adjustSelectedDuration,
    adjustSelectedVelocity,
    toggleSelectedMute
  } = useHarmonyChordNoteSelection({
    getChords: () => chords.value,
    setChords,
    totalBars: () => projectStore.bars,
    palette: () => diatonicPalette.value,
    key: () => projectStore.key,
    scale: () => projectStore.scale,
    selectedChordId: () => selectedChordId.value,
    removeChord,
    auditionPitch: (pitch) => {
      if (useUiStore().isAuditionEnabled) {
        void useAudioStore().auditionPitch(pitch)
      }
    },
    toggleMute: () => {
      isMuted.value = !isMuted.value
    },
    isScaleLocked: () => useUiStore().isScaleLocked
  })

  function setChords(newChords: ChordEvent[], recordHistory = true): void {
    if (recordHistory) {
      history.pushState(chords.value)
    }
    chords.value = [...newChords]
    clearProgressionSelection()
    pruneSelectedChordNoteIds()
    if (selectedChordId.value && !chords.value.some((c) => c.id === selectedChordId.value)) {
      selectedChordId.value = chords.value[0]?.id ?? null
    }
    syncAudioIfActive()
  }

  function addChord(chord: ChordEvent, options: { preserveExisting?: boolean } = {}): ChordEvent {
    history.pushState(chords.value)
    let nextChords = resolveChordOverlaps([...chords.value, chord])
    if (autoSmooth.value && nextChords.length > 1) {
      nextChords = options.preserveExisting
        ? optimizeInsertedChordVoiceLeading(nextChords, chord.id, chordRegister.value)
        : optimizeProgressionVoiceLeading(nextChords, chordRegister.value)
    }
    chords.value = nextChords
    selectedChordId.value = chord.id
    clearProgressionSelection()
    pruneSelectedChordNoteIds()
    syncAudioIfActive()
    return chords.value.find((c) => c.id === chord.id) ?? chord
  }

  const { moveChordToPosition, duplicateChordToPosition } = useHarmonyChordPositioning({
    getChords: () => chords.value,
    totalBars: () => projectStore.bars,
    setChords,
    selectChord
  })

  function removeChord(id: string): void {
    const idx = chords.value.findIndex((c) => c.id === id)
    if (idx === -1) return
    history.pushState(chords.value)
    chords.value = chords.value.filter((c) => c.id !== id)
    if (selectedChordId.value === id) {
      const fallback = chords.value[idx] ?? chords.value[idx - 1] ?? null
      selectedChordId.value = fallback ? fallback.id : null
    }
    clearProgressionSelection()
    pruneSelectedChordNoteIds()
    syncAudioIfActive()
  }

  function reorderChords(newChords: ChordEvent[]): void {
    chords.value = [...newChords]
  }

  function reorderChord(chordId: string, direction: 'up' | 'down'): void {
    const reordered = reorderChordInProgression(chords.value, chordId, direction)
    if (reordered !== chords.value) {
      history.pushState(chords.value)
      chords.value = reordered
      pruneSelectedChordNoteIds()
      syncAudioIfActive()
    }
  }

  function setChordDuration(chordId: string, durationBars: number): void {
    const chord = chords.value.find((c) => c.id === chordId)
    if (!chord) return

    history.pushState(chords.value)
    chords.value = realignChordsAfterDurationChange(chords.value, chordId, durationBars, {
      totalBars: projectStore.bars
    })
    pruneSelectedChordNoteIds()
    syncAudioIfActive()
  }

  function applySmoothVoiceLeading(): void {
    if (chords.value.length <= 1) return
    history.pushState(chords.value)
    chords.value = optimizeProgressionVoiceLeading(chords.value, chordRegister.value)
    pruneSelectedChordNoteIds()
    syncAudioIfActive()
  }

  function setAutoSmooth(enabled: boolean): void {
    autoSmooth.value = enabled
    if (enabled && chords.value.length > 1) {
      applySmoothVoiceLeading()
    }
  }

  function toggleAutoSmooth(): void {
    setAutoSmooth(!autoSmooth.value)
  }

  function setDefaultChordDuration(duration: number): void {
    defaultChordDuration.value = Math.max(0.25, duration)
  }

  function setVoicingStyle(style: VoicingStyle): void {
    voicingStyle.value = style
  }

  function setChordRegister(octave: number): void {
    chordRegister.value = Math.max(MIN_CHORD_REGISTER, Math.min(MAX_CHORD_REGISTER, Math.round(octave)))
  }

  function setInversion(chordId: string, inversion: 0 | 1 | 2 | 3): void {
    const index = chords.value.findIndex((c) => c.id === chordId)
    if (index === -1) return

    history.pushState(chords.value)
    const copy = [...chords.value]
    copy[index] = setChordInversion(copy[index], inversion, chordRegister.value, voicingStyle.value)
    chords.value = copy
    syncAudioIfActive()
  }

  function moveChordInTime(id: string, deltaBars: number): void {
    const chord = chords.value.find((c) => c.id === id)
    if (!chord) return

    history.pushState(chords.value)
    const moved = moveChordsByBars(chords.value, [id], deltaBars, { totalBars: projectStore.bars })
    chords.value = resolveChordOverlaps(moved)
    pruneSelectedChordNoteIds()
    syncAudioIfActive()
  }

  function resizeChord(id: string, durationBars: number): void {
    const chord = chords.value.find((c) => c.id === id)
    if (!chord) return

    history.pushState(chords.value)
    const resized = setChordDurationBars(chords.value, id, durationBars, { totalBars: projectStore.bars })
    chords.value = resolveChordOverlaps(resized)
    pruneSelectedChordNoteIds()
    syncAudioIfActive()
  }

  function closeProgressionGaps(): void {
    if (!hasProgressionGaps(chords.value)) return
    setChords(closeProgressionGapsCore(chords.value))
  }

  function transposeVoicingNote(chordId: string, noteIndex: number, midi: number): void {
    setChords(
      chords.value.map((c) =>
        c.id === chordId
          ? transposeVoicingNoteCore(c, noteIndex, midi, diatonicPalette.value, projectStore.key, projectStore.scale)
          : c
      )
    )
  }

  function addVoicingNote(chordId: string, pitch: string): void {
    setChords(
      chords.value.map((c) =>
        c.id === chordId ? addVoicingNoteCore(c, pitch, diatonicPalette.value, projectStore.key, projectStore.scale) : c
      )
    )
  }

  function removeVoicingNote(chordId: string, noteIndex: number): void {
    const chord = chords.value.find((c) => c.id === chordId)
    if (!chord) return

    const updated = removeVoicingNoteCore(chord, noteIndex, diatonicPalette.value, projectStore.key, projectStore.scale)
    if (!updated) {
      removeChord(chordId)
      return
    }

    setChords(chords.value.map((c) => (c.id === chordId ? updated : c)))
  }

  function renameFromVoicing(chordId: string): void {
    setChords(
      chords.value.map((c) =>
        c.id === chordId ? renameChordFromVoicing(c, diatonicPalette.value, projectStore.key, projectStore.scale) : c
      ),
      false
    )
  }

  function createChordAt(startBar: number, durationBars: number, firstPitch: string): ChordEvent | null {
    const draft = createChordDraft(startBar, durationBars, firstPitch, { totalBars: projectStore.bars })
    if (!draft) return null

    const identity = deriveChordIdentity(draft.voicing, diatonicPalette.value, projectStore.key, projectStore.scale)
    const chord: ChordEvent = { ...draft, ...identity }

    addChord(chord)
    return chord
  }

  function loadPredefinedProgression(progressionId: string): void {
    const range = { ...projectStore.workRange }
    const targetBars = Math.ceil((range.endStep - range.startStep) / STEPS_PER_BAR)
    const { preset, chords: nextChords } = generateProgressionChords({
      progressionId,
      key: projectStore.key,
      targetBars,
      chordRegister: chordRegister.value,
      voicingStyle: voicingStyle.value,
      autoSmooth: autoSmooth.value
    })

    history.pushState(chords.value)
    if (range.startStep === 0 && range.endStep === projectStore.bars * STEPS_PER_BAR) {
      projectStore.setScale(preset.scale)
    }
    chords.value = fitAndMergeProgression(chords.value, nextChords, range)
    selectedProgressionId.value =
      range.startStep === 0 && range.endStep === projectStore.bars * STEPS_PER_BAR ? progressionId : null
    if (selectedChordId.value && !chords.value.some((chord) => chord.id === selectedChordId.value)) {
      selectedChordId.value = null
    }
    pruneSelectedChordNoteIds()
    syncAudioIfActive()
  }

  const setUseChords = (enabled: boolean): void => {
    useChords.value = enabled
  }

  function setBackingVolume(volume: number): void {
    backingVolume.value = Math.max(0, Math.min(1, volume))
  }

  const setMuted = (muted: boolean): void => {
    isMuted.value = muted
  }

  function setAdherence(val: number): void {
    adherence.value = Math.max(0, Math.min(1, val))
  }

  function clearChords(): void {
    history.pushState(chords.value)
    chords.value = []
    selectedChordId.value = null
    selectedChordNoteIds.value = []
    clearProgressionSelection()
    syncAudioIfActive()
  }

  function duplicateChord(chordId: string): void {
    const chord = chords.value.find((c) => c.id === chordId)
    if (!chord) return
    addChord(duplicateChordEvent(chord))
  }

  function transposeChordVoicingOctave(chordId: string, deltaOctave: number): void {
    const chord = chords.value.find((c) => c.id === chordId)
    if (!chord || deltaOctave === 0) return

    history.pushState(chords.value)
    chords.value = chords.value.map((c) => (c.id === chordId ? transposeVoicingOctave(c, deltaOctave) : c))
    pruneSelectedChordNoteIds()
    syncAudioIfActive()
  }

  function undo(): void {
    const prev = history.undo(chords.value)
    if (prev !== undefined) {
      setChords(prev, false)
    }
  }

  function redo(): void {
    const next = history.redo(chords.value)
    if (next !== undefined) {
      setChords(next, false)
    }
  }

  function transposeToScale(newKey: string, newScale: string): void {
    if (newKey === projectStore.key && newScale === projectStore.scale) return
    if (chords.value.length === 0) return

    const { chords: nextChords, keepPreset } = transposeProgressionToScale({
      chords: chords.value,
      selectedProgressionId: selectedProgressionId.value,
      currentKey: projectStore.key,
      currentScale: projectStore.scale,
      newKey,
      newScale,
      totalBars: projectStore.bars,
      chordRegister: chordRegister.value,
      voicingStyle: voicingStyle.value
    })

    history.pushState(chords.value)
    chords.value = nextChords
    if (!keepPreset) clearProgressionSelection()
    if (selectedChordId.value && !nextChords.some((chord) => chord.id === selectedChordId.value)) {
      selectedChordId.value = nextChords[0]?.id ?? null
    }
    pruneSelectedChordNoteIds()
    syncAudioIfActive()
  }

  return {
    chords,
    useChords,
    backingVolume,
    isMuted,
    adherence,
    chordRegister,
    defaultChordDuration,
    voicingStyle,
    autoSmooth,
    paletteClickMode,
    selectedChordId,
    selectedChord,
    selectedChordNoteIds,
    selectedProgressionId,
    diatonicPalette,
    canUndo,
    canRedo,
    selectChord,
    setPaletteClickMode,
    duplicateChord,
    transposeChordVoicingOctave,
    setChords,
    addChord,
    removeChord,
    reorderChords,
    reorderChord,
    setChordDuration,
    applySmoothVoiceLeading,
    setAutoSmooth,
    toggleAutoSmooth,
    setDefaultChordDuration,
    setVoicingStyle,
    setChordRegister,
    setInversion,
    moveChordInTime,
    moveChordToPosition,
    duplicateChordToPosition,
    resizeChord,
    closeProgressionGaps,
    transposeVoicingNote,
    addVoicingNote,
    removeVoicingNote,
    renameFromVoicing,
    createChordAt,
    loadPredefinedProgression,
    clearProgressionSelection,
    setUseChords,
    setBackingVolume,
    setMuted,
    setAdherence,
    clearChords,
    setSelectedChordNoteIds,
    clearSelection,
    duplicateSelected,
    deleteSelected,
    transposeSelected,
    selectNextNote,
    selectPreviousNote,
    nudgeSelected,
    adjustSelectedDuration,
    adjustSelectedVelocity,
    toggleSelectedMute,
    transposeToScale,
    undo,
    redo
  }
})
