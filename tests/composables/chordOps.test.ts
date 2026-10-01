import { describe, expect, it } from 'vitest'
import {
  addChordVoicingNote,
  cloneChords,
  chordNoteKey,
  chordStepRange,
  createChordDraft,
  finalizeChords,
  findChordAtStep,
  getChordHitAtPixel,
  moveChordsByBars,
  parseChordNoteKey,
  quantizeDeltaBars,
  realignChordsAfterDurationChange,
  removeChordVoicingNoteAt,
  reorderChordInProgression,
  resizeChordByBars,
  setChordVoicingPitch,
  transposeChordVoicings,
  transposeWholeChords
} from '@/composables/pianoroll/chordOps'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import { remapChordNoteSelection } from '@/core/schemas/chord.schema'
import type { TransformOptions } from '@/composables/pianoroll/noteOps'

function chord(id: string, startBar: number, durationBars: number, voicing: string[]): ChordEvent {
  return {
    id,
    name: 'C',
    roman: 'I',
    notes: voicing.map((v) => v.replace(/\d+$/, '')),
    voicing,
    startBar,
    durationBars,
    inversion: 0
  }
}

const tf: TransformOptions = {
  stepWidth: 20,
  rowHeight: 10,
  scrollX: 0,
  scrollY: 0,
  keyboardWidth: 0,
  maxMidi: 108
}

const stepsPerBar = 16

describe('chordOps', () => {
  describe('chordNoteKey / parseChordNoteKey', () => {
    it('round-trips selection keys', () => {
      const key = chordNoteKey('c-1', 2)
      expect(key).toBe('c-1:2')
      expect(parseChordNoteKey(key)).toEqual({ chordId: 'c-1', noteIndex: 2 })
    })

    it('rejects malformed keys', () => {
      expect(parseChordNoteKey('no-colon')).toBeNull()
      expect(parseChordNoteKey('c:x')).toBeNull()
      expect(parseChordNoteKey(':2')).toBeNull()
    })
  })

  describe('chordStepRange', () => {
    it('converts bars to sequencer steps using the given steps-per-bar', () => {
      expect(chordStepRange(chord('c', 1.5, 0.5, ['C3']), 16)).toEqual({ startStep: 24, endStep: 32 })
      expect(chordStepRange(chord('c', 2, 1, ['C3']), 8)).toEqual({ startStep: 16, endStep: 24 })
    })
  })

  describe('findChordAtStep', () => {
    const chords = [
      chord('c-1', 0, 1, ['D3']), // steps 0..16
      chord('c-2', 1, 2, ['G3']) // steps 16..48
    ]

    it('returns the chord covering the specified sequencer step', () => {
      expect(findChordAtStep(0, chords, 16)?.id).toBe('c-1')
      expect(findChordAtStep(8, chords, 16)?.id).toBe('c-1')
      expect(findChordAtStep(15, chords, 16)?.id).toBe('c-1')
      expect(findChordAtStep(16, chords, 16)?.id).toBe('c-2')
      expect(findChordAtStep(32, chords, 16)?.id).toBe('c-2')
      expect(findChordAtStep(47, chords, 16)?.id).toBe('c-2')
    })

    it('returns null when step is outside all chord spans', () => {
      expect(findChordAtStep(48, chords, 16)).toBeNull()
      expect(findChordAtStep(64, chords, 16)).toBeNull()
    })
  })

  describe('getChordHitAtPixel', () => {
    // C3 = midi 48 -> row (108-48)*10 = 600..610 ; block spans step 0..16 -> x 0..320
    const c = chord('c-1', 0, 1, ['C3', 'E3'])

    it('detects voicing note hits with index', () => {
      const hit = getChordHitAtPixel(100, 605, [c], tf, stepsPerBar)
      expect(hit.zone).toBe('note')
      expect(hit.chord?.id).toBe('c-1')
      expect(hit.noteIndex).toBe(0)
    })

    it('detects block body hits between voicing notes', () => {
      // E3 = midi 52 -> row 560..570; y=585 lies between the two note rows but inside the block
      const hit = getChordHitAtPixel(100, 585, [c], tf, stepsPerBar)
      expect(hit.zone).toBe('block')
      expect(hit.noteIndex).toBe(-1)
    })

    it('prioritizes the resize-end zone at the block right edge', () => {
      const hit = getChordHitAtPixel(316, 605, [c], tf, stepsPerBar)
      expect(hit.zone).toBe('resize-end')
    })

    it('returns outside for misses', () => {
      expect(getChordHitAtPixel(500, 605, [c], tf, stepsPerBar).zone).toBe('outside')
      expect(getChordHitAtPixel(100, 10, [c], tf, stepsPerBar).zone).toBe('outside')
    })
  })

  describe('remapChordNoteSelection', () => {
    it('drops the removed index and shifts higher indices down', () => {
      const keys = ['c-1:0', 'c-1:2', 'c-1:3', 'c-2:1']
      expect(remapChordNoteSelection('c-1', 1, keys)).toEqual(['c-1:0', 'c-1:1', 'c-1:2', 'c-2:1'])
    })

    it('leaves other chords and lower indices untouched', () => {
      const keys = ['c-1:0', 'c-2:4']
      expect(remapChordNoteSelection('c-1', 2, keys)).toEqual(['c-1:0', 'c-2:4'])
    })
  })

  describe('quantizeDeltaBars', () => {
    it('snaps bar deltas to whole sequencer steps', () => {
      expect(quantizeDeltaBars(0.1, 4, 16)).toBeCloseTo(0, 6)
      expect(quantizeDeltaBars(0.2, 4, 16)).toBeCloseTo(0.25, 6)
      expect(quantizeDeltaBars(0.4, 0, 16)).toBeCloseTo(0.4, 6)
    })
  })

  describe('moveChordsByBars', () => {
    it('moves only targeted chords and keeps relative offsets', () => {
      const chords = [chord('a', 0, 1, ['C3']), chord('b', 2, 1, ['G3'])]
      const moved = moveChordsByBars(chords, ['a', 'b'], 0.5, { totalBars: 4 })
      expect(moved.map((c) => c.startBar)).toEqual([0.5, 2.5])
    })

    it('clamps the group inside the project', () => {
      const chords = [chord('a', 0, 1, ['C3']), chord('b', 2, 1, ['G3'])]
      const moved = moveChordsByBars(chords, ['a', 'b'], -5, { totalBars: 4 })
      expect(moved.map((c) => c.startBar)).toEqual([0, 2])

      const movedEnd = moveChordsByBars(chords, ['a', 'b'], 10, { totalBars: 4 })
      expect(movedEnd.map((c) => c.startBar + c.durationBars)).toEqual([2, 4])
    })
  })

  describe('resizeChordByBars', () => {
    it('snaps to quarter-bar minimum duration and clamps at the project end', () => {
      const chords = [chord('a', 0, 1, ['C3'])]
      expect(resizeChordByBars(chords, 'a', -5, { totalBars: 4 })[0].durationBars).toBe(0.25)
      expect(resizeChordByBars(chords, 'a', 10, { totalBars: 4 })[0].durationBars).toBe(4)
      expect(resizeChordByBars(chords, 'a', 0.4, { totalBars: 4 })[0].durationBars).toBe(1.5)
    })
  })

  describe('voicing note mutations', () => {
    it('transposes a single voicing note without touching the others', () => {
      const chords = [chord('c-1', 0, 1, ['C3', 'E3', 'G3'])]
      const next = setChordVoicingPitch(chords, 'c-1', 1, 50) // E3 -> D3
      expect(next[0].voicing).toEqual(['C3', 'D3', 'G3'])
      // Original array and chord object remain untouched (immutability)
      expect(chords[0].voicing).toEqual(['C3', 'E3', 'G3'])
    })

    it('adds voicing notes in ascending MIDI pitch order', () => {
      // Adding D3 (lower than E3) and B3 (higher than G3)
      let next = addChordVoicingNote([chord('c-1', 0, 1, ['E3', 'G3'])], 'c-1', 'D3')
      expect(next[0].voicing).toEqual(['D3', 'E3', 'G3'])

      next = addChordVoicingNote(next, 'c-1', 'B3')
      expect(next[0].voicing).toEqual(['D3', 'E3', 'G3', 'B3'])
    })

    it('ignores duplicate voicing pitches', () => {
      const next = addChordVoicingNote([chord('c-1', 0, 1, ['C3', 'E3'])], 'c-1', 'E3')
      expect(next[0].voicing).toEqual(['C3', 'E3'])
    })

    it('removes voicing notes and drops the chord when the last note goes', () => {
      const chords = [chord('c-1', 0, 1, ['C3', 'E3'])]
      const next = removeChordVoicingNoteAt(chords, 'c-1', 0)
      expect(next[0].voicing).toEqual(['E3'])
      expect(removeChordVoicingNoteAt(next, 'c-1', 0)).toHaveLength(0)
    })
  })

  describe('createChordDraft', () => {
    it('creates a one-note chord clamped into the project', () => {
      const draft = createChordDraft(1, 1, 'G3', { totalBars: 4 })
      expect(draft).not.toBeNull()
      expect(draft?.startBar).toBe(1)
      expect(draft?.durationBars).toBe(1)
      expect(draft?.voicing).toEqual(['G3'])
    })

    it('rejects creation beyond the project end', () => {
      expect(createChordDraft(4, 1, 'G3', { totalBars: 4 })).toBeNull()
    })

    it('rejects creation where less than the minimum chord duration remains', () => {
      // Step 63 of a 4-bar/16n project leaves only 0.0625 bars, below the 0.25 minimum
      expect(createChordDraft(63 / 16, 1, 'G3', { totalBars: 4 })).toBeNull()
    })
  })

  describe('finalizeChords', () => {
    it('trims overlaps produced by a drag commit', () => {
      const finalized = finalizeChords([chord('a', 0, 2, ['C3']), chord('b', 1, 1, ['G3'])])
      expect(finalized).toHaveLength(2)
      expect(finalized.find((c) => c.id === 'a')?.durationBars).toBe(1)
    })
  })

  describe('multi-note chord drawing workflow', () => {
    it('supports drawing D, then F, then A into Bar 1 without overwriting', () => {
      let chords: ChordEvent[] = []

      // 1. User clicks on D3 in Bar 1 (step 4, bar 0) -> no chord exists -> create draft
      const draft = createChordDraft(0, 1, 'D3', { totalBars: 4 })
      expect(draft).not.toBeNull()
      chords = finalizeChords([...chords, draft!])
      expect(chords).toHaveLength(1)
      expect(chords[0].voicing).toEqual(['D3'])

      // 2. User clicks on F3 in Bar 1 (step 8) -> chord exists at step 8
      const hitChord = findChordAtStep(8, chords, 16)
      expect(hitChord).not.toBeNull()
      expect(hitChord?.id).toBe(chords[0].id)

      // Add F3 to the existing chord
      chords = addChordVoicingNote(chords, hitChord!.id, 'F3')
      expect(chords).toHaveLength(1)
      expect(chords[0].voicing).toEqual(['D3', 'F3'])

      // 3. User clicks on A3 in Bar 1 (step 12) -> chord exists at step 12
      const hitChord2 = findChordAtStep(12, chords, 16)
      expect(hitChord2).not.toBeNull()

      chords = addChordVoicingNote(chords, hitChord2!.id, 'A3')
      expect(chords).toHaveLength(1)
      expect(chords[0].voicing).toEqual(['D3', 'F3', 'A3'])

      // 4. User clicks in Bar 2 (step 16) on G3 -> no chord at step 16 -> creates new chord
      const hitBar2 = findChordAtStep(16, chords, 16)
      expect(hitBar2).toBeNull()

      const draft2 = createChordDraft(1, 1, 'G3', { totalBars: 4 })
      chords = finalizeChords([...chords, draft2!])
      expect(chords).toHaveLength(2)
      expect(chords[0].startBar).toBe(0)
      expect(chords[0].voicing).toEqual(['D3', 'F3', 'A3'])
      expect(chords[1].startBar).toBe(1)
      expect(chords[1].voicing).toEqual(['G3'])

      // 5. Toggling off note F3 from chord in Bar 1
      const f3Index = chords[0].voicing.indexOf('F3')
      expect(f3Index).toBe(1)
      chords = removeChordVoicingNoteAt(chords, chords[0].id, f3Index)
      expect(chords).toHaveLength(2)
      expect(chords[0].voicing).toEqual(['D3', 'A3'])
    })
  })

  describe('cloneChords', () => {
    it('clones selected chords shifted by their span and generates new keys', () => {
      const c1 = chord('c1', 0, 1, ['C3', 'E3', 'G3'])
      const { clonedChords, newKeys } = cloneChords([c1], ['c1:0', 'c1:1'], 4)

      expect(clonedChords).toHaveLength(1)
      expect(clonedChords[0].id).not.toBe('c1')
      expect(clonedChords[0].startBar).toBe(1)
      expect(clonedChords[0].durationBars).toBe(1)
      expect(clonedChords[0].voicing).toEqual(['C3', 'E3', 'G3'])
      expect(newKeys).toHaveLength(3)
      expect(newKeys[0]).toBe(`${clonedChords[0].id}:0`)
    })

    it('returns empty when no keys selected or chords out of bounds', () => {
      const c1 = chord('c1', 3, 1, ['C3', 'E3', 'G3'])
      expect(cloneChords([c1], [], 4)).toEqual({ clonedChords: [], newKeys: [] })
      // Shifting past totalBars (3 + 1 = 4 >= 4)
      expect(cloneChords([c1], ['c1:0'], 4)).toEqual({ clonedChords: [], newKeys: [] })
    })
  })

  describe('transposeChordVoicings', () => {
    it('transposes selected notes, sorts ascending, and updates selection index', () => {
      const c1 = chord('c1', 0, 1, ['C3', 'E3', 'G3'])
      const result = transposeChordVoicings([c1], ['c1:1'], 12, [], 'C', 'major')

      expect(result.hasChanged).toBe(true)
      expect(result.nextChords[0].voicing).toEqual(['C3', 'G3', 'E4'])
      expect(result.newSelectedKeys).toEqual(['c1:2'])
      expect(result.singleTransposedPitch).toBe('E4')
    })

    it('clamps notes at MIDI 127 boundary', () => {
      const c1 = chord('c1', 0, 1, ['C9', 'E9', 'G9']) // G9 is 127
      const result = transposeChordVoicings([c1], ['c1:0', 'c1:1', 'c1:2'], 12, [], 'C', 'major')

      expect(result.hasChanged).toBe(false)
      expect(result.nextChords[0].voicing).toEqual(['C9', 'E9', 'G9'])
    })
  })

  describe('transposeWholeChords', () => {
    it('transposes all voicing notes of targeted chords by delta semitones', () => {
      const c1 = chord('c1', 0, 1, ['C3', 'E3', 'G3'])
      const c2 = chord('c2', 1, 1, ['F3', 'A3', 'C4'])

      const result = transposeWholeChords([c1, c2], ['c1'], 2)
      expect(result[0].voicing).toEqual(['D3', 'Gb3', 'A3'])
      expect(result[1].voicing).toEqual(['F3', 'A3', 'C4']) // Untargeted chord untouched
    })

    it('transposes multiple targeted chords together preserving relative voicing intervals', () => {
      const c1 = chord('c1', 0, 1, ['C3', 'E3', 'G3'])
      const c2 = chord('c2', 1, 1, ['F3', 'A3', 'C4'])

      const result = transposeWholeChords([c1, c2], ['c1', 'c2'], -2)
      expect(result[0].voicing).toEqual(['Bb2', 'D3', 'F3'])
      expect(result[1].voicing).toEqual(['Eb3', 'G3', 'Bb3'])
    })

    it('clamps group when top or bottom note would exceed [0, 127]', () => {
      const c1 = chord('c1', 0, 1, ['G9']) // MIDI 127
      const resultUp = transposeWholeChords([c1], ['c1'], 5)
      expect(resultUp[0].voicing).toEqual(['G9'])

      const c2 = chord('c2', 0, 1, ['C-1']) // MIDI 0
      const resultDown = transposeWholeChords([c2], ['c2'], -5)
      expect(resultDown[0].voicing).toEqual(['C-1'])
    })

    it('snaps pitches to scale when scaleLock is enabled', () => {
      const c1 = chord('c1', 0, 1, ['C3', 'E3', 'G3']) // C major in C major scale
      // Transpose +2 semitones: C3 -> D3, E3 -> F#3 (snapped to F3), G3 -> A3 => D minor
      const result = transposeWholeChords([c1], ['c1'], 2, {
        scaleLock: {
          isLocked: true,
          rootKey: 'C',
          scale: 'major'
        }
      })
      expect(result[0].voicing).toEqual(['D3', 'F3', 'A3'])
    })

    it('returns untouched array when delta is 0 or targetIds empty', () => {
      const c1 = chord('c1', 0, 1, ['C3', 'E3', 'G3'])
      expect(transposeWholeChords([c1], ['c1'], 0)).toEqual([c1])
      expect(transposeWholeChords([c1], [], 5)).toEqual([c1])
      expect(transposeWholeChords([c1], ['unknown'], 5)).toEqual([c1])
    })
  })

  describe('realignChordsAfterDurationChange', () => {
    it('sets duration and shifts subsequent chords seamlessly', () => {
      const c1 = chord('c1', 0, 1, ['C3', 'E3', 'G3'])
      const c2 = chord('c2', 1, 1, ['F3', 'A3', 'C4'])
      const c3 = chord('c3', 2, 1, ['G3', 'B3', 'D4'])

      const result = realignChordsAfterDurationChange([c1, c2, c3], 'c1', 2, { totalBars: 8 })
      expect(result[0].durationBars).toBe(2)
      expect(result[0].startBar).toBe(0)
      expect(result[1].startBar).toBe(2)
      expect(result[1].durationBars).toBe(1)
      expect(result[2].startBar).toBe(3)
      expect(result[2].durationBars).toBe(1)
    })

    it('returns copy unchanged if targetId is not found', () => {
      const c1 = chord('c1', 0, 1, ['C3', 'E3', 'G3'])
      const result = realignChordsAfterDurationChange([c1], 'unknown', 2, { totalBars: 8 })
      expect(result).toEqual([c1])
    })
  })

  describe('reorderChordInProgression', () => {
    it('swaps chords and re-anchors sequential startBar positions from Bar 0', () => {
      const c1 = chord('c1', 0, 1, ['C3', 'E3', 'G3'])
      const c2 = chord('c2', 1, 2, ['F3', 'A3', 'C4'])
      const c3 = chord('c3', 3, 1, ['G3', 'B3', 'D4'])

      const result = reorderChordInProgression([c1, c2, c3], 'c1', 'down')
      expect(result[0].id).toBe('c2')
      expect(result[0].startBar).toBe(0)
      expect(result[0].durationBars).toBe(2)

      expect(result[1].id).toBe('c1')
      expect(result[1].startBar).toBe(2)
      expect(result[1].durationBars).toBe(1)

      expect(result[2].id).toBe('c3')
      expect(result[2].startBar).toBe(3)
      expect(result[2].durationBars).toBe(1)
    })

    it('does not reorder when moving up from index 0 or down from last index', () => {
      const c1 = chord('c1', 0, 1, ['C3', 'E3', 'G3'])
      const c2 = chord('c2', 1, 1, ['F3', 'A3', 'C4'])

      const atStart = reorderChordInProgression([c1, c2], 'c1', 'up')
      expect(atStart[0].id).toBe('c1')

      const atEnd = reorderChordInProgression([c1, c2], 'c2', 'down')
      expect(atEnd[1].id).toBe('c2')
    })
  })
})
