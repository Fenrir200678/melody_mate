import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FACTORY_SOUND_IDS } from '@/core/presets/preview-sounds'
import type { ChordPreset, LeadPreset } from '@/core/schemas/synth.schema'
import { useAudioStore } from '@/stores/audio.store'
import { useMixerStore } from '@/stores/mixer.store'

const { toneMock } = await vi.hoisted(async () => {
  const helpers = await import('../../helpers/tone-mock')
  return { toneMock: helpers.createToneMock({ meterValue: -12.5 }).toneMock }
})

vi.mock('tone', () => toneMock)

describe('SynthRack Integration & Submodule Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Factory sound selection', () => {
    it('cycles forward through lead presets with wrap-around', () => {
      const store = useAudioStore()
      store.setLeadPreset(FACTORY_SOUND_IDS[0] as LeadPreset)

      function nextPreset(): void {
        const curr = FACTORY_SOUND_IDS.indexOf(store.activeLeadPreset as (typeof FACTORY_SOUND_IDS)[number])
        const next = (curr + 1) % FACTORY_SOUND_IDS.length
        store.setLeadPreset(FACTORY_SOUND_IDS[next] as LeadPreset)
      }

      nextPreset()
      expect(store.activeLeadPreset).toBe(FACTORY_SOUND_IDS[1])

      // Set to last and cycle forward
      store.setLeadPreset(FACTORY_SOUND_IDS[FACTORY_SOUND_IDS.length - 1] as LeadPreset)
      nextPreset()
      expect(store.activeLeadPreset).toBe(FACTORY_SOUND_IDS[0])
    })

    it('cycles backward through lead presets with wrap-around', () => {
      const store = useAudioStore()
      store.setLeadPreset(FACTORY_SOUND_IDS[0] as LeadPreset)

      function prevPreset(): void {
        const curr = FACTORY_SOUND_IDS.indexOf(store.activeLeadPreset as (typeof FACTORY_SOUND_IDS)[number])
        const prev = (curr - 1 + FACTORY_SOUND_IDS.length) % FACTORY_SOUND_IDS.length
        store.setLeadPreset(FACTORY_SOUND_IDS[prev] as LeadPreset)
      }

      prevPreset()
      expect(store.activeLeadPreset).toBe(FACTORY_SOUND_IDS[FACTORY_SOUND_IDS.length - 1])
    })

    it('cycles chord presets correctly', () => {
      const store = useAudioStore()
      store.setChordPreset(FACTORY_SOUND_IDS[0] as ChordPreset)

      function nextChordPreset(): void {
        const curr = FACTORY_SOUND_IDS.indexOf(store.activeChordPreset as (typeof FACTORY_SOUND_IDS)[number])
        const next = (curr + 1) % FACTORY_SOUND_IDS.length
        store.setChordPreset(FACTORY_SOUND_IDS[next] as ChordPreset)
      }

      nextChordPreset()
      expect(store.activeChordPreset).toBe(FACTORY_SOUND_IDS[1])
    })
  })

  describe('Solo and Mute channel interactions', () => {
    it('handles lead and chord solo states and updates effects rack', async () => {
      const audioStore = useAudioStore()
      const mixerStore = useMixerStore()
      const engine = (await audioStore.initializeAudio())!

      expect(mixerStore.isLeadSolo).toBe(false)
      expect(mixerStore.isChordSolo).toBe(false)
      expect(engine.effectsRack.isLeadAudible()).toBe(true)
      expect(engine.effectsRack.isChordAudible()).toBe(true)

      // Solo Lead -> Lead audible, Chords inaudible
      mixerStore.toggleSolo('lead')
      expect(mixerStore.isLeadSolo).toBe(true)
      expect(engine.effectsRack.isLeadAudible()).toBe(true)
      expect(engine.effectsRack.isChordAudible()).toBe(false)

      // Solo Chords as well -> Both audible
      mixerStore.toggleSolo('chord')
      expect(mixerStore.isChordSolo).toBe(true)
      expect(engine.effectsRack.isLeadAudible()).toBe(true)
      expect(engine.effectsRack.isChordAudible()).toBe(true)

      // Unsolo Lead -> Chords audible, Lead inaudible
      mixerStore.toggleSolo('lead')
      expect(mixerStore.isLeadSolo).toBe(false)
      expect(engine.effectsRack.isLeadAudible()).toBe(false)
      expect(engine.effectsRack.isChordAudible()).toBe(true)

      // Unsolo Chords -> Both audible
      mixerStore.toggleSolo('chord')
      expect(mixerStore.isChordSolo).toBe(false)
      expect(engine.effectsRack.isLeadAudible()).toBe(true)
      expect(engine.effectsRack.isChordAudible()).toBe(true)
    })

    it('handles channel mutes alongside solos', async () => {
      const audioStore = useAudioStore()
      const mixerStore = useMixerStore()
      const engine = (await audioStore.initializeAudio())!

      mixerStore.setMute('lead', true)
      expect(mixerStore.isLeadMuted).toBe(true)
      expect(engine.effectsRack.isLeadAudible()).toBe(false)

      // Even if soloed, mute takes precedence
      mixerStore.toggleSolo('lead')
      expect(mixerStore.isLeadSolo).toBe(true)
      expect(engine.effectsRack.isLeadAudible()).toBe(false)
    })
  })

  describe('Macro and Meter queries', () => {
    it('sets per-instrument macro parameters correctly', () => {
      const mixerStore = useMixerStore()

      mixerStore.setMacro('leadCutoff', 8500)
      expect(mixerStore.macros.leadCutoff).toBe(8500)

      mixerStore.setMacro('leadResonance', 3.5)
      expect(mixerStore.macros.leadResonance).toBe(3.5)

      mixerStore.setMacro('leadDelaySend', 0.45)
      expect(mixerStore.macros.leadDelaySend).toBe(0.45)

      mixerStore.setMacro('chordCutoff', 6000)
      expect(mixerStore.macros.chordCutoff).toBe(6000)

      mixerStore.setMacro('chordChorusSend', 0.25)
      expect(mixerStore.macros.chordChorusSend).toBe(0.25)

      mixerStore.setMacro('chordReverbSend', 0.6)
      expect(mixerStore.macros.chordReverbSend).toBe(0.6)
    })

    it('queries master meter level for live VU meter', async () => {
      const audioStore = useAudioStore()
      const mixerStore = useMixerStore()
      expect(mixerStore.getMasterLevel()).toBe(-Infinity)
      await audioStore.initializeAudio()
      const level = mixerStore.getMasterLevel()
      expect(level).toBe(-12.5)
    })

    it('enables and bypasses the optional bus compressor on effects rack', async () => {
      const audioStore = useAudioStore()
      const mixerStore = useMixerStore()
      const engine = (await audioStore.initializeAudio())!

      expect(engine.effectsRack.isBusCompressorEnabled()).toBe(true)

      mixerStore.setBusCompressor(false)
      expect(mixerStore.isBusCompressorActive).toBe(false)
      expect(engine.effectsRack.isBusCompressorEnabled()).toBe(false)

      mixerStore.toggleBusCompressor()
      expect(mixerStore.isBusCompressorActive).toBe(true)
      expect(engine.effectsRack.isBusCompressorEnabled()).toBe(true)
    })

    it('exposes one always-on output protection stage shared by playback and preview', async () => {
      const audioStore = useAudioStore()
      const mixerStore = useMixerStore()
      const engine = (await audioStore.initializeAudio())!

      const snapshot = engine.effectsRack.getProtectionSnapshot()
      expect(snapshot.ceilingDb).toBe(-1)
      expect(['idle', 'loading', 'active', 'fallback', 'failed']).toContain(snapshot.status)
      expect(mixerStore.getOutputProtection()).toMatchObject({ ceilingDb: -1 })
      expect(mixerStore.getOutputLatencySeconds()).toBe(engine.effectsRack.getOutputLatencySeconds())

      // The creative compressor toggle must never disable final protection.
      mixerStore.setBusCompressor(false)
      expect(engine.effectsRack.getProtectionSnapshot().ceilingDb).toBe(-1)
    })
  })
})
