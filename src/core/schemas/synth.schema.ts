import { z } from 'zod'
import { DEFAULT_AUDIO_SOUND_IDS, DEFAULT_SYNTH_MACROS } from '../../config/defaults'

export const LeadPresetEnum = z.string().min(1)
export type LeadPreset = z.infer<typeof LeadPresetEnum>
export const ChordPresetEnum = z.string().min(1)
export type ChordPreset = z.infer<typeof ChordPresetEnum>

export const LeadMacrosSchema = z.object({
  cutoff: z.number().min(20).max(20000).default(DEFAULT_SYNTH_MACROS.leadCutoff),
  resonance: z.number().min(0).max(12).default(DEFAULT_SYNTH_MACROS.leadResonance),
  delaySend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.leadDelaySend),
  chorusSend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.leadChorusSend),
  reverbSend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.leadReverbSend)
})
export type LeadMacros = z.infer<typeof LeadMacrosSchema>

export const ChordMacrosSchema = z.object({
  cutoff: z.number().min(20).max(20000).default(DEFAULT_SYNTH_MACROS.chordCutoff),
  delaySend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.chordDelaySend),
  chorusSend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.chordChorusSend),
  reverbSend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.chordReverbSend)
})
export type ChordMacros = z.infer<typeof ChordMacrosSchema>

export const SynthConfigSchema = z.object({
  leadPreset: LeadPresetEnum.default(DEFAULT_AUDIO_SOUND_IDS.lead),
  chordPreset: ChordPresetEnum.default(DEFAULT_AUDIO_SOUND_IDS.chord),
  leadCutoff: z.number().min(20).max(20000).default(DEFAULT_SYNTH_MACROS.leadCutoff),
  leadResonance: z.number().min(0).max(12).default(DEFAULT_SYNTH_MACROS.leadResonance),
  leadDelaySend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.leadDelaySend),
  leadChorusSend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.leadChorusSend),
  leadReverbSend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.leadReverbSend),
  chordCutoff: z.number().min(20).max(20000).default(DEFAULT_SYNTH_MACROS.chordCutoff),
  chordDelaySend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.chordDelaySend),
  chordChorusSend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.chordChorusSend),
  chordReverbSend: z.number().min(0).max(1).default(DEFAULT_SYNTH_MACROS.chordReverbSend)
})

export type SynthConfig = z.infer<typeof SynthConfigSchema>
