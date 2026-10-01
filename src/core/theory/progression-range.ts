import type { ChordEvent } from '../schemas/chord.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import type { WorkRange } from '../generator/work-range'
import { createNoteIdAllocator } from '../variation/helpers'

/** Places a relative progression in a work range and keeps existing material outside it. */
export function fitAndMergeProgression(
  existing: readonly ChordEvent[],
  newRelativeChords: readonly ChordEvent[],
  range: WorkRange
): ChordEvent[] {
  const startBar = range.startStep / STEPS_PER_BAR
  const endBar = range.endStep / STEPS_PER_BAR
  const rangeBars = endBar - startBar
  const usedIds = new Set([...existing, ...newRelativeChords].map((chord) => chord.id))
  const allocateId = createNoteIdAllocator(
    [...existing, ...newRelativeChords].map((chord) => ({
      id: chord.id,
      pitch: chord.name,
      midi: 0,
      step: 0,
      durationSteps: 1,
      velocity: 1,
      isMuted: false
    }))
  )
  const freshId = (sourceId: string, ordinal: number): string => {
    const candidate = allocateId({
      id: sourceId,
      pitch: '',
      midi: 0,
      step: ordinal,
      durationSteps: 1,
      velocity: 1,
      isMuted: false
    })
    usedIds.add(candidate)
    return candidate
  }

  const preserved = existing.flatMap((chord, index) => {
    const chordEnd = chord.startBar + chord.durationBars
    if (chordEnd <= startBar || chord.startBar >= endBar) return [chord]
    const fragments: ChordEvent[] = []
    const leftDuration = Math.min(startBar, chordEnd) - chord.startBar
    const rightStart = Math.max(endBar, chord.startBar)
    const rightDuration = chordEnd - rightStart
    if (leftDuration > 0) fragments.push({ ...chord, durationBars: leftDuration })
    if (rightDuration > 0) {
      fragments.push({
        ...chord,
        id: freshId(chord.id, index),
        startBar: rightStart,
        durationBars: rightDuration
      })
    }
    return fragments
  })

  const generated = newRelativeChords.flatMap((chord) => {
    const relativeStart = Math.max(0, chord.startBar)
    const relativeEnd = Math.min(rangeBars, chord.startBar + chord.durationBars)
    const durationBars = relativeEnd - relativeStart
    if (durationBars <= 0) return []
    return [{ ...chord, startBar: startBar + relativeStart, durationBars }]
  })
  return [...preserved, ...generated].sort((a, b) => a.startBar - b.startBar)
}
