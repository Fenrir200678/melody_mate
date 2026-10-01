import { computed, ref, toValue, type ComputedRef, type Ref } from 'vue'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import type { AppNote } from '@/core/schemas/note.schema'
import type { DiatonicChord } from '@/core/theory/chord.engine'
import type { WorkRange } from '@/core/generator/work-range'
import { midiToPitch, snapMidiToScale } from '@/core/theory/scale.engine'
import { createDragState } from './gestureSession'
import type { DragState, ToolMode, TransformOptions } from './noteOps'

export interface UsePianoRollInteractionsOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
  notes: Ref<AppNote[]>
  selectedNoteIds: Ref<string[]>
  activeTool: Ref<ToolMode>
  snapStep: Ref<number>
  rootKey: Ref<string> | ComputedRef<string>
  scale: Ref<string> | ComputedRef<string>
  isScaleLocked?: Ref<boolean> | ComputedRef<boolean> | boolean
  isAuditionEnabled: Ref<boolean>
  scrollX: Ref<number>
  scrollY: Ref<number>
  stepWidth: Ref<number>
  rowHeight: Ref<number>
  keyboardWidth: Ref<number>
  minMidi: Ref<number>
  maxMidi: Ref<number>
  bars?: Ref<number> | number
  activeTrack?: Ref<'melody' | 'chords'> | ComputedRef<'melody' | 'chords'>
  chords?: Ref<ChordEvent[]> | ComputedRef<ChordEvent[]>
  stepsPerBar?: Ref<number> | ComputedRef<number> | number
  selectedChordNoteIds?: Ref<string[]> | ComputedRef<string[]>
  workRange?: Ref<WorkRange>
  chordPalette?: Ref<DiatonicChord[]> | ComputedRef<DiatonicChord[]>
  dragState?: Ref<DragState>
  onUpdateNotes: (notes: AppNote[]) => void
  onUpdateSelectedNoteIds: (ids: string[]) => void
  onUpdateChords?: (chords: ChordEvent[]) => void
  onUpdateSelectedChordNoteIds?: (ids: string[]) => void
  onUpdateWorkRange?: (range: WorkRange) => void
  onAuditionNote?: (pitch: string) => void
  onAuditionChord?: (voicing: string[]) => void
  onKeyFlash?: (midi: number) => void
  requestDraw?: () => void
}

/**
 * Read-only view over the injected piano-roll options: resolves reactive options on
 * demand and exposes the viewport/scale/audition queries every gesture module needs.
 */
export interface PianoRollInteractionContext {
  options: UsePianoRollInteractionsOptions
  dragState: Ref<DragState>
  /** Project end in steps, derived from the bar count with a 4-bar fallback. */
  maxProjectStep: ComputedRef<number>
  isChordTrack: () => boolean
  currentNotes: () => AppNote[]
  currentChords: () => ChordEvent[]
  currentStepsPerBar: () => number
  currentPalette: () => DiatonicChord[]
  totalBarsLimit: () => number
  getTransformOptions: () => TransformOptions
  lockMidi: (midi: number) => number
  enforceScaleLock: (notes: AppNote[]) => AppNote[]
  triggerAudition: (pitch: string) => void
}

export function createPianoRollInteractionContext(
  options: UsePianoRollInteractionsOptions
): PianoRollInteractionContext {
  const dragState = options.dragState ?? ref<DragState>(createDragState())

  const maxProjectStep = computed(() => {
    const b = toValue(options.bars)
    return b && b > 0 ? b * 16 : 64
  })

  function isChordTrack(): boolean {
    return (toValue(options.activeTrack) ?? 'melody') === 'chords'
  }

  function currentNotes(): AppNote[] {
    return toValue(options.notes)
  }

  function currentChords(): ChordEvent[] {
    return toValue(options.chords) ?? []
  }

  function currentStepsPerBar(): number {
    return toValue(options.stepsPerBar) ?? 16
  }

  function currentPalette(): DiatonicChord[] {
    return toValue(options.chordPalette) ?? []
  }

  function totalBarsLimit(): number {
    const b = toValue(options.bars)
    return b && b > 0 ? b : 4
  }

  function getTransformOptions(): TransformOptions {
    return {
      stepWidth: toValue(options.stepWidth),
      rowHeight: toValue(options.rowHeight),
      scrollX: toValue(options.scrollX),
      scrollY: toValue(options.scrollY),
      keyboardWidth: toValue(options.keyboardWidth),
      maxMidi: toValue(options.maxMidi)
    }
  }

  /**
   * Pulls a MIDI value onto the current scale when Scale Lock is active; otherwise passes through.
   */
  function lockMidi(midi: number): number {
    if (!toValue(options.isScaleLocked)) return midi
    return snapMidiToScale(midi, toValue(options.rootKey), toValue(options.scale))
  }

  /**
   * Enforces Scale Lock on a set of (dragged) notes so their committed pitch never lands
   * on a non-scale semitone. Notes already in scale are returned untouched (stable references).
   */
  function enforceScaleLock(notes: AppNote[]): AppNote[] {
    if (!toValue(options.isScaleLocked)) return notes
    const root = toValue(options.rootKey)
    const scale = toValue(options.scale)
    return notes.map((note) => {
      const lockedMidi = snapMidiToScale(note.midi, root, scale)
      if (lockedMidi === note.midi) return note
      return { ...note, midi: lockedMidi, pitch: midiToPitch(lockedMidi) }
    })
  }

  function triggerAudition(pitch: string): void {
    if (toValue(options.isAuditionEnabled)) {
      options.onAuditionNote?.(pitch)
    }
  }

  return {
    options,
    dragState,
    maxProjectStep,
    isChordTrack,
    currentNotes,
    currentChords,
    currentStepsPerBar,
    currentPalette,
    totalBarsLimit,
    getTransformOptions,
    lockMidi,
    enforceScaleLock,
    triggerAudition
  }
}
