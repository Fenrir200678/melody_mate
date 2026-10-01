import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { toneMock } = await vi.hoisted(async () => {
  const helpers = await import('../helpers/tone-mock')
  return { toneMock: helpers.createToneMock({ meterValue: -14.2 }).toneMock }
})

vi.mock('tone', () => toneMock)

import { getPresetDefinition } from '../../src/core/presets/synths'
import { parseSynthPatch } from '../../src/core/synth/patch'
import { DEFAULT_MIXER_SETTINGS, DEFAULT_SYNTH_MACROS } from '../../src/config/defaults'
import { useAudioStore } from '../../src/stores/audio.store'
import { useMixerStore } from '../../src/stores/mixer.store'

describe('useMixerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default mixer levels, mute/solo flags, and macros', () => {
    const store = useMixerStore()

    expect(store.masterVolume).toBe(DEFAULT_MIXER_SETTINGS.masterVolume)
    expect(store.leadVolume).toBe(DEFAULT_MIXER_SETTINGS.leadVolume)
    expect(store.chordVolume).toBe(DEFAULT_MIXER_SETTINGS.chordVolume)
    expect(store.isLeadMuted).toBe(DEFAULT_MIXER_SETTINGS.isLeadMuted)
    expect(store.isChordMuted).toBe(DEFAULT_MIXER_SETTINGS.isChordMuted)
    expect(store.isLeadSolo).toBe(DEFAULT_MIXER_SETTINGS.isLeadSolo)
    expect(store.isChordSolo).toBe(DEFAULT_MIXER_SETTINGS.isChordSolo)
    expect(store.isBusCompressorActive).toBe(DEFAULT_MIXER_SETTINGS.isBusCompressorActive)
    expect(store.protectionStatus).toBe(DEFAULT_MIXER_SETTINGS.protectionStatus)
    expect(store.macros).toEqual(DEFAULT_SYNTH_MACROS)
  })

  it('updates and clamps volume for master, lead, and chord channels', () => {
    const store = useMixerStore()

    store.setVolume('master', 0.8)
    expect(store.masterVolume).toBe(0.8)

    store.setVolume('lead', 0.6)
    expect(store.leadVolume).toBe(0.6)

    store.setVolume('chord', 0.4)
    expect(store.chordVolume).toBe(0.4)

    store.setVolume('master', 1.5)
    expect(store.masterVolume).toBe(1)

    store.setVolume('lead', -0.5)
    expect(store.leadVolume).toBe(0)
  })

  it('updates macro parameters within bounded ranges', () => {
    const store = useMixerStore()

    store.setMacro('leadCutoff', 5000)
    expect(store.macros.leadCutoff).toBe(5000)

    store.setMacro('leadResonance', 4)
    expect(store.macros.leadResonance).toBe(4)

    store.setMacro('leadDelaySend', 0.5)
    expect(store.macros.leadDelaySend).toBe(0.5)

    store.setMacro('leadReverbSend', 0.6)
    expect(store.macros.leadReverbSend).toBe(0.6)

    store.setMacro('chordCutoff', 4000)
    expect(store.macros.chordCutoff).toBe(4000)

    store.setMacro('chordChorusSend', 0.7)
    expect(store.macros.chordChorusSend).toBe(0.7)

    store.setMacro('chordReverbSend', 0.8)
    expect(store.macros.chordReverbSend).toBe(0.8)

    store.setMacro('chordChorusSend', 1.2)
    expect(store.macros.chordChorusSend).toBe(1.0)
  })

  it('manages track solo and mute toggles', () => {
    const store = useMixerStore()

    expect(store.isLeadSolo).toBe(false)
    store.toggleSolo('lead')
    expect(store.isLeadSolo).toBe(true)

    expect(store.isChordSolo).toBe(false)
    store.setSolo('chord', true)
    expect(store.isChordSolo).toBe(true)

    store.toggleSolo('lead')
    expect(store.isLeadSolo).toBe(false)

    expect(store.isLeadMuted).toBe(false)
    store.setMute('lead', true)
    expect(store.isLeadMuted).toBe(true)
  })

  it('activates and toggles the optional bus compressor', () => {
    const store = useMixerStore()
    expect(store.isBusCompressorActive).toBe(true)

    store.toggleBusCompressor()
    expect(store.isBusCompressorActive).toBe(false)

    store.setBusCompressor(true)
    expect(store.isBusCompressorActive).toBe(true)
  })

  it('applies default macros from synth patch', () => {
    const store = useMixerStore()
    const patch = parseSynthPatch(getPresetDefinition('acid-303')!)

    store.applyDefaultMacros('lead', patch)
    expect(store.macros.leadCutoff).toBe(patch.defaultMacros?.cutoff)
    expect(store.macros.leadResonance).toBe(patch.defaultMacros?.resonance)
  })

  it('hydrates the engine effects rack from store state on initialization', async () => {
    const audioStore = useAudioStore()
    const mixerStore = useMixerStore()

    mixerStore.setVolume('master', 0)
    mixerStore.setMute('chord', true)
    mixerStore.setSolo('lead', true)
    mixerStore.setBusCompressor(false)
    expect(audioStore.getPlaybackEngine()).toBeNull()

    const engine = await audioStore.initializeAudio()
    expect(engine?.effectsRack.getState()).toMatchObject({
      ...mixerStore.macros,
      masterVolume: 0,
      isChordMuted: true,
      isLeadSolo: true,
      isBusCompressorActive: false
    })

    mixerStore.reset()
    expect(engine?.effectsRack.getState()).toMatchObject({
      ...mixerStore.macros,
      masterVolume: mixerStore.masterVolume,
      leadVolume: mixerStore.leadVolume,
      chordVolume: mixerStore.chordVolume,
      isChordMuted: false,
      isLeadSolo: false,
      isBusCompressorActive: true
    })
  })

  it('queries master output level and protection diagnostics from engine', async () => {
    const audioStore = useAudioStore()
    const mixerStore = useMixerStore()

    expect(mixerStore.getMasterLevel()).toBe(-Infinity)
    expect(mixerStore.protectionStatus).toBe('idle')

    await audioStore.initializeAudio()

    expect(mixerStore.getMasterLevel()).toBe(-14.2)
    expect(mixerStore.getMasterOutputLevel()).toBe(-14.2)
    expect(mixerStore.protectionStatus).toBe('failed')
    expect(mixerStore.protectionError).toBeTruthy()
    expect(mixerStore.getOutputProtection()).toMatchObject({ status: 'failed' })
  })

  it('resets all mixer channels, compressor, and macros to defaults', () => {
    const store = useMixerStore()

    store.setVolume('master', 0.5)
    store.setVolume('lead', 0.4)
    store.setVolume('chord', 0.3)
    store.setMute('lead', true)
    store.setSolo('lead', true)
    store.setBusCompressor(false)
    store.setMacro('leadCutoff', 5000)
    store.setMacro('leadResonance', 4)
    store.setMacro('chordCutoff', 1800)

    store.reset()

    expect(store.masterVolume).toBe(0.9)
    expect(store.leadVolume).toBe(0.9)
    expect(store.chordVolume).toBe(0.75)
    expect(store.isLeadMuted).toBe(false)
    expect(store.isChordMuted).toBe(false)
    expect(store.isLeadSolo).toBe(false)
    expect(store.isChordSolo).toBe(false)
    expect(store.isBusCompressorActive).toBe(true)
    expect(store.macros.leadCutoff).toBe(4200)
    expect(store.macros.leadResonance).toBe(1.0)
    expect(store.macros.chordCutoff).toBe(3800)
  })
})
