import type { ChordEvent } from '../schemas/chord.schema'
import { resolveChordOverlaps } from './chord.engine'

export interface DragPositionOptions {
  totalBars: number
  snapGrid: number
}

/** Snaps a bar position to the requested grid and clamps it to the track bounds. */
export function snapBarToGrid(bar: number, snapGrid: number, minBar = 0, maxBar = Infinity): number {
  if (!Number.isFinite(bar) || !Number.isFinite(snapGrid) || snapGrid <= 0) return minBar
  const snapped = Math.round(bar / snapGrid) * snapGrid
  const normalized = Math.round(snapped * 1000) / 1000
  return Math.max(minBar, Math.min(maxBar, normalized))
}

/** Converts a pixel drag delta to a snapped bar position, clamped to the track. */
export function calculateMovedStartBar(
  initialStartBar: number,
  deltaPixels: number,
  barWidth: number,
  durationBars: number,
  options: DragPositionOptions
): number {
  const deltaBars = barWidth > 0 ? deltaPixels / barWidth : 0
  const maxBar = Math.max(0, options.totalBars - durationBars)
  return snapBarToGrid(initialStartBar + deltaBars, options.snapGrid, 0, maxBar)
}

/** Moves a chord, resolving overlaps while giving the moved chord priority at equal starts. */
export function repositionChord(chords: readonly ChordEvent[], chordId: string, newStartBar: number): ChordEvent[] {
  const target = chords.find((chord) => chord.id === chordId)
  if (!target) return [...chords]

  const updated = { ...target, startBar: newStartBar }
  const others = chords.filter((chord) => chord.id !== chordId)
  return resolveChordOverlaps([...others, updated])
}

/** Clones a chord at a target position; the caller supplies a fresh ID to keep core pure. */
export function cloneChordToPosition(
  chords: readonly ChordEvent[],
  chordId: string,
  targetStartBar: number,
  clonedId: string
): ChordEvent[] {
  const source = chords.find((chord) => chord.id === chordId)
  if (!source) return [...chords]

  const cloned: ChordEvent = {
    ...source,
    id: clonedId,
    startBar: targetStartBar,
    notes: [...source.notes],
    voicing: [...source.voicing]
  }
  return resolveChordOverlaps([...chords, cloned])
}
