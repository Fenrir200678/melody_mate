import type { ChordEvent } from '@/core/schemas/chord.schema'
import { pitchToMidi, snapMidiToScale } from '@/core/theory/scale.engine'
import { moveChordsByBars, setChordVoicingPitch, transposeWholeChords } from './chordOps'

export type ChordPreviewMode = 'chord-move' | 'chord-clone' | 'chord-note'

export interface ScaleLockContext {
  rootKey: string
  scale: string
}

export interface ChordDragPreviewInput {
  originalChords: ChordEvent[]
  mode: ChordPreviewMode
  /** Horizontal delta already quantized to whole sequencer steps. */
  deltaBars: number
  deltaMidi: number
  targetId: string | null
  targetNoteIndex: number
  activeIds: string[]
  totalBars: number
  scaleLock?: ScaleLockContext
}

export interface ChordDragPreviewResult {
  chords: ChordEvent[]
  /**
   * True when a mutation path was entered, even if the result happens to equal the input.
   * Chord commits use this to decide whether the gesture is worth an undo entry.
   */
  dirty: boolean
}

/**
 * Pure preview math for chord move/clone/voicing-note drags: applies the vertical
 * transposition and the horizontal bar shift in that order, without touching any store.
 * Chord resizes are a separate single-op path (see `resizeChordByBars`).
 */
export function computeChordDragPreview(input: ChordDragPreviewInput): ChordDragPreviewResult {
  const { mode, deltaBars, deltaMidi, targetId, targetNoteIndex, activeIds, totalBars, scaleLock } = input

  let chords = input.originalChords
  let dirty = false

  if (mode === 'chord-note' && targetId && targetNoteIndex >= 0 && deltaMidi !== 0) {
    const original = input.originalChords.find((c) => c.id === targetId)
    const originalMidi = original?.voicing[targetNoteIndex] ? pitchToMidi(original.voicing[targetNoteIndex]) : 0
    let targetMidi = Math.max(0, Math.min(127, originalMidi + deltaMidi))
    if (scaleLock) {
      targetMidi = snapMidiToScale(targetMidi, scaleLock.rootKey, scaleLock.scale)
    }
    if (targetMidi !== originalMidi) {
      chords = setChordVoicingPitch(chords, targetId, targetNoteIndex, targetMidi)
      dirty = true
    }
  } else if ((mode === 'chord-move' || mode === 'chord-clone') && activeIds.length > 0 && deltaMidi !== 0) {
    chords = transposeWholeChords(chords, activeIds, deltaMidi, {
      scaleLock: scaleLock ? { isLocked: true, rootKey: scaleLock.rootKey, scale: scaleLock.scale } : undefined
    })
    dirty = true
  }

  if (deltaBars !== 0) {
    const ids = mode === 'chord-note' && targetId ? [targetId] : activeIds
    chords = moveChordsByBars(chords, ids, deltaBars, { totalBars })
    dirty = true
  }

  return { chords, dirty }
}
