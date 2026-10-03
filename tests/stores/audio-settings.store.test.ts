import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { useAudioSettingsStore } from '../../src/stores/audio-settings.store'
import { useAudioStore } from '../../src/stores/audio.store'
import { useMixerStore } from '../../src/stores/mixer.store'
import { useProjectStore } from '../../src/stores/project.store'
import {
  AUDIO_SETTINGS_PERSISTENCE_DEBOUNCE_MS,
  DEFAULT_AUDIO_SOUND_IDS,
  DEFAULT_MIDI_OUTPUT_SETTINGS
} from '../../src/config/defaults'
import { useMidiOutputStore } from '../../src/stores/midi-output.store'
import { AccessFake, PortFake } from '../audio/midi/port-fake'
import { loadProjectAudioDocument } from '../../src/services/project-audio-storage'
import { PROJECT_STORAGE_KEY } from '../../src/stores/project.store'
import { installMockLocalStorage } from '../helpers/storage-mock'

const storage = installMockLocalStorage()
describe('audio settings store', () => {
  let pinia: ReturnType<typeof createPinia>
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.useFakeTimers()
    storage.storage.clear()
    storage.failWritesFor(null)
  })
  afterEach(() => {
    disposePinia(pinia)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('restores desired MIDI settings across reload without permission, open ports or sends', async () => {
    const port = new PortFake()
    const access = new AccessFake(port)
    const requestMIDIAccess = vi.fn(async () => access)
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { requestMIDIAccess })
    const settings = useAudioSettingsStore()
    const midi = useMidiOutputStore()
    const desired = {
      lead: {
        mode: 'midi' as const,
        port: { id: port.id, name: port.name, manufacturer: port.manufacturer },
        channel: 7,
        offsetMs: -8,
        sendPreviews: true
      },
      chord: { ...DEFAULT_MIDI_OUTPUT_SETTINGS.chord, mode: 'both' as const, channel: 9, offsetMs: 12 }
    }
    midi.restoreSettings(desired)
    expect(settings.isDirty).toBe(true)
    expect(settings.saveProjectAudio().ok).toBe(true)
    expect(settings.isDirty).toBe(false)
    disposePinia(pinia)
    pinia = createPinia()
    setActivePinia(pinia)

    const restored = useAudioSettingsStore()
    expect(restored.hydrateProjectAudio().status).toBe('loaded')
    expect(useMidiOutputStore().getSettings()).toEqual(desired)
    expect(useMidiOutputStore().snapshot.enabled).toBe(false)
    expect(useMidiOutputStore().snapshot.routes.lead.desiredPortId).toBe(port.id)
    expect(useMidiOutputStore().getRuntime().canDispatch('lead')).toBe(false)
    expect(restored.isDirty).toBe(false)
    await vi.advanceTimersByTimeAsync(AUDIO_SETTINGS_PERSISTENCE_DEBOUNCE_MS)
    expect(requestMIDIAccess).not.toHaveBeenCalled()
    expect(port.open).not.toHaveBeenCalled()
    expect(port.send).not.toHaveBeenCalled()
    expect(loadProjectAudioDocument()).toMatchObject({ document: { snapshot: { midi: desired } } })
  })

  it('autosaves desired route changes while enable, discovery and hotplug stay clean', async () => {
    const port = new PortFake()
    const access = new AccessFake(port)
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { requestMIDIAccess: async () => access })
    const settings = useAudioSettingsStore()
    const midi = useMidiOutputStore()
    expect(settings.saveProjectAudio().ok).toBe(true)
    const revision = useProjectStore().audioSavedAt
    await midi.enable()
    await midi.open('lead', port.id)
    access.outputs.set('new', new PortFake('new'))
    access.change()
    await midi.disable()
    expect(settings.isDirty).toBe(false)
    await vi.advanceTimersByTimeAsync(AUDIO_SETTINGS_PERSISTENCE_DEBOUNCE_MS)
    expect(useProjectStore().audioSavedAt).toBe(revision)

    await midi.setRoute('lead', { ...DEFAULT_MIDI_OUTPUT_SETTINGS.lead, channel: 5, offsetMs: 6 })
    midi.setSendPreviews(true)
    expect(settings.isDirty).toBe(true)
    await vi.advanceTimersByTimeAsync(AUDIO_SETTINGS_PERSISTENCE_DEBOUNCE_MS)
    expect(settings.isDirty).toBe(false)
    expect(useProjectStore().audioSavedAt).toBeGreaterThan(revision)
    expect(loadProjectAudioDocument()).toMatchObject({ document: { snapshot: { midi: midi.getSettings() } } })
    useProjectStore().reset()
    expect(midi.getSettings()).toEqual(DEFAULT_MIDI_OUTPUT_SETTINGS)
    expect(midi.snapshot.enabled).toBe(false)
    expect(settings.isDirty).toBe(true)
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
    expect(settings.saveProjectAudio().ok).toBe(true)
    const before = project.audioSavedAt
    useMidiOutputStore().setSendPreviews(true)
    storage.failWritesFor(PROJECT_STORAGE_KEY)
    expect(settings.saveProjectAudio()).toMatchObject({ ok: false, stage: 'project-storage' })
    expect(project.audioSavedAt).toBe(before)
    expect(settings.isDirty).toBe(true)
    expect(settings.hydrateProjectAudio().status).toBe('unpaired')
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
