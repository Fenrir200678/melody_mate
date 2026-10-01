import type { AppNote } from '../schemas/note.schema'
import { midiToPitch, transposeMidiInScale } from '../theory/scale.engine'

/**
 * Pure comparator sorting notes chronologically:
 * 1. Step ascending (timeline position)
 * 2. MIDI pitch ascending (lower to higher pitch)
 * 3. ID string comparison for stable deterministic sorting
 */
export function sortNotesChronologically(notes: readonly AppNote[]): AppNote[] {
  return [...notes].sort((a, b) => {
    if (a.step !== b.step) return a.step - b.step
    if (a.midi !== b.midi) return a.midi - b.midi
    return a.id.localeCompare(b.id)
  })
}

/**
 * Finds the ID of the chronologically next note after the current selection.
 * Clamps to the last note if already at the end of the melody.
 */
export function findNextNoteId(notes: readonly AppNote[], currentSelectedId: string | null): string | null {
  if (notes.length === 0) return null
  const sorted = sortNotesChronologically(notes)
  if (!currentSelectedId) return sorted[0].id

  const currentIndex = sorted.findIndex((n) => n.id === currentSelectedId)
  if (currentIndex === -1) return sorted[0].id
  if (currentIndex < sorted.length - 1) {
    return sorted[currentIndex + 1].id
  }
  return sorted[sorted.length - 1].id
}

/**
 * Finds the ID of the chronologically previous note before the current selection.
 * Clamps to the first note if already at the start of the melody.
 */
export function findPreviousNoteId(notes: readonly AppNote[], currentSelectedId: string | null): string | null {
  if (notes.length === 0) return null
  const sorted = sortNotesChronologically(notes)
  if (!currentSelectedId) return sorted[sorted.length - 1].id

  const currentIndex = sorted.findIndex((n) => n.id === currentSelectedId)
  if (currentIndex === -1) return sorted[sorted.length - 1].id
  if (currentIndex > 0) {
    return sorted[currentIndex - 1].id
  }
  return sorted[0].id
}

/**
 * Nudges targeted notes in time by deltaSteps, preserving relative spacing
 * and clamping to timeline bounds (min step 0, maxSteps if specified).
 */
export function nudgeNotesTime(
  notes: readonly AppNote[],
  selectedIds: readonly string[],
  deltaSteps: number,
  maxSteps?: number
): AppNote[] {
  if (notes.length === 0 || selectedIds.length === 0 || deltaSteps === 0) {
    return [...notes]
  }

  const selectedSet = new Set(selectedIds)
  const selectedNotes = notes.filter((n) => selectedSet.has(n.id))
  if (selectedNotes.length === 0) return [...notes]

  // Clamp deltaSteps so no selected note starts before step 0
  const minStep = Math.min(...selectedNotes.map((n) => n.step))
  let effectiveDelta = Math.max(-minStep, deltaSteps)

  // Clamp deltaSteps so no selected note ends beyond maxSteps (if specified)
  if (maxSteps !== undefined && maxSteps > 0) {
    const maxEndStep = Math.max(...selectedNotes.map((n) => n.step + n.durationSteps))
    if (maxEndStep + effectiveDelta > maxSteps) {
      effectiveDelta = Math.max(-minStep, maxSteps - maxEndStep)
    }
  }

  if (effectiveDelta === 0) return [...notes]

  return notes.map((note) => {
    if (!selectedSet.has(note.id)) return note
    const newStep = Math.max(0, Math.round((note.step + effectiveDelta) * 10000) / 10000)
    return {
      ...note,
      step: newStep
    }
  })
}

/**
 * Adjusts the duration of targeted notes by deltaSteps, enforcing a minimum of 1 step.
 */
export function adjustNotesDuration(
  notes: readonly AppNote[],
  selectedIds: readonly string[],
  deltaSteps: number
): AppNote[] {
  if (notes.length === 0 || selectedIds.length === 0 || deltaSteps === 0) {
    return [...notes]
  }

  const selectedSet = new Set(selectedIds)
  let hasChanged = false

  const updated = notes.map((note) => {
    if (!selectedSet.has(note.id)) return note
    const newDuration = Math.max(1, Math.round((note.durationSteps + deltaSteps) * 10000) / 10000)
    if (newDuration !== note.durationSteps) {
      hasChanged = true
      return {
        ...note,
        durationSteps: newDuration
      }
    }
    return note
  })

  return hasChanged ? updated : [...notes]
}

/**
 * Adjusts the velocity of targeted notes by deltaVelocity, clamped within [1, 127].
 */
export function adjustNotesVelocity(
  notes: readonly AppNote[],
  selectedIds: readonly string[],
  deltaVelocity: number
): AppNote[] {
  if (notes.length === 0 || selectedIds.length === 0 || deltaVelocity === 0) {
    return [...notes]
  }

  const selectedSet = new Set(selectedIds)
  let hasChanged = false

  const updated = notes.map((note) => {
    if (!selectedSet.has(note.id)) return note
    const newVelocity = Math.max(1, Math.min(127, Math.round(note.velocity + deltaVelocity)))
    if (newVelocity !== note.velocity) {
      hasChanged = true
      return {
        ...note,
        velocity: newVelocity
      }
    }
    return note
  })

  return hasChanged ? updated : [...notes]
}

/**
 * Toggles the muted state of targeted notes following Ableton Live ergonomics:
 * If any selected note is unmuted (active), all selected notes are muted.
 * If all selected notes are already muted, all selected notes are unmuted.
 */
export function toggleNotesMute(notes: readonly AppNote[], selectedIds: readonly string[]): AppNote[] {
  if (notes.length === 0 || selectedIds.length === 0) {
    return [...notes]
  }

  const selectedSet = new Set(selectedIds)
  const selectedNotes = notes.filter((n) => selectedSet.has(n.id))
  if (selectedNotes.length === 0) return [...notes]

  const anyActive = selectedNotes.some((n) => !n.isMuted)
  const targetMuted = anyActive

  return notes.map((note) => {
    if (!selectedSet.has(note.id)) return note
    return {
      ...note,
      isMuted: targetMuted
    }
  })
}

export interface TransposeNotesOptions {
  isScaleLocked?: boolean
  rootKey?: string
  scale?: string
  minMidi?: number
  maxMidi?: number
}

/**
 * Transposes notes vertically. If isScaleLocked is true and transposing by scale steps
 * (Math.abs(delta) !== 12), walks along the scale degrees of rootKey and scale.
 * Octave shifts (Math.abs(delta) === 12) preserve scale degrees by adding ±12 semitones.
 */
export function transposeNotesPitch(
  notes: readonly AppNote[],
  selectedIds: readonly string[],
  delta: number,
  options?: TransposeNotesOptions
): AppNote[] {
  if (notes.length === 0 || selectedIds.length === 0 || delta === 0) {
    return [...notes]
  }

  const selectedSet = new Set(selectedIds)
  const isDiatonic = Boolean(options?.isScaleLocked && Math.abs(delta) % 12 !== 0 && options?.rootKey && options?.scale)
  const root = options?.rootKey ?? 'C'
  const scale = options?.scale ?? 'major'
  const minMidi = options?.minMidi ?? 0
  const maxMidi = options?.maxMidi ?? 127

  let anyChanged = false

  const updated = notes.map((note) => {
    if (!selectedSet.has(note.id)) return note
    let newMidi: number
    if (isDiatonic) {
      newMidi = Math.max(minMidi, Math.min(maxMidi, transposeMidiInScale(note.midi, delta, root, scale)))
    } else {
      newMidi = Math.max(minMidi, Math.min(maxMidi, note.midi + delta))
    }

    if (newMidi !== note.midi) {
      anyChanged = true
      return {
        ...note,
        midi: newMidi,
        pitch: midiToPitch(newMidi)
      }
    }
    return note
  })

  return anyChanged ? updated : [...notes]
}
