import { describe, expect, it } from 'vitest'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import {
  addVoicingNote,
  duplicateChordEvent,
  generateProgressionChords,
  removeVoicingNote,
  renameChordFromVoicing,
  setChordInversion,
  transposeProgressionToScale,
  transposeVoicingNote,
  transposeVoicingOctave
} from '../../../src/core/theory/chord-mutations'
import { getDiatonicChords } from '../../../src/core/theory/chord.engine'

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

describe('chord-mutations', () => {
  const palette = getDiatonicChords('C', 'major')

  it('setChordInversion applies inversion and recalculates notes and voicing', () => {
    const chord = sampleChord('c1', 'C', 'I', ['C', 'E', 'G'])
    const inverted = setChordInversion(chord, 1, 3, 'close')
    expect(inverted.inversion).toBe(1)
    expect(inverted.notes).toEqual(['E', 'G', 'C'])
    expect(inverted.voicing).toEqual(['E3', 'G3', 'C4'])
  })

  it('transposeVoicingNote transposes note and rederives identity', () => {
    const chord = sampleChord('c1', 'C', 'I', ['C3', 'E3', 'G3'])
    const updated = transposeVoicingNote(chord, 0, 57, palette, 'C', 'major') // C3 (48) -> A3 (57)
    expect(updated.voicing).toEqual(['A3', 'E3', 'G3'])
  })

  it('addVoicingNote adds pitch and rederives identity', () => {
    const chord = sampleChord('c1', 'C', 'I', ['C3', 'E3', 'G3'])
    const updated = addVoicingNote(chord, 'B3', palette, 'C', 'major')
    expect(updated.voicing).toEqual(['C3', 'E3', 'G3', 'B3'])
    expect(updated.name).toBe('Cmaj7')
  })

  it('removeVoicingNote removes pitch, returns null when empty', () => {
    const chord = sampleChord('c1', 'C', 'I', ['C3'])
    const empty = removeVoicingNote(chord, 0, palette, 'C', 'major')
    expect(empty).toBeNull()

    const multi = sampleChord('c2', 'C', 'I', ['C3', 'E3'])
    const updated = removeVoicingNote(multi, 1, palette, 'C', 'major')
    expect(updated).not.toBeNull()
    expect(updated!.voicing).toEqual(['C3'])
  })

  it('renameChordFromVoicing updates identity from current voicing', () => {
    const chord: ChordEvent = {
      ...sampleChord('c1', 'Unknown', '?', []),
      voicing: ['A3', 'C4', 'E4']
    }
    const renamed = renameChordFromVoicing(chord, palette, 'C', 'major')
    expect(renamed.name).toBe('Am')
    expect(renamed.roman).toBe('vi')
  })

  it('transposeVoicingOctave shifts pitches by 12 semitones', () => {
    const chord = sampleChord('c1', 'C', 'I', ['C3', 'E3', 'G3'])
    const octaveUp = transposeVoicingOctave(chord, 1)
    expect(octaveUp.voicing).toEqual(['C4', 'E4', 'G4'])

    const octaveDown = transposeVoicingOctave(chord, -1)
    expect(octaveDown.voicing).toEqual(['C2', 'E2', 'G2'])
  })

  it('duplicateChordEvent clones chord with new ID and shifted startBar', () => {
    const chord = sampleChord('c1', 'C', 'I', ['C3', 'E3', 'G3'], 1)
    const cloned = duplicateChordEvent(chord)
    expect(cloned.id).not.toBe(chord.id)
    expect(cloned.startBar).toBe(2)
  })

  it('generateProgressionChords loads preset chords with optional voice leading', () => {
    const { preset, chords } = generateProgressionChords({
      progressionId: 'pop-standard',
      key: 'C',
      targetBars: 4,
      chordRegister: 3,
      voicingStyle: 'close',
      autoSmooth: true
    })
    expect(preset.id).toBe('pop-standard')
    expect(chords).toHaveLength(4)
  })

  it('transposeProgressionToScale transposes preset or custom chords', () => {
    const c1 = sampleChord('c1', 'C', 'I', ['C3', 'E3', 'G3'], 0)
    const { chords, keepPreset } = transposeProgressionToScale({
      chords: [c1],
      selectedProgressionId: null,
      currentKey: 'C',
      currentScale: 'major',
      newKey: 'A',
      newScale: 'minor',
      totalBars: 4,
      chordRegister: 3,
      voicingStyle: 'close'
    })
    expect(keepPreset).toBe(false)
    expect(chords[0].name).toBe('Am')
  })
})
