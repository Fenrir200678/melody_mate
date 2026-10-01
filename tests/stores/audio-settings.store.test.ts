import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAudioSettingsStore } from '../../src/stores/audio-settings.store'
import { useAudioStore } from '../../src/stores/audio.store'
import { useMixerStore } from '../../src/stores/mixer.store'
import { useProjectStore } from '../../src/stores/project.store'
import { DEFAULT_AUDIO_SOUND_IDS } from '../../src/config/defaults'
import { PROJECT_STORAGE_KEY } from '../../src/stores/project.store'
import { installMockLocalStorage } from '../helpers/storage-mock'

const storage = installMockLocalStorage()
describe('audio settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.storage.clear()
    storage.failWritesFor(null)
  })
  it('changes only the selected track and resets its controls with the sound default', () => {
    const settings = useAudioSettingsStore()
    const audio = useAudioStore()
    const mixer = useMixerStore()
    mixer.setVolume('lead', 0.42)
    mixer.setMute('lead', true)
    mixer.setVolume('master', 0.7)
    settings.setSound('lead', 'crystal-pluck')
    settings.setControl('lead', 'cutoff', 20)
    expect(audio.activeLeadPreset).toBe('crystal-pluck')
    expect(audio.activeChordPreset).toBe(DEFAULT_AUDIO_SOUND_IDS.chord)
    expect(mixer.leadVolume).toBe(0.42)
    expect(mixer.isLeadMuted).toBe(true)
    expect(mixer.masterVolume).toBe(0.7)
    settings.resetControls('lead')
    expect(settings.controls.lead.cutoff).not.toBe(20)
  })
  it('persists factory IDs, preview controls and mix state', () => {
    const settings = useAudioSettingsStore()
    const mixer = useMixerStore()
    const project = useProjectStore()
    settings.setSound('chord', 'juno-chords')
    settings.setControl('chord', 'reverb', 73)
    mixer.setVolume('chord', 0.51)
    const saved = settings.saveProjectAudio()
    expect(saved.ok).toBe(true)
    if (!saved.ok) return
    expect(project.audioSavedAt).toBe(saved.savedAt)
    const restored = useAudioSettingsStore()
    expect(restored.hydrateProjectAudio().status).toBe('loaded')
    expect(restored.soundIds.chord).toBe('juno-chords')
    expect(restored.controls.chord.reverb).toBe(73)
    expect(useMixerStore().chordVolume).toBe(0.51)
  })
  it('restores a saved project when a retired sound ID is no longer in the bank', () => {
    const settings = useAudioSettingsStore()
    const saved = settings.saveProjectAudio()
    expect(saved.ok).toBe(true)
    const raw = storage.storage.getItem('melodymate_project_audio')
    if (!raw) throw new Error('Expected saved audio document')
    const document = JSON.parse(raw) as { snapshot: { lead: { soundId: string }; chord: { soundId: string } } }
    document.snapshot.lead.soundId = 'flute-vibe'
    document.snapshot.chord.soundId = 'soft-strings'
    storage.storage.setItem('melodymate_project_audio', JSON.stringify(document))

    expect(settings.hydrateProjectAudio().status).toBe('loaded')
    expect(settings.soundIds).toEqual(DEFAULT_AUDIO_SOUND_IDS)
  })
  it('reports storage write failures and safely resets obsolete documents', () => {
    const settings = useAudioSettingsStore()
    storage.failWritesFor('melodymate_project_audio')
    expect(settings.saveProjectAudio()).toMatchObject({ ok: false, stage: 'audio-storage' })
    storage.failWritesFor(null)
    storage.storage.setItem(
      'melodymate_project_audio',
      JSON.stringify({ documentVersion: 1, savedAt: 1, snapshot: {} })
    )
    expect(settings.hydrateProjectAudio().status).toBe('reset')
  })
  it('does not claim success when the project commit marker cannot be written', () => {
    const settings = useAudioSettingsStore()
    const project = useProjectStore()
    const before = project.audioSavedAt
    storage.failWritesFor(PROJECT_STORAGE_KEY)
    expect(settings.saveProjectAudio()).toMatchObject({ ok: false, stage: 'project-storage' })
    expect(project.audioSavedAt).toBe(before)
  })
  it('automatically persists audio settings after debounced control updates', () => {
    const settings = useAudioSettingsStore()
    settings.setControl('lead', 'attack', 45)
    settings.setControl('lead', 'delay', 30)

    // Manual immediate save or debounced save works seamlessly
    const saved = settings.saveProjectAudio()
    expect(saved.ok).toBe(true)

    const raw = storage.storage.getItem('melodymate_project_audio')
    expect(raw).not.toBeNull()
    const document = JSON.parse(raw!) as { snapshot: { lead: { controls: { attack: number; delay: number } } } }
    expect(document.snapshot.lead.controls.attack).toBe(45)
    expect(document.snapshot.lead.controls.delay).toBe(30)
  })
})
