import { parseSynthPatch } from '../../synth/patch'
import { CHORD_PRESETS } from './chords'
import { LEAD_PRESETS } from './lead'
import type { SynthPresetCategory, SynthPresetDefinition } from './types'

export * from './types'
export * from './lead'
export * from './chords'

export const PREVIEW_SYNTH_PRESET: SynthPresetDefinition = {
  id: 'preview-synth',
  name: 'Preview Synth',
  category: 'preview',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: [],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'synth',
  description: 'Ultra-fast low latency feedback synth for keyboard preview clicks.',
  outputTrimDb: -16,
  options: {
    oscillator: {
      type: 'triangle'
    },
    envelope: {
      attack: 0.005,
      decay: 0.1,
      sustain: 0.3,
      release: 0.1
    }
  }
}

export const ALL_BUILTIN_PRESETS: SynthPresetDefinition[] = [
  ...LEAD_PRESETS,
  ...CHORD_PRESETS,
  PREVIEW_SYNTH_PRESET
].map((preset) => {
  parseSynthPatch(preset)
  return deepFreeze(preset)
})

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

export const BUILTIN_PRESETS_MAP: Record<string, SynthPresetDefinition> = Object.fromEntries(
  ALL_BUILTIN_PRESETS.map((preset) => [preset.id, preset])
)

export function getPresetDefinition(id: string, _category?: SynthPresetCategory): SynthPresetDefinition | undefined {
  return ALL_BUILTIN_PRESETS.find((patch) => patch.id === id)
}

export function getAllPresets(category?: SynthPresetCategory): SynthPresetDefinition[] {
  return category ? ALL_BUILTIN_PRESETS.filter((p) => p.category === category) : [...ALL_BUILTIN_PRESETS]
}
