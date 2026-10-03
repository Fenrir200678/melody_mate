import { effectScope, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { PlaybackEngine } from '../../src/audio/playback-engine'
import type { AppNote } from '../../src/core/schemas/note.schema'
import type { ChordEvent } from '../../src/core/schemas/chord.schema'
import { useAudioAudition } from '../../src/composables/useAudioAudition'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function engineStub() {
  return {
    previewNote: vi.fn(),
    previewChord: vi.fn(),
    auditionNotes: vi.fn(),
    stopNotesAudition: vi.fn(),
    previewProgression: vi.fn(),
    stopProgressionPreview: vi.fn(),
    stopRhythmPreview: vi.fn(),
    panic: vi.fn()
  } as unknown as PlaybackEngine & {
    previewNote: ReturnType<typeof vi.fn>
    previewChord: ReturnType<typeof vi.fn>
    auditionNotes: ReturnType<typeof vi.fn>
    stopNotesAudition: ReturnType<typeof vi.fn>
    previewProgression: ReturnType<typeof vi.fn>
    stopProgressionPreview: ReturnType<typeof vi.fn>
    stopRhythmPreview: ReturnType<typeof vi.fn>
    panic: ReturnType<typeof vi.fn>
  }
}

function createAudition(initializeAudio: () => Promise<PlaybackEngine | null>, engine = engineStub()) {
  const scope = effectScope()
  const audition = scope.run(() =>
    useAudioAudition({
      initializeAudio,
      getEngine: () => engine,
      initializationError: ref(null),
      getBpm: () => 120
    })
  )!
  return { audition, engine, scope }
}

const note: AppNote = {
  id: '11111111-1111-4111-8111-111111111111',
  pitch: 'C4',
  midi: 60,
  step: 0,
  durationSteps: 2,
  velocity: 100,
  isMuted: false
}

const chord: ChordEvent = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'C major',
  roman: 'I',
  notes: ['C', 'E', 'G'],
  voicing: ['C3', 'E3', 'G3'],
  startBar: 0,
  durationBars: 1
}

describe('useAudioAudition async lifecycle', () => {
  it('does not start a progression when stopped before audio initialization resolves', async () => {
    const pending = deferred<PlaybackEngine | null>()
    const { audition, engine, scope } = createAudition(() => pending.promise)

    const request = audition.previewProgression([chord])
    audition.stopProgressionPreview()
    pending.resolve(engine)
    await request

    expect(engine.previewProgression).not.toHaveBeenCalled()
    expect(audition.isPreviewingProgression.value).toBe(false)
    expect(audition.previewingChordId.value).toBeNull()
    scope.stop()
  })

  it('starts only the latest progression request after concurrent initialization', async () => {
    const first = deferred<PlaybackEngine | null>()
    const second = deferred<PlaybackEngine | null>()
    const requests = [first, second]
    const { audition, engine, scope } = createAudition(() => requests.shift()!.promise)

    const olderRequest = audition.previewProgression([chord])
    const newerChords = [{ ...chord, id: '33333333-3333-4333-8333-333333333333' }]
    const newerRequest = audition.previewProgression(newerChords)
    first.resolve(engine)
    await olderRequest
    expect(engine.previewProgression).not.toHaveBeenCalled()

    second.resolve(engine)
    await newerRequest
    expect(engine.previewProgression).toHaveBeenCalledOnce()
    expect(engine.previewProgression).toHaveBeenCalledWith(newerChords, 120, expect.any(Function), expect.any(Function))
    scope.stop()
  })

  it('does not start a take audition when stopped before audio initialization resolves', async () => {
    const pending = deferred<PlaybackEngine | null>()
    const { audition, engine, scope } = createAudition(() => pending.promise)

    const request = audition.auditionNotes([note], 120, 'take:one')
    audition.stopNotesAudition()
    pending.resolve(engine)
    await request

    expect(engine.auditionNotes).not.toHaveBeenCalled()
    expect(audition.auditioningId.value).toBeNull()
    scope.stop()
  })

  it.each(['panic', 'dispose'] as const)(
    '%s prevents pending note, chord and progression auditions from starting',
    async (cancel) => {
      const pending = deferred<PlaybackEngine | null>()
      const { audition, engine, scope } = createAudition(() => pending.promise)
      const noteRequest = audition.auditionPitch('C4')
      const chordRequest = audition.auditionChord(['C3', 'E3', 'G3'])
      const progressionRequest = audition.previewProgression([chord])

      if (cancel === 'panic') audition.panic()
      else scope.stop()
      pending.resolve(engine)
      await Promise.all([noteRequest, chordRequest, progressionRequest])

      expect(engine.previewNote).not.toHaveBeenCalled()
      expect(engine.previewChord).not.toHaveBeenCalled()
      expect(engine.previewProgression).not.toHaveBeenCalled()
      if (cancel === 'panic') scope.stop()
    }
  )
})
