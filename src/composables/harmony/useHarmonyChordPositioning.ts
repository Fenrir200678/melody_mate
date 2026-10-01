import type { ChordEvent } from '@/core/schemas/chord.schema'
import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
import { calculateMovedStartBar, cloneChordToPosition, repositionChord } from '@/core/theory/chord-positioning'

interface PositioningOptions {
  getChords: () => readonly ChordEvent[]
  totalBars: () => number
  setChords: (chords: ChordEvent[]) => void
  selectChord: (id: string) => void
}

export function useHarmonyChordPositioning(options: PositioningOptions) {
  function positionChord(chordId: string, startBar: number, clone: boolean): void {
    const chords = options.getChords()
    const chord = chords.find((event) => event.id === chordId)
    if (!chord || !Number.isFinite(startBar)) return
    const target = calculateMovedStartBar(startBar, 0, 1, chord.durationBars, {
      totalBars: options.totalBars(),
      snapGrid: 1 / STEPS_PER_BAR
    })
    if (target === chord.startBar) return
    const id = clone ? crypto.randomUUID() : chordId
    options.setChords(
      clone ? cloneChordToPosition(chords, chordId, target, id) : repositionChord(chords, chordId, target)
    )
    options.selectChord(id)
  }

  return {
    moveChordToPosition: (id: string, startBar: number) => positionChord(id, startBar, false),
    duplicateChordToPosition: (id: string, startBar: number) => positionChord(id, startBar, true)
  }
}
