/** Initial macro values of a freshly constructed rack. */
export const EFFECTS_RACK_DEFAULTS = {
  leadCutoff: 3200,
  leadResonance: 1.5,
  leadDelaySend: 0.15,
  leadChorusSend: 0.0,
  leadReverbSend: 0.25,
  chordCutoff: 2500,
  chordDelaySend: 0.0,
  chordChorusSend: 0.2,
  chordReverbSend: 0.3,
  leadVolume: 0.9,
  chordVolume: 0.75,
  masterVolume: 0.9
} as const

/** Continuous controls ramp on the audio clock so parameter moves never click. */
export const PARAM_RAMP_SECONDS = 0.05

/** Bypass crossfade of the creative bus compressor. */
export const COMPRESSOR_CROSSFADE_SECONDS = 0.02

export const MIN_FILTER_CUTOFF_HZ = 200
export const MAX_FILTER_CUTOFF_HZ = 18000
export const MIN_FILTER_RESONANCE = 0
export const MAX_FILTER_RESONANCE = 12
