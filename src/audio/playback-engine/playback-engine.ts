import * as Tone from 'tone'
import { transportSecondsToPlayheadStep } from '../../core/audio-dsp/output-latency'
import type { ChordEvent } from '../../core/schemas/chord.schema'
import type { AppNote } from '../../core/schemas/note.schema'
import { STEPS_PER_BAR, type ProjectConfig } from '../../core/schemas/project.schema'
import type { ChordPreset, LeadPreset } from '../../core/schemas/synth.schema'
import {
  createEventGenerationTracker,
  type EventGenerationTracker,
  type PlaybackSession
} from '../../core/synth/event-generation'
import { EffectsRack } from '../mixer'
import { getStepDurationSeconds } from '../../core/transport/playback-timing'
import { PreviewController, type NotesAuditionOptions } from './preview-controller'
import { SynthRegistry } from './synth-registry'
import { TransportScheduler } from './transport-scheduler'
import type { SynthPatch } from '../../core/synth/patch'
import {
  ensureAudioContextRunning,
  getAudibleTransportSeconds,
  setTransportLoop,
  stepToTransportPosition
} from '../transport-adapter'
import { TRUNCATE_SILENCE_POLICY } from '../../core/audio/voice-lifecycle'
import { RhythmPreviewController } from '../rhythm-preview'
import type { CustomRhythmPattern } from '../../core/schemas/custom-rhythm.schema'

export { stepToTransportPosition } from '../transport-adapter'

/**
 * Documented audible semantics of every transport/preview boundary. Each entry names the three
 * things that must happen together: future callbacks are invalidated, voices are released, and
 * events that already reached audio nodes are withdrawn by a short track fade.
 *
 * - `stop`     Rewinds the transport, releases every voice and fades the track inputs for
 *              12 ms, so notes that were already scheduled into nodes cannot ring on.
 * - `pause`    Keeps the transport position, releases every voice with the same short fade;
 *              resuming re-renders the schedule from the current step.
 * - `seek`     Moves the transport and releases any sounding voices so notes do not hang.
 *              The transport schedule stays intact and valid for playback.
 * - `preview`  Cancelling a progression or audition releases that session's voices and fades
 *              the corresponding track, because queued note-ons cannot be withdrawn otherwise.
 * - `panic`    Cancels the transport schedule, releases all voices and applies a 35 ms fade to
 *              every track so release tails and effect returns are cleared.
 */
export const TRANSPORT_LIFECYCLE_SEMANTICS = {
  stop: 'rewind + invalidate + release + short track fade',
  pause: 'hold position + invalidate + release + short track fade',
  seek: 'move position + release sounding voices',
  preview: 'cancel session + release session voices + short track fade',
  panic: 'cancel schedule + release all voices + clear tails'
} as const

/**
 * Central PlaybackEngine managing multi-track scheduling on Tone.Transport,
 * live auditioning, synths, and master bus effects.
 *
 * The engine stays a thin orchestrator: voice graphs and presets live in the {@link SynthRegistry},
 * transport events in the {@link TransportScheduler} and auditions in the {@link PreviewController}.
 * It owns the session generation and the transport/preview lifecycle boundaries that tie them
 * together.
 */
export class PlaybackEngine {
  readonly effectsRack: EffectsRack
  readonly generations: EventGenerationTracker = createEventGenerationTracker()

  private readonly synths: SynthRegistry
  private readonly scheduler: TransportScheduler
  private readonly previews: PreviewController
  private rhythmPreview: RhythmPreviewController | null = null

  private readonly expiryTimers = new Set<ReturnType<typeof setTimeout>>()
  private isDisposed = false

  async initializeDiagnostics(): Promise<boolean> {
    const meteringReady = await this.effectsRack.initializeMetering()
    const protectionReady = await this.effectsRack.initializeOutputProtection()
    return meteringReady && protectionReady
  }

  constructor(effectsRack?: EffectsRack) {
    this.effectsRack = effectsRack ?? new EffectsRack()
    this.synths = new SynthRegistry(this.effectsRack)
    this.scheduler = new TransportScheduler({
      effectsRack: this.effectsRack,
      generations: this.generations,
      getLeadSynth: () => this.synths.getLead(),
      getChordSynth: () => this.synths.getChord(),
      holdVoice: (voiceId, holdSeconds) => this.scheduleVoiceExpiry(voiceId, holdSeconds)
    })
    this.previews = new PreviewController({
      generations: this.generations,
      getLeadPreviewSynth: () => this.synths.getLeadPreview(),
      getChordPreviewSynth: () => this.synths.getChordPreview(),
      holdVoice: (voiceId, holdSeconds) => this.scheduleVoiceExpiry(voiceId, holdSeconds),
      truncateVoices: () => this.truncateVoices()
    })

    // Only instantiate audio nodes if environment supports Web Audio
    if (typeof window !== 'undefined') {
      this.synths.initialize()
    }
  }

  private trackExpiry(callback: () => void, delayMs: number): void {
    const timer = setTimeout(() => {
      this.expiryTimers.delete(timer)
      callback()
    }, delayMs)
    this.expiryTimers.add(timer)
  }

  /**
   * Releases the note that this handle owns after its duration and release, so voice ownership
   * stays bounded instead of assuming that a release callback exists for every note-on.
   */
  private scheduleVoiceExpiry(id: string, holdSeconds: number): void {
    this.trackExpiry(() => this.generations.endVoice(id), Math.max(50, (holdSeconds + 0.25) * 1000))
  }

  /**
   * Schedules melody notes and accompaniment chords on Tone.Transport under fresh generations,
   * so events of the previous schedule can never start.
   */
  schedule(notes: AppNote[], chords: ChordEvent[], projectConfig: ProjectConfig): void {
    const transport = Tone.getTransport()
    transport.bpm.value = projectConfig.bpm
    this.setTempo(projectConfig.bpm)
    setTransportLoop(projectConfig.loopStartStep, projectConfig.loopEndStep, projectConfig.isLooping)

    const leadGen = this.beginTransportTrackSession('transport-lead')
    const chordGen = this.beginTransportTrackSession('transport-chord')
    this.scheduler.schedule(notes, chords, projectConfig, leadGen, chordGen)
  }

  /**
   * Updates only melody notes on the transport, leaving scheduled chords and active chord voices
   * completely untouched.
   */
  scheduleLead(notes: AppNote[], projectConfig: ProjectConfig): void {
    const leadGen = this.beginTransportTrackSession('transport-lead')
    this.scheduler.scheduleLead(notes, projectConfig, leadGen)
  }

  /**
   * Updates only chord accompaniment on the transport, leaving melody notes completely untouched.
   */
  scheduleChords(chords: ChordEvent[], projectConfig: ProjectConfig): void {
    const chordGen = this.beginTransportTrackSession('transport-chord')
    this.scheduler.scheduleChords(chords, projectConfig, chordGen)
    this.pickupActiveChordIfPlaying(chords, projectConfig, chordGen)
  }

  setTempo(bpm: number): void {
    this.synths.setTempo(bpm, Tone.now())
  }

  /**
   * Invalidates and resets one transport track session. When the transport is actively playing,
   * currently sounding voices are kept alive so they decay naturally instead of creating dropouts.
   */
  private beginTransportTrackSession(track: 'transport-lead' | 'transport-chord'): number {
    if (track === 'transport-lead') {
      this.scheduler.clearLead()
    } else {
      this.scheduler.clearChords()
    }
    this.generations.invalidate(track)
    if (Tone.getTransport().state !== 'started') {
      this.releaseSessionVoices(track)
    }
    return this.generations.openGeneration(track)
  }

  /**
   * If chords are updated while transport is playing, immediately sounds the chord corresponding
   * to the current playhead position for its remaining duration.
   */
  private pickupActiveChordIfPlaying(
    chords: ChordEvent[],
    projectConfig: ProjectConfig,
    eventGeneration: number
  ): void {
    if (Tone.getTransport().state !== 'started') return
    const currentStep = this.getCurrentStep(projectConfig.bpm)
    const stepsPerBar = STEPS_PER_BAR
    const currentBar = currentStep / stepsPerBar

    const activeChord = chords.find(
      (c) => c.voicing && c.voicing.length > 0 && currentBar >= c.startBar && currentBar < c.startBar + c.durationBars
    )
    if (!activeChord) return

    const chordEndStep = (activeChord.startBar + activeChord.durationBars) * stepsPerBar
    const remainingSteps = chordEndStep - currentStep
    const stepDuration = getStepDurationSeconds(projectConfig.bpm, '16n')
    const remainingSeconds = remainingSteps * stepDuration

    if (remainingSeconds > 0.05) {
      const chordSynth = this.synths.getChord()
      if (!this.effectsRack.isChordAudible() || !chordSynth) return
      const handle = this.generations.beginVoice('transport-chord', eventGeneration, activeChord.voicing.join(','))[0]
      if (!handle) return
      chordSynth.playNote(handle.id, activeChord.voicing, remainingSeconds, Tone.now(), 0.75)
      this.scheduleVoiceExpiry(handle.id, remainingSeconds)
    }
  }

  clearScheduledEvents(): void {
    this.scheduler.clear()
  }

  /**
   * Invalidates queued transport note-ons and releases the voices they already own. Tone keeps
   * scheduled attacks inside its event timeline, which `transport.clear` does not always reach.
   */
  private invalidateTransportSession(): void {
    this.generations.invalidate('transport')
    this.generations.invalidate('transport-lead')
    this.generations.invalidate('transport-chord')
    this.releaseSessionVoices('transport')
    this.releaseSessionVoices('transport-lead')
    this.releaseSessionVoices('transport-chord')
  }

  // --- Voice ownership ---

  private releaseSessionVoices(session: PlaybackSession): number {
    const released = this.generations.releaseSession(session)
    this.synths.releaseSessionVoices(session)
    return released.length
  }

  /**
   * Withdraws events that are already queued inside audio nodes. `releaseAll` stops future
   * note-ons from that synth but cannot withdraw an envelope that was already scheduled, so the
   * track inputs are faded to silence for a few milliseconds.
   */
  private truncateVoices(): void {
    this.effectsRack.silenceVoices(TRUNCATE_SILENCE_POLICY)
  }

  // --- Transport Controls ---

  async play(): Promise<void> {
    // A start directly after a stop or panic must not begin inside the 12–35 ms silencing window.
    this.effectsRack.restoreVoiceGains()
    await ensureAudioContextRunning()
    Tone.getTransport().start()
  }

  pause(): void {
    this.clearScheduledEvents()
    this.invalidateTransportSession()
    this.truncateVoices()
    Tone.getTransport().pause()
  }

  stop(targetStep = 0): void {
    this.previews.stopNotesAudition()
    const transport = Tone.getTransport()
    transport.stop()
    this.clearScheduledEvents()
    this.invalidateTransportSession()
    this.truncateVoices()
    transport.position = stepToTransportPosition(targetStep)
  }

  /**
   * Single panic action: cancels the remaining transport schedule, releases every voice and
   * clears release tails and effect returns through a short track fade. The transport position is
   * left untouched, so panic can be used as a safety action during playback.
   */
  panic(): void {
    this.previews.stopNotesAudition()
    Tone.getTransport().cancel()
    this.scheduler.reset()
    this.generations.releaseAll()
    this.synths.releaseAllVoices()
    this.effectsRack.silenceVoices()
    this.previews.stopProgressionPreview()
  }

  setLoop(startStep: number, endStep: number, isLooping: boolean): void {
    setTransportLoop(startStep, endStep, isLooping)
  }

  seekToStep(step: number): void {
    // Release any sounding voices so notes do not hang across the seek position
    this.releaseSessionVoices('transport')
    this.releaseSessionVoices('transport-lead')
    this.releaseSessionVoices('transport-chord')
    Tone.getTransport().position = stepToTransportPosition(step)
  }

  // --- Audition / Preview ---

  previewNote(pitch: string, duration = '8n', velocity = 0.8): void {
    this.previews.previewNote(pitch, duration, velocity)
  }

  previewChord(notes: string[], duration = '2n', velocity = 0.7): void {
    this.previews.previewChord(notes, duration, velocity)
  }

  auditionNotes(notes: AppNote[], bpm: number, onFinish?: () => void, options?: NotesAuditionOptions): void {
    this.previews.auditionNotes(notes, bpm, onFinish, options)
  }

  stopNotesAudition(): void {
    this.previews.stopNotesAudition()
  }

  previewProgression(
    chords: ChordEvent[],
    bpm: number,
    onChordChangeOrFinish?: ((chordId: string | null) => void) | (() => void),
    maybeFinish?: () => void
  ): void {
    this.previews.previewProgression(chords, bpm, onChordChangeOrFinish, maybeFinish)
  }

  stopProgressionPreview(): void {
    this.previews.stopProgressionPreview()
  }

  previewRhythm(
    pattern: CustomRhythmPattern,
    bpm: number,
    onStep: (step: number) => void,
    onFinished: () => void
  ): Promise<boolean> {
    this.rhythmPreview ??= new RhythmPreviewController(this.effectsRack)
    return this.rhythmPreview.start(
      pattern,
      bpm,
      { transportRunning: Tone.getTransport().state === 'started' },
      onStep,
      onFinished
    )
  }

  stopRhythmPreview(): void {
    this.rhythmPreview?.stop()
  }

  // --- Playhead & Time Queries ---

  getCurrentTimeSeconds(): number {
    return getAudibleTransportSeconds()
  }

  /** Fixed latency of the always-on final output protection stage and audio hardware in seconds. */
  getOutputLatencySeconds(): number {
    const rackLatency = this.effectsRack.getOutputLatencySeconds()
    let hardwareLatency = 0
    try {
      const rawCtx = Tone.getContext().rawContext as AudioContext | undefined
      if (rawCtx) {
        hardwareLatency = (rawCtx.outputLatency ?? 0) + (rawCtx.baseLatency ?? 0)
      }
    } catch {
      // Ignore in non-browser or mock environments
    }
    return rackLatency + hardwareLatency
  }

  /**
   * Continuous playhead position on the project step grid (fractional steps), loop-wrapped
   * by Tone's transport and never quantized — the sole time source for smooth rendering.
   * Compensated for output-protection latency during active playback so the cursor matches the audible sample.
   */
  getPlayheadStep(bpm: number): number {
    const stepSeconds = getStepDurationSeconds(bpm, '16n')
    if (stepSeconds <= 0) return 0
    const latency = Tone.getTransport().state === 'started' ? this.getOutputLatencySeconds() : 0
    return transportSecondsToPlayheadStep(this.getCurrentTimeSeconds(), stepSeconds, latency)
  }

  getCurrentStep(bpm: number): number {
    const stepDuration = getStepDurationSeconds(bpm, '16n')
    if (stepDuration <= 0) return 0
    const latency = Tone.getTransport().state === 'started' ? this.getOutputLatencySeconds() : 0
    return Math.floor(transportSecondsToPlayheadStep(this.getCurrentTimeSeconds(), stepDuration, latency))
  }

  // --- Preset Selection ---

  setLeadPreset(preset: LeadPreset | SynthPatch): void {
    this.synths.setLeadPreset(preset, typeof window !== 'undefined' && !this.isDisposed)
  }

  setChordPreset(preset: ChordPreset | SynthPatch): void {
    this.synths.setChordPreset(preset, typeof window !== 'undefined' && !this.isDisposed)
  }

  // --- Disposal ---

  dispose(): void {
    if (this.isDisposed) return
    this.isDisposed = true
    this.previews.dispose()
    this.rhythmPreview?.dispose()
    for (const timer of this.expiryTimers) clearTimeout(timer)
    this.expiryTimers.clear()
    this.generations.releaseAll()
    this.clearScheduledEvents()
    this.synths.dispose()
    this.effectsRack.dispose()
  }
}
