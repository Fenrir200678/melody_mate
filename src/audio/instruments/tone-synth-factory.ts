import { parseSynthPatch } from '../../core/synth/patch'
import * as Tone from 'tone'
import {
  getPresetDefinition,
  SOFT_TRIANGLE_KEYS_PRESET,
  TRIANGLE_COMP_PRESET,
  PREVIEW_SYNTH_PRESET,
  type SynthPresetDefinition
} from '../../core/presets/synths'
import type { ChordPreset, LeadPreset } from '../../core/schemas/synth.schema'
import { clampPresetTrimDb } from '../../core/audio/gain-staging'

export * from '../../core/presets/synths'

/**
 * Instantiates a Tone.PolySynth configured by a preset definition.
 */
export function createSynthFromDefinition(definition: SynthPresetDefinition): Tone.PolySynth {
  definition = parseSynthPatch(definition) as SynthPresetDefinition
  let synth: Tone.PolySynth
  switch (definition.synthType) {
    case 'mono':
      synth = new Tone.PolySynth(Tone.MonoSynth, definition.options)
      break
    case 'am':
      synth = new Tone.PolySynth(Tone.AMSynth, definition.options)
      break
    case 'fm':
      synth = new Tone.PolySynth(Tone.FMSynth, definition.options)
      break
    case 'synth':
    default:
      synth = new Tone.PolySynth(Tone.Synth, definition.options)
  }
  synth.volume.value = clampPresetTrimDb(definition.outputTrimDb)
  return synth
}

/**
 * Creates a PolySynth for lead melodies from either a preset ID or a full definition.
 */
export function createLeadSynth(preset: LeadPreset | SynthPresetDefinition): Tone.PolySynth {
  const definition = typeof preset === 'string' ? getPresetDefinition(preset, 'lead') : preset
  if (!definition) {
    return createSynthFromDefinition(SOFT_TRIANGLE_KEYS_PRESET)
  }
  return createSynthFromDefinition(definition)
}

/**
 * Creates a PolySynth for accompaniment chords from either a preset ID or a full definition.
 */
export function createChordSynth(preset: ChordPreset | SynthPresetDefinition): Tone.PolySynth {
  const definition = typeof preset === 'string' ? getPresetDefinition(preset, 'chord') : preset
  if (!definition) {
    return createSynthFromDefinition(TRIANGLE_COMP_PRESET)
  }
  return createSynthFromDefinition(definition)
}

/**
 * Creates an audition synth for instant piano roll keyboard clicks. Defaults to the
 * low-latency preview preset, but callers pass the active lead preset so auditioned
 * notes match the selected lead sound.
 */
export function createPreviewSynth(preset: LeadPreset | SynthPresetDefinition = PREVIEW_SYNTH_PRESET): Tone.PolySynth {
  return createLeadSynth(preset)
}

/**
 * Safely disposes a Tone.js synth or audio node.
 */
export function disposeSynth(synth: Tone.ToneAudioNode | Tone.PolySynth | null | undefined): void {
  if (synth && typeof synth.dispose === 'function') {
    synth.dispose()
  }
}

/**
 * Updates polyphonic synth release time using a multiplier relative to the preset base release.
 */
export function applyReleaseMultiplier(synth: Tone.PolySynth, baseRelease: number, multiplier: number): void {
  const clampedMultiplier = Math.max(0.2, Math.min(3.0, multiplier))
  const newRelease = Math.max(0.02, Math.min(10.0, baseRelease * clampedMultiplier))
  synth.set({
    envelope: {
      release: newRelease
    }
  })
}

/**
 * Applies a partial configuration patch to all voices of a PolySynth in real-time.
 * Foundation for live parameter manipulation in a future synth GUI.
 */
export function applySynthPatch(synth: Tone.PolySynth, patch: SynthPresetDefinition): void {
  const validated = parseSynthPatch(patch)
  if (validated.backend !== 'tone') throw new Error('Expected a Tone patch')
  synth.set(validated.options)
}
