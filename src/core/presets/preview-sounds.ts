import { CHORD_PRESETS, getPresetDefinition, LEAD_PRESETS, type SynthPresetDefinition } from './synths'
import { parseSynthPatch, type SynthPatch } from '../synth/patch'

export type PreviewTrack = 'lead' | 'chord'

export interface PreviewControls {
  // Row 1: ADSR envelope (0–100%)
  attack: number
  decay: number
  sustain: number
  release: number
  // Row 2: Filter & FX (0–100%)
  cutoff: number
  delay: number
  chorus: number
  reverb: number
}

export const FACTORY_SOUND_IDS = [...LEAD_PRESETS, ...CHORD_PRESETS].map((preset) => preset.id)

export function getPresetsForTrack(track: PreviewTrack): SynthPresetDefinition[] {
  return track === 'lead' ? [...LEAD_PRESETS] : [...CHORD_PRESETS]
}

export function getFactorySound(id: string): SynthPatch {
  const patch = getPresetDefinition(id)
  if (!patch) {
    throw new Error(`Unknown factory sound: ${id}`)
  }
  return parseSynthPatch(structuredClone(patch))
}

// --- Parameter Conversions (0–100% <-> Audio Units) ---

export function attackToSeconds(attack: number): number {
  const u = Math.max(0, Math.min(100, attack)) / 100
  return Math.round(0.002 * Math.pow(2.0 / 0.002, u) * 1000) / 1000
}

export function secondsToAttack(seconds: number): number {
  const clamped = Math.max(0.002, Math.min(2.0, seconds))
  const u = (Math.log(clamped) - Math.log(0.002)) / Math.log(2.0 / 0.002)
  return Math.round(Math.max(0, Math.min(100, u * 100)))
}

export function decayToSeconds(decay: number): number {
  const u = Math.max(0, Math.min(100, decay)) / 100
  return Math.round(0.02 * Math.pow(4.0 / 0.02, u) * 1000) / 1000
}

export function secondsToDecay(seconds: number): number {
  const clamped = Math.max(0.02, Math.min(4.0, seconds))
  const u = (Math.log(clamped) - Math.log(0.02)) / Math.log(4.0 / 0.02)
  return Math.round(Math.max(0, Math.min(100, u * 100)))
}

export function sustainToLevel(sustain: number): number {
  return Math.round(Math.max(0, Math.min(100, sustain))) / 100
}

export function levelToSustain(level: number): number {
  return Math.round(Math.max(0, Math.min(1, level)) * 100)
}

export function releaseToSeconds(release: number): number {
  const u = Math.max(0, Math.min(100, release)) / 100
  return Math.round(0.05 * Math.pow(4.0 / 0.05, u) * 100) / 100
}

export function secondsToRelease(seconds: number): number {
  const clamped = Math.max(0.05, Math.min(4.0, seconds))
  const u = (Math.log(clamped) - Math.log(0.05)) / Math.log(4.0 / 0.05)
  return Math.round(Math.max(0, Math.min(100, u * 100)))
}

export function cutoffToHz(cutoff: number): number {
  const u = Math.max(0, Math.min(100, cutoff)) / 100
  return Math.round(200 * Math.pow(18000 / 200, u))
}

export function cutoffHzToPercent(hz: number): number {
  const clamped = Math.max(200, Math.min(18000, hz))
  const u = (Math.log(clamped) - Math.log(200)) / Math.log(18000 / 200)
  return Math.round(Math.max(0, Math.min(100, u * 100)))
}

/** Backward-compatible alias for cutoffToHz */
export const brightnessToCutoff = cutoffToHz

export function defaultPreviewControls(id: string): PreviewControls {
  const patch = getFactorySound(id)
  const macros = patch.backend === 'tone' ? patch.defaultMacros : undefined
  const cutoffHz = macros?.cutoff ?? 3800
  const env = patch.backend === 'tone' ? patch.options.envelope : undefined
  const attack = env ? Number(env.attack ?? 0.005) : 0.005
  const decay = env ? Number(env.decay ?? 0.5) : 0.5
  const sustain = env ? Number(env.sustain ?? 0.5) : 0.5
  const release = env ? Number(env.release ?? 0.5) : 0.5

  return {
    attack: secondsToAttack(attack),
    decay: secondsToDecay(decay),
    sustain: levelToSustain(sustain),
    release: secondsToRelease(release),
    cutoff: cutoffHzToPercent(cutoffHz),
    delay: Math.round((macros?.delaySend ?? 0) * 100),
    chorus: Math.round((macros?.chorusSend ?? 0) * 100),
    reverb: Math.round((macros?.reverbSend ?? 0.25) * 100)
  }
}

export function previewSendLevels(
  patch: SynthPatch,
  track: PreviewTrack,
  space: number
): { reverb: number; secondary: number } {
  const macros = patch.backend === 'tone' ? patch.defaultMacros : undefined
  const reverb = Math.max(0, Math.min(100, space)) / 100
  const defaultReverb = macros?.reverbSend ?? 0.25
  const defaultSecondary = track === 'lead' ? (macros?.delaySend ?? 0) : (macros?.chorusSend ?? 0)
  const secondary = defaultReverb > 0 ? defaultSecondary * (reverb / defaultReverb) : defaultSecondary * reverb
  return { reverb, secondary: Math.min(0.65, secondary) }
}

export function applyPreviewControls(patch: SynthPatch, controls: PreviewControls): SynthPatch {
  const next = structuredClone(patch) as SynthPatch & {
    options: {
      envelope?: {
        attack?: number
        decay?: number
        sustain?: number
        release?: number
      }
    }
  }
  if (next.options.envelope) {
    next.options.envelope.attack = attackToSeconds(controls.attack)
    next.options.envelope.decay = decayToSeconds(controls.decay)
    next.options.envelope.sustain = sustainToLevel(controls.sustain)
    next.options.envelope.release = releaseToSeconds(controls.release)
  }
  return parseSynthPatch(next)
}
