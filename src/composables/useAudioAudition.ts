import { ref, type Ref } from 'vue'
import type { PlaybackEngine } from '../audio/audio-runtime'
import type { NotesAuditionOptions } from '../audio/playback-engine/preview-controller'
import type { AppNote } from '../core/schemas/note.schema'
import type { ChordEvent } from '../core/schemas/chord.schema'
import type { CustomRhythmPattern } from '../core/schemas/custom-rhythm.schema'

export interface UseAudioAuditionOptions {
  initializeAudio: () => Promise<PlaybackEngine | null>
  getEngine: () => PlaybackEngine | null
  initializationError: Ref<string | null>
  getBpm: () => number
}

export function useAudioAudition(options: UseAudioAuditionOptions) {
  let notesAuditionRequest = 0
  const auditioningId = ref<string | null>(null)
  const isPreviewingProgression = ref<boolean>(false)
  const previewingChordId = ref<string | null>(null)

  async function auditionPitch(pitch: string): Promise<void> {
    ;(await options.initializeAudio())?.previewNote(pitch)
  }

  async function auditionChord(notes: string[]): Promise<void> {
    ;(await options.initializeAudio())?.previewChord(notes)
  }

  async function auditionNotes(
    notes: AppNote[],
    bpm: number,
    id?: string,
    timing?: NotesAuditionOptions
  ): Promise<void> {
    const request = ++notesAuditionRequest
    auditioningId.value = id ?? null
    options.getEngine()?.stopNotesAudition()
    try {
      const engine = await options.initializeAudio()
      if (!engine || request !== notesAuditionRequest) {
        if (request === notesAuditionRequest) auditioningId.value = null
        return
      }
      engine.auditionNotes(
        notes,
        bpm,
        () => {
          if (request === notesAuditionRequest) auditioningId.value = null
        },
        timing
      )
    } catch (error) {
      if (request === notesAuditionRequest) {
        options.getEngine()?.stopNotesAudition()
        auditioningId.value = null
        options.initializationError.value = error instanceof Error ? error.message : 'Take audition failed.'
      }
    }
  }

  function stopNotesAudition(): void {
    notesAuditionRequest += 1
    auditioningId.value = null
    options.getEngine()?.stopNotesAudition()
  }

  async function previewProgression(chords: ChordEvent[]): Promise<void> {
    const engine = await options.initializeAudio()
    if (!engine) return
    isPreviewingProgression.value = true
    previewingChordId.value = null
    engine.previewProgression(
      chords,
      options.getBpm(),
      (chordId) => {
        previewingChordId.value = chordId
      },
      () => {
        isPreviewingProgression.value = false
        previewingChordId.value = null
      }
    )
  }

  function stopProgressionPreview(): void {
    const engine = options.getEngine()
    if (engine) {
      engine.stopProgressionPreview()
    }
    isPreviewingProgression.value = false
    previewingChordId.value = null
  }

  async function previewRhythm(
    pattern: CustomRhythmPattern,
    onStep: (step: number) => void,
    onFinished: () => void,
    shouldStart: () => boolean = () => true
  ): Promise<boolean> {
    const engine = await options.initializeAudio()
    if (!engine || !shouldStart()) return false
    return engine.previewRhythm(pattern, options.getBpm(), onStep, onFinished)
  }

  function stopRhythmPreview(): void {
    options.getEngine()?.stopRhythmPreview()
  }

  function panic(): void {
    notesAuditionRequest += 1
    auditioningId.value = null
    const engine = options.getEngine()
    if (engine) {
      engine.stopRhythmPreview()
      engine.panic()
    }
    isPreviewingProgression.value = false
    previewingChordId.value = null
  }

  return {
    auditioningId,
    isPreviewingProgression,
    previewingChordId,
    auditionPitch,
    auditionChord,
    auditionNotes,
    stopNotesAudition,
    previewProgression,
    stopProgressionPreview,
    previewRhythm,
    stopRhythmPreview,
    panic
  }
}
