import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PlaybackEngine } from '../audio/audio-runtime'
import type { OutputProtectionSnapshot, OutputProtectionStatus } from '../audio/mixer/master-output'
import type { MasterMeterReadings } from '../audio/mixer/metering'
import { clampEffectSendGain } from '../core/audio/gain-staging'
import { brightnessToCutoff, type PreviewControls } from '../core/presets/preview-sounds'
import type { SynthPatch } from '../core/synth/patch'
import { DEFAULT_MIXER_SETTINGS, DEFAULT_SYNTH_MACROS } from '../config/defaults'
import { useAudioStore } from './audio.store'

export interface AudioMacros {
  leadCutoff: number
  leadResonance: number
  leadDelaySend: number
  leadChorusSend: number
  leadReverbSend: number
  chordCutoff: number
  chordDelaySend: number
  chordChorusSend: number
  chordReverbSend: number
}

export type MacroConfig = AudioMacros

export const useMixerStore = defineStore('mixer', () => {
  const masterVolume = ref<number>(DEFAULT_MIXER_SETTINGS.masterVolume)
  const leadVolume = ref<number>(DEFAULT_MIXER_SETTINGS.leadVolume)
  const chordVolume = ref<number>(DEFAULT_MIXER_SETTINGS.chordVolume)
  const isLeadMuted = ref<boolean>(DEFAULT_MIXER_SETTINGS.isLeadMuted)
  const isChordMuted = ref<boolean>(DEFAULT_MIXER_SETTINGS.isChordMuted)
  const isLeadSolo = ref<boolean>(DEFAULT_MIXER_SETTINGS.isLeadSolo)
  const isChordSolo = ref<boolean>(DEFAULT_MIXER_SETTINGS.isChordSolo)
  const isBusCompressorActive = ref<boolean>(DEFAULT_MIXER_SETTINGS.isBusCompressorActive)

  const protectionStatus = ref<OutputProtectionStatus>(DEFAULT_MIXER_SETTINGS.protectionStatus)
  const protectionError = ref<string | null>(null)
  const meteringError = ref<string | null>(null)

  const macros = ref<AudioMacros>({ ...DEFAULT_SYNTH_MACROS })

  function getEngine(): PlaybackEngine | null {
    return useAudioStore().getPlaybackEngine()
  }

  function applyToEngine(engine: PlaybackEngine): void {
    engine.effectsRack.applyState({
      ...macros.value,
      leadVolume: leadVolume.value,
      chordVolume: chordVolume.value,
      masterVolume: masterVolume.value,
      isLeadMuted: isLeadMuted.value,
      isChordMuted: isChordMuted.value,
      isLeadSolo: isLeadSolo.value,
      isChordSolo: isChordSolo.value,
      isBusCompressorActive: isBusCompressorActive.value
    })
    engine.syncOutputAudibility()
    syncDiagnostics(engine)
  }

  function syncDiagnostics(engine: PlaybackEngine): void {
    const protection = engine.effectsRack.getProtectionSnapshot()
    protectionStatus.value = protection.status
    protectionError.value = protection.error
    meteringError.value = engine.effectsRack.getMeteringError()
  }

  function setVolume(channel: 'master' | 'lead' | 'chord', value: number): void {
    const clamped = Math.max(0, Math.min(1, value))
    const engine = getEngine()

    switch (channel) {
      case 'master':
        masterVolume.value = clamped
        engine?.effectsRack.setMasterVolume(clamped)
        break
      case 'lead':
        leadVolume.value = clamped
        engine?.effectsRack.setLeadVolume(clamped)
        break
      case 'chord':
        chordVolume.value = clamped
        engine?.effectsRack.setChordVolume(clamped)
        break
    }
  }

  function setMute(channel: 'lead' | 'chord', muted: boolean): void {
    const engine = getEngine()
    if (channel === 'lead') {
      isLeadMuted.value = muted
      engine?.effectsRack.setLeadMute(muted)
    } else {
      isChordMuted.value = muted
      engine?.effectsRack.setChordMute(muted)
    }
    engine?.syncOutputAudibility()
  }

  function setSolo(channel: 'lead' | 'chord', solo: boolean): void {
    const engine = getEngine()
    if (channel === 'lead') {
      isLeadSolo.value = solo
      engine?.effectsRack.setLeadSolo(solo)
    } else {
      isChordSolo.value = solo
      engine?.effectsRack.setChordSolo(solo)
    }
    engine?.syncOutputAudibility()
  }

  function toggleSolo(channel: 'lead' | 'chord'): void {
    if (channel === 'lead') {
      setSolo('lead', !isLeadSolo.value)
    } else {
      setSolo('chord', !isChordSolo.value)
    }
  }

  function setBusCompressor(enabled: boolean): void {
    isBusCompressorActive.value = enabled
    getEngine()?.effectsRack.setBusCompressorActive(enabled)
  }

  function toggleBusCompressor(): void {
    setBusCompressor(!isBusCompressorActive.value)
  }

  function setMacro(name: keyof AudioMacros, value: number): void {
    const engine = getEngine()
    switch (name) {
      case 'leadCutoff': {
        if (engine) {
          engine.effectsRack.setLeadCutoff(value)
          macros.value.leadCutoff = engine.effectsRack.getLeadCutoff()
        } else {
          macros.value.leadCutoff = Math.max(200, Math.min(18000, value))
        }
        break
      }
      case 'leadResonance': {
        if (engine) {
          engine.effectsRack.setLeadResonance(value)
          macros.value.leadResonance = engine.effectsRack.getLeadResonance()
        } else {
          macros.value.leadResonance = Math.max(0, Math.min(12, value))
        }
        break
      }
      case 'leadDelaySend': {
        if (engine) {
          engine.effectsRack.setLeadDelaySend(value)
          macros.value.leadDelaySend = engine.effectsRack.getLeadDelaySend()
        } else {
          macros.value.leadDelaySend = clampEffectSendGain(value)
        }
        break
      }
      case 'leadChorusSend': {
        if (engine) {
          engine.effectsRack.setLeadChorusSend(value)
          macros.value.leadChorusSend = engine.effectsRack.getLeadChorusSend()
        } else {
          macros.value.leadChorusSend = clampEffectSendGain(value)
        }
        break
      }
      case 'leadReverbSend': {
        if (engine) {
          engine.effectsRack.setLeadReverbSend(value)
          macros.value.leadReverbSend = engine.effectsRack.getLeadReverbSend()
        } else {
          macros.value.leadReverbSend = clampEffectSendGain(value)
        }
        break
      }
      case 'chordCutoff': {
        if (engine) {
          engine.effectsRack.setChordCutoff(value)
          macros.value.chordCutoff = engine.effectsRack.getChordCutoff()
        } else {
          macros.value.chordCutoff = Math.max(200, Math.min(18000, value))
        }
        break
      }
      case 'chordDelaySend': {
        if (engine) {
          engine.effectsRack.setChordDelaySend(value)
          macros.value.chordDelaySend = engine.effectsRack.getChordDelaySend()
        } else {
          macros.value.chordDelaySend = clampEffectSendGain(value)
        }
        break
      }
      case 'chordChorusSend': {
        if (engine) {
          engine.effectsRack.setChordChorusSend(value)
          macros.value.chordChorusSend = engine.effectsRack.getChordChorusSend()
        } else {
          macros.value.chordChorusSend = clampEffectSendGain(value)
        }
        break
      }
      case 'chordReverbSend': {
        if (engine) {
          engine.effectsRack.setChordReverbSend(value)
          macros.value.chordReverbSend = engine.effectsRack.getChordReverbSend()
        } else {
          macros.value.chordReverbSend = clampEffectSendGain(value)
        }
        break
      }
    }
  }

  function applyDefaultMacros(track: 'lead' | 'chord', patch: SynthPatch): void {
    const defaultMacros = patch.backend === 'tone' ? patch.defaultMacros : undefined
    if (!defaultMacros) return
    if (track === 'lead') {
      if (defaultMacros.cutoff !== undefined) setMacro('leadCutoff', defaultMacros.cutoff)
      if (defaultMacros.resonance !== undefined) setMacro('leadResonance', defaultMacros.resonance)
      if (defaultMacros.delaySend !== undefined) setMacro('leadDelaySend', defaultMacros.delaySend)
      if (defaultMacros.chorusSend !== undefined) setMacro('leadChorusSend', defaultMacros.chorusSend)
      if (defaultMacros.reverbSend !== undefined) setMacro('leadReverbSend', defaultMacros.reverbSend)
    } else {
      if (defaultMacros.cutoff !== undefined) setMacro('chordCutoff', defaultMacros.cutoff)
      if (defaultMacros.delaySend !== undefined) setMacro('chordDelaySend', defaultMacros.delaySend)
      if (defaultMacros.chorusSend !== undefined) setMacro('chordChorusSend', defaultMacros.chorusSend)
      if (defaultMacros.reverbSend !== undefined) setMacro('chordReverbSend', defaultMacros.reverbSend)
    }
  }

  function applyPreviewControls(track: 'lead' | 'chord', controls: PreviewControls, _patch?: SynthPatch): void {
    const cutoff = brightnessToCutoff(controls.cutoff)
    const delay = clampEffectSendGain(controls.delay / 100)
    const chorus = clampEffectSendGain(controls.chorus / 100)
    const reverb = clampEffectSendGain(controls.reverb / 100)
    if (track === 'lead') {
      setMacro('leadCutoff', cutoff)
      setMacro('leadDelaySend', delay)
      setMacro('leadChorusSend', chorus)
      setMacro('leadReverbSend', reverb)
    } else {
      setMacro('chordCutoff', cutoff)
      setMacro('chordDelaySend', delay)
      setMacro('chordChorusSend', chorus)
      setMacro('chordReverbSend', reverb)
    }
  }

  function getMasterLevel(): number {
    return getEngine()?.effectsRack.getMasterLevel() ?? -Infinity
  }

  function getMasterMeterReadings(): MasterMeterReadings | null {
    return getEngine()?.effectsRack.getMasterMeterReadings() ?? null
  }

  function getOutputProtection(): OutputProtectionSnapshot | null {
    return getEngine()?.effectsRack.getProtectionSnapshot() ?? null
  }

  function getOutputLatencySeconds(): number {
    return getEngine()?.effectsRack.getOutputLatencySeconds() ?? 0
  }

  function reset(): void {
    setVolume('master', 0.9)
    setVolume('lead', 0.9)
    setVolume('chord', 0.75)
    setMute('lead', false)
    setMute('chord', false)
    setSolo('lead', false)
    setSolo('chord', false)
    setBusCompressor(true)
    setMacro('leadCutoff', 4200)
    setMacro('leadResonance', 1.0)
    setMacro('leadDelaySend', 0.0)
    setMacro('leadChorusSend', 0.0)
    setMacro('leadReverbSend', 0.25)
    setMacro('chordCutoff', 3800)
    setMacro('chordDelaySend', 0.0)
    setMacro('chordChorusSend', 0.05)
    setMacro('chordReverbSend', 0.3)
  }

  return {
    masterVolume,
    leadVolume,
    chordVolume,
    isLeadMuted,
    isChordMuted,
    isLeadSolo,
    isChordSolo,
    isBusCompressorActive,
    protectionStatus,
    protectionError,
    meteringError,
    macros,
    applyToEngine,
    syncDiagnostics,
    setVolume,
    setMute,
    setSolo,
    toggleSolo,
    setBusCompressor,
    toggleBusCompressor,
    setMacro,
    applyDefaultMacros,
    applyPreviewControls,
    getMasterLevel,
    getMasterMeterReadings,
    getOutputProtection,
    getOutputLatencySeconds,
    getMasterOutputLevel: getMasterLevel,
    reset
  }
})
