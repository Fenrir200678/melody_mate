import type { ChordEvent } from '@/core/schemas/chord.schema'

export const DEFAULT_BAR_WIDTH = 220
export const MIN_BAR_WIDTH = 140
export const MAX_BAR_WIDTH = 340
export const ZOOM_STEP = 40

export function clampBarWidth(width: number): number {
  return Math.max(MIN_BAR_WIDTH, Math.min(MAX_BAR_WIDTH, width))
}

/** Fit-to-viewport width: how wide one bar must be for the whole progression to fill the lane. */
export function calculateFitBarWidth(containerWidth: number, totalBars: number): number {
  if (containerWidth <= 0 || totalBars <= 0) return DEFAULT_BAR_WIDTH
  return clampBarWidth(Math.floor(containerWidth / totalBars))
}

export function calculateZoomPercentage(barWidth: number, baseBarWidth: number): number {
  return Math.round((barWidth / baseBarWidth) * 100)
}

/** End bar of the last chord, i.e. where a newly appended chord would start. */
export function progressionEndBar(chords: readonly ChordEvent[]): number {
  if (chords.length === 0) return 0
  const last = chords[chords.length - 1]
  return last.startBar + last.durationBars
}

/** Lane bar count: at least the project length, plus one spare bar to host the ghost slot. */
export function calculateTrackBars(projectBars: number, chords: readonly ChordEvent[]): number {
  const minBars = Math.max(projectBars, 1)
  if (chords.length === 0) return minBars
  return Math.max(minBars, Math.ceil(progressionEndBar(chords)) + 1)
}

/** Progression length in whole bars; used to grow the project once chords run past its end. */
export function calculateProgressionBars(projectBars: number, chords: readonly ChordEvent[]): number {
  if (chords.length === 0) return projectBars
  return Math.max(projectBars, Math.ceil(progressionEndBar(chords)))
}

/** Clones the whole progression after itself, doubling its length. */
export function duplicateProgression(chords: readonly ChordEvent[]): ChordEvent[] {
  if (chords.length === 0) return []

  const length = chords.reduce((acc, c) => Math.max(acc, c.startBar + c.durationBars), 0)
  const cloned = chords.map((chord) => ({
    ...chord,
    id: crypto.randomUUID(),
    startBar: chord.startBar + length
  }))
  return [...chords, ...cloned]
}

export function formatBarSpan(chord: ChordEvent): string {
  const start = chord.startBar + 1
  if (chord.durationBars === 1) {
    return `Bar ${start}`
  }
  if (Number.isInteger(chord.durationBars) && chord.durationBars > 1) {
    return `Bars ${start}–${start + chord.durationBars - 1}`
  }
  return `Bar ${start} (${chord.durationBars}b)`
}

/** 1px inset on both sides keeps a visible hairline gap between adjacent blocks. */
export function calculateBlockGeometry(
  startBar: number,
  durationBars: number,
  barWidth: number
): { left: number; width: number } {
  return {
    left: startBar * barWidth + 1,
    width: Math.max(16, durationBars * barWidth - 2)
  }
}

/** Density tier of a chord block, chosen so labels stay legible at every zoom level. */
export type BlockDensity = 'wide' | 'medium' | 'compact'

export function blockDensity(pixelWidth: number): BlockDensity {
  if (pixelWidth >= 100) return 'wide'
  if (pixelWidth >= 55) return 'medium'
  return 'compact'
}
