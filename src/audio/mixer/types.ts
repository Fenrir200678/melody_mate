import type * as Tone from 'tone'

/** The two instrument tracks the rack mixes. */
export type TrackId = 'lead' | 'chord'

export interface EffectsRackState {
  leadCutoff: number
  leadResonance: number
  leadDelaySend: number
  leadChorusSend?: number
  leadReverbSend: number
  chordCutoff: number
  chordDelaySend?: number
  chordChorusSend: number
  chordReverbSend: number
  leadVolume: number
  chordVolume: number
  masterVolume: number
  isLeadMuted: boolean
  isChordMuted: boolean
  isLeadSolo: boolean
  isChordSolo: boolean
  isBusCompressorActive?: boolean
}

/** One voice-graph replacement: `incoming` fades in while `outgoing` fades out. */
export interface VoiceGraphFade {
  track: TrackId
  incoming: Tone.Gain
  outgoing: Tone.Gain
  crossfadeSeconds: number
}
