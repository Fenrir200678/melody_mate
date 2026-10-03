import type { InstrumentHost } from '../instrument-host'
import type { ChordEvent } from '../../core/schemas/chord.schema'
import type { AppNote } from '../../core/schemas/note.schema'
import type { EventGenerationTracker } from '../../core/synth/event-generation'
import { durationToSeconds, getStepDurationSeconds, normalizePitchOctave } from '../../core/transport/playback-timing'
import { convertMidiPitches } from '../../core/midi/live-messages'
import type { TrackOutputRouter } from '../output-router'
import type { MidiPreviewEvent } from '../midi/preview-output'
import { now as audioNow } from '../transport-adapter'

export interface NotesAuditionOptions {
  /** Step that maps to t=0; defaults to the first sounding note so takes start immediately. */
  originStep?: number
  /** Minimum audible span in steps, so trailing rests of the source range are kept. */
  durationSteps?: number
}

export interface PreviewControllerDeps {
  outputRouter?: TrackOutputRouter
  readonly generations: EventGenerationTracker
  getLeadPreviewSynth(): InstrumentHost | null
  getChordPreviewSynth(): InstrumentHost | null
  /** Keeps voice ownership bounded after a note-on, in case no release callback follows. */
  holdVoice(voiceId: string, holdSeconds: number): void
  /** Withdraws note-ons that were already queued inside audio nodes. */
  truncateVoices(): void
}

/**
 * Handles live auditioning and progression previews on the dedicated preview synths.
 *
 * Auditions and progressions own their own generations, so a cancelled progression can never start
 * a later note, and cancelling one only fades the chord track when that session still owned a voice.
 */
export class PreviewController {
  private progressionPreviewTimer: ReturnType<typeof setTimeout> | null = null
  private previewChordTimers: ReturnType<typeof setTimeout>[] = []
  private notesAuditionTimer: ReturnType<typeof setTimeout> | null = null
  private notesAuditionStartTimers: ReturnType<typeof setTimeout>[] = []
  private notesAuditionReleaseTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private notesAuditionFinish: (() => void) | null = null

  private readonly deps: PreviewControllerDeps

  constructor(deps: PreviewControllerDeps) {
    this.deps = deps
  }

  previewNote(pitch: string, duration = '8n', velocity = 0.8): void {
    this.deps.outputRouter?.preview('note', 'lead', [
      this.pitchEvent([pitch], audioNow(), durationToSeconds(duration), velocity)
    ])
    const { generations } = this.deps
    const generation = generations.openGeneration('note-audition')
    const handle = generations.beginVoice('note-audition', generation, pitch)[0]
    this.deps.getLeadPreviewSynth()?.playNote(handle?.id ?? '', pitch, duration, audioNow(), velocity)
    if (handle) this.deps.holdVoice(handle.id, durationToSeconds(duration))
  }

  previewChord(notes: string[], duration = '2n', velocity = 0.7): void {
    if (notes.length === 0) return
    const { generations } = this.deps
    const generation = generations.openGeneration('chord-audition')
    const normalised = notes.map((note) => normalizePitchOctave(note, 3))
    this.deps.outputRouter?.preview('chord', 'chord', [
      this.pitchEvent(normalised, audioNow(), durationToSeconds(duration), velocity)
    ])
    const handle = generations.beginVoice('chord-audition', generation, normalised.join(','))[0]
    this.deps.getChordPreviewSynth()?.playNote(handle?.id ?? '', normalised, duration, audioNow(), velocity)
    if (handle) this.deps.holdVoice(handle.id, durationToSeconds(duration))
  }

  auditionNotes(notes: AppNote[], bpm: number, onFinish?: () => void, options: NotesAuditionOptions = {}): void {
    this.stopNotesAudition()
    const playableNotes = notes.filter((note) => !note.isMuted)
    const leadSynth = this.deps.getLeadPreviewSynth()
    if (playableNotes.length === 0) {
      onFinish?.()
      return
    }
    this.notesAuditionFinish = onFinish ?? null

    const { generations } = this.deps
    const generation = generations.openGeneration('take-audition')
    const stepSeconds = getStepDurationSeconds(bpm, '16n')
    const firstStep = options.originStep ?? Math.min(...playableNotes.map((note) => note.step))
    let totalDuration = Math.max(0, (options.durationSteps ?? 0) * stepSeconds)

    const startTime = audioNow()
    this.deps.outputRouter?.preview(
      'notes',
      'lead',
      playableNotes.map((note) => ({
        midiNotes: [{ midi: note.midi, source: { kind: 'preview', sourceId: note.id } }],
        onTimeSeconds: startTime + Math.max(0, (note.step - firstStep) * stepSeconds),
        durationSeconds: Math.max(0.05, note.durationSteps * stepSeconds),
        velocity: note.velocity / 127
      }))
    )
    for (const note of playableNotes) {
      const startOffset = (note.step - firstStep) * stepSeconds
      const duration = Math.max(0.05, note.durationSteps * stepSeconds)
      const play = () => {
        if (!leadSynth || !generations.isCurrent('take-audition', generation)) return
        const handle = generations.beginVoice('take-audition', generation, note.pitch)[0]
        if (!handle) return
        leadSynth.noteOn(handle.id, note.pitch, audioNow(), note.velocity / 127)
        this.deps.holdVoice(handle.id, duration)
        const releaseTimer = setTimeout(() => {
          this.notesAuditionReleaseTimers.delete(handle.id)
          if (!generations.isCurrent('take-audition', generation)) return
          leadSynth.noteOff(handle.id, audioNow())
          generations.endVoice(handle.id)
        }, duration * 1000)
        this.notesAuditionReleaseTimers.set(handle.id, releaseTimer)
      }
      if (startOffset === 0) play()
      else {
        this.notesAuditionStartTimers.push(setTimeout(play, startOffset * 1000))
      }
      totalDuration = Math.max(totalDuration, startOffset + duration)
    }

    this.notesAuditionTimer = setTimeout(
      () => {
        this.notesAuditionTimer = null
        generations.releaseSession('take-audition')
        this.finishNotesAudition()
      },
      Math.max(100, (totalDuration + 0.1) * 1000)
    )
  }

  stopNotesAudition(): void {
    this.deps.outputRouter?.cancelPreview('notes')
    for (const timer of this.notesAuditionStartTimers) clearTimeout(timer)
    this.notesAuditionStartTimers = []
    for (const timer of this.notesAuditionReleaseTimers.values()) clearTimeout(timer)
    this.notesAuditionReleaseTimers.clear()
    if (this.notesAuditionTimer) {
      clearTimeout(this.notesAuditionTimer)
      this.notesAuditionTimer = null
    }
    const { generations } = this.deps
    const hadVoices = generations.getActiveVoiceCount('take-audition') > 0
    generations.invalidate('take-audition')
    generations.releaseSession('take-audition')
    if (hadVoices) {
      this.deps.getLeadPreviewSynth()?.releaseAll()
    }
    this.finishNotesAudition()
  }

  private finishNotesAudition(): void {
    const finish = this.notesAuditionFinish
    this.notesAuditionFinish = null
    finish?.()
  }

  previewProgression(
    chords: ChordEvent[],
    bpm: number,
    onChordChangeOrFinish?: ((chordId: string | null) => void) | (() => void),
    maybeFinish?: () => void
  ): void {
    let onChordChange: ((chordId: string | null) => void) | undefined
    let onFinish: (() => void) | undefined

    if (typeof maybeFinish === 'function') {
      onChordChange = onChordChangeOrFinish as (chordId: string | null) => void
      onFinish = maybeFinish
    } else if (typeof onChordChangeOrFinish === 'function') {
      onFinish = onChordChangeOrFinish as () => void
    }

    this.stopProgressionPreview()
    const chordSynth = this.deps.getChordPreviewSynth()
    if (!chords || chords.length === 0) {
      onFinish?.()
      return
    }

    const { generations } = this.deps
    generations.invalidate('progression-preview')
    const generation = generations.openGeneration('progression-preview')

    const beatSeconds = 60 / Math.max(20, bpm)
    const barSeconds = beatSeconds * 4
    const startTime = audioNow()

    const midiEvents: MidiPreviewEvent[] = []
    let totalDuration = 0
    for (const chord of chords) {
      if (!chord.voicing || chord.voicing.length === 0) continue
      const startOffset = chord.startBar * barSeconds
      const duration = Math.max(0.2, chord.durationBars * barSeconds * 0.95)
      const voicedNotes = chord.voicing.map((n) => normalizePitchOctave(n, 3))

      const handle = generations.beginVoice('progression-preview', generation, voicedNotes.join(','))[0]
      midiEvents.push(this.pitchEvent(voicedNotes, startTime + startOffset, duration, 0.75))
      if (handle) chordSynth?.playNote(handle.id, voicedNotes, duration, startTime + startOffset, 0.75)

      // Schedule UI highlight for when this chord starts sounding
      const startTimer = setTimeout(
        () => {
          if (!generations.isCurrent('progression-preview', generation)) return
          onChordChange?.(chord.id)
        },
        Math.max(0, startOffset * 1000)
      )
      this.previewChordTimers.push(startTimer)

      // Schedule UI unhighlight when this chord finishes sounding
      const endTimer = setTimeout(
        () => {
          if (!generations.isCurrent('progression-preview', generation)) return
          onChordChange?.(null)
        },
        Math.max(0, (startOffset + duration) * 1000)
      )
      this.previewChordTimers.push(endTimer)

      const endOffset = startOffset + duration
      if (endOffset > totalDuration) {
        totalDuration = endOffset
      }
    }

    this.deps.outputRouter?.preview('progression', 'chord', midiEvents)
    this.progressionPreviewTimer = setTimeout(
      () => {
        this.progressionPreviewTimer = null
        this.clearPreviewChordTimers()
        // A session that was cancelled meanwhile must not report completion.
        if (!generations.isCurrent('progression-preview', generation)) return
        generations.releaseSession('progression-preview')
        onChordChange?.(null)
        onFinish?.()
      },
      Math.max(100, (totalDuration + 0.1) * 1000)
    )
  }

  private clearPreviewChordTimers(): void {
    for (const timer of this.previewChordTimers) {
      clearTimeout(timer)
    }
    this.previewChordTimers = []
  }

  /**
   * Cancels a queued or sounding progression preview. The session is invalidated (so no later
   * callback of it can start a note) and its already-queued note-ons are withdrawn by a short
   * fade, because cancelling the JavaScript completion timer alone cannot stop them.
   */
  stopProgressionPreview(): void {
    this.deps.outputRouter?.cancelPreview('progression')
    if (this.progressionPreviewTimer) {
      clearTimeout(this.progressionPreviewTimer)
      this.progressionPreviewTimer = null
    }
    this.clearPreviewChordTimers()
    const { generations } = this.deps
    // Count before invalidating, because the generation bump makes the session's voices stale and
    // they are then no longer reported as owned.
    const hadVoices = generations.getActiveVoiceCount('progression-preview') > 0
    generations.invalidate('progression-preview')
    generations.releaseSession('progression-preview')
    this.deps.getChordPreviewSynth()?.releaseAll()
    if (hadVoices) this.deps.truncateVoices()
  }

  private pitchEvent(
    pitches: string[],
    onTimeSeconds: number,
    durationSeconds: number,
    velocity: number
  ): MidiPreviewEvent {
    return {
      midiNotes: convertMidiPitches(pitches).midis.map((midi) => ({
        midi,
        source: { kind: 'preview', sourceId: pitches.join(',') }
      })),
      onTimeSeconds,
      durationSeconds,
      velocity
    }
  }

  dispose(): void {
    this.stopNotesAudition()
    this.stopProgressionPreview()
    this.deps.outputRouter?.cancelPreviews()
  }
}
