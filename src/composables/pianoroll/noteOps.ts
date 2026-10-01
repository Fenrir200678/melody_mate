import type { ChordEvent } from '@/core/schemas/chord.schema'
import type { AppNote } from '@/core/schemas/note.schema'
import { getKeyboardKeyTooltip } from '@/core/theory'
import { midiToPitch } from '@/core/theory/scale.engine'
import { midiToPixelY, pixelXToStep, pixelYToMidi, stepToPixelX } from './geometry'

export type ToolMode = 'select' | 'lasso' | 'pencil' | 'eraser' | 'pan'
export type HitZone = 'resize-end' | 'body' | 'outside'
export type DragMode =
  | 'move'
  | 'resize'
  | 'clone'
  | 'lasso'
  | 'create'
  | 'chord-move'
  | 'chord-clone'
  | 'chord-note'
  | 'chord-resize'
  | 'chord-create'
  | 'chord-lasso'
  | 'work-range'
  | 'pan'
  | null

export interface NoteHitResult {
  note: AppNote | null
  zone: HitZone
}

export interface LassoBounds {
  startStep: number
  endStep: number
  minMidi: number
  maxMidi: number
}

export interface DragState {
  isDragging: boolean
  mode: DragMode
  dragNotes: AppNote[]
  dragChords: ChordEvent[]
  lassoRect: { x: number; y: number; width: number; height: number } | null
}

export interface TransformOptions {
  stepWidth: number
  rowHeight: number
  scrollX: number
  scrollY: number
  keyboardWidth: number
  maxMidi: number
  resizeHandleWidth?: number
}

export interface DeltaClampOptions {
  minMidi?: number
  maxMidi?: number
  maxStep?: number
}

/**
 * Detects which zone of a note the cursor points to (last 8px = resize-end, middle = body, otherwise outside).
 */
export function detectZone(pixelX: number, pixelY: number, note: AppNote, options: TransformOptions): HitZone {
  const handleW = options.resizeHandleWidth ?? 8
  const noteX = stepToPixelX(note.step, options.stepWidth, options.scrollX, options.keyboardWidth)
  const noteW = Math.max(3, note.durationSteps * options.stepWidth - 1)
  const noteY = midiToPixelY(note.midi, options.rowHeight, options.scrollY, options.maxMidi)
  const noteH = options.rowHeight - 2

  const isInside = pixelX >= noteX && pixelX <= noteX + noteW && pixelY >= noteY && pixelY <= noteY + noteH
  if (!isInside) return 'outside'

  if (pixelX >= noteX + noteW - handleW) {
    return 'resize-end'
  }
  return 'body'
}

/**
 * Performs reverse hit-testing to identify the topmost note at given pixel coordinates.
 */
export function getNoteAtPixel(
  pixelX: number,
  pixelY: number,
  notes: AppNote[],
  options: TransformOptions
): NoteHitResult {
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i]
    const zone = detectZone(pixelX, pixelY, note, options)
    if (zone !== 'outside') {
      return { note, zone }
    }
  }
  return { note: null, zone: 'outside' }
}

/**
 * Determines whether a note rectangle intersects a marquee selection box in both time and pitch.
 */
export function isNoteInLasso(note: AppNote, lasso: LassoBounds): boolean {
  const noteEndStep = note.step + note.durationSteps
  const minLassoStep = Math.min(lasso.startStep, lasso.endStep)
  const maxLassoStep = Math.max(lasso.startStep, lasso.endStep)

  // Overlap condition between intervals [note.step, noteEndStep] and [minLassoStep, maxLassoStep]
  const overlapsTime = noteEndStep > minLassoStep && note.step < maxLassoStep
  const inMidi = note.midi >= lasso.minMidi && note.midi <= lasso.maxMidi

  return overlapsTime && inMidi
}

/**
 * Computes step and MIDI bounds as well as pixel geometry for a drag marquee rectangle.
 */
export function computeLassoBounds(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  options: TransformOptions
): { bounds: LassoBounds; rect: { x: number; y: number; width: number; height: number } } {
  const left = Math.min(startX, currentX)
  const top = Math.min(startY, currentY)
  const width = Math.abs(currentX - startX)
  const height = Math.abs(currentY - startY)

  const startStep = pixelXToStep(left, options.stepWidth, options.scrollX, options.keyboardWidth, 0)
  const endStep = pixelXToStep(left + width, options.stepWidth, options.scrollX, options.keyboardWidth, 0)

  // Higher pixel Y maps to lower MIDI values
  const topMidi = pixelYToMidi(top, options.rowHeight, options.scrollY, options.maxMidi)
  const bottomMidi = pixelYToMidi(top + height, options.rowHeight, options.scrollY, options.maxMidi)

  return {
    bounds: {
      startStep,
      endStep,
      minMidi: Math.min(topMidi, bottomMidi),
      maxMidi: Math.max(topMidi, bottomMidi)
    },
    rect: { x: left, y: top, width, height }
  }
}

/**
 * Factory for creating a validated, schema-compliant AppNote.
 */
export function createNote(step: number, midi: number, durationSteps = 1, velocity = 100): AppNote {
  const clampedStep = Math.max(0, Math.round(step * 10000) / 10000)
  const clampedMidi = Math.max(0, Math.min(127, Math.round(midi)))
  const clampedDuration = Math.max(1, Math.round(durationSteps * 10000) / 10000)
  const clampedVelocity = Math.max(1, Math.min(127, Math.round(velocity)))

  return {
    id: crypto.randomUUID(),
    pitch: midiToPitch(clampedMidi),
    midi: clampedMidi,
    step: clampedStep,
    durationSteps: clampedDuration,
    velocity: clampedVelocity,
    isMuted: false
  }
}

/**
 * Clamps drag deltas so the whole note group stays inside step [0, maxStep]
 * and MIDI [minMidi, maxMidi] boundaries while preserving relative positions.
 */
function clampDragDeltas(
  notes: AppNote[],
  deltaStep: number,
  deltaMidi: number,
  options?: DeltaClampOptions
): { deltaStep: number; deltaMidi: number } {
  // Prevent moving notes before step 0
  const minOrigStep = Math.min(...notes.map((n) => n.step))
  let effectiveDeltaStep = Math.max(-minOrigStep, deltaStep)

  // Prevent moving notes beyond maxStep
  if (options?.maxStep !== undefined) {
    const maxOrigEndStep = Math.max(...notes.map((n) => n.step + n.durationSteps))
    if (maxOrigEndStep + effectiveDeltaStep > options.maxStep) {
      effectiveDeltaStep = Math.max(-minOrigStep, options.maxStep - maxOrigEndStep)
    }
  }

  // Clamp MIDI transposition within boundaries
  const minBound = options?.minMidi ?? 0
  const maxBound = options?.maxMidi ?? 127
  const minOrigMidi = Math.min(...notes.map((n) => n.midi))
  const maxOrigMidi = Math.max(...notes.map((n) => n.midi))

  let effectiveDeltaMidi = deltaMidi
  if (minOrigMidi + effectiveDeltaMidi < minBound) {
    effectiveDeltaMidi = minBound - minOrigMidi
  }
  if (maxOrigMidi + effectiveDeltaMidi > maxBound) {
    effectiveDeltaMidi = maxBound - maxOrigMidi
  }

  return { deltaStep: effectiveDeltaStep, deltaMidi: effectiveDeltaMidi }
}

/**
 * Moves targeted notes by step and pitch deltas, maintaining relative positions and boundary safety.
 */
export function moveNotes(
  notes: AppNote[],
  targetIds: string[],
  deltaStep: number,
  deltaMidi: number,
  options?: DeltaClampOptions
): AppNote[] {
  const toMove = notes.filter((n) => targetIds.includes(n.id))
  if (toMove.length === 0) return [...notes]

  const clamped = clampDragDeltas(toMove, deltaStep, deltaMidi, options)

  return notes.map((n) => {
    if (!targetIds.includes(n.id)) return n
    const newMidi = n.midi + clamped.deltaMidi
    const newStep = Math.max(0, Math.round((n.step + clamped.deltaStep) * 10000) / 10000)
    return {
      ...n,
      step: newStep,
      midi: newMidi,
      pitch: midiToPitch(newMidi)
    }
  })
}

/**
 * Clones target notes, assigns new IDs, and shifts them by delta step and MIDI.
 */
export function cloneNotes(
  notes: AppNote[],
  targetIds: string[],
  deltaStep: number,
  deltaMidi: number,
  options?: DeltaClampOptions
): { newNotes: AppNote[]; clonedIds: string[] } {
  const toClone = notes.filter((n) => targetIds.includes(n.id))
  if (toClone.length === 0) return { newNotes: [...notes], clonedIds: [] }

  const clamped = clampDragDeltas(toClone, deltaStep, deltaMidi, options)

  const clonedNotes: AppNote[] = toClone.map((n) => {
    const newMidi = n.midi + clamped.deltaMidi
    const newStep = Math.max(0, Math.round((n.step + clamped.deltaStep) * 10000) / 10000)
    return {
      id: crypto.randomUUID(),
      pitch: midiToPitch(newMidi),
      midi: newMidi,
      step: newStep,
      durationSteps: n.durationSteps,
      velocity: n.velocity,
      isMuted: n.isMuted
    }
  })

  return {
    newNotes: [...notes, ...clonedNotes],
    clonedIds: clonedNotes.map((n) => n.id)
  }
}

/**
 * Resizes target notes in step units, enforcing a strict minimum duration guard and optional maxStep limit.
 */
export function resizeNotes(
  notes: AppNote[],
  targetIds: string[],
  deltaDuration: number,
  minDuration = 1,
  maxStep?: number
): AppNote[] {
  const guard = Math.max(1, minDuration)
  return notes.map((n) => {
    if (!targetIds.includes(n.id)) return n
    let newDuration = Math.max(guard, Math.round((n.durationSteps + deltaDuration) * 10000) / 10000)
    if (maxStep !== undefined && n.step + newDuration > maxStep) {
      newDuration = Math.max(guard, maxStep - n.step)
    }
    return {
      ...n,
      durationSteps: newDuration
    }
  })
}

/**
 * Removes notes with matching IDs from the list.
 */
export function deleteNotes(notes: AppNote[], targetIds: string[]): AppNote[] {
  if (targetIds.length === 0) return [...notes]
  const idSet = new Set(targetIds)
  return notes.filter((n) => !idSet.has(n.id))
}

/**
 * Updates the velocity of a specific note, strictly clamped to [1, 127].
 */
export function updateNoteVelocity(notes: AppNote[], targetId: string, velocity: number): AppNote[] {
  const clamped = Math.max(1, Math.min(127, Math.round(velocity)))
  return notes.map((n) => (n.id === targetId ? { ...n, velocity: clamped } : n))
}

/**
 * Computes axis locking for constrained drag manipulation (Shift + Drag).
 */
export function computeAxisLock(deltaPixelX: number, deltaPixelY: number): 'horizontal' | 'vertical' {
  return Math.abs(deltaPixelX) >= Math.abs(deltaPixelY) ? 'horizontal' : 'vertical'
}

/**
 * Computes updated 2D scroll offsets based on drag displacement and clamping bounds.
 */
export function calculatePanScroll(
  startScrollX: number,
  startScrollY: number,
  deltaClientX: number,
  deltaClientY: number,
  maxScrollX: number,
  maxScrollY: number
): { scrollX: number; scrollY: number } {
  return {
    scrollX: Math.max(0, Math.min(maxScrollX, Math.round(startScrollX - deltaClientX))),
    scrollY: Math.max(0, Math.min(maxScrollY, Math.round(startScrollY - deltaClientY)))
  }
}

/**
 * Returns a new note array sorted by step ascending, then pitch/midi ascending.
 */
export function sortNotes(notes: AppNote[]): AppNote[] {
  return [...notes].sort((a, b) => a.step - b.step || a.midi - b.midi)
}

/**
 * Inserts a note into the list maintaining chronological and pitch sort order.
 */
export function addNoteToList(notes: AppNote[], note: AppNote): AppNote[] {
  return sortNotes([...notes, note])
}

/**
 * Updates an existing note with partial fields, preserving sorting.
 */
export function updateNoteInList(notes: AppNote[], id: string, partial: Partial<AppNote>): AppNote[] {
  const index = notes.findIndex((n) => n.id === id)
  if (index === -1) return [...notes]

  const updated = { ...notes[index], ...partial }
  const copy = [...notes]
  copy[index] = updated
  return sortNotes(copy)
}

/**
 * Duplicates selected notes shifted in time by their bounding span snapped to grid.
 */
export function duplicateNotes(
  notes: AppNote[],
  targetIds: string[],
  snapStep: number,
  maxStep?: number
): { newNotes: AppNote[]; clonedIds: string[] } {
  if (targetIds.length === 0) return { newNotes: [...notes], clonedIds: [] }

  const targets = notes.filter((n) => targetIds.includes(n.id))
  if (targets.length === 0) return { newNotes: [...notes], clonedIds: [] }

  const minStep = Math.min(...targets.map((n) => n.step))
  const maxEndStep = Math.max(...targets.map((n) => n.step + n.durationSteps))
  const spanSteps = maxEndStep - minStep
  const snap = Math.max(1, snapStep)
  const deltaStep = Math.max(snap, Math.ceil(spanSteps / snap) * snap)

  return cloneNotes(notes, targetIds, deltaStep, 0, maxStep !== undefined ? { maxStep } : undefined)
}

/**
 * Resolves the tooltip string for a piano keyboard key under the given pointer Y position.
 * Returns null if the pointer is outside the visible/active MIDI pitch bounds.
 */
export function resolveKeyboardKeyTooltip(
  mouseY: number,
  options: { rowHeight: number; scrollY: number; minMidi: number; maxMidi: number },
  rootKey?: string,
  scale?: string
): string | null {
  const midi = pixelYToMidi(mouseY, options.rowHeight, options.scrollY, options.maxMidi)
  if (midi < options.minMidi || midi > options.maxMidi) return null
  return getKeyboardKeyTooltip(midi, rootKey, scale)
}
