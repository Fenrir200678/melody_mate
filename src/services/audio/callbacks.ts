import type { StepUpdateCallback, NotePlayCallback } from '@/ts/types/audio.types'

let stepUpdateCallback: StepUpdateCallback | null = null
let notePlayCallback: NotePlayCallback | null = null

/**
 * Sets a callback function that will be called for each rhythm step during playback
 * @param callback - Function to call with the current step index
 */
export function setStepUpdateCallback(callback: StepUpdateCallback | null): void {
  stepUpdateCallback = callback
}

/**
 * Sets a callback function that will be called when a note is actually played
 * @param callback - Function to call with the step index of the played note
 */
export function setNotePlayCallback(callback: NotePlayCallback | null): void {
  notePlayCallback = callback
}

/**
 * Clears the step update callback
 */
export function clearStepUpdateCallback(): void {
  stepUpdateCallback = null
}

/**
 * Clears the note play callback
 */
export function clearNotePlayCallback(): void {
  notePlayCallback = null
}

/**
 * Gets the current step update callback function.
 * @returns The current step update callback or null.
 */
export function getStepUpdateCallback(): StepUpdateCallback | null {
  return stepUpdateCallback
}

/**
 * Gets the current note play callback function.
 * @returns The current note play callback or null.
 */
export function getNotePlayCallback(): NotePlayCallback | null {
  return notePlayCallback
}
