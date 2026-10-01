import type { TrackId } from './types'

interface ChannelState {
  volume: number
  muted: boolean
  solo: boolean
}

function otherTrack(track: TrackId): TrackId {
  return track === 'lead' ? 'chord' : 'lead'
}

function clampUnitGain(gain: number): number {
  return Math.max(0, Math.min(1, gain))
}

export interface ChannelMixInitialState {
  leadVolume: number
  chordVolume: number
}

/**
 * Pure volume/mute/solo bookkeeping for the two instrument tracks. Solo follows the usual DAW
 * rule: any active solo silences every track that is not soloed itself, while mute always wins
 * over solo.
 */
export class ChannelMixControls {
  private readonly channels: Record<TrackId, ChannelState>

  constructor(initial: ChannelMixInitialState) {
    this.channels = {
      lead: { volume: clampUnitGain(initial.leadVolume), muted: false, solo: false },
      chord: { volume: clampUnitGain(initial.chordVolume), muted: false, solo: false }
    }
  }

  setVolume(track: TrackId, gain: number): void {
    this.channels[track].volume = clampUnitGain(gain)
  }

  getVolume(track: TrackId): number {
    return this.channels[track].volume
  }

  setMute(track: TrackId, muted: boolean): void {
    this.channels[track].muted = muted
  }

  isMuted(track: TrackId): boolean {
    return this.channels[track].muted
  }

  setSolo(track: TrackId, solo: boolean): void {
    this.channels[track].solo = solo
  }

  isSolo(track: TrackId): boolean {
    return this.channels[track].solo
  }

  isAudible(track: TrackId): boolean {
    const channel = this.channels[track]
    if (channel.muted) return false
    if (this.channels[otherTrack(track)].solo && !channel.solo) return false
    return true
  }

  /** Fader value the audio graph should hold, or 0 while the track is muted or soloed away. */
  getTargetGain(track: TrackId): number {
    return this.isAudible(track) ? this.channels[track].volume : 0
  }
}
