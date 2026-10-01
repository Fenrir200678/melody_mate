import * as Tone from 'tone'
import { now as audioNow } from '../transport-adapter'
import { PANIC_SILENCE_POLICY, type SilencePolicy } from '../../core/audio/voice-lifecycle'
import type { TrackId, VoiceGraphFade } from './types'

/**
 * Nodes of one track the lifecycle manager needs: the kill gain it can fade to silence and the
 * track input replacement voice graphs connect to.
 */
export interface VoiceGraphTrack {
  readonly voiceKill: Tone.Gain
  readonly input: Tone.Gain
}

/**
 * Owns voice-graph replacement and abrupt silencing for both instrument tracks.
 */
export class VoiceGraphLifecycle {
  private readonly tracks: Record<TrackId, VoiceGraphTrack>
  private readonly fades: VoiceGraphFade[] = []

  constructor(tracks: Record<TrackId, VoiceGraphTrack>) {
    this.tracks = tracks
  }

  /**
   * Crossfades a prepared replacement voice graph into its track and returns the gain the caller
   * must ramp out. Both ends move on the audio clock, so the swap never cuts a sounding note and
   * the linear pair sums back to unity (temporary doubling is a level-neutral overlap, not a boost).
   */
  replace(track: TrackId, connect: (target: Tone.Gain) => void, crossfadeSeconds: number): Tone.Gain {
    const outgoing = new Tone.Gain(1.0)
    const incoming = new Tone.Gain(0.0)
    const input = this.tracks[track].input

    outgoing.connect(input)
    incoming.connect(input)
    connect(incoming)

    const now = audioNow()
    outgoing.gain.setValueAtTime(1, now)
    outgoing.gain.linearRampToValueAtTime(0, now + crossfadeSeconds)
    incoming.gain.setValueAtTime(0, now)
    incoming.gain.linearRampToValueAtTime(1, now + crossfadeSeconds)

    this.fades.push({ track, incoming, outgoing, crossfadeSeconds })
    return outgoing
  }

  /**
   * Crossfade pairs that were installed for voice-graph replacement. Exposed for diagnostics and
   * tests; the runtime keeps ownership of the nodes themselves.
   */
  getFades(): VoiceGraphFade[] {
    return [...this.fades]
  }

  /** Silences a retired voice graph completely before it is disposed. */
  release(graph: Tone.Gain): void {
    graph.gain.cancelScheduledValues(audioNow())
    graph.gain.setValueAtTime(0, audioNow())
    const index = this.fades.findIndex((fade) => fade.outgoing === graph)
    if (index >= 0) this.fades.splice(index, 1)
  }

  /**
   * Silences every source for `fadeInSeconds` and recovers after `fadeOutSeconds`. Used for stop,
   * seek, preview cancellation and panic, where note events may already sit inside audio nodes
   * and cannot be withdrawn by a generation check alone.
   */
  silence(policy: SilencePolicy = PANIC_SILENCE_POLICY): void {
    for (const kill of this.killNodes()) {
      const now = audioNow()
      // A repeated panic must fade from the level that is audible right now, not from the last
      // programmed target, otherwise the second fade would start from a stale value.
      const current = kill.gain.getValueAtTime(now)
      kill.gain.cancelScheduledValues(now)
      kill.gain.setValueAtTime(current, now)
      kill.gain.linearRampToValueAtTime(0, now + policy.fadeInSeconds)
      kill.gain.setValueAtTime(0, now + policy.fadeInSeconds)
      kill.gain.linearRampToValueAtTime(1, now + policy.fadeInSeconds + policy.fadeOutSeconds)
    }
  }

  /** Current silencing factor of a track input; 1 means no temporary fade is active. */
  getKillGain(track: TrackId): number {
    return this.tracks[track].voiceKill.gain.value
  }

  /**
   * Restores the track inputs to unity before playback starts again, so a start immediately after
   * stop or panic does not begin inside the silencing window.
   */
  restore(): void {
    for (const kill of this.killNodes()) {
      const now = audioNow()
      kill.gain.cancelScheduledValues(now)
      kill.gain.setValueAtTime(1, now)
    }
  }

  /**
   * The first gain node behind each track input. Voices connect through it, so its automation
   * history shows whether a lifecycle action actually silenced sounding material.
   */
  getKillNode(track: TrackId): Tone.Gain {
    return this.tracks[track].voiceKill
  }

  private killNodes(): Tone.Gain[] {
    return [this.tracks.lead.voiceKill, this.tracks.chord.voiceKill]
  }
}
