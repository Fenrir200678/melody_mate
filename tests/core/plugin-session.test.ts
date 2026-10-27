import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_GENERATOR_PARAMS,
  DEFAULT_HARMONY_SETTINGS,
  DEFAULT_PLUGIN_OUTPUT,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_VARIATION_SETTINGS,
  PLUGIN_LIMITS
} from '../../src/config/defaults'
import { buildPlaybackSnapshot } from '../../src/core/plugin/playback-snapshot'
import { buildPluginMidiDragExport } from '../../src/core/plugin/midi-drag-export'
import {
  PluginDocumentSchema,
  PluginSessionSchema,
  PLUGIN_PROTOCOL_VERSION,
  type PluginSession
} from '../../src/core/plugin/session'
import { STEPS_PER_BAR, PROJECT_SCHEMA_VERSION } from '../../src/core/schemas/project.schema'
import type { AppNote } from '../../src/core/schemas/note.schema'
import { captureSession, pluginStores, restoreSession } from '../../src/platform/plugin/session-stores'

const NOTE_IDS = {
  lead: '10000000-0000-4000-8000-000000000001',
  muted: '10000000-0000-4000-8000-000000000002',
  ending: '10000000-0000-4000-8000-000000000003',
  outside: '10000000-0000-4000-8000-000000000004',
  chord: '20000000-0000-4000-8000-000000000001'
} as const

let piniae: ReturnType<typeof createPinia>[] = []

beforeEach(() => {
  piniae = []
  vi.stubGlobal('window', undefined)
  const pinia = createPinia()
  piniae.push(pinia)
  setActivePinia(pinia)
})

afterEach(() => {
  piniae.forEach(disposePinia)
  vi.unstubAllGlobals()
})

function makeNote(id: string, step: number, midi: number, durationSteps: number, isMuted = false): AppNote {
  return { id, pitch: 'C4', midi, step, durationSteps, velocity: 96, isMuted }
}

function makeSession(
  overrides: {
    project?: Partial<PluginSession['project']>
    notes?: AppNote[]
    harmony?: Partial<PluginSession['harmony']>
    output?: Partial<PluginSession['output']>
  } = {}
): PluginSession {
  const bars = overrides.project?.bars ?? DEFAULT_PROJECT_SETTINGS.bars
  return PluginSessionSchema.parse({
    project: {
      ...DEFAULT_PROJECT_SETTINGS,
      ...overrides.project,
      version: PROJECT_SCHEMA_VERSION,
      bars,
      loopEndStep: bars * STEPS_PER_BAR,
      workRange: { startStep: 0, endStep: bars * STEPS_PER_BAR }
    },
    melody: {
      notes: overrides.notes ?? [],
      generatorParams: DEFAULT_GENERATOR_PARAMS,
      ...DEFAULT_VARIATION_SETTINGS
    },
    harmony: { chords: [], ...DEFAULT_HARMONY_SETTINGS, ...overrides.harmony },
    rhythm: { pattern: { bars: 1, events: [] }, savedPresets: [], activeSavedPresetId: null },
    takes: {
      takes: [],
      currentSeed: 101,
      seedLocked: false,
      selectedTakeId: null,
      compareEnabled: false
    },
    output: { ...DEFAULT_PLUGIN_OUTPUT, ...overrides.output }
  })
}

describe('plugin session playback snapshot', () => {
  it('maps swung sixteenth steps to PPQ, excludes muted and out-of-project notes, and clips the ending', () => {
    const bars = 2
    const session = makeSession({
      project: { bars, swing: 1, timingLooseness: 0 },
      notes: [
        makeNote(NOTE_IDS.lead, 1, 60, 4),
        makeNote(NOTE_IDS.muted, 0, 62, 4, true),
        makeNote(NOTE_IDS.ending, bars * STEPS_PER_BAR - 1, 64, 8),
        makeNote(NOTE_IDS.outside, bars * STEPS_PER_BAR, 65, 4)
      ]
    })

    const snapshot = buildPlaybackSnapshot(session)

    expect(snapshot.lengthPpq).toBe(8)
    expect(snapshot.notes).toHaveLength(2)
    expect(snapshot.notes[0]).toMatchObject({
      pitch: 60,
      track: 'melody',
      channel: DEFAULT_PLUGIN_OUTPUT.melodyChannel
    })
    expect(snapshot.notes[0].startPpq).toBeCloseTo(1 / 3)
    expect(snapshot.notes[0].endPpq).toBeCloseTo(4 / 3)
    expect(snapshot.notes[1]).toMatchObject({
      pitch: 64,
      track: 'melody',
      channel: DEFAULT_PLUGIN_OUTPUT.melodyChannel,
      endPpq: 8
    })
    expect(snapshot.notes[1].startPpq).toBeLessThan(snapshot.lengthPpq)
  })

  it('includes optional chord notes only when chord and MIDI output are enabled', () => {
    const chordSession = makeSession({
      project: { timingLooseness: 0 },
      notes: [makeNote(NOTE_IDS.lead, 0, 60, 4)],
      harmony: {
        chords: [
          {
            id: NOTE_IDS.chord,
            name: 'C major',
            roman: 'I',
            notes: ['C', 'E', 'G'],
            voicing: ['C3', 'E3', 'G3'],
            startBar: 1,
            durationBars: 1,
            inversion: 0
          }
        ]
      }
    })

    const enabled = buildPlaybackSnapshot(chordSession)
    expect(enabled.notes.filter((note) => note.track === 'chords').map((note) => [note.startPpq, note.pitch])).toEqual([
      [4, 48],
      [4, 52],
      [4, 55]
    ])
    expect(
      enabled.notes
        .filter((note) => note.track === 'chords')
        .every((note) => note.channel === DEFAULT_PLUGIN_OUTPUT.chordsChannel)
    ).toBe(true)
    const routed = { ...chordSession, output: { ...chordSession.output, melodyChannel: 3, chordsChannel: 16 } }
    expect(buildPlaybackSnapshot(routed).notes.map((note) => [note.track, note.channel])).toEqual([
      ['melody', 3],
      ['chords', 16],
      ['chords', 16],
      ['chords', 16]
    ])
    expect(
      buildPlaybackSnapshot({ ...routed, output: { ...routed.output, melodyChannel: 0 } }).notes.map(
        (note) => note.track
      )
    ).toEqual(['chords', 'chords', 'chords'])
    expect(
      buildPlaybackSnapshot({ ...routed, output: { ...routed.output, chordsChannel: 0 } }).notes.map(
        (note) => note.track
      )
    ).toEqual(['melody'])
    expect(
      buildPlaybackSnapshot({
        ...chordSession,
        harmony: { ...chordSession.harmony, isMuted: true }
      }).notes.map((note) => note.track)
    ).toEqual(['melody'])
    expect(
      buildPlaybackSnapshot({
        ...chordSession,
        harmony: { ...chordSession.harmony, useChords: false }
      }).notes.map((note) => note.track)
    ).toEqual(['melody'])
    expect(
      buildPlaybackSnapshot({
        ...chordSession,
        output: { ...chordSession.output, enabled: false }
      }).notes
    ).toEqual([])
  })

  it('rejects malformed, non-finite, out-of-range, and oversized native documents', () => {
    const session = makeSession()
    const document = {
      version: PLUGIN_PROTOCOL_VERSION,
      session,
      playback: buildPlaybackSnapshot(session),
      midiBase64: '',
      filename: 'session.mid'
    }
    const playbackNote = { startPpq: 0, endPpq: 1, pitch: 60, velocity: 96, channel: 1, track: 'melody' as const }

    expect(PluginDocumentSchema.safeParse(document).success).toBe(true)
    expect(
      PluginDocumentSchema.safeParse({
        ...document,
        playback: { ...document.playback, repeat: !session.output.repeat }
      }).success
    ).toBe(false)
    expect(
      PluginDocumentSchema.safeParse({
        ...document,
        session: { ...session, output: { ...session.output, melodyChannel: 17 } }
      }).success
    ).toBe(false)
    expect(
      PluginDocumentSchema.safeParse({
        ...document,
        session: { ...session, output: { ...session.output, chordsChannel: -1 } }
      }).success
    ).toBe(false)
    expect(
      PluginDocumentSchema.safeParse({
        ...document,
        playback: { ...document.playback, notes: [{ ...playbackNote, channel: 16 }] }
      }).success
    ).toBe(false)
    expect(
      PluginDocumentSchema.safeParse({
        ...document,
        playback: { ...document.playback, notes: [{ ...playbackNote, pitch: 'C4' }] }
      }).success
    ).toBe(false)
    expect(
      PluginDocumentSchema.safeParse({
        ...document,
        playback: { ...document.playback, notes: [{ ...playbackNote, startPpq: Number.NaN }] }
      }).success
    ).toBe(false)
    expect(
      PluginDocumentSchema.safeParse({
        ...document,
        playback: {
          ...document.playback,
          notes: [{ ...playbackNote, endPpq: document.playback.lengthPpq + 1 }]
        }
      }).success
    ).toBe(false)
    const oversized = Array.from({ length: PLUGIN_LIMITS.maxNotes + 1 }, () => makeNote(NOTE_IDS.lead, 0, 60, 1))
    expect(
      PluginDocumentSchema.safeParse({
        ...document,
        session: { ...session, melody: { ...session.melody, notes: oversized } }
      }).success
    ).toBe(false)
  })
})

describe('plugin MIDI drag export', () => {
  it('exports the selected editable track with its track channel and filename', () => {
    const session = makeSession({
      project: { key: 'C', scale: 'major', timingLooseness: 0 },
      notes: [makeNote(NOTE_IDS.lead, 0, 60, 4)],
      harmony: {
        chords: [
          {
            id: NOTE_IDS.chord,
            name: 'C major',
            roman: 'I',
            notes: ['C', 'E', 'G'],
            voicing: ['C3', 'E3', 'G3'],
            startBar: 0,
            durationBars: 1,
            inversion: 0
          }
        ]
      }
    })

    const melody = buildPluginMidiDragExport(session, 'melody')
    const chords = buildPluginMidiDragExport(session, 'chords')
    const hasMidiNoteOn = (bytes: Uint8Array, channelStatus: number, pitch: number) =>
      bytes.some((byte, index) => byte === channelStatus && bytes[index + 1] === pitch)

    expect(melody.filename).toMatch(/_Lead\.mid$/)
    expect(chords.filename).toMatch(/_Chords\.mid$/)
    expect(hasMidiNoteOn(melody.bytes, 0x90, 60)).toBe(true)
    expect(hasMidiNoteOn(melody.bytes, 0x91, 48)).toBe(false)
    expect(hasMidiNoteOn(chords.bytes, 0x91, 48)).toBe(true)
    expect(hasMidiNoteOn(chords.bytes, 0x90, 60)).toBe(false)
  })

  it('exports chord voicings without melody and regardless of playback routing or mute state', () => {
    const session = makeSession({
      harmony: {
        chords: [
          {
            id: NOTE_IDS.chord,
            name: 'C major',
            roman: 'I',
            notes: ['C', 'E', 'G'],
            voicing: ['C3', 'E3', 'G3'],
            startBar: 0,
            durationBars: 1,
            inversion: 0
          }
        ],
        isMuted: true,
        useChords: false
      },
      output: { enabled: false, chordsChannel: 0 }
    })

    const exported = buildPluginMidiDragExport(session, 'chords')
    expect(exported.bytes.length).toBeGreaterThan(0)
    expect(exported.bytes.some((byte, index) => byte === 0x91 && exported.bytes[index + 1] === 48)).toBe(true)
  })
})

describe('plugin session state transfer', () => {
  it('restores panel layout, module visibility and editing view per instance while accepting older sessions', () => {
    const first = pluginStores()
    const originalPlayback = buildPlaybackSnapshot(captureSession(DEFAULT_PLUGIN_OUTPUT))
    first.ui.setLeftSidebar(false)
    first.ui.setLeftSidebarWidth(360)
    first.ui.setRightSidebarWidth(390)
    first.ui.setRhythmStudioHeight(330)
    first.ui.setRhythmStudioOpen(true)
    first.ui.setVelocityLane(true)
    first.ui.setVelocityLaneHeight(120)
    first.ui.setStepWidth(48)
    first.modules.setModuleOpen('motif', true)
    first.modules.setModuleOpen('rhythm', false)
    const saved = captureSession(DEFAULT_PLUGIN_OUTPUT)
    expect(buildPlaybackSnapshot(saved)).toEqual(originalPlayback)
    const fresh = createPinia()
    piniae.push(fresh)
    setActivePinia(fresh)
    restoreSession(PluginSessionSchema.parse(saved))
    expect(captureSession(DEFAULT_PLUGIN_OUTPUT).ui).toEqual(saved.ui)
    expect(pluginStores().modules.isModuleOpen('motif')).toBe(true)
    const { ui: _ui, ...legacy } = saved
    expect(() => restoreSession(PluginSessionSchema.parse(legacy))).not.toThrow()
    expect(pluginStores().modules.isModuleOpen('motif')).toBe(false)
  })
  it('keeps independent Pinia sessions and restores a complete captured session', () => {
    function populateSession(label: 'A' | 'B') {
      const stores = pluginStores()
      const variant = label === 'A' ? 0 : 1
      stores.project.setKey(label === 'A' ? 'D' : 'G')
      stores.project.setScale(label === 'A' ? 'dorian' : 'minor')
      stores.project.setBars(2)
      stores.melody.setNotes(
        [makeNote(label === 'A' ? NOTE_IDS.lead : NOTE_IDS.ending, variant * 4, 60 + variant, 4)],
        false,
        false
      )
      stores.melody.setGeneratorParams({ euclideanPulses: variant === 0 ? 7 : 9 })
      stores.harmony.setChords(
        [
          {
            id: label === 'A' ? NOTE_IDS.chord : NOTE_IDS.outside,
            name: label === 'A' ? 'D minor' : 'G minor',
            roman: label === 'A' ? 'i' : 'i',
            notes: label === 'A' ? ['D', 'F', 'A'] : ['G', 'Bb', 'D'],
            voicing: label === 'A' ? ['D3', 'F3', 'A3'] : ['G3', 'Bb3', 'D4'],
            startBar: 0,
            durationBars: 1,
            inversion: 0
          }
        ],
        false
      )
      stores.rhythm.insert(variant === 0 ? 3 : 6, 2, 88)
      stores.rhythm.savePreset(label === 'A' ? 'Session A rhythm' : 'Session B rhythm')
      stores.takes.currentSeed = variant === 0 ? 707 : 909
      stores.takes.setSeedLocked(true)
      const take = stores.takes.captureTake(
        stores.melody.notes,
        stores.melody.generatorParams,
        { key: stores.project.key, scale: stores.project.scale, bpm: stores.project.bpm, bars: stores.project.bars },
        stores.takes.currentSeed
      )
      if (!take) throw new Error('Expected a take for the round-trip fixture.')
      stores.takes.selectTake(take.id)
      return stores
    }

    const piniaA = piniae[0]
    const storesA = populateSession('A')
    const outputA = { enabled: true, repeat: false, melodyChannel: 3, chordsChannel: 16 }
    const capturedA = captureSession(outputA)

    const piniaB = createPinia()
    piniae.push(piniaB)
    setActivePinia(piniaB)
    populateSession('B')
    const outputB = { enabled: false, repeat: true, melodyChannel: 16, chordsChannel: 0 }
    const capturedB = captureSession(outputB)
    expect(capturedB).not.toEqual(capturedA)
    expect(capturedB.melody.generatorParams.euclideanPulses).not.toBe(capturedA.melody.generatorParams.euclideanPulses)
    expect(capturedB.rhythm.pattern).not.toEqual(capturedA.rhythm.pattern)
    expect(capturedB.harmony.chords).not.toEqual(capturedA.harmony.chords)
    expect(capturedB.takes.takes[0].seed).not.toBe(capturedA.takes.takes[0].seed)

    restoreSession(capturedA)
    expect(captureSession(capturedA.output)).toEqual(capturedA)

    setActivePinia(piniaA)
    expect(captureSession(outputA)).toEqual(capturedA)
    expect(storesA.melody.notes).toEqual(capturedA.melody.notes)
  })
})
