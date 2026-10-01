import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { toneMock } = await vi.hoisted(async () => {
  const helpers = await import('../helpers/tone-mock')
  return { toneMock: helpers.createToneMock({ meterValue: -14.2 }).toneMock }
})

vi.mock('tone', () => toneMock)

import { getPresetDefinition } from '../../src/core/presets/synths'
import type { PlaybackEngine } from '../../src/audio/playback-engine'
import type { AppNote } from '../../src/core/schemas/note.schema'
import { DEFAULT_AUDIO_SOUND_IDS } from '../../src/config/defaults'
import { DEFAULT_FOLLOW_PLAYHEAD } from '../../src/config/ui-defaults'
import { STEPS_PER_BAR } from '../../src/core/schemas/project.schema'
import { useAudioStore } from '../../src/stores/audio.store'
import { useHarmonyStore } from '../../src/stores/harmony.store'
import { useMelodyStore } from '../../src/stores/melody.store'
import { useMixerStore } from '../../src/stores/mixer.store'
import { useProjectStore } from '../../src/stores/project.store'
import { useUiStore } from '../../src/stores/ui.store'

describe('useAudioStore', () => {
  const auditionNote: AppNote = {
    id: '11111111-1111-4111-8111-111111111111',
    pitch: 'C4',
    midi: 60,
    step: 0,
    durationSteps: 2,
    velocity: 100,
    isMuted: false
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default playback and preset state', () => {
    const store = useAudioStore()

    expect(store.isPlaying).toBe(false)
    expect(store.isPaused).toBe(false)
    expect(store.currentStep).toBe(0)
    expect(store.currentTime).toBe(0)
    expect(store.activeLeadPreset).toBe(DEFAULT_AUDIO_SOUND_IDS.lead)
    expect(store.activeChordPreset).toBe(DEFAULT_AUDIO_SOUND_IDS.chord)
    expect(store.followPlayhead).toBe(DEFAULT_FOLLOW_PLAYHEAD)
  })

  it('manages play, pause, stop lifecycle', async () => {
    const store = useAudioStore()

    await store.play()
    expect(store.isPlaying).toBe(true)
    expect(store.isPaused).toBe(false)

    store.pause()
    expect(store.isPlaying).toBe(false)
    expect(store.isPaused).toBe(true)

    store.seek(12)
    expect(store.currentStep).toBe(12)
    expect(store.playhead.step).toBe(12)

    store.stop()
    expect(store.isPlaying).toBe(false)
    expect(store.isPaused).toBe(false)
    expect(store.currentStep).toBe(0)
    expect(store.currentTime).toBe(0)
    expect(store.playhead.step).toBe(0)
  })

  it('returns the playhead to the start on pause when enabled', () => {
    const store = useAudioStore()
    const uiStore = useUiStore()

    uiStore.setReturnToStartOnPause(false)
    store.seek(12)
    store.pause()
    expect(store.currentStep).toBe(12)
    expect(store.playhead.step).toBe(12)

    uiStore.setReturnToStartOnPause(true)
    store.seek(12)
    store.pause()
    expect(store.currentStep).toBe(0)
    expect(store.playhead.step).toBe(0)
  })

  it('exposes follow playhead state with toggle', () => {
    const store = useAudioStore()

    expect(store.followPlayhead).toBe(DEFAULT_FOLLOW_PLAYHEAD)

    store.setFollowPlayhead(false)
    expect(store.followPlayhead).toBe(false)

    store.setFollowPlayhead(true)
    expect(store.followPlayhead).toBe(DEFAULT_FOLLOW_PLAYHEAD)

    store.toggleFollowPlayhead()
    expect(store.followPlayhead).toBe(false)
    store.toggleFollowPlayhead()
    expect(store.followPlayhead).toBe(true)
  })

  it('seeks relative bars through the normal seek path and stops at the beginning', () => {
    const store = useAudioStore()
    store.seek(STEPS_PER_BAR)

    store.seekRelativeBars(1)
    expect(store.currentStep).toBe(STEPS_PER_BAR * 2)
    expect(store.playhead.step).toBe(STEPS_PER_BAR * 2)

    store.seekRelativeBars(-3)
    expect(store.currentStep).toBe(0)
    expect(store.playhead.step).toBe(0)
  })

  it('switches factory sounds without changing the mix state', () => {
    const audioStore = useAudioStore()
    const mixerStore = useMixerStore()

    audioStore.setLeadPreset('analog-saw')
    expect(audioStore.activeLeadPreset).toBe('analog-saw')
    expect(mixerStore.leadVolume).toBe(0.9)

    audioStore.setChordPreset('electric-piano')
    expect(audioStore.activeChordPreset).toBe('electric-piano')
    expect(mixerStore.chordVolume).toBe(0.75)
  })

  it('preserves mix settings when replacing an internal factory patch', () => {
    const audioStore = useAudioStore()
    const mixerStore = useMixerStore()

    mixerStore.setVolume('lead', 0.42)

    const patch = getPresetDefinition('analog-saw')!
    audioStore.setLeadPatch(patch)

    expect(audioStore.activeLeadPatch.id).toBe('analog-saw')
    expect(mixerStore.leadVolume).toBe(0.42)
  })

  it('syncs schedule transferring melody notes and harmony chords to playback engine', async () => {
    const projectStore = useProjectStore()
    projectStore.setBpm(130)
    projectStore.setBars(4)

    const melodyStore = useMelodyStore()
    melodyStore.addNote({
      id: 'n1',
      pitch: 'C4',
      midi: 60,
      step: 0,
      durationSteps: 4,
      velocity: 100,
      isMuted: false
    })

    const harmonyStore = useHarmonyStore()
    harmonyStore.addChord({
      id: 'c1',
      name: 'Am',
      roman: 'i',
      notes: ['A3', 'C4', 'E4'],
      voicing: ['A3', 'C4', 'E4'],
      startBar: 0,
      durationBars: 2,
      inversion: 0
    })

    const audioStore = useAudioStore()
    const engine = (await audioStore.initializeAudio())!
    const scheduleSpy = vi.spyOn(engine, 'schedule')

    audioStore.syncSchedule()

    expect(scheduleSpy).toHaveBeenCalledTimes(1)
    const [notesArg, chordsArg, projectConfigArg] = scheduleSpy.mock.calls[0]
    expect(notesArg).toHaveLength(1)
    expect(notesArg[0].id).toBe('n1')
    expect(chordsArg).toHaveLength(1)
    expect(chordsArg[0].name).toBe('Am')
    expect(projectConfigArg.bpm).toBe(130)
  })

  it('starts playback at loopStartStep when playFromLoopStart and isLooping are active', async () => {
    const store = useAudioStore()
    const projectStore = useProjectStore()
    const uiStore = useUiStore()

    projectStore.setLoop(32, 64)
    projectStore.setLooping(true)
    uiStore.setPlayFromLoopStart(true)

    // Initially at 0 (outside loop range 32..64)
    store.seek(0)
    expect(store.currentStep).toBe(0)

    // When play() is invoked, it seeks to loopStartStep (32)
    await store.play()
    expect(store.currentStep).toBe(32)
    expect(store.isPlaying).toBe(true)

    store.stop()
  })

  it('returns to loopStartStep on first stop and bar 0 on second stop', () => {
    const store = useAudioStore()
    const projectStore = useProjectStore()
    const uiStore = useUiStore()

    projectStore.setLoop(16, 48)
    projectStore.setLooping(true)
    uiStore.setPlayFromLoopStart(true)

    store.seek(30)
    expect(store.currentStep).toBe(30)

    // First stop: returns to loop start
    store.stop()
    expect(store.currentStep).toBe(16)
    expect(store.playhead.step).toBe(16)

    // Second stop (double-stop): returns to beginning (bar 0)
    store.stop()
    expect(store.currentStep).toBe(0)
    expect(store.playhead.step).toBe(0)
  })

  it('returns to loopStartStep on pause when returnToStartOnPause and playFromLoopStart are active', () => {
    const store = useAudioStore()
    const projectStore = useProjectStore()
    const uiStore = useUiStore()

    projectStore.setLoop(16, 48)
    projectStore.setLooping(true)
    uiStore.setPlayFromLoopStart(true)
    uiStore.setReturnToStartOnPause(true)

    store.seek(24)
    store.pause()
    expect(store.currentStep).toBe(16)
  })

  it('does not seek to loop start on stop if playFromLoopStart is disabled', () => {
    const store = useAudioStore()
    const projectStore = useProjectStore()
    const uiStore = useUiStore()

    projectStore.setLoop(16, 48)
    projectStore.setLooping(true)
    uiStore.setPlayFromLoopStart(false)

    store.seek(24)
    store.stop()
    expect(store.currentStep).toBe(0)
  })

  it('handles auditioning notes and chords through playback engine', async () => {
    const store = useAudioStore()
    const engine = (await store.initializeAudio())!
    const noteSpy = vi.spyOn(engine, 'previewNote')
    const chordSpy = vi.spyOn(engine, 'previewChord')

    await store.auditionPitch('C4')
    expect(noteSpy).toHaveBeenCalledWith('C4')

    await store.auditionChord(['C4', 'E4', 'G4'])
    expect(chordSpy).toHaveBeenCalledWith(['C4', 'E4', 'G4'])
  })

  it('tracks a take audition immediately and clears it when manually stopped', async () => {
    const store = useAudioStore()
    const engine = {
      auditionNotes: vi.fn(),
      stopNotesAudition: vi.fn()
    } as unknown as PlaybackEngine
    store.setPlaybackEngine(engine)
    const audition = store.auditionNotes([auditionNote], 120, 'take-1')

    expect(store.auditioningId).toBe('take-1')
    await audition
    expect(store.auditioningId).toBe('take-1')

    store.stopNotesAudition()
    expect(store.auditioningId).toBeNull()
  })

  it('clears the active take when the playback engine rejects an audition', async () => {
    const store = useAudioStore()
    const engine = {
      auditionNotes: vi.fn(() => {
        throw new Error('Preview host failed')
      }),
      stopNotesAudition: vi.fn()
    } as unknown as PlaybackEngine
    store.setPlaybackEngine(engine)

    await store.auditionNotes([auditionNote], 120, 'take-error')

    expect(store.auditioningId).toBeNull()
    expect(store.initializationError).toBe('Preview host failed')
    expect(engine.stopNotesAudition).toHaveBeenCalledTimes(2)
  })

  it('stops panic and progression previews cleanly', async () => {
    const store = useAudioStore()
    const engine = (await store.initializeAudio())!
    const panicSpy = vi.spyOn(engine, 'panic')

    store.panic()
    expect(panicSpy).toHaveBeenCalledTimes(1)
    expect(store.isPreviewingProgression).toBe(false)
  })

  it('resets transport, presets and delegates to mixer reset', () => {
    const audioStore = useAudioStore()
    const mixerStore = useMixerStore()

    audioStore.setLeadPreset('synthwave-80s')
    audioStore.setChordPreset('electric-piano')
    audioStore.setFollowPlayhead(false)
    mixerStore.setVolume('master', 0.5)

    audioStore.reset()

    expect(audioStore.activeLeadPreset).toBe('soft-triangle-keys')
    expect(audioStore.activeChordPreset).toBe('triangle-comp')
    expect(audioStore.followPlayhead).toBe(DEFAULT_FOLLOW_PLAYHEAD)
    expect(mixerStore.masterVolume).toBe(0.9)
  })
})
