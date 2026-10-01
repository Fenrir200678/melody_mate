import type { SynthPresetCategory } from './synths/types'
import { ALL_BUILTIN_PRESETS, getPresetDefinition } from './synths'
import { NATIVE_FACTORY_PATCHES } from '../synth/factory-patches'
import { parseSynthPatch, type SynthPatch } from '../synth/patch'

/**
 * All immutable factory presets available in the application, including Tone patches
 * and the native subtractive factory bank.
 */
export const ALL_FACTORY_PATCHES: readonly SynthPatch[] = Object.freeze([
  ...ALL_BUILTIN_PRESETS.filter((p) => p.category !== 'preview'),
  ...NATIVE_FACTORY_PATCHES
])

export interface AvailablePresetSummary {
  id: string
  name: string
  description: string
  category: SynthPresetCategory
  tags: string[]
  author: string
  source: 'factory' | 'user'
  backend: 'tone' | 'native-subtractive'
  outputTrimDb: number
}

export function toPresetSummary(patch: SynthPatch): AvailablePresetSummary {
  return {
    id: patch.id,
    name: patch.name,
    description: patch.description,
    category: patch.category,
    tags: [...patch.tags],
    author: patch.author,
    source: patch.source,
    backend: patch.backend,
    outputTrimDb: patch.outputTrimDb
  }
}

/**
 * Returns a unified list of all available presets (factory and user), optionally filtered by category.
 */
export function getAllAvailablePresets(filterCategory?: SynthPresetCategory | 'all'): AvailablePresetSummary[] {
  const all: AvailablePresetSummary[] = ALL_FACTORY_PATCHES.map(toPresetSummary)

  if (!filterCategory || filterCategory === 'all') {
    return all
  }

  return all.filter((preset) => preset.category === filterCategory)
}

/**
 * Resolves a patch candidate by either returning the parsed patch directly or
 * finding it by ID in the user library or factory banks.
 */
export function resolvePresetCandidate(idOrPatch: string | SynthPatch): SynthPatch | null {
  if (typeof idOrPatch !== 'string') {
    return parseSynthPatch(idOrPatch)
  }

  // Check all factory patches (both Tone and Native).
  const factoryMatch = ALL_FACTORY_PATCHES.find((p) => p.id === idOrPatch)
  if (factoryMatch) {
    return parseSynthPatch(factoryMatch)
  }

  // Fallback to built-in Tone presets registry.
  const factoryDefinition = getPresetDefinition(idOrPatch)
  if (factoryDefinition) {
    return parseSynthPatch(factoryDefinition)
  }

  return null
}
