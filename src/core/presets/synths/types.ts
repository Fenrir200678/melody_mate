import type { ToneSynthPatch } from '../../synth/patch'

export type SynthPresetDefinition = ToneSynthPatch
export type SynthPresetCategory = ToneSynthPatch['category']
export type SynthPresetType = ToneSynthPatch['synthType']
export type SynthPresetMacros = NonNullable<ToneSynthPatch['defaultMacros']>
