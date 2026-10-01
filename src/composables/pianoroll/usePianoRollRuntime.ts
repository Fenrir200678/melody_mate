import { computed, ref, toRef, type Ref } from 'vue'
import { useElementSize, useMediaQuery } from '@vueuse/core'
import type { AppNote } from '@/core/schemas/note.schema'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import type { DiatonicChord } from '@/core/theory/chord.engine'
import type { WorkRange } from '@/core/generator/work-range'
import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
import { pitchToMidi } from '@/core/theory/scale.engine'
import { calculateMaxScrollX } from './geometry'
import { usePianoRollCanvas, type PianoRollTrack } from './usePianoRollCanvas'
import { type DragState, type ToolMode } from './noteOps'
import { usePianoRollInteractions } from './usePianoRollInteractions'
import { usePianoRollZoom } from './usePianoRollZoom'
import { usePianoRollNavigation } from './usePianoRollNavigation'

interface RuntimeProps {
  rootKey: string
  scale: string
  bars: number
  isPlaying: boolean
  currentStep: number
  chordPalette: DiatonicChord[]
  sectionLetters: string[]
  playhead?: { step: number }
  minMidi: number
  maxMidi: number
  rowHeight: number
  stepWidth: number
  keyboardWidth: number
  isChordStudioOpen: boolean
}

interface RuntimeOptions {
  props: Readonly<RuntimeProps>
  notes: Ref<AppNote[]>
  selectedNoteIds: Ref<string[]>
  chords: Ref<ChordEvent[]>
  selectedChordNoteIds: Ref<string[]>
  activeTrack: Ref<PianoRollTrack>
  activeTool: Ref<ToolMode>
  snapStep: Ref<number>
  workRange: Ref<WorkRange>
  isAuditionEnabled: Ref<boolean>
  isScaleLocked: Ref<boolean>
  isFollowEnabled: Ref<boolean>
  velocityLaneHeight: Ref<number>
  loopStartStep: Ref<number>
  loopEndStep: Ref<number>
  canvasRef: Ref<HTMLCanvasElement | null>
  viewportRef: Ref<HTMLDivElement | null>
  rulerRef: Ref<{ setPlayheadStep: (step: number) => void } | null>
  emit: {
    (event: 'auditionNote', pitch: string): void
    (event: 'selectNote', id: string, isShift: boolean): void
    (event: 'seekStep', step: number): void
  }
}

export function usePianoRollRuntime(options: RuntimeOptions) {
  const {
    props,
    notes,
    selectedNoteIds,
    chords,
    selectedChordNoteIds,
    activeTrack,
    activeTool,
    snapStep,
    workRange,
    isAuditionEnabled,
    isScaleLocked,
    isFollowEnabled,
    velocityLaneHeight,
    loopStartStep,
    loopEndStep,
    canvasRef,
    viewportRef,
    rulerRef,
    emit
  } = options
  const isMobile = useMediaQuery('(max-width: 767px)')

  const { width: viewportWidth, height: viewportHeight } = useElementSize(viewportRef)

  const rootKeyRef = toRef(props, 'rootKey')
  const scaleRef = toRef(props, 'scale')
  const barsRef = toRef(props, 'bars')
  const isPlayingRef = toRef(props, 'isPlaying')
  const currentStepRef = toRef(props, 'currentStep')
  const chordPaletteRef = toRef(props, 'chordPalette')
  const stepsPerBar = computed(() => STEPS_PER_BAR)

  function handleAuditionNote(pitch: string): void {
    if (isAuditionEnabled.value) {
      emit('auditionNote', pitch)
    }
  }

  function handleAuditionChord(_voicing: string[]): void {
    // Chord audition completely removed as per user request (melody audition remains active)
  }

  function handleUpdateNotes(newNotes: AppNote[]): void {
    notes.value = newNotes
  }

  function handleUpdateSelectedNoteIds(newIds: string[]): void {
    selectedNoteIds.value = newIds
  }

  function handleUpdateChords(newChords: ChordEvent[]): void {
    chords.value = newChords
  }

  function handleUpdateSelectedChordNoteIds(newIds: string[]): void {
    selectedChordNoteIds.value = newIds
  }

  function handleUpdateVelocityLaneHeight(height: number): void {
    velocityLaneHeight.value = height
  }

  function handleSelectNote(noteId: string, isShift: boolean): void {
    if (isShift) {
      const current = selectedNoteIds.value
      const updated = current.includes(noteId) ? current.filter((id) => id !== noteId) : [...current, noteId]
      handleUpdateSelectedNoteIds(updated)
    } else {
      handleUpdateSelectedNoteIds([noteId])
    }
    emit('selectNote', noteId, isShift)
  }

  const dragState = ref<DragState>({
    isDragging: false,
    mode: null,
    dragNotes: [],
    dragChords: [],
    lassoRect: null
  })

  const chordVoicingMidis = computed(() => chords.value.flatMap((c) => c.voicing.map((p) => pitchToMidi(p))))

  const effectiveMinMidi = computed(() => {
    let min = props.minMidi ?? 24
    for (const note of notes.value) {
      if (note.midi < min) {
        min = Math.floor(note.midi / 12) * 12
      }
    }
    for (const midi of chordVoicingMidis.value) {
      if (midi < min) {
        min = Math.floor(midi / 12) * 12
      }
    }
    return Math.max(0, min)
  })

  const effectiveMaxMidi = computed(() => {
    let max = props.maxMidi ?? 108
    for (const note of notes.value) {
      if (note.midi > max) {
        max = Math.min(127, Math.ceil((note.midi + 1) / 12) * 12)
      }
    }
    for (const midi of chordVoicingMidis.value) {
      if (midi > max) {
        max = Math.min(127, Math.ceil((midi + 1) / 12) * 12)
      }
    }
    return Math.min(127, max)
  })

  const { scrollX, scrollY, stepWidth, rowHeight, keyboardWidth, setupCanvasDpi, requestDraw, flashKey } =
    usePianoRollCanvas(canvasRef, {
      notes,
      chords,
      rootKey: rootKeyRef,
      scale: scaleRef,
      bars: barsRef,
      isPlaying: isPlayingRef,
      currentStep: currentStepRef,
      playhead: props.playhead,
      followPlayhead: isFollowEnabled,
      onPlayheadFrame: (step) => rulerRef.value?.setPlayheadStep(step),
      selectedNoteIds,
      workRange,
      sectionLetters: toRef(props, 'sectionLetters'),
      selectedChordNoteIds,
      dragPreviewNotes: computed(() => dragState.value.dragNotes),
      dragPreviewChords: computed(() => dragState.value.dragChords),
      activeTrack,
      stepsPerBar,
      lassoRect: computed(() => dragState.value.lassoRect),
      disableInternalPointerDown: true,
      snapStep,
      isScaleLocked,
      loopStartStep,
      loopEndStep,
      minMidi: effectiveMinMidi,
      maxMidi: effectiveMaxMidi,
      initialRowHeight: props.rowHeight,
      initialStepWidth: props.stepWidth,
      keyboardWidth: props.keyboardWidth,
      onAuditionNote: handleAuditionNote,
      onSelectNote: handleSelectNote,
      onSeekStep: (step) => emit('seekStep', step)
    })

  usePianoRollInteractions({
    canvasRef,
    notes,
    selectedNoteIds,
    workRange,
    onUpdateWorkRange: (range) => {
      workRange.value = range
    },
    activeTool,
    snapStep,
    rootKey: rootKeyRef,
    scale: scaleRef,
    isScaleLocked,
    isAuditionEnabled,
    activeTrack,
    chords,
    stepsPerBar,
    selectedChordNoteIds,
    chordPalette: chordPaletteRef,
    dragState,
    scrollX,
    scrollY,
    stepWidth,
    rowHeight,
    keyboardWidth,
    minMidi: effectiveMinMidi,
    maxMidi: effectiveMaxMidi,
    bars: barsRef,
    onUpdateNotes: handleUpdateNotes,
    onUpdateSelectedNoteIds: handleUpdateSelectedNoteIds,
    onUpdateChords: handleUpdateChords,
    onUpdateSelectedChordNoteIds: handleUpdateSelectedChordNoteIds,
    onAuditionNote: handleAuditionNote,
    onAuditionChord: handleAuditionChord,
    onKeyFlash: flashKey,
    requestDraw
  })

  // Dimensions & bounds for vertical/horizontal scrollbars
  const totalRows = computed(() => effectiveMaxMidi.value - effectiveMinMidi.value + 1)
  const totalContentHeight = computed(() => totalRows.value * rowHeight.value)
  const maxScrollY = computed(() => Math.max(0, totalContentHeight.value - viewportHeight.value))

  const totalProjectWidth = computed(() => {
    const barsCount = props.bars ?? 4
    return barsCount * 16 * stepWidth.value
  })
  const maxScrollX = computed(() => {
    return calculateMaxScrollX(viewportWidth.value, stepWidth.value, props.bars ?? 4, keyboardWidth.value)
  })

  const zoom = usePianoRollZoom({
    stepWidth,
    rowHeight,
    scrollX,
    scrollY,
    viewportWidth,
    viewportHeight,
    keyboardWidth,
    minMidi: effectiveMinMidi,
    maxMidi: effectiveMaxMidi,
    bars: barsRef,
    notes,
    chords,
    loopStartStep,
    loopEndStep,
    requestDraw
  })

  const { zoomInHorizontal, zoomOutHorizontal, zoomInVertical, zoomOutVertical, fitLoop, fitHeight, resetZoom } = zoom
  const { scrollToNotes, scrollToChords, scrollToMidi } = usePianoRollNavigation({
    notes,
    chords,
    chordVoicingMidis,
    effectiveMinMidi,
    effectiveMaxMidi,
    activeTrack,
    viewportWidth,
    viewportHeight,
    totalContentHeight,
    maxScrollX,
    scrollX,
    scrollY,
    stepWidth,
    rowHeight,
    keyboardWidth,
    stepsPerBar,
    isChordStudioOpen: toRef(props, 'isChordStudioOpen'),
    setupCanvasDpi,
    requestDraw,
    zoom
  })

  function onSeekStep(step: number): void {
    emit('seekStep', step)
  }

  return {
    scrollX,
    scrollY,
    stepWidth,
    rowHeight,
    keyboardWidth,
    requestDraw,
    isMobile,
    viewportWidth,
    viewportHeight,
    totalContentHeight,
    maxScrollY,
    totalProjectWidth,
    maxScrollX,
    handleUpdateVelocityLaneHeight,
    handleAuditionNote,
    onSeekStep,
    scrollToNotes,
    scrollToChords,
    scrollToMidi,
    zoomInHorizontal,
    zoomOutHorizontal,
    zoomInVertical,
    zoomOutVertical,
    resetZoom,
    fitLoop,
    fitHeight
  }
}
