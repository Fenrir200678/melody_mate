import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  defaultPreviewControls,
  getFactorySound,
  getPresetsForTrack,
  type PreviewControls,
  type PreviewTrack
} from '../core/presets/preview-sounds'
import {
  createDefaultProjectAudioSnapshot,
  parseProjectAudioSnapshot,
  PROJECT_AUDIO_SNAPSHOT_VERSION,
  type ProjectAudioSnapshot
} from '../core/schemas/project-audio.schema'
import { AUDIO_SETTINGS_PERSISTENCE_DEBOUNCE_MS, DEFAULT_AUDIO_SOUND_IDS } from '../config/defaults'
import {
  isProjectAudioDocumentPaired,
  loadProjectAudioDocument,
  saveProjectAudioDocument
} from '../services/project-audio-storage'
import { useAudioStore } from './audio.store'
import { useMixerStore } from './mixer.store'
import { useProjectStore } from './project.store'

export type ProjectAudioHydrationStatus = 'empty' | 'loaded' | 'invalid' | 'reset' | 'unpaired'
export type ProjectAudioSaveResult =
  { ok: true; savedAt: number } | { ok: false; stage: 'snapshot' | 'audio-storage' | 'project-storage'; error: string }

export const useAudioSettingsStore = defineStore('audio-settings', () => {
  const soundIds = ref<Record<PreviewTrack, string>>({ ...DEFAULT_AUDIO_SOUND_IDS })
  const controls = ref<{ lead: PreviewControls; chord: PreviewControls }>({
    lead: defaultPreviewControls(DEFAULT_AUDIO_SOUND_IDS.lead),
    chord: defaultPreviewControls(DEFAULT_AUDIO_SOUND_IDS.chord)
  })
  const hydrationStatus = ref<ProjectAudioHydrationStatus>('empty')
  const hydrationError = ref<string | null>(null)
  let isHydrating = false
  let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null

  function applyTrack(track: PreviewTrack): void {
    useAudioStore().setTrackSound(track, soundIds.value[track], controls.value[track])
    useMixerStore().applyPreviewControls(track, controls.value[track], getFactorySound(soundIds.value[track]))
  }

  function setSound(track: PreviewTrack, soundId: string): void {
    soundIds.value = { ...soundIds.value, [track]: soundId }
    controls.value = { ...controls.value, [track]: defaultPreviewControls(soundId) }
    applyTrack(track)
  }

  function setControl(track: PreviewTrack, control: keyof PreviewControls, value: number): void {
    const next = Math.max(0, Math.min(100, Math.round(value)))
    controls.value = { ...controls.value, [track]: { ...controls.value[track], [control]: next } }
    applyTrack(track)
  }

  function resetControls(track: PreviewTrack): void {
    controls.value = { ...controls.value, [track]: defaultPreviewControls(soundIds.value[track]) }
    applyTrack(track)
  }

  function captureProjectAudioSnapshot(): ProjectAudioSnapshot {
    const mixer = useMixerStore()
    return parseProjectAudioSnapshot({
      version: PROJECT_AUDIO_SNAPSHOT_VERSION,
      lead: {
        soundId: soundIds.value.lead,
        controls: controls.value.lead,
        volume: mixer.leadVolume,
        muted: mixer.isLeadMuted,
        solo: mixer.isLeadSolo
      },
      chord: {
        soundId: soundIds.value.chord,
        controls: controls.value.chord,
        volume: mixer.chordVolume,
        muted: mixer.isChordMuted,
        solo: mixer.isChordSolo
      },
      master: { volume: mixer.masterVolume, busCompressorActive: mixer.isBusCompressorActive }
    })
  }

  function applySnapshot(snapshot: ProjectAudioSnapshot): void {
    const leadId = getPresetsForTrack('lead').some((preset) => preset.id === snapshot.lead.soundId)
      ? snapshot.lead.soundId
      : DEFAULT_AUDIO_SOUND_IDS.lead
    const chordId = getPresetsForTrack('chord').some((preset) => preset.id === snapshot.chord.soundId)
      ? snapshot.chord.soundId
      : DEFAULT_AUDIO_SOUND_IDS.chord
    soundIds.value = { lead: leadId, chord: chordId }
    controls.value = {
      lead: leadId === snapshot.lead.soundId ? snapshot.lead.controls : defaultPreviewControls(leadId),
      chord: chordId === snapshot.chord.soundId ? snapshot.chord.controls : defaultPreviewControls(chordId)
    }
    const mixer = useMixerStore()
    mixer.setVolume('lead', snapshot.lead.volume)
    mixer.setMute('lead', snapshot.lead.muted)
    mixer.setSolo('lead', snapshot.lead.solo)
    mixer.setVolume('chord', snapshot.chord.volume)
    mixer.setMute('chord', snapshot.chord.muted)
    mixer.setSolo('chord', snapshot.chord.solo)
    mixer.setVolume('master', snapshot.master.volume)
    mixer.setBusCompressor(snapshot.master.busCompressorActive)
    applyTrack('lead')
    applyTrack('chord')
  }

  function hydrateProjectAudio(): { status: ProjectAudioHydrationStatus; error?: string } {
    isHydrating = true
    try {
      const result = loadProjectAudioDocument()
      if (result.status !== 'loaded') {
        hydrationStatus.value = result.status
        hydrationError.value = 'error' in result ? result.error : null
        if (result.status === 'invalid' || result.status === 'reset') applySnapshot(createDefaultProjectAudioSnapshot())
        return result
      }
      if (!isProjectAudioDocumentPaired(result.document, useProjectStore().audioSavedAt)) {
        hydrationStatus.value = 'unpaired'
        hydrationError.value = null
        return { status: 'unpaired' }
      }
      applySnapshot(result.document.snapshot)
      hydrationStatus.value = 'loaded'
      hydrationError.value = null
      return { status: 'loaded' }
    } finally {
      isHydrating = false
    }
  }

  function saveProjectAudio(): ProjectAudioSaveResult {
    const project = useProjectStore()
    const savedAt = Date.now()
    const saved = saveProjectAudioDocument(captureProjectAudioSnapshot(), savedAt)
    if (!saved.ok) return { ok: false, stage: 'audio-storage', error: saved.error }
    const previousSavedAt = project.audioSavedAt
    project.setAudioSavedAt(savedAt)
    const projectSaved = project.saveToStorage()
    if (!projectSaved.ok) {
      project.setAudioSavedAt(previousSavedAt)
      return { ok: false, stage: 'project-storage', error: projectSaved.error }
    }
    return { ok: true, savedAt }
  }

  function scheduleAutoSave(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
    saveDebounceTimer = setTimeout(() => {
      saveDebounceTimer = null
      void saveProjectAudio()
    }, AUDIO_SETTINGS_PERSISTENCE_DEBOUNCE_MS)
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    const mixer = useMixerStore()
    watch(
      [
        soundIds,
        controls,
        () => mixer.leadVolume,
        () => mixer.chordVolume,
        () => mixer.masterVolume,
        () => mixer.isLeadMuted,
        () => mixer.isChordMuted,
        () => mixer.isLeadSolo,
        () => mixer.isChordSolo,
        () => mixer.isBusCompressorActive
      ],
      () => {
        if (!isHydrating) {
          scheduleAutoSave()
        }
      }
    )
  }

  return {
    soundIds,
    controls,
    hydrationStatus,
    hydrationError,
    setSound,
    setControl,
    resetControls,
    captureProjectAudioSnapshot,
    hydrateProjectAudio,
    saveProjectAudio
  }
})
