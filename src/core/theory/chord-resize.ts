import type { ChordEvent } from '../schemas/chord.schema'
import { snapBarToGrid } from './chord-positioning'

interface ResizeOptions {
  totalBars: number
  snapGrid: number
  minDuration: number
}

export function chordResizeLimit(chord: ChordEvent, chords: readonly ChordEvent[], options: ResizeOptions): number {
  const nextStart = chords.reduce(
    (end, other) => (other.id !== chord.id && other.startBar >= chord.startBar ? Math.min(end, other.startBar) : end),
    options.totalBars
  )
  // Round down so a fractional neighbour boundary never snaps into an overlap.
  return Math.floor((nextStart - chord.startBar + Number.EPSILON) / options.snapGrid) * options.snapGrid
}

export function calculateResizedDuration(
  chord: ChordEvent,
  chords: readonly ChordEvent[],
  deltaBars: number,
  options: ResizeOptions
): number {
  const maxDuration = chordResizeLimit(chord, chords, options)
  if (maxDuration < options.minDuration) return chord.durationBars
  return snapBarToGrid(chord.durationBars + deltaBars, options.snapGrid, options.minDuration, maxDuration)
}
