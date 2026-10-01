import { MIN_GAP_DURATION_BARS } from '../../config/defaults'
import type { ChordEvent } from '../schemas/chord.schema'

export { MIN_GAP_DURATION_BARS } from '../../config/defaults'

export interface ProgressionGap {
  id: string
  startBar: number
  durationBars: number
}

/** Finds qualifying gaps before and between chords, leaving the trailing slot to the timeline ghost slot. */
export function findProgressionGaps(
  chords: readonly ChordEvent[],
  minDuration: number = MIN_GAP_DURATION_BARS
): ProgressionGap[] {
  if (chords.length === 0 || minDuration <= 0) return []

  const sorted = [...chords].sort((left, right) => left.startBar - right.startBar || left.id.localeCompare(right.id))
  const gaps: ProgressionGap[] = []
  const first = sorted[0]

  if (first.startBar >= minDuration) {
    gaps.push({ id: 'gap-start-0', startBar: 0, durationBars: first.startBar })
  }

  let occupiedEnd = first.startBar + first.durationBars
  let occupiedEndChordId = first.id

  for (let index = 1; index < sorted.length; index += 1) {
    const chord = sorted[index]
    const gapDuration = chord.startBar - occupiedEnd

    if (gapDuration >= minDuration) {
      gaps.push({
        id: `gap-${occupiedEndChordId}-${chord.id}`,
        startBar: occupiedEnd,
        durationBars: gapDuration
      })
    }

    const chordEnd = chord.startBar + chord.durationBars
    if (chordEnd > occupiedEnd || (chordEnd === occupiedEnd && chord.id.localeCompare(occupiedEndChordId) < 0)) {
      occupiedEnd = chordEnd
      occupiedEndChordId = chord.id
    }
  }

  return gaps
}

/** Moves chords into chronological order and packs them from bar zero without gaps. */
export function closeProgressionGaps(chords: readonly ChordEvent[]): ChordEvent[] {
  const sorted = [...chords].sort((left, right) => left.startBar - right.startBar || left.id.localeCompare(right.id))
  let currentStart = 0

  return sorted.map((chord) => {
    const closedChord = { ...chord, startBar: Math.round(currentStart * 1000) / 1000 }
    currentStart += chord.durationBars
    return closedChord
  })
}

/** Returns whether the progression contains a gap large enough to surface in the timeline. */
export function hasProgressionGaps(chords: readonly ChordEvent[]): boolean {
  return findProgressionGaps(chords).length > 0
}
