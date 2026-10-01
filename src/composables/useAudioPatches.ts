import { ref } from 'vue'
import type { PlaybackEngine } from '../audio/audio-runtime'
import { applyPreviewControls, getFactorySound, type PreviewControls } from '../core/presets/preview-sounds'
import type { ChordPreset, LeadPreset } from '../core/schemas/synth.schema'
import { parseSynthPatch, type SynthPatch } from '../core/synth/patch'
import { DEFAULT_AUDIO_SOUND_IDS } from '../config/defaults'

export function useAudioPatches(getEngine: () => PlaybackEngine | null) {
  const activeLeadPreset = ref<LeadPreset>(DEFAULT_AUDIO_SOUND_IDS.lead as LeadPreset)
  const activeChordPreset = ref<ChordPreset>(DEFAULT_AUDIO_SOUND_IDS.chord as ChordPreset)
  const activeLeadPatch = ref<SynthPatch>(getFactorySound(DEFAULT_AUDIO_SOUND_IDS.lead))
  const activeChordPatch = ref<SynthPatch>(getFactorySound(DEFAULT_AUDIO_SOUND_IDS.chord))

  function setLeadPatch(patch: SynthPatch): void {
    const validated = parseSynthPatch(patch)
    getEngine()?.setLeadPreset(validated)
    activeLeadPatch.value = validated
    activeLeadPreset.value = validated.id
  }

  function setChordPatch(patch: SynthPatch): void {
    const validated = parseSynthPatch(patch)
    getEngine()?.setChordPreset(validated)
    activeChordPatch.value = validated
    activeChordPreset.value = validated.id
  }

  function setLeadPreset(preset: LeadPreset): void {
    setLeadPatch(getFactorySound(preset))
  }

  function setChordPreset(preset: ChordPreset): void {
    setChordPatch(getFactorySound(preset))
  }

  function setTrackSound(track: 'lead' | 'chord', presetId: string, controls: PreviewControls): void {
    const patch = applyPreviewControls(getFactorySound(presetId), controls)
    if (track === 'lead') setLeadPatch(patch)
    else setChordPatch(patch)
  }

  function resetPatches(): void {
    setLeadPreset(DEFAULT_AUDIO_SOUND_IDS.lead as LeadPreset)
    setChordPreset(DEFAULT_AUDIO_SOUND_IDS.chord as ChordPreset)
  }

  return {
    activeLeadPreset,
    activeChordPreset,
    activeLeadPatch,
    activeChordPatch,
    setLeadPatch,
    setChordPatch,
    setLeadPreset,
    setChordPreset,
    setTrackSound,
    resetPatches
  }
}
