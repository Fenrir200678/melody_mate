/**
 * @module AudioService
 *
 * This service acts as a facade for the audio-related functionalities of the application.
 * It re-exports functions from the modularized audio services, providing a single
 * point of access for audio operations like playback, synth management, and callbacks.
 * This approach decouples the rest of the application from the internal structure
 * of the audio services, making it easier to maintain and refactor.
 */

// Re-export playback controls
export { playMelody, stopPlayback } from './audio/playback'

// Re-export callback setters and clearers
export {
  setStepUpdateCallback,
  setNotePlayCallback,
  clearStepUpdateCallback,
  clearNotePlayCallback
} from './audio/callbacks'
