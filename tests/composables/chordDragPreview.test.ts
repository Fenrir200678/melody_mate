import { describe, expect, it } from 'vitest'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import { computeChordDragPreview } from '@/composables/pianoroll/chordDragPreview'

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

function baseInput(overrides: Partial<Parameters<typeof computeChordDragPreview>[0]> = {}) {
  return {
    originalChords: [chord('c-1', 0, 1, ['C4', 'E4', 'G4']), chord('c-2', 2, 1, ['F4', 'A4', 'C5'])],
    mode: 'chord-move' as const,
    deltaBars: 0,
    deltaMidi: 0,
    targetId: null,
    targetNoteIndex: -1,
    activeIds: [],
    totalBars: 8,
    ...overrides
  }
}

describe('computeChordDragPreview', () => {
  describe('no-op gestures', () => {
    it('reports not dirty and reuses the input array when nothing changes', () => {
      const input = baseInput()
      const result = computeChordDragPreview(input)

      expect(result.dirty).toBe(false)
      expect(result.chords).toBe(input.originalChords)
    })

    it('ignores a vertical delta when no chord is active', () => {
      const result = computeChordDragPreview(baseInput({ deltaMidi: 5 }))

      expect(result.dirty).toBe(false)
      expect(result.chords[0].voicing).toEqual(['C4', 'E4', 'G4'])
    })
  })

  describe('chord-move / chord-clone transposition', () => {
    it('transposes only the active chords and preserves their intervals', () => {
      const result = computeChordDragPreview(baseInput({ activeIds: ['c-1'], deltaMidi: 2 }))

      expect(result.dirty).toBe(true)
      expect(result.chords[0].voicing).toEqual(['D4', 'Gb4', 'A4'])
      // Untouched chord keeps its original reference
      expect(result.chords[1].voicing).toEqual(['F4', 'A4', 'C5'])
    })

    it('clamps the transposition so no voicing note crosses midi 127', () => {
      const result = computeChordDragPreview(baseInput({ activeIds: ['c-1'], deltaMidi: 100 }))

      // Highest note is G4 (67), so the group shifts by 127 - 67 = 60 semitones
      expect(result.chords[0].voicing).toEqual(['C9', 'E9', 'G9'])
    })

    it('applies the same transposition for chord-clone', () => {
      const result = computeChordDragPreview(baseInput({ mode: 'chord-clone', activeIds: ['c-1'], deltaMidi: 2 }))

      expect(result.dirty).toBe(true)
      expect(result.chords[0].voicing).toEqual(['D4', 'Gb4', 'A4'])
    })
  })

  describe('horizontal bar shift', () => {
    it('shifts every active chord by the bar delta', () => {
      const result = computeChordDragPreview(baseInput({ activeIds: ['c-1', 'c-2'], deltaBars: 1 }))

      expect(result.dirty).toBe(true)
      expect(result.chords.map((c) => c.startBar)).toEqual([1, 3])
    })

    it('restricts a chord-note drag to its own chord', () => {
      const result = computeChordDragPreview(
        baseInput({
          mode: 'chord-note',
          targetId: 'c-1',
          targetNoteIndex: 0,
          // c-2 is "active" too, but a voicing-note drag must not move it
          activeIds: ['c-1', 'c-2'],
          deltaBars: 1
        })
      )

      expect(result.dirty).toBe(true)
      expect(result.chords.map((c) => c.startBar)).toEqual([1, 2])
    })

    it('clamps the shifted group inside the project bounds', () => {
      // The group spans bars 0..3, so an 8-bar project leaves 5 bars of headroom
      const result = computeChordDragPreview(baseInput({ activeIds: ['c-1', 'c-2'], deltaBars: 10 }))

      expect(result.chords.map((c) => c.startBar)).toEqual([5, 7])
    })
  })

  describe('chord-note pitch drag', () => {
    it('moves a single voicing note without transposing the rest', () => {
      const result = computeChordDragPreview(
        baseInput({ mode: 'chord-note', targetId: 'c-1', targetNoteIndex: 0, deltaMidi: 2 })
      )

      expect(result.dirty).toBe(true)
      expect(result.chords[0].voicing).toEqual(['D4', 'E4', 'G4'])
    })

    it('combines a voicing-note transposition with a bar shift', () => {
      const result = computeChordDragPreview(
        baseInput({ mode: 'chord-note', targetId: 'c-1', targetNoteIndex: 0, deltaMidi: 2, deltaBars: 1 })
      )

      expect(result.chords[0].voicing).toEqual(['D4', 'E4', 'G4'])
      expect(result.chords[0].startBar).toBe(1)
    })

    it('is a no-op when no voicing-note index is armed', () => {
      const result = computeChordDragPreview(
        baseInput({ mode: 'chord-note', targetId: 'c-1', targetNoteIndex: -1, deltaMidi: 5 })
      )

      expect(result.dirty).toBe(false)
      expect(result.chords[0].voicing).toEqual(['C4', 'E4', 'G4'])
    })
  })

  describe('scale lock', () => {
    it('snaps a dragged voicing note onto the active scale', () => {
      // C4 + 2 semitones = D4, already a C-major tone
      const result = computeChordDragPreview(
        baseInput({
          mode: 'chord-note',
          targetId: 'c-1',
          targetNoteIndex: 0,
          deltaMidi: 2,
          scaleLock: { rootKey: 'C', scale: 'major' }
        })
      )

      expect(result.chords[0].voicing).toEqual(['D4', 'E4', 'G4'])
    })

    it('collapses an off-scale drag back to the original pitch and stays clean', () => {
      // C4 + 1 semitone = C#4, which snaps back to C4 => no audible change
      const result = computeChordDragPreview(
        baseInput({
          mode: 'chord-note',
          targetId: 'c-1',
          targetNoteIndex: 0,
          deltaMidi: 1,
          scaleLock: { rootKey: 'C', scale: 'major' }
        })
      )

      expect(result.dirty).toBe(false)
      expect(result.chords[0].voicing).toEqual(['C4', 'E4', 'G4'])
    })

    it('snaps whole-chord transpositions onto the scale', () => {
      const result = computeChordDragPreview(
        baseInput({
          activeIds: ['c-1'],
          deltaMidi: 1,
          scaleLock: { rootKey: 'C', scale: 'major' }
        })
      )

      // C#4->C4, F4 stays, G#4->G4: the triad collapses back onto the C-major scale
      expect(result.chords[0].voicing).toEqual(['C4', 'F4', 'G4'])
    })
  })
})
