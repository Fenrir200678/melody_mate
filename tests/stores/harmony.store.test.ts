import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { ChordEventSchema, type ChordEvent } from '../../src/core/schemas/chord.schema'
import { pitchToMidi } from '../../src/core/theory/scale.engine'
import { DEFAULT_HARMONY_SETTINGS } from '../../src/config/defaults'
import { useHarmonyStore } from '../../src/stores/harmony.store'
import { useProjectStore } from '../../src/stores/project.store'
import { useUiStore } from '../../src/stores/ui.store'

function sampleChord(id: string, name = 'C', roman = 'I', notes = ['C', 'E', 'G'], startBar = 0): ChordEvent {
  return {
    id,
    name,
    roman,
    notes,
    voicing: notes.map((n) => (/\d$/.test(n) ? n : `${n}3`)),
    startBar,
    durationBars: 1,
    inversion: 0
  }
}

describe('useHarmonyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with expected default state', () => {
    const store = useHarmonyStore()

    expect(store.chords).toEqual([])
    expect(store.useChords).toBe(DEFAULT_HARMONY_SETTINGS.useChords)
    expect(store.backingVolume).toBe(DEFAULT_HARMONY_SETTINGS.backingVolume)
    expect(store.isMuted).toBe(DEFAULT_HARMONY_SETTINGS.isMuted)
    expect(store.adherence).toBe(DEFAULT_HARMONY_SETTINGS.adherence)
    expect(store.chordRegister).toBe(DEFAULT_HARMONY_SETTINGS.chordRegister)
    expect(store.autoSmooth).toBe(DEFAULT_HARMONY_SETTINGS.autoSmooth)
    expect(store.selectedChordNoteIds).toEqual([])
  })

  it('adds, removes, reorders, and clears chords', () => {
    const store = useHarmonyStore()
    const c1 = sampleChord('c-1', 'C')
    const c2 = sampleChord('c-2', 'G', 'V', ['G', 'B', 'D'], 1)

    store.addChord(c1)
    store.addChord(c2)
    expect(store.chords).toHaveLength(2)

    store.reorderChords([c2, c1])
    expect(store.chords[0].id).toBe('c-2')
    expect(store.chords[1].id).toBe('c-1')

    store.removeChord('c-1')
    expect(store.chords).toHaveLength(1)
    expect(store.chords[0].id).toBe('c-2')

    // Removing non-existent chord is a safe no-op
    store.removeChord('non-existent')
    expect(store.chords).toHaveLength(1)

    store.clearChords()
    expect(store.chords).toEqual([])
  })

  it('trims an overlapping predecessor when adding a chord', () => {
    const store = useHarmonyStore()
    store.addChord({ ...sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'], 0), durationBars: 2 })
    store.addChord({ ...sampleChord('c-2', 'G', 'V', ['G', 'B', 'D'], 1), durationBars: 1 })

    expect(store.chords).toHaveLength(2)
    expect(store.chords.find((c) => c.id === 'c-1')?.durationBars).toBe(1)
  })

  it('computes reactive diatonicPalette based on project store key and scale', () => {
    const projectStore = useProjectStore()
    const harmonyStore = useHarmonyStore()

    projectStore.setKey('C')
    projectStore.setScale('major')

    expect(harmonyStore.diatonicPalette).toHaveLength(7)
    expect(harmonyStore.diatonicPalette[0].triadName).toBe('C')
    expect(harmonyStore.diatonicPalette[0].roman).toBe('I')
    expect(harmonyStore.diatonicPalette[4].triadName).toBe('G')
    expect(harmonyStore.diatonicPalette[4].roman).toBe('V')

    // Change key to A minor
    projectStore.setKey('A')
    projectStore.setScale('minor')

    expect(harmonyStore.diatonicPalette[0].triadName).toBe('Am')
    expect(harmonyStore.diatonicPalette[0].roman).toBe('i')
  })

  it('clamps chordRegister to the 1-6 octave range', () => {
    const store = useHarmonyStore()

    store.setChordRegister(5)
    expect(store.chordRegister).toBe(5)

    store.setChordRegister(-2)
    expect(store.chordRegister).toBe(1)

    store.setChordRegister(99)
    expect(store.chordRegister).toBe(6)
  })

  it('sets chord inversion and recalculates notes plus a real pitched voicing', () => {
    const store = useHarmonyStore()
    const chord = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'])
    store.addChord(chord)

    // First inversion: root 'C' shifts to top
    store.setInversion('c-1', 1)
    expect(store.chords[0].inversion).toBe(1)
    expect(store.chords[0].notes).toEqual(['E', 'G', 'C'])
    expect(store.chords[0].voicing).toEqual(['E3', 'G3', 'C4'])

    // Second inversion
    store.setInversion('c-1', 2)
    expect(store.chords[0].inversion).toBe(2)
    expect(store.chords[0].notes).toEqual(['G', 'C', 'E'])
    expect(store.chords[0].voicing).toEqual(['G3', 'C4', 'E4'])

    // Reset back to root position
    store.setInversion('c-1', 0)
    expect(store.chords[0].inversion).toBe(0)
    expect(store.chords[0].notes).toEqual(['C', 'E', 'G'])
    expect(store.chords[0].voicing).toEqual(['C3', 'E3', 'G3'])
  })

  it('recomputes inversion voicings from the active chord register', () => {
    const store = useHarmonyStore()
    store.setChordRegister(4)
    store.addChord(sampleChord('c-1', 'C', 'I', ['C', 'E', 'G']))
    store.setInversion('c-1', 1)

    expect(store.chords[0].voicing).toEqual(['E4', 'G4', 'C5'])
  })

  it('moves and resizes chords with overlap resolution', () => {
    const store = useHarmonyStore()
    store.addChord({ ...sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'], 0), durationBars: 1 })
    store.addChord({ ...sampleChord('c-2', 'G', 'V', ['G', 'B', 'D'], 2), durationBars: 1 })

    store.moveChordInTime('c-1', 0.5)
    expect(store.chords.find((c) => c.id === 'c-1')?.startBar).toBe(0.5)

    store.resizeChord('c-1', 4)
    // c-1 must be trimmed back to c-2's start
    expect(store.chords.find((c) => c.id === 'c-1')?.durationBars).toBe(1.5)

    store.resizeChord('c-1', 0.01)
    expect(store.chords.find((c) => c.id === 'c-1')?.durationBars).toBe(0.25)
  })

  it('transposes voicing notes and re-derives name/roman/notes from the voicing', () => {
    const projectStore = useProjectStore()
    projectStore.setKey('C')
    projectStore.setScale('major')
    projectStore.setBars(4)

    const store = useHarmonyStore()
    store.addChord(sampleChord('c-1', 'C', 'I', ['C', 'E', 'G']))

    // Reshape C3/E3/G3 into A3/C4/E4 -> diatonic A minor (vi in C major)
    store.transposeVoicingNote('c-1', 0, 57) // C3 -> A3
    store.transposeVoicingNote('c-1', 1, 60) // E3 -> C4
    store.transposeVoicingNote('c-1', 2, 64) // G3 -> E4

    const updated = store.chords[0]
    expect(updated.voicing).toEqual(['A3', 'C4', 'E4'])
    expect(updated.name).toBe('Am')
    expect(updated.roman).toBe('vi')
    expect([...updated.notes].sort()).toEqual(['A', 'C', 'E'].sort())

    // Non-diatonic cluster falls back to a detected or Custom identity without throwing
    store.transposeVoicingNote('c-1', 1, 61) // C4 -> C#/Db4
    expect(pitchToMidi(store.chords[0].voicing[1])).toBe(61)
    expect(store.chords[0].name.length).toBeGreaterThan(0)
  })

  it('adds and removes voicing notes, dropping the chord with its last note', () => {
    const store = useHarmonyStore()
    store.addChord(sampleChord('c-1', 'C', 'I', ['C', 'E', 'G']))

    store.addVoicingNote('c-1', 'B3')
    expect(store.chords[0].voicing).toEqual(['C3', 'E3', 'G3', 'B3'])
    expect(store.chords[0].name).toBe('Cmaj7')

    store.removeVoicingNote('c-1', 3)
    expect(store.chords[0].voicing).toEqual(['C3', 'E3', 'G3'])

    store.removeVoicingNote('c-1', 2)
    store.removeVoicingNote('c-1', 1)
    expect(store.chords).toHaveLength(1)

    store.removeVoicingNote('c-1', 0)
    expect(store.chords).toHaveLength(0)
  })

  it('creates a chord at a bar position with a detected single-note identity', () => {
    const projectStore = useProjectStore()
    projectStore.setKey('C')
    projectStore.setScale('major')
    projectStore.setBars(4)

    const store = useHarmonyStore()
    const chord = store.createChordAt(1, 1, 'G3')

    expect(chord).not.toBeNull()
    expect(store.chords).toHaveLength(1)
    expect(store.chords[0].voicing).toEqual(['G3'])
    expect(store.chords[0].name).toBe('G')
    expect(store.chords[0].roman).toBe('V')
    expect(store.chords[0].startBar).toBe(1)

    // Out-of-project creation is rejected
    expect(store.createChordAt(8, 1, 'C3')).toBeNull()
  })

  it('tracks undo/redo across chord edits', () => {
    const store = useHarmonyStore()
    store.addChord(sampleChord('c-1', 'C', 'I', ['C', 'E', 'G']))
    expect(store.canUndo).toBe(true)

    store.undo()
    expect(store.chords).toEqual([])
    expect(store.canRedo).toBe(true)

    store.redo()
    expect(store.chords).toHaveLength(1)
  })

  it('prunes invalid chord note selection keys', () => {
    const store = useHarmonyStore()
    store.addChord(sampleChord('c-1', 'C', 'I', ['C', 'E', 'G']))
    store.setSelectedChordNoteIds(['c-1:0', 'c-1:2', 'c-1:5', 'ghost:0'])
    expect(store.selectedChordNoteIds).toEqual(['c-1:0', 'c-1:2'])

    store.removeVoicingNote('c-1', 2)
    expect(store.selectedChordNoteIds).toEqual(['c-1:0'])

    store.setSelectedChordNoteIds(['c-1:1'])
    expect(store.selectedChordNoteIds).toEqual(['c-1:1'])
    store.setSelectedChordNoteIds([])
    expect(store.selectedChordNoteIds).toEqual([])
  })

  it('loads predefined chord progression', () => {
    const projectStore = useProjectStore()
    projectStore.setKey('C')
    projectStore.setScale('major')
    projectStore.setBars(4)

    const harmonyStore = useHarmonyStore()
    harmonyStore.loadPredefinedProgression('pop-standard')

    expect(harmonyStore.chords).toHaveLength(4)
    expect(harmonyStore.chords.map((c) => c.name)).toEqual(['C', 'G', 'Am', 'F'])
    expect(harmonyStore.chords.map((c) => c.startBar)).toEqual([0, 1, 2, 3])
  })

  it('sets the preset scale and clips a longer phrase to the work range', () => {
    const projectStore = useProjectStore()
    projectStore.setKey('C')
    projectStore.setScale('major')
    projectStore.setBars(4)

    const harmonyStore = useHarmonyStore()
    harmonyStore.loadPredefinedProgression('blues-turnaround')

    expect(projectStore.scale).toBe('mixolydian')
    expect(projectStore.bars).toBe(4)
    expect(projectStore.loopEndStep).toBe(4 * 16)
    expect(harmonyStore.chords).toHaveLength(4)
    expect(harmonyStore.chords.at(-1)!.startBar + harmonyStore.chords.at(-1)!.durationBars).toBe(4)
  })

  it('loads a preset into a partial work range and preserves material outside it', () => {
    const projectStore = useProjectStore()
    projectStore.setKey('D')
    projectStore.setScale('dorian')
    projectStore.setBars(6)
    projectStore.setWorkRange({ startStep: 32, endStep: 56 })

    const harmonyStore = useHarmonyStore()
    harmonyStore.addChord(sampleChord('00000000-0000-4000-8000-000000000001', 'C', 'I', ['C', 'E', 'G'], 0))
    harmonyStore.addChord({
      ...sampleChord('00000000-0000-4000-8000-000000000002', 'G', 'V', ['G', 'B', 'D'], 1),
      durationBars: 3.5
    })
    harmonyStore.addChord(sampleChord('00000000-0000-4000-8000-000000000003', 'A', 'vi', ['A', 'C', 'E'], 5))

    harmonyStore.loadPredefinedProgression('pop-standard')

    expect(projectStore.scale).toBe('dorian')
    expect(projectStore.bars).toBe(6)
    expect(harmonyStore.selectedProgressionId).toBeNull()
    expect(harmonyStore.chords.find((chord) => chord.id === '00000000-0000-4000-8000-000000000001')).toMatchObject({
      startBar: 0,
      durationBars: 1
    })
    expect(harmonyStore.chords.find((chord) => chord.id === '00000000-0000-4000-8000-000000000003')).toMatchObject({
      startBar: 5,
      durationBars: 1
    })
    expect(harmonyStore.chords.find((chord) => chord.id === '00000000-0000-4000-8000-000000000002')).toMatchObject({
      startBar: 1,
      durationBars: 1
    })
    expect(harmonyStore.chords.find((chord) => chord.startBar === 3.5 && chord.durationBars === 1)?.id).not.toBe(
      '00000000-0000-4000-8000-000000000002'
    )
    expect(harmonyStore.chords.every((chord) => ChordEventSchema.safeParse(chord).success)).toBe(true)
  })

  it('preserves authored dominant quality when a selected preset changes key', () => {
    const projectStore = useProjectStore()
    projectStore.setKey('A')
    projectStore.setScale('minor')
    projectStore.setBars(4)

    const harmonyStore = useHarmonyStore()
    harmonyStore.loadPredefinedProgression('andalusian')
    harmonyStore.transposeToScale('C', 'minor')
    projectStore.setKey('C')

    expect(harmonyStore.selectedProgressionId).toBe('andalusian')
    expect(harmonyStore.chords.at(-1)!.name).toBe('G7')
    expect(harmonyStore.chords.at(-1)!.notes).toContain('B')
  })

  it('tracks the selected progression and drops the marker once the progression is edited', () => {
    const projectStore = useProjectStore()
    projectStore.setBars(4)

    const harmonyStore = useHarmonyStore()
    expect(harmonyStore.selectedProgressionId).toBeNull()

    harmonyStore.loadPredefinedProgression('pop-standard')
    expect(harmonyStore.selectedProgressionId).toBe('pop-standard')

    harmonyStore.addChord(sampleChord('extra', 'Dm', 'ii', ['D', 'F', 'A']))
    expect(harmonyStore.selectedProgressionId).toBeNull()

    harmonyStore.loadPredefinedProgression('pop-standard')
    harmonyStore.removeChord(harmonyStore.chords[0].id)
    expect(harmonyStore.selectedProgressionId).toBeNull()

    harmonyStore.loadPredefinedProgression('pop-standard')
    harmonyStore.clearChords()
    expect(harmonyStore.selectedProgressionId).toBeNull()
  })

  it('updates volume, mute, and adherence settings', () => {
    const store = useHarmonyStore()

    store.setBackingVolume(0.5)
    expect(store.backingVolume).toBe(0.5)

    store.setMuted(true)
    expect(store.isMuted).toBe(true)

    store.setAdherence(0.9)
    expect(store.adherence).toBe(0.9)

    store.setUseChords(false)
    expect(store.useChords).toBe(false)
  })

  describe('duplicateSelected', () => {
    it('duplicates selected chords shifted by their span and selects the new chord notes', () => {
      const projectStore = useProjectStore()
      projectStore.setBars(4)

      const store = useHarmonyStore()
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'])
      c1.startBar = 0
      c1.durationBars = 1
      c1.voicing = ['C3', 'E3', 'G3']
      store.setChords([c1])
      store.setSelectedChordNoteIds(['c-1:0', 'c-1:1', 'c-1:2'])

      store.duplicateSelected()

      // Should have 2 chords: c-1 at bar 0, and clone at bar 1
      expect(store.chords).toHaveLength(2)
      expect(store.chords[0].id).toBe('c-1')
      expect(store.chords[0].startBar).toBe(0)

      const clone = store.chords[1]
      expect(clone.id).not.toBe('c-1')
      expect(clone.startBar).toBe(1)
      expect(clone.durationBars).toBe(1)
      expect(clone.voicing).toEqual(['C3', 'E3', 'G3'])

      // Selection points to cloned chord's notes
      expect(store.selectedChordNoteIds).toEqual([`${clone.id}:0`, `${clone.id}:1`, `${clone.id}:2`])

      // Undo reverts duplication
      store.undo()
      expect(store.chords).toHaveLength(1)
      expect(store.chords[0].id).toBe('c-1')
    })

    it('does nothing when no chord notes are selected', () => {
      const store = useHarmonyStore()
      store.setChords([sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'])])
      store.setSelectedChordNoteIds([])

      store.duplicateSelected()
      expect(store.chords).toHaveLength(1)
    })
  })

  describe('transposeSelected', () => {
    it('transposes all voicing notes of a selected chord by an octave (+12 / -12)', () => {
      const store = useHarmonyStore()
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'])
      c1.voicing = ['C3', 'E3', 'G3'] // MIDI 48, 52, 55
      store.setChords([c1])
      store.setSelectedChordNoteIds(['c-1:0', 'c-1:1', 'c-1:2'])

      store.transposeSelected(12)
      expect(store.chords[0].voicing).toEqual(['C4', 'E4', 'G4'])
      expect(store.selectedChordNoteIds).toEqual(['c-1:0', 'c-1:1', 'c-1:2'])

      store.transposeSelected(-24)
      expect(store.chords[0].voicing).toEqual(['C2', 'E2', 'G2'])

      store.undo()
      expect(store.chords[0].voicing).toEqual(['C4', 'E4', 'G4'])
    })

    it('transposes an individual voicing note and updates its sorted index in selection', () => {
      const store = useHarmonyStore()
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'])
      c1.voicing = ['C3', 'E3', 'G3'] // MIDI 48, 52, 55
      store.setChords([c1])
      // Select only E3 (index 1)
      store.setSelectedChordNoteIds(['c-1:1'])

      // Shift E3 up by an octave -> E4 (MIDI 64)
      // New voicing should be sorted ascending: C3 (48), G3 (55), E4 (64)
      store.transposeSelected(12)
      expect(store.chords[0].voicing).toEqual(['C3', 'G3', 'E4'])
      // Selection follows the note to index 2
      expect(store.selectedChordNoteIds).toEqual(['c-1:2'])
    })

    it('transposes by single semitone (+1 / -1) when scale lock is disabled', () => {
      const store = useHarmonyStore()
      useUiStore().setScaleLocked(false)
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'])
      c1.voicing = ['C3', 'E3', 'G3']
      store.setChords([c1])
      store.setSelectedChordNoteIds(['c-1:0', 'c-1:1', 'c-1:2'])

      store.transposeSelected(1)
      expect(store.chords[0].voicing).toEqual(['Db3', 'F3', 'Ab3'])

      store.transposeSelected(-1)
      expect(store.chords[0].voicing).toEqual(['C3', 'E3', 'G3'])
    })

    it('transposes diatonically within scale when scale lock is enabled', () => {
      const store = useHarmonyStore()
      const projectStore = useProjectStore()
      projectStore.setKey('C')
      projectStore.setScale('major')
      useUiStore().setScaleLocked(true)

      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'])
      c1.voicing = ['C3', 'E3', 'G3']
      store.setChords([c1])
      store.setSelectedChordNoteIds(['c-1:0', 'c-1:1', 'c-1:2'])

      store.transposeSelected(1)
      expect(store.chords[0].voicing).toEqual(['D3', 'F3', 'A3'])

      store.transposeSelected(-1)
      expect(store.chords[0].voicing).toEqual(['C3', 'E3', 'G3'])
    })

    it('clamps chord notes at MIDI boundary [0, 127]', () => {
      const store = useHarmonyStore()
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'])
      c1.voicing = ['C9', 'E9', 'G9'] // G9 is MIDI 127
      store.setChords([c1])
      store.setSelectedChordNoteIds(['c-1:0', 'c-1:1', 'c-1:2'])

      // Cannot transpose up because maxMidi is already 127
      store.transposeSelected(12)
      expect(store.chords[0].voicing).toEqual(['C9', 'E9', 'G9'])
    })

    it('does nothing when no notes are selected or semitones is 0', () => {
      const store = useHarmonyStore()
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'])
      c1.voicing = ['C3', 'E3', 'G3']
      store.setChords([c1])
      store.setSelectedChordNoteIds([])

      store.transposeSelected(12)
      expect(store.chords[0].voicing).toEqual(['C3', 'E3', 'G3'])

      store.setSelectedChordNoteIds(['c-1:0'])
      store.transposeSelected(0)
      expect(store.chords[0].voicing).toEqual(['C3', 'E3', 'G3'])
    })
  })

  describe('setChordDuration with timeline realignment', () => {
    it('resizes chord and realigns subsequent chords contiguously', () => {
      const store = useHarmonyStore()
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'], 0)
      const c2 = sampleChord('c-2', 'F', 'IV', ['F', 'A', 'C'], 1)
      const c3 = sampleChord('c-3', 'G', 'V', ['G', 'B', 'D'], 2)
      store.setChords([c1, c2, c3])

      // Expand c1 to 2 bars -> c2 should shift to bar 2, c3 to bar 3
      store.setChordDuration('c-1', 2)
      expect(store.chords[0].durationBars).toBe(2)
      expect(store.chords[0].startBar).toBe(0)
      expect(store.chords[1].startBar).toBe(2)
      expect(store.chords[1].durationBars).toBe(1)
      expect(store.chords[2].startBar).toBe(3)
      expect(store.chords[2].durationBars).toBe(1)

      // Shrink c1 to 0.5 bars -> c2 starts at 0.5, c3 at 1.5
      store.setChordDuration('c-1', 0.5)
      expect(store.chords[0].durationBars).toBe(0.5)
      expect(store.chords[1].startBar).toBe(0.5)
      expect(store.chords[2].startBar).toBe(1.5)

      // Undo restores 2 bars state
      store.undo()
      expect(store.chords[0].durationBars).toBe(2)
      expect(store.chords[1].startBar).toBe(2)
    })
  })

  describe('reorderChord in progression timeline', () => {
    it('swaps adjacent chords and re-anchors sequential start bars', () => {
      const store = useHarmonyStore()
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'], 0)
      const c2 = sampleChord('c-2', 'F', 'IV', ['F', 'A', 'C'], 1)
      const c3 = sampleChord('c-3', 'G', 'V', ['G', 'B', 'D'], 2)
      store.setChords([c1, c2, c3])

      // Move c1 down: swaps with c2
      store.reorderChord('c-1', 'down')
      expect(store.chords[0].id).toBe('c-2')
      expect(store.chords[0].startBar).toBe(0)
      expect(store.chords[1].id).toBe('c-1')
      expect(store.chords[1].startBar).toBe(1)
      expect(store.chords[2].id).toBe('c-3')
      expect(store.chords[2].startBar).toBe(2)

      // Move c-1 down again: swaps with c3
      store.reorderChord('c-1', 'down')
      expect(store.chords[2].id).toBe('c-1')
      expect(store.chords[2].startBar).toBe(2)

      // Move c-1 down at the end does nothing
      store.reorderChord('c-1', 'down')
      expect(store.chords[2].id).toBe('c-1')

      // Move c-1 up: swaps back with c3
      store.reorderChord('c-1', 'up')
      expect(store.chords[1].id).toBe('c-1')

      // Undo restores previous position
      store.undo()
      expect(store.chords[2].id).toBe('c-1')
    })
  })

  describe('applySmoothVoiceLeading action', () => {
    it('optimizes progression inversions and registers an undo entry', () => {
      const store = useHarmonyStore()
      store.setChordRegister(3)
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'], 0)
      const c2 = sampleChord('c-2', 'F', 'IV', ['F', 'A', 'C'], 1)
      const c3 = sampleChord('c-3', 'G', 'V', ['G', 'B', 'D'], 2)
      const c4 = sampleChord('c-4', 'C', 'I', ['C', 'E', 'G'], 3)
      store.setChords([c1, c2, c3, c4])

      store.applySmoothVoiceLeading()

      // F chord should have picked 2nd inversion
      expect(store.chords[1].inversion).toBe(2)
      expect(store.chords[1].notes[0]).toBe('C')

      // Undo restores root position
      store.undo()
      expect(store.chords[1].inversion).toBe(0)
    })
  })

  describe('autoSmooth setting & behavior', () => {
    it('toggles and sets autoSmooth state', () => {
      const store = useHarmonyStore()
      expect(store.autoSmooth).toBe(false)

      store.toggleAutoSmooth()
      expect(store.autoSmooth).toBe(true)

      store.setAutoSmooth(false)
      expect(store.autoSmooth).toBe(false)
    })

    it('automatically applies smooth voice leading when chords are added with autoSmooth enabled', () => {
      const store = useHarmonyStore()
      store.setChordRegister(3)
      store.setAutoSmooth(true)

      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'], 0)
      const c2 = sampleChord('c-2', 'F', 'IV', ['F', 'A', 'C'], 1)

      store.addChord(c1)
      store.addChord(c2)

      expect(store.chords).toHaveLength(2)
      // When autoSmooth is on, F chord is automatically smoothed (inversion 2 with C on bottom)
      expect(store.chords[1].inversion).toBe(2)
      expect(store.chords[1].notes[0]).toBe('C')
    })

    it('smoothes existing progression when autoSmooth is toggled on', () => {
      const store = useHarmonyStore()
      store.setChordRegister(3)
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'], 0)
      const c2 = sampleChord('c-2', 'F', 'IV', ['F', 'A', 'C'], 1)
      store.setChords([c1, c2])
      expect(store.chords[1].inversion).toBe(0)

      store.setAutoSmooth(true)
      expect(store.chords[1].inversion).toBe(2)
    })
  })

  describe('defaultChordDuration & voicingStyle settings', () => {
    it('updates default chord duration and voicing style', () => {
      const store = useHarmonyStore()

      expect(store.defaultChordDuration).toBe(1)
      expect(store.voicingStyle).toBe('close')

      store.setDefaultChordDuration(2)
      expect(store.defaultChordDuration).toBe(2)

      store.setDefaultChordDuration(0.1)
      expect(store.defaultChordDuration).toBe(0.25)

      store.setVoicingStyle('drop-2')
      expect(store.voicingStyle).toBe('drop-2')

      store.setVoicingStyle('bass-triad')
      expect(store.voicingStyle).toBe('bass-triad')
    })
  })

  describe('transposeToScale', () => {
    it('transposes chords to the target scale and records history for undo', () => {
      const projectStore = useProjectStore()
      const harmonyStore = useHarmonyStore()

      projectStore.setKey('C')
      projectStore.setScale('major')

      const c1 = sampleChord('c-1', 'C', 'I', ['C3', 'E3', 'G3'], 0)
      const c2 = sampleChord('c-2', 'G', 'V', ['G3', 'B3', 'D4'], 1)
      harmonyStore.setChords([c1, c2])

      harmonyStore.transposeToScale('C', 'minor')

      expect(harmonyStore.chords[0].name).toBe('Cm')
      expect(harmonyStore.chords[0].roman).toBe('i')
      expect(harmonyStore.chords[0].voicing).toEqual(['C3', 'Eb3', 'G3'])

      expect(harmonyStore.chords[1].name).toBe('Gm')
      expect(harmonyStore.chords[1].roman).toBe('v')
      expect(harmonyStore.chords[1].voicing).toEqual(['G3', 'Bb3', 'D4'])

      // Undo restores original C major chords
      harmonyStore.undo()
      expect(harmonyStore.chords[0].name).toBe('C')
      expect(harmonyStore.chords[0].voicing).toEqual(['C3', 'E3', 'G3'])
    })

    it('is a no-op if chords are empty or scale/key is unchanged', () => {
      const projectStore = useProjectStore()
      const harmonyStore = useHarmonyStore()

      projectStore.setKey('C')
      projectStore.setScale('major')

      expect(() => harmonyStore.transposeToScale('C', 'major')).not.toThrow()
      expect(harmonyStore.canUndo).toBe(false)
    })
  })

  describe('chord selection and operations', () => {
    it('manages selectedChordId and selectedChord properly', () => {
      const store = useHarmonyStore()
      const c1 = sampleChord('c-1', 'C')
      const c2 = sampleChord('c-2', 'G', 'V', ['G', 'B', 'D'], 1)

      store.addChord(c1)
      expect(store.selectedChordId).toBe('c-1')
      expect(store.selectedChord?.id).toBe('c-1')

      store.addChord(c2)
      expect(store.selectedChordId).toBe('c-2')
      expect(store.selectedChord?.id).toBe('c-2')

      store.selectChord('c-1')
      expect(store.selectedChordId).toBe('c-1')
      expect(store.selectedChord?.id).toBe('c-1')

      store.removeChord('c-1')
      expect(store.selectedChordId).toBe('c-2')
      expect(store.selectedChord?.id).toBe('c-2')

      store.clearChords()
      expect(store.selectedChordId).toBeNull()
      expect(store.selectedChord).toBeNull()
    })

    it('duplicates a chord and sets selection to the clone', () => {
      const store = useHarmonyStore()
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'], 0)
      store.addChord(c1)

      store.duplicateChord('c-1')
      expect(store.chords).toHaveLength(2)
      expect(store.chords[1].startBar).toBe(1)
      expect(store.selectedChordId).toBe(store.chords[1].id)
    })

    it('transposes chord voicing octave', () => {
      const store = useHarmonyStore()
      const c1 = sampleChord('c-1', 'C', 'I', ['C3', 'E3', 'G3'], 0)
      store.addChord(c1)

      store.transposeChordVoicingOctave('c-1', 1)
      expect(store.chords[0].voicing).toEqual(['C4', 'E4', 'G4'])

      store.transposeChordVoicingOctave('c-1', -1)
      expect(store.chords[0].voicing).toEqual(['C3', 'E3', 'G3'])
    })

    it('deleteSelected removes selected chord when no note ids are selected', () => {
      const store = useHarmonyStore()
      const c1 = sampleChord('c-1', 'C', 'I', ['C', 'E', 'G'], 0)
      const c2 = sampleChord('c-2', 'G', 'V', ['G', 'B', 'D'], 1)
      store.addChord(c1)
      store.addChord(c2)

      store.selectChord('c-1')
      store.deleteSelected()

      expect(store.chords).toHaveLength(1)
      expect(store.chords[0].id).toBe('c-2')
    })

    it('manages paletteClickMode properly', () => {
      const store = useHarmonyStore()
      expect(store.paletteClickMode).toBe(DEFAULT_HARMONY_SETTINGS.paletteClickMode)

      store.setPaletteClickMode('insert')
      expect(store.paletteClickMode).toBe('insert')

      store.setPaletteClickMode('preview')
      expect(store.paletteClickMode).toBe('preview')
    })
  })
})
