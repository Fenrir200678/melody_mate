import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as seedHelpers from '../../src/core/generator/rng'
import * as arpSeedHelpers from '../../src/composables/arpSeed'
import * as trainedModelService from '../../src/services/trained-model-service'
import { AppNoteSchema, type AppNote } from '../../src/core/schemas/note.schema'
import { midiToPitch } from '../../src/core/theory/scale.engine'
import { GENERATOR_STORAGE_KEY, useMelodyStore } from '../../src/stores/melody.store'
import { DEFAULT_GENERATOR_PARAMS, DEFAULT_VARIATION_SETTINGS } from '../../src/config/defaults'
import { defaultsFingerprint } from '../../src/utils/defaults-fingerprint.utils'
import { useAudioStore } from '../../src/stores/audio.store'
import { useProjectStore } from '../../src/stores/project.store'
import { TAKE_CAPACITY, useTakesStore } from '../../src/stores/takes.store'
import { useUiStore } from '../../src/stores/ui.store'

const storageMap = new Map<string, string>()

const mockLocalStorage = {
  getItem: (key: string): string | null => storageMap.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    storageMap.set(key, String(value))
  },
  removeItem: (key: string): void => {
    storageMap.delete(key)
  },
  clear: (): void => {
    storageMap.clear()
  },
  get length(): number {
    return storageMap.size
  },
  key: (index: number): string | null => Array.from(storageMap.keys())[index] ?? null
}

;(globalThis as unknown as { window: unknown }).window = {
  localStorage: mockLocalStorage
}
;(globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage

function sampleNote(id: string, step = 0, midi = 60, durationSteps = 4): AppNote {
  return {
    id,
    pitch: 'C4',
    midi,
    step,
    durationSteps,
    velocity: 100,
    isMuted: false
  }
}

describe('useMelodyStore', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    setActivePinia(createPinia())
  })

  it('initializes with clean default state', () => {
    const store = useMelodyStore()

    expect(store.notes).toEqual([])
    expect(store.selectedNoteIds).toEqual([])
    expect(store.selectedNotes).toEqual([])
    expect(store.isGenerating).toBe(false)
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)
    expect(store.generatorParams).toEqual(DEFAULT_GENERATOR_PARAMS)
    expect(store.variationMode).toBe(DEFAULT_VARIATION_SETTINGS.variationMode)
    expect(store.mutationAxes).toEqual(DEFAULT_VARIATION_SETTINGS.mutationAxes)
    expect(store.mutationStrength).toBe(DEFAULT_VARIATION_SETTINGS.mutationStrength)
    expect(store.keepOriginalAsTake).toBe(DEFAULT_VARIATION_SETTINGS.keepOriginalAsTake)
  })

  it('updates rhythm mode and rhythm preset', () => {
    const store = useMelodyStore()
    store.setRhythmMode('euclidean')
    expect(store.generatorParams.rhythmMode).toBe('euclidean')

    store.setRhythmPreset('four-on-the-floor-bass')
    expect(store.generatorParams.rhythmPresetId).toBe('four-on-the-floor-bass')
  })

  it('adds, updates, and deletes notes', () => {
    const store = useMelodyStore()
    const note1 = sampleNote('note-1', 0, 60)
    const note2 = sampleNote('note-2', 4, 62)

    store.addNote(note1)
    store.addNote(note2)
    expect(store.notes).toHaveLength(2)

    store.updateNote('note-1', { velocity: 120, pitch: 'C#4', midi: 61 })
    expect(store.notes[0].velocity).toBe(120)
    expect(store.notes[0].midi).toBe(61)

    store.deleteNote('note-2')
    expect(store.notes).toHaveLength(1)
    expect(store.notes[0].id).toBe('note-1')
  })

  it('deletes selected notes and clears selection', () => {
    const store = useMelodyStore()
    store.addNote(sampleNote('n1', 0))
    store.addNote(sampleNote('n2', 4))
    store.addNote(sampleNote('n3', 8))

    store.setSelectedNoteIds(['n1', 'n3'])
    expect(store.selectedNoteIds).toEqual(['n1', 'n3'])
    expect(store.selectedNotes).toHaveLength(2)

    store.deleteSelectedNotes()
    expect(store.notes).toHaveLength(1)
    expect(store.notes[0].id).toBe('n2')
    expect(store.selectedNoteIds).toEqual([])
  })

  it('quantizes notes on snap grid', () => {
    const store = useMelodyStore()
    store.addNote(sampleNote('n1', 0.8, 60))
    store.addNote(sampleNote('n2', 2.3, 62))

    store.quantize(2) // snap to grid of 2
    expect(store.notes[0].step).toBe(0) // 0.8 -> round(0.8/2)*2 = 0
    expect(store.notes[1].step).toBe(2) // 2.3 -> round(2.3/2)*2 = 2
  })

  it('generates notes using project and generator parameters', async () => {
    const projectStore = useProjectStore()
    projectStore.setBars(4)
    projectStore.setKey('C')
    projectStore.setScale('major')

    const melodyStore = useMelodyStore()
    await melodyStore.generate()

    expect(melodyStore.notes.length).toBeGreaterThan(0)
    expect(melodyStore.isGenerating).toBe(false)
    expect(melodyStore.canUndo).toBe(true)
    const takes = useTakesStore()
    expect(takes.takes).toHaveLength(1)
    expect(takes.takes[0].notes).toEqual(melodyStore.notes)
    expect(takes.takes[0].seed).toBe(takes.currentSeed)
  })

  it('replaces only the Arp Studio work range and restores it with undo and redo', async () => {
    const index = vi.spyOn(trainedModelService, 'loadTrainedModelIndex').mockResolvedValue(null)
    try {
      const project = useProjectStore()
      project.setWorkRange({ startStep: 4, endStep: 12 })
      const melody = useMelodyStore()
      const original = [
        sampleNote('before', 0, 60, 4),
        sampleNote('replaced', 4, 62, 4),
        sampleNote('crossing', 10, 64, 4),
        sampleNote('after', 16, 67, 4)
      ]
      melody.setNotes(original, false)
      melody.setGeneratorParams({ arpPattern: 'up-down', arpRate: '1/16', arpSeed: 42, arpSeedLocked: true })

      await melody.applyArp()
      const generated = melody.notes.map((note) => ({ ...note }))
      expect(generated.some((note) => note.id === 'before')).toBe(true)
      expect(generated.some((note) => note.id === 'after')).toBe(true)
      expect(generated.some((note) => note.id === 'replaced')).toBe(false)
      expect(generated.some((note) => note.step >= 4 && note.step < 12)).toBe(true)
      expect(generated.every((note) => note.step < 4 || note.step + note.durationSteps <= 12 || note.step >= 12)).toBe(
        true
      )
      expect(melody.arpModelStatus).toBe('fallback')

      melody.undo()
      expect(melody.notes).toEqual(original)
      melody.redo()
      expect(melody.notes).toEqual(generated)
    } finally {
      index.mockRestore()
    }
  })

  it('starts Arp Studio in Auto; only Shuffle rolls the displayed seed and Apply keeps it', async () => {
    const index = vi.spyOn(trainedModelService, 'loadTrainedModelIndex').mockResolvedValue(null)
    const nextSeed = vi.spyOn(arpSeedHelpers, 'nextArpSeed').mockReturnValueOnce(101).mockReturnValueOnce(202)
    try {
      const melody = useMelodyStore()
      const takes = useTakesStore()
      expect(melody.generatorParams.arpSeedLocked).toBe(DEFAULT_GENERATOR_PARAMS.arpSeedLocked)
      await melody.loadArpModels()

      melody.shuffleArp()
      expect(melody.generatorParams.arpSeed).toBe(101)
      await melody.applyArp()
      expect(melody.generatorParams.arpSeed).toBe(101)

      melody.shuffleArp()
      expect(melody.generatorParams.arpSeed).toBe(202)
      await melody.applyArp()
      expect(melody.generatorParams.arpSeed).toBe(202)
      expect(takes.takes.map((take) => take.seed)).toEqual([101, 202])
      expect(nextSeed).toHaveBeenCalledTimes(2)
    } finally {
      index.mockRestore()
      nextSeed.mockRestore()
    }
  })

  it('reproduces Arp Studio notes with a manually entered or locked seed and resumes Auto when unlocked', async () => {
    const index = vi.spyOn(trainedModelService, 'loadTrainedModelIndex').mockResolvedValue(null)
    const nextSeed = vi.spyOn(arpSeedHelpers, 'nextArpSeed').mockReturnValue(9876)
    try {
      const melody = useMelodyStore()
      melody.setGeneratorParams({ arpPattern: 'random', arpSeed: 4242, arpSeedLocked: true })
      await melody.applyArp()
      const first = melody.notes.map(({ id: _id, ...note }) => note)
      melody.shuffleArp()
      await melody.applyArp()
      expect(melody.notes.map(({ id: _id, ...note }) => note)).toEqual(first)
      expect(melody.generatorParams.arpSeed).toBe(4242)
      expect(nextSeed).not.toHaveBeenCalled()

      melody.setGeneratorParams({ arpSeedLocked: false })
      melody.shuffleArp()
      expect(melody.generatorParams.arpSeed).toBe(9876)
      expect(nextSeed).toHaveBeenCalledOnce()
    } finally {
      index.mockRestore()
      nextSeed.mockRestore()
    }
  })

  it('persists the displayed Arp Studio seed and lock mode in generator settings', async () => {
    const melody = useMelodyStore()
    melody.setGeneratorParams({ arpSeed: 314159, arpSeedLocked: true })
    await nextTick()

    setActivePinia(createPinia())
    const restored = useMelodyStore()
    expect(restored.generatorParams.arpSeed).toBe(314159)
    expect(restored.generatorParams.arpSeedLocked).toBe(true)
  })

  it('repeats musical output with a locked seed including random preset selection', async () => {
    const takes = useTakesStore()
    takes.currentSeed = 12345
    takes.setSeedLocked(true)
    const melody = useMelodyStore()
    melody.setGeneratorParams({ randomRhythmPreset: true })
    await melody.generate()
    const first = melody.notes.map(({ id: _id, ...musical }) => musical)
    const preset = melody.generatorParams.rhythmPresetId
    await melody.generate()
    expect(melody.notes.map(({ id: _id, ...musical }) => musical)).toEqual(first)
    expect(melody.generatorParams.rhythmPresetId).toBe(preset)
    expect(takes.currentSeed).toBe(12345)
    expect(takes.takes.map((take) => take.seed)).toEqual([12345])
  })

  it('chooses and reports a fresh seed for each unlocked generation', async () => {
    const takes = useTakesStore()
    const randomSeed = vi.spyOn(seedHelpers, 'randomSeed').mockReturnValueOnce(100).mockReturnValueOnce(200)
    try {
      const melody = useMelodyStore()
      await melody.generate()
      expect(takes.currentSeed).toBe(100)
      await melody.generate()
      expect(takes.currentSeed).toBe(200)
      expect(takes.takes.map((take) => take.seed)).toEqual([100, 200])
      expect(randomSeed).toHaveBeenCalledTimes(2)
    } finally {
      randomSeed.mockRestore()
    }
  })

  it('preserves a locked seed when generation is blocked or fails', async () => {
    const takes = useTakesStore()
    takes.currentSeed = 321
    takes.setSeedLocked(true)
    const randomSeed = vi.spyOn(seedHelpers, 'randomSeed')
    const loadModel = vi.spyOn(trainedModelService, 'loadTrainedModel')
    try {
      const melody = useMelodyStore()
      melody.setRhythmMode('custom')
      await melody.generate()
      expect(takes.currentSeed).toBe(321)

      melody.setRhythmMode('preset')
      loadModel.mockRejectedValueOnce(new Error('model unavailable'))
      await expect(melody.generate()).rejects.toThrow('model unavailable')
      expect(takes.currentSeed).toBe(321)

      loadModel.mockResolvedValueOnce(null)
      await melody.generate()
      expect(takes.takes[0].seed).toBe(321)
      expect(randomSeed).not.toHaveBeenCalled()
    } finally {
      randomSeed.mockRestore()
      loadModel.mockRestore()
    }
  })

  it('does not capture or change the seed when an empty custom rhythm prevents generation', async () => {
    const takes = useTakesStore()
    takes.currentSeed = 42
    const melody = useMelodyStore()
    melody.setRhythmMode('custom')
    await melody.generate()
    expect(takes.takes).toEqual([])
    expect(takes.currentSeed).toBe(42)
    expect(melody.isGenerating).toBe(false)
    expect(melody.canUndo).toBe(false)
  })

  it('generates strictly inside active loop bounds and preserves outside notes', async () => {
    const projectStore = useProjectStore()
    projectStore.setBars(4)
    projectStore.setKey('C')
    projectStore.setScale('major')

    const melodyStore = useMelodyStore()
    // Place existing note in bar 0 (step 0) and bar 3 (step 48)
    melodyStore.addNote({
      id: 'existing-bar-0',
      pitch: 'C4',
      midi: 60,
      step: 0,
      durationSteps: 4,
      velocity: 100,
      isMuted: false
    })
    melodyStore.addNote({
      id: 'existing-bar-3',
      pitch: 'G4',
      midi: 67,
      step: 48,
      durationSteps: 4,
      velocity: 100,
      isMuted: false
    })

    projectStore.setWorkRange({ startStep: 16, endStep: 32 })
    projectStore.setLoop(0, 64)
    projectStore.setLooping(true)

    await melodyStore.generate()

    // Notes outside loop region must be preserved
    expect(melodyStore.notes.some((n) => n.id === 'existing-bar-0')).toBe(true)
    expect(melodyStore.notes.some((n) => n.id === 'existing-bar-3')).toBe(true)

    // Newly generated notes should be within [16, 32)
    const generatedInLoop = melodyStore.notes.filter((n) => n.id !== 'existing-bar-0' && n.id !== 'existing-bar-3')
    expect(generatedInLoop.length).toBeGreaterThan(0)
    expect(useTakesStore().takes[0].notes).toEqual(generatedInLoop)
    expect(useTakesStore().takes[0].context).toMatchObject({ rangeStartStep: 16, rangeEndStep: 32 })
    generatedInLoop.forEach((n) => {
      expect(n.step).toBeGreaterThanOrEqual(16)
      expect(n.step).toBeLessThan(32)
      expect(n.step + n.durationSteps).toBeLessThanOrEqual(32)
    })
  })

  it('generates across the entire work range even if loop markers exist', async () => {
    const projectStore = useProjectStore()
    projectStore.setBars(4)
    projectStore.setKey('C')
    projectStore.setScale('major')

    const melodyStore = useMelodyStore()
    melodyStore.addNote(sampleNote('existing-note', 0))

    // Set loop markers
    projectStore.setLoop(16, 32)
    projectStore.setLooping(true)

    // Explicitly target the entire project independently of playback.
    projectStore.selectEntireProject()

    await melodyStore.generate()

    // Full project generation should replace all existing notes across the 64-step span
    expect(melodyStore.notes.some((n) => n.id === 'existing-note')).toBe(false)
    expect(melodyStore.notes.length).toBeGreaterThan(0)
    // Notes can span beyond loop region [16, 32)
    const hasNotesOutsideLoop = melodyStore.notes.some((n) => n.step < 16 || n.step >= 32)
    expect(hasNotesOutsideLoop).toBe(true)
  })

  it('generates notes with cadence constraints when startWithRoot and endWithRoot are enabled in store', async () => {
    const projectStore = useProjectStore()
    projectStore.setBars(2)
    projectStore.setKey('G')
    projectStore.setScale('major')

    const melodyStore = useMelodyStore()
    melodyStore.setGeneratorParams({
      startWithRoot: true,
      endWithRoot: true
    })

    await melodyStore.generate()

    expect(melodyStore.notes.length).toBeGreaterThan(1)
    expect(melodyStore.notes[0].pitch.startsWith('G')).toBe(true)
    expect(melodyStore.notes[melodyStore.notes.length - 1].pitch.startsWith('G')).toBe(true)
  })

  it('generates notes following preset step onsets in preset mode', async () => {
    const projectStore = useProjectStore()
    projectStore.setBars(2)
    projectStore.setKey('C')
    projectStore.setScale('major')

    const melodyStore = useMelodyStore()
    melodyStore.setRhythmMode('preset')
    melodyStore.setRhythmPreset('four-on-the-floor-bass')
    // Task 45 may vary motif onsets; FREE isolates the preset rhythm contract.
    melodyStore.setGeneratorParams({ motif: 'FREE', callAndResponse: false })
    await melodyStore.generate()

    expect(melodyStore.notes.length).toBeGreaterThan(0)
    // four-on-the-floor-bass has 4 steps of duration 4 -> note onsets on 0, 4, 8, 12, 16, 20, 24, 28
    melodyStore.notes.forEach((note) => {
      expect(note.step % 4).toBe(0)
    })
  })

  it('generates notes using Euclidean rhythm when rhythmMode is euclidean', async () => {
    const projectStore = useProjectStore()
    projectStore.setBars(2)
    projectStore.setKey('C')
    projectStore.setScale('major')

    const melodyStore = useMelodyStore()
    melodyStore.setRhythmMode('euclidean')
    melodyStore.setGeneratorParams({
      euclideanPulses: 4,
      euclideanSteps: 16,
      euclideanRotation: 0,
      restProbability: 0
    })
    await melodyStore.generate()

    expect(melodyStore.notes.length).toBeGreaterThan(0)
    expect(melodyStore.generatorParams.rhythmMode).toBe('euclidean')
  })

  it('manages selections with toggle and multi-select', () => {
    const store = useMelodyStore()
    store.addNote(sampleNote('n1', 0))
    store.addNote(sampleNote('n2', 4))

    store.selectNote('n1')
    expect(store.selectedNoteIds).toEqual(['n1'])

    // Toggle select another
    store.selectNote('n2', true)
    expect(store.selectedNoteIds).toEqual(['n1', 'n2'])

    // Toggle unselect first
    store.selectNote('n1', true)
    expect(store.selectedNoteIds).toEqual(['n2'])

    store.selectAll()
    expect(store.selectedNoteIds).toEqual(['n1', 'n2'])

    store.clearSelection()
    expect(store.selectedNoteIds).toEqual([])
  })

  it('supports undo and redo, pruning invalid selectedNoteIds', () => {
    const store = useMelodyStore()
    const n1 = sampleNote('n1', 0)
    const n2 = sampleNote('n2', 4)

    store.addNote(n1)
    expect(store.canUndo).toBe(true)
    expect(store.canRedo).toBe(false)

    store.addNote(n2)
    store.setSelectedNoteIds(['n2'])

    // Undo adding n2
    store.undo()
    expect(store.notes).toHaveLength(1)
    expect(store.notes[0].id).toBe('n1')
    // Selected 'n2' does not exist anymore, so it must be pruned
    expect(store.selectedNoteIds).toEqual([])
    expect(store.canRedo).toBe(true)

    // Redo adding n2
    store.redo()
    expect(store.notes).toHaveLength(2)
    expect(store.notes.map((n) => n.id)).toEqual(['n1', 'n2'])
    expect(store.canRedo).toBe(false)

    // Undo back to empty
    store.undo()
    store.undo()
    expect(store.notes).toEqual([])
    expect(store.canUndo).toBe(false)
  })

  it('clears melody and pushes snapshot to history', () => {
    const store = useMelodyStore()
    store.addNote(sampleNote('n1', 0))
    store.clearMelody()

    expect(store.notes).toEqual([])
    expect(store.canUndo).toBe(true)

    store.undo()
    expect(store.notes).toHaveLength(1)
    expect(store.notes[0].id).toBe('n1')
  })

  it('updates octave range and auto-adjusts collision boundaries', () => {
    const store = useMelodyStore()

    store.setGeneratorParams({ minOctave: 4, maxOctave: 6 })
    expect(store.generatorParams.minOctave).toBe(4)
    expect(store.generatorParams.maxOctave).toBe(6)

    // Increasing minOctave past current maxOctave pushes maxOctave up
    store.setGeneratorParams({ minOctave: 7 })
    expect(store.generatorParams.minOctave).toBe(7)
    expect(store.generatorParams.maxOctave).toBe(7)

    // Decreasing maxOctave below current minOctave pushes minOctave down
    store.setGeneratorParams({ maxOctave: 2 })
    expect(store.generatorParams.minOctave).toBe(2)
    expect(store.generatorParams.maxOctave).toBe(2)
  })

  it('generates notes strictly bounded by configured octave range', async () => {
    const projectStore = useProjectStore()
    projectStore.setBars(2)
    projectStore.setKey('C')
    projectStore.setScale('major')

    const store = useMelodyStore()
    store.setGeneratorParams({ minOctave: 5, maxOctave: 6 })
    await store.generate()

    expect(store.notes.length).toBeGreaterThan(0)
    // C5 is MIDI 72, B6 is MIDI 95
    for (const note of store.notes) {
      expect(note.midi).toBeGreaterThanOrEqual(72)
      expect(note.midi).toBeLessThanOrEqual(95)
    }
  })

  it('supports random rhythm preset toggle, instant pick, and randomization on generate', async () => {
    const store = useMelodyStore()

    // Toggle test
    expect(store.generatorParams.randomRhythmPreset).toBe(false)
    store.toggleRandomRhythmPreset()
    expect(store.generatorParams.randomRhythmPreset).toBe(true)

    // Instant pick test
    store.pickRandomRhythmPreset()
    expect(typeof store.generatorParams.rhythmPresetId).toBe('string')
    expect(store.generatorParams.rhythmPresetId.length).toBeGreaterThan(0)

    // Generate with random preset active
    const projectStore = useProjectStore()
    projectStore.setBars(2)
    projectStore.setKey('C')
    projectStore.setScale('major')

    store.setRhythmMode('preset')
    await store.generate()

    expect(store.notes.length).toBeGreaterThan(0)
    expect(typeof store.generatorParams.rhythmPresetId).toBe('string')
  })

  it('persists generator params to localStorage on change', async () => {
    const store = useMelodyStore()
    store.setGeneratorParams({ restProbability: 0.42 })
    await nextTick()

    const stored = JSON.parse(localStorage.getItem(GENERATOR_STORAGE_KEY) ?? '{}')
    expect(stored.restProbability).toBe(0.42)
  })

  it('hydrates generator params from localStorage and fills schema defaults', () => {
    localStorage.setItem(
      GENERATOR_STORAGE_KEY,
      JSON.stringify({
        restProbability: 0.42,
        motif: 'AABA',
        defaultsFingerprint: defaultsFingerprint(DEFAULT_GENERATOR_PARAMS)
      })
    )

    const store = useMelodyStore()
    store.hydrateGeneratorFromStorage()

    expect(store.generatorParams.restProbability).toBe(0.42)
    expect(store.generatorParams.motif).toBe('AABA')
    expect(store.generatorParams.rhythmMode).toBe('preset')
  })

  it('falls back to config defaults when the stored payload predates a defaults change', () => {
    localStorage.setItem(
      GENERATOR_STORAGE_KEY,
      JSON.stringify({ restProbability: 0.42, motif: 'AABA', defaultsFingerprint: 'stale-fingerprint' })
    )

    const store = useMelodyStore()
    store.hydrateGeneratorFromStorage()

    expect(store.generatorParams.restProbability).toBe(DEFAULT_GENERATOR_PARAMS.restProbability)
    expect(store.generatorParams.motif).toBe(DEFAULT_GENERATOR_PARAMS.motif)
  })

  it('falls back to defaults when generator payload is corrupt', () => {
    localStorage.setItem(GENERATOR_STORAGE_KEY, 'invalid-json{{{')

    const store = useMelodyStore()
    store.hydrateGeneratorFromStorage()

    expect(store.generatorParams.restProbability).toBe(DEFAULT_GENERATOR_PARAMS.restProbability)
  })

  it('resets generator params to schema defaults', () => {
    const store = useMelodyStore()
    store.setGeneratorParams({ restProbability: 0.9, motif: 'AAAB', rhythmMode: 'euclidean', markovOrder: 4 })

    store.resetGeneratorParams()

    expect(store.generatorParams).toEqual(DEFAULT_GENERATOR_PARAMS)
  })

  describe('duplicateSelected', () => {
    it('duplicates selected notes shifted by their time span and selects the new notes', () => {
      const store = useMelodyStore()
      const n1 = sampleNote('n1', 0, 4) // step 0..4
      const n2 = sampleNote('n2', 4, 4) // step 4..8
      store.setNotes([n1, n2])
      store.setSelectedNoteIds(['n1', 'n2'])

      store.duplicateSelected()

      // Total notes should now be 4: [n1, n2, clone1, clone2]
      expect(store.notes).toHaveLength(4)
      const clones = store.notes.filter((n) => n.id !== 'n1' && n.id !== 'n2')
      expect(clones).toHaveLength(2)

      // Time span was 8 steps, so clones start at 0+8=8 and 4+8=12
      expect(clones[0].step).toBe(8)
      expect(clones[1].step).toBe(12)

      // Clones are selected
      expect(store.selectedNoteIds).toEqual(clones.map((n) => n.id))

      // Undo reverts duplication
      store.undo()
      expect(store.notes).toHaveLength(2)
      expect(store.notes.map((n) => n.id)).toEqual(['n1', 'n2'])
    })

    it('does nothing when no notes are selected', () => {
      const store = useMelodyStore()
      store.setNotes([sampleNote('n1', 0, 4)])
      store.setSelectedNoteIds([])

      store.duplicateSelected()
      expect(store.notes).toHaveLength(1)
    })
  })

  describe('transposeSelected', () => {
    it('transposes selected notes up and down by an octave (12 semitones)', () => {
      const store = useMelodyStore()
      const n1 = sampleNote('n1', 0, 60, 4) // C4 (60)
      const n2 = sampleNote('n2', 4, 64, 4) // E4 (64)
      store.setNotes([n1, n2])
      store.setSelectedNoteIds(['n1', 'n2'])

      // Transpose +12
      store.transposeSelected(12)
      expect(store.notes[0].midi).toBe(72)
      expect(store.notes[0].pitch).toBe('C5')
      expect(store.notes[1].midi).toBe(76)
      expect(store.notes[1].pitch).toBe('E5')

      // Transpose -24 (down 2 octaves to C3, E3)
      store.transposeSelected(-24)
      expect(store.notes[0].midi).toBe(48)
      expect(store.notes[0].pitch).toBe('C3')
      expect(store.notes[1].midi).toBe(52)
      expect(store.notes[1].pitch).toBe('E3')

      // Undo reverts last transpose
      store.undo()
      expect(store.notes[0].midi).toBe(72)
      expect(store.notes[1].midi).toBe(76)
    })

    it('transposes by single semitone (+1 / -1)', () => {
      const store = useMelodyStore()
      useUiStore().setScaleLocked(false)
      const n1 = sampleNote('n1', 0, 60, 4) // C4
      store.setNotes([n1])
      store.setSelectedNoteIds(['n1'])

      store.transposeSelected(1)
      expect(store.notes[0].midi).toBe(61)
      expect(store.notes[0].pitch).toBe('Db4')

      store.transposeSelected(-1)
      expect(store.notes[0].midi).toBe(60)
      expect(store.notes[0].pitch).toBe('C4')
    })

    it('clamps notes within [0, 127] bounds', () => {
      const store = useMelodyStore()
      const highNote = sampleNote('high', 0, 125, 4)
      store.setNotes([highNote])
      store.setSelectedNoteIds(['high'])

      // Trying +12 should clamp to 127
      store.transposeSelected(12)
      expect(store.notes[0].midi).toBe(127)

      // When already at max, further upward transpose does nothing
      store.transposeSelected(12)
      expect(store.notes[0].midi).toBe(127)
    })

    it('does nothing when no notes are selected or delta is 0', () => {
      const store = useMelodyStore()
      const n1 = sampleNote('n1', 0, 60, 4)
      store.setNotes([n1])
      store.setSelectedNoteIds([])

      store.transposeSelected(12)
      expect(store.notes[0].midi).toBe(60)

      store.setSelectedNoteIds(['n1'])
      store.transposeSelected(0)
      expect(store.notes[0].midi).toBe(60)
    })
  })
})

describe('variation actions', () => {
  function variationNote(id: string, step = 0, midi = 60, durationSteps = 4): AppNote {
    return { ...sampleNote(id, step, midi, durationSteps), pitch: midiToPitch(midi) }
  }

  beforeEach(() => {
    mockLocalStorage.clear()
    setActivePinia(createPinia())
  })

  it('transforms the work range including unselected notes and preserves outside notes', () => {
    const project = useProjectStore()
    project.setBars(4)
    const melody = useMelodyStore()
    const first = variationNote('00000000-0000-4000-8000-000000000011', 4, 60, 2)
    const hole = variationNote('00000000-0000-4000-8000-000000000012', 6, 64, 2)
    const last = variationNote('00000000-0000-4000-8000-000000000013', 8, 67, 4)
    const outside = variationNote('00000000-0000-4000-8000-000000000014', 16, 72, 2)
    melody.setNotes([first, hole, last, outside], false)
    melody.setSelectedNoteIds([first.id, last.id])
    project.setWorkRange({ startStep: 4, endStep: 12 })

    melody.transformCurrent('double')

    expect(melody.notes.find((note) => note.id === first.id)).toMatchObject({ step: 4, durationSteps: 4 })
    expect(melody.notes.some((note) => note.id === last.id)).toBe(false)
    expect(melody.notes.find((note) => note.id === hole.id)).toMatchObject({ step: 8, durationSteps: 4 })
    expect(melody.notes.find((note) => note.id === outside.id)).toEqual(outside)
    expect(useTakesStore().takes.at(-1)?.context).toMatchObject({ rangeStartStep: 0, rangeEndStep: 64 })
  })

  it('uses the full project span when selection is empty and clips transforms at its end', () => {
    const project = useProjectStore()
    project.setBars(2)
    const melody = useMelodyStore()
    const inside = variationNote('00000000-0000-4000-8000-000000000021', 12, 60, 4)
    const tail = variationNote('00000000-0000-4000-8000-000000000023', 14, 60, 4)
    const beyond = variationNote('00000000-0000-4000-8000-000000000022', 32, 64, 2)
    melody.setNotes([inside, tail, beyond], false)

    melody.transformCurrent('double')

    expect(melody.notes.find((note) => note.id === inside.id)).toMatchObject({ step: 24, durationSteps: 8 })
    expect(melody.notes.find((note) => note.id === tail.id)).toMatchObject({ step: 28, durationSteps: 4 })
    expect(melody.notes.find((note) => note.id === beyond.id)).toEqual(beyond)
    expect(useTakesStore().takes.at(-1)?.context).toMatchObject({ rangeStartStep: 0, rangeEndStep: 32 })
  })

  it('does not expand variation to the project when the work range contains no notes', () => {
    const melody = useMelodyStore()
    const original = [variationNote('00000000-0000-4000-8000-000000000099', 0)]
    melody.setNotes(original, false)
    melody.setSelectedNoteIds([original[0].id])
    useProjectStore().setWorkRange({ startStep: 16, endStep: 32 })
    melody.mutateCurrent({ rhythm: true, pitch: true, ornament: true, simplify: false }, 1)
    melody.transformCurrent('reverse')
    expect(melody.notes).toEqual(original)
    expect(melody.canUndo).toBe(false)
    expect(useTakesStore().takes).toEqual([])
    expect(melody.getTransformDisabledReason('reverse')).toContain('work range')
  })

  it('captures the complete original before a mutation, even when another take has the same seed', () => {
    const project = useProjectStore()
    project.setBars(3)
    project.setKey('D')
    project.setScale('minor')
    const takes = useTakesStore()
    takes.currentSeed = 678
    const melody = useMelodyStore()
    const original = [
      variationNote('00000000-0000-4000-8000-000000000001', 0, 62, 4),
      variationNote('00000000-0000-4000-8000-000000000002', 8, 65, 2)
    ]
    melody.setNotes(original, false)
    takes.captureTake(
      [variationNote('00000000-0000-4000-8000-000000000003', 0, 40)],
      melody.generatorParams,
      {
        key: 'C',
        scale: 'major',
        bpm: 120,
        bars: 1
      },
      678
    )

    melody.mutateCurrent({ rhythm: false, pitch: true, ornament: false, simplify: false }, 1)

    const safetyTake = takes.takes.at(-1)
    expect(safetyTake?.seed).toBe(678)
    expect(safetyTake?.notes).toEqual(original)
    expect(safetyTake?.context).toMatchObject({ key: 'D', scale: 'minor', bars: 3 })
  })

  it('captures transform originals when enabled and skips the safety take when disabled', () => {
    const melody = useMelodyStore()
    const takes = useTakesStore()
    const original = [variationNote('00000000-0000-4000-8000-000000000031', 0, 60, 2)]
    melody.setNotes(original, false)

    melody.transformCurrent('one-up')
    expect(takes.takes).toHaveLength(1)
    expect(takes.takes[0].notes).toEqual(original)

    melody.keepOriginalAsTake = false
    melody.transformCurrent('octave-down')
    expect(takes.takes).toHaveLength(1)
    expect(melody.notes[0].midi).not.toBe(original[0].midi)
  })

  it('reports pitch register blocks and leaves notes, history, and takes untouched', () => {
    const melody = useMelodyStore()
    const takes = useTakesStore()
    melody.setGeneratorParams({ minOctave: 4, maxOctave: 4 })
    const original = [variationNote('00000000-0000-4000-8000-000000000032', 0, 60, 2)]
    melody.setNotes(original, false)
    const previous = melody.notes

    expect(melody.getTransformDisabledReason('octave-up')).toBeTruthy()
    melody.transformCurrent('octave-up')

    expect(melody.notes).toBe(previous)
    expect(melody.notes).toEqual(original)
    expect(melody.canUndo).toBe(false)
    expect(melody.canRedo).toBe(false)
    expect(takes.takes).toEqual([])
    expect(melody.getTransformDisabledReason('reverse')).toBeUndefined()
  })

  it('guards work range notes and ignores pitch limits outside the range', () => {
    const melody = useMelodyStore()
    const selected = variationNote('00000000-0000-4000-8000-000000000033', 4, 60, 2)
    const outside = variationNote('00000000-0000-4000-8000-000000000034', 24, 83, 2)
    melody.setNotes([selected, outside], false)
    melody.setSelectedNoteIds([outside.id])
    useProjectStore().setWorkRange({ startStep: 4, endStep: 8 })

    expect(melody.getTransformDisabledReason('one-up')).toBeUndefined()
    melody.transformCurrent('one-up')

    expect(melody.notes.find((note) => note.id === selected.id)?.midi).toBe(62)
    expect(melody.notes.find((note) => note.id === outside.id)).toEqual(outside)
    expect(melody.canUndo).toBe(true)
  })

  it('does not capture a safety take or history for a blocked transform', () => {
    const melody = useMelodyStore()
    const takes = useTakesStore()
    melody.setGeneratorParams({ minOctave: 3, maxOctave: 5 })
    const original = [variationNote('00000000-0000-4000-8000-000000000035', 0, 83, 2)]
    melody.setNotes(original, false)
    const previous = melody.notes

    expect(melody.getTransformDisabledReason('octave-up')).toBeTruthy()
    melody.transformCurrent('octave-up')

    expect(melody.notes).toBe(previous)
    expect(melody.canUndo).toBe(false)
    expect(takes.takes).toEqual([])
  })

  it('records one undo step per application and supports redo', () => {
    const melody = useMelodyStore()
    const original = [variationNote('00000000-0000-4000-8000-000000000041', 0, 60, 2)]
    melody.setNotes(original, false)

    melody.transformCurrent('one-up')
    const transformed = melody.notes.map((note) => ({ ...note }))
    expect(melody.notes[0]).not.toEqual(original[0])
    melody.undo()
    expect(melody.notes).toEqual(original)
    expect(melody.canUndo).toBe(false)
    expect(melody.canRedo).toBe(true)
    melody.redo()
    expect(melody.notes).toEqual(transformed)
  })

  it('leaves the melody and history untouched when its safety take cannot be captured', () => {
    const melody = useMelodyStore()
    const takes = useTakesStore()
    const original = [variationNote('00000000-0000-4000-8000-000000000081')]
    melody.setNotes(original, false)
    for (let seed = 0; seed < TAKE_CAPACITY; seed++) {
      const take = takes.captureTake(original, melody.generatorParams, useProjectStore().toConfig(), seed)!
      takes.toggleLock(take.id)
    }
    expect(takes.isFull).toBe(true)
    const seed = takes.currentSeed
    const previous = melody.notes

    melody.transformCurrent('one-up')
    melody.mutateCurrent({ rhythm: false, pitch: true, ornament: false, simplify: false }, 1)

    expect(melody.notes).toBe(previous)
    expect(melody.canUndo).toBe(false)
    expect(takes.takes).toHaveLength(TAKE_CAPACITY)
    expect(takes.currentSeed).toBe(seed)

    melody.keepOriginalAsTake = false
    melody.transformCurrent('one-up')
    expect(melody.notes).not.toEqual(original)
    expect(melody.canUndo).toBe(true)
  })

  it('mutates the work range independently of selection and records one undo step', () => {
    const melody = useMelodyStore()
    const selected = variationNote('00000000-0000-4000-8000-000000000061', 4, 60, 2)
    const hole = variationNote('00000000-0000-4000-8000-000000000062', 6, 62, 2)
    const last = variationNote('00000000-0000-4000-8000-000000000063', 8, 64, 2)
    melody.setNotes([selected, hole, last], false)
    melody.setSelectedNoteIds([last.id])
    useProjectStore().setWorkRange({ startStep: 4, endStep: 6 })
    useTakesStore().reuseSeed(4242)
    const previous = melody.notes

    melody.mutateCurrent({ rhythm: false, pitch: true, ornament: false, simplify: false }, 1)

    expect(melody.notes.find((note) => note.id === hole.id)).toEqual(hole)
    expect(melody.notes.find((note) => note.id === selected.id)).not.toEqual(selected)
    expect(melody.notes).not.toBe(previous)
    expect(previous).toEqual([selected, hole, last])
    const result = melody.notes.map((note) => ({ ...note }))
    melody.undo()
    expect(melody.notes).toEqual([selected, hole, last])
    expect(melody.canUndo).toBe(false)
    melody.redo()
    expect(melody.notes).toEqual(result)
  })

  it('keeps variation settings in session state and ignores empty axes or melodies', async () => {
    const melody = useMelodyStore()
    expect(melody.variationMode).toBe(DEFAULT_VARIATION_SETTINGS.variationMode)
    expect(melody.mutationAxes).toEqual(DEFAULT_VARIATION_SETTINGS.mutationAxes)
    expect(melody.mutationStrength).toBe(DEFAULT_VARIATION_SETTINGS.mutationStrength)
    expect(melody.keepOriginalAsTake).toBe(DEFAULT_VARIATION_SETTINGS.keepOriginalAsTake)
    melody.mutateCurrent({ rhythm: false, pitch: false, ornament: false, simplify: false }, 1)
    melody.transformCurrent('reverse')
    expect(melody.notes).toEqual([])
    expect(melody.canUndo).toBe(false)
    expect(useTakesStore().takes).toEqual([])
    expect(localStorage.getItem(GENERATOR_STORAGE_KEY)).toBeNull()

    const original = [variationNote('00000000-0000-4000-8000-000000000071')]
    melody.setNotes(original, false)
    melody.mutateCurrent({ rhythm: false, pitch: false, ornament: false, simplify: false }, 1)
    expect(melody.notes).toEqual(original)
    expect(melody.canUndo).toBe(false)
    expect(useTakesStore().takes).toEqual([])

    melody.variationMode = 'transform'
    melody.mutationAxes.pitch = false
    melody.mutationStrength = 0.9
    melody.keepOriginalAsTake = false
    await nextTick()
    expect(JSON.parse(localStorage.getItem(GENERATOR_STORAGE_KEY) ?? '{}')).not.toHaveProperty('variationMode')
    setActivePinia(createPinia())
    const freshSession = useMelodyStore()
    expect(freshSession.variationMode).toBe(DEFAULT_VARIATION_SETTINGS.variationMode)
    expect(freshSession.mutationAxes.pitch).toBe(DEFAULT_VARIATION_SETTINGS.mutationAxes.pitch)
    expect(freshSession.mutationStrength).toBe(DEFAULT_VARIATION_SETTINGS.mutationStrength)
    expect(freshSession.keepOriginalAsTake).toBe(DEFAULT_VARIATION_SETTINGS.keepOriginalAsTake)
  })

  it('reuses the locked seed for reproducible mutations', () => {
    const takes = useTakesStore()
    takes.currentSeed = 4242
    takes.setSeedLocked(true)
    const melody = useMelodyStore()
    const original = [
      variationNote('00000000-0000-4000-8000-000000000051', 0, 60, 4),
      variationNote('00000000-0000-4000-8000-000000000052', 8, 65, 4)
    ]
    melody.setNotes(original, false)
    const axes = { rhythm: true, pitch: true, ornament: false, simplify: false }
    melody.mutateCurrent(axes, 1)
    const first = melody.notes.map((note) => ({ ...note }))
    melody.setNotes(original, false)
    melody.mutateCurrent(axes, 1)
    expect(melody.notes).toEqual(first)
    expect(takes.currentSeed).toBe(4242)
  })

  it('keeps repeated reverse transforms valid for fractional durations', () => {
    const melody = useMelodyStore()
    const original = [variationNote('00000000-0000-4000-8000-000000000091', 4, 60, 1.5)]
    melody.setNotes(original, false)

    melody.transformCurrent('reverse')
    melody.transformCurrent('reverse')

    expect(melody.notes.every((note) => AppNoteSchema.safeParse(note).success)).toBe(true)
    expect(useTakesStore().takes).toHaveLength(2)
    expect(
      useTakesStore().takes.every((take) => take.notes.every((note) => AppNoteSchema.safeParse(note).success))
    ).toBe(true)
    const transformed = melody.notes.map((note) => ({ ...note }))
    melody.undo()
    expect(melody.notes.every((note) => AppNoteSchema.safeParse(note).success)).toBe(true)
    expect(melody.canRedo).toBe(true)
    melody.redo()
    expect(melody.notes).toEqual(transformed)
  })

  it('keeps repeated boundary reverses and rhythm mutations valid', () => {
    const project = useProjectStore()
    project.setBars(2)
    const melody = useMelodyStore()
    const original = [variationNote('00000000-0000-4000-8000-000000000092', 31, 60, 2)]
    melody.setNotes(original, false)

    melody.transformCurrent('reverse')
    melody.transformCurrent('reverse')

    expect(melody.notes.every((note) => AppNoteSchema.safeParse(note).success)).toBe(true)
    expect(useTakesStore().takes).toHaveLength(2)
    expect(
      useTakesStore().takes.every((take) => take.notes.every((note) => AppNoteSchema.safeParse(note).success))
    ).toBe(true)

    melody.setNotes([variationNote('00000000-0000-4000-8000-000000000093', 0, 60, 1.5)], false)
    useTakesStore().reuseSeed(4242)
    const axes = { rhythm: true, pitch: false, ornament: false, simplify: false }
    melody.mutateCurrent(axes, 1)
    melody.mutateCurrent(axes, 1)

    expect(melody.notes.every((note) => AppNoteSchema.safeParse(note).success)).toBe(true)
    expect(
      useTakesStore().takes.every((take) => take.notes.every((note) => AppNoteSchema.safeParse(note).success))
    ).toBe(true)
  })

  it('keeps work range transforms valid with fractional note durations', () => {
    const melody = useMelodyStore()
    const selected = variationNote('00000000-0000-4000-8000-000000000094', 4, 60, 1.5)
    const outside = variationNote('00000000-0000-4000-8000-000000000095', 12, 64, 2)
    melody.setNotes([selected, outside], false)
    melody.setSelectedNoteIds([selected.id])
    useProjectStore().setWorkRange({ startStep: 4, endStep: 6 })

    melody.transformCurrent('reverse')
    melody.transformCurrent('reverse')

    expect(melody.notes.every((note) => AppNoteSchema.safeParse(note).success)).toBe(true)
    expect(melody.notes.find((note) => note.id === outside.id)).toEqual(outside)
    expect(useTakesStore().takes).toHaveLength(2)
    expect(
      useTakesStore().takes.every((take) => take.notes.every((note) => AppNoteSchema.safeParse(note).success))
    ).toBe(true)
  })

  it('keeps rhythm swaps on integer onsets when fractional gates are repeated', () => {
    const takes = useTakesStore()
    takes.reuseSeed(2)
    const melody = useMelodyStore()
    melody.setNotes(
      [
        variationNote('00000000-0000-4000-8000-000000000096', 0, 60, 1.25),
        variationNote('00000000-0000-4000-8000-000000000097', 4, 64, 2.5)
      ],
      false
    )

    const rhythmOnly = { rhythm: true, pitch: false, ornament: false, simplify: false }
    melody.mutateCurrent(rhythmOnly, 1)
    melody.mutateCurrent(rhythmOnly, 1)

    expect(melody.notes.some((note) => !Number.isInteger(note.step))).toBe(false)
    expect(melody.notes.every((note) => AppNoteSchema.safeParse(note).success)).toBe(true)
    expect(takes.takes).toHaveLength(2)
    expect(takes.takes.every((take) => take.notes.every((note) => AppNoteSchema.safeParse(note).success))).toBe(true)
  })

  it('keeps generated fractional note lengths valid through repeated variations', async () => {
    const takes = useTakesStore()
    takes.reuseSeed(9876)
    const melody = useMelodyStore()
    melody.setGeneratorParams({ noteLength: 0.7 })
    await melody.generate()
    expect(melody.notes.length).toBeGreaterThan(0)
    expect(melody.notes.some((note) => !Number.isInteger(note.durationSteps))).toBe(true)

    melody.transformCurrent('reverse')
    melody.mutateCurrent({ rhythm: true, pitch: false, ornament: true, simplify: false }, 1)

    expect(melody.notes.every((note) => AppNoteSchema.safeParse(note).success)).toBe(true)
    expect(takes.takes.every((take) => take.notes.every((note) => AppNoteSchema.safeParse(note).success))).toBe(true)
  })

  describe('note navigation, nudge, duration, velocity and mute actions', () => {
    it('steps through notes chronologically with selectNextNote and selectPreviousNote', () => {
      const store = useMelodyStore()
      const n1 = sampleNote('00000000-0000-4000-8000-000000000101', 0, 60)
      const n2 = sampleNote('00000000-0000-4000-8000-000000000102', 4, 64)
      const n3 = sampleNote('00000000-0000-4000-8000-000000000103', 8, 67)
      store.setNotes([n2, n3, n1], false)

      // Nothing selected yet -> selectNextNote picks the first chronological note (n1)
      store.selectNextNote()
      expect(store.selectedNoteIds).toEqual([n1.id])

      // Next -> n2
      store.selectNextNote()
      expect(store.selectedNoteIds).toEqual([n2.id])

      // Next -> n3
      store.selectNextNote()
      expect(store.selectedNoteIds).toEqual([n3.id])

      // Next at end clamps to n3
      store.selectNextNote()
      expect(store.selectedNoteIds).toEqual([n3.id])

      // Previous -> n2
      store.selectPreviousNote()
      expect(store.selectedNoteIds).toEqual([n2.id])

      // Previous -> n1
      store.selectPreviousNote()
      expect(store.selectedNoteIds).toEqual([n1.id])

      // Previous at start clamps to n1
      store.selectPreviousNote()
      expect(store.selectedNoteIds).toEqual([n1.id])
    })

    it('only auditions note pitch on selectNextNote and selectPreviousNote when isAuditionEnabled is true', () => {
      const store = useMelodyStore()
      const uiStore = useUiStore()
      const audioStore = useAudioStore()
      const auditionSpy = vi.spyOn(audioStore, 'auditionPitch').mockResolvedValue()

      const n1 = sampleNote('00000000-0000-4000-8000-000000000108', 0, 60)
      const n2 = sampleNote('00000000-0000-4000-8000-000000000109', 4, 64)
      store.setNotes([n1, n2], false)

      // When audition is disabled
      uiStore.setAudition(false)
      store.selectNextNote()
      expect(store.selectedNoteIds).toEqual([n1.id])
      expect(auditionSpy).not.toHaveBeenCalled()

      store.selectPreviousNote()
      expect(auditionSpy).not.toHaveBeenCalled()

      // When audition is enabled
      uiStore.setAudition(true)
      store.selectNextNote()
      expect(store.selectedNoteIds).toEqual([n2.id])
      expect(auditionSpy).toHaveBeenCalledWith('C4')
    })

    it('nudges selected notes with undo/redo history', () => {
      const store = useMelodyStore()
      const n1 = sampleNote('00000000-0000-4000-8000-000000000104', 2)
      store.setNotes([n1], false)
      store.setSelectedNoteIds([n1.id])

      store.nudgeSelected(2)
      expect(store.notes[0].step).toBe(4)
      expect(store.canUndo).toBe(true)

      store.undo()
      expect(store.notes[0].step).toBe(2)

      store.redo()
      expect(store.notes[0].step).toBe(4)
    })

    it('adjusts duration of selected notes and records history', () => {
      const store = useMelodyStore()
      const n1 = sampleNote('00000000-0000-4000-8000-000000000105', 0, 60, 2)
      store.setNotes([n1], false)
      store.setSelectedNoteIds([n1.id])

      store.adjustSelectedDuration(2)
      expect(store.notes[0].durationSteps).toBe(4)

      // Enforce minimum 1 step
      store.adjustSelectedDuration(-10)
      expect(store.notes[0].durationSteps).toBe(1)

      store.undo()
      expect(store.notes[0].durationSteps).toBe(4)
    })

    it('adjusts velocity of selected notes and records history', () => {
      const store = useMelodyStore()
      const n1 = sampleNote('00000000-0000-4000-8000-000000000106', 0, 60, 2)
      store.setNotes([n1], false)
      store.setSelectedNoteIds([n1.id])

      store.adjustSelectedVelocity(5)
      expect(store.notes[0].velocity).toBe(105)

      store.adjustSelectedVelocity(-10)
      expect(store.notes[0].velocity).toBe(95)

      store.undo()
      expect(store.notes[0].velocity).toBe(105)
    })

    it('toggles muted state of selected notes and records history', () => {
      const store = useMelodyStore()
      const n1 = sampleNote('00000000-0000-4000-8000-000000000107', 0)
      store.setNotes([n1], false)
      store.setSelectedNoteIds([n1.id])
      expect(store.notes[0].isMuted).toBe(false)

      store.toggleSelectedMute()
      expect(store.notes[0].isMuted).toBe(true)
      expect(store.canUndo).toBe(true)

      store.toggleSelectedMute()
      expect(store.notes[0].isMuted).toBe(false)

      store.undo()
      expect(store.notes[0].isMuted).toBe(true)
    })

    it('transposes selected notes chromatically when scale lock is disabled', () => {
      const store = useMelodyStore()
      const projectStore = useProjectStore()
      const uiStore = useUiStore()
      const audioStore = useAudioStore()
      const auditionSpy = vi.spyOn(audioStore, 'auditionPitch').mockResolvedValue()

      projectStore.setKey('C')
      projectStore.setScale('major')
      uiStore.setScaleLocked(false)
      uiStore.setAudition(true)

      const n1 = sampleNote('00000000-0000-4000-8000-000000000110', 0, 60)
      store.setNotes([n1], false)
      store.setSelectedNoteIds([n1.id])

      store.transposeSelected(1)
      expect(store.notes[0].midi).toBe(61)
      expect(store.notes[0].pitch).toBe('Db4')
      expect(store.canUndo).toBe(true)
      expect(auditionSpy).toHaveBeenCalledWith('Db4')

      store.undo()
      expect(store.notes[0].midi).toBe(60)
      expect(store.notes[0].pitch).toBe('C4')

      store.redo()
      expect(store.notes[0].midi).toBe(61)
    })

    it('transposes selected notes diatonically when scale lock is enabled', () => {
      const store = useMelodyStore()
      const projectStore = useProjectStore()
      const uiStore = useUiStore()

      projectStore.setKey('C')
      projectStore.setScale('major')
      uiStore.setScaleLocked(true)

      const n1 = sampleNote('00000000-0000-4000-8000-000000000111', 0, 60) // C4
      store.setNotes([n1], false)
      store.setSelectedNoteIds([n1.id])

      // C4 (60) + 1 step -> D4 (62)
      store.transposeSelected(1)
      expect(store.notes[0].midi).toBe(62)
      expect(store.notes[0].pitch).toBe('D4')

      // D4 (62) + 1 step -> E4 (64)
      store.transposeSelected(1)
      expect(store.notes[0].midi).toBe(64)
      expect(store.notes[0].pitch).toBe('E4')

      // E4 (64) + 1 step -> F4 (65) (half-step diatonic)
      store.transposeSelected(1)
      expect(store.notes[0].midi).toBe(65)
      expect(store.notes[0].pitch).toBe('F4')

      // F4 (65) - 1 step -> E4 (64)
      store.transposeSelected(-1)
      expect(store.notes[0].midi).toBe(64)
      expect(store.notes[0].pitch).toBe('E4')
    })

    it('transposes octaves by ±12 semitones even when scale lock is enabled', () => {
      const store = useMelodyStore()
      const projectStore = useProjectStore()
      const uiStore = useUiStore()

      projectStore.setKey('C')
      projectStore.setScale('major')
      uiStore.setScaleLocked(true)

      const n1 = sampleNote('00000000-0000-4000-8000-000000000112', 0, 60)
      store.setNotes([n1], false)
      store.setSelectedNoteIds([n1.id])

      store.transposeSelected(12)
      expect(store.notes[0].midi).toBe(72)
      expect(store.notes[0].pitch).toBe('C5')

      store.transposeSelected(-12)
      expect(store.notes[0].midi).toBe(60)
      expect(store.notes[0].pitch).toBe('C4')
    })

    it('does not audition on transposeSelected when audition is disabled', () => {
      const store = useMelodyStore()
      const uiStore = useUiStore()
      const audioStore = useAudioStore()
      const auditionSpy = vi.spyOn(audioStore, 'auditionPitch').mockResolvedValue()

      uiStore.setAudition(false)
      const n1 = sampleNote('00000000-0000-4000-8000-000000000113', 0, 60)
      store.setNotes([n1], false)
      store.setSelectedNoteIds([n1.id])

      store.transposeSelected(1)
      expect(auditionSpy).not.toHaveBeenCalled()
    })
  })
})
