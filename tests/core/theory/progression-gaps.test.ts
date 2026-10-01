import { describe, expect, it } from 'vitest'
import { MIN_GAP_DURATION_BARS } from '../../../src/config/defaults'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import {
  closeProgressionGaps,
  findProgressionGaps,
  hasProgressionGaps
} from '../../../src/core/theory/progression-gaps'

function chord(id: string, startBar: number, durationBars: number): ChordEvent {
  return {
    id,
    name: id,
    roman: 'I',
    notes: ['C', 'E', 'G'],
    voicing: ['C3', 'E3', 'G3'],
    startBar,
    durationBars
  }
}

describe('findProgressionGaps', () => {
  it('returns no gaps for an empty or seamlessly adjacent progression', () => {
    expect(findProgressionGaps([])).toEqual([])
    expect(findProgressionGaps([chord('a', 0, 1), chord('b', 1, 1), chord('c', 2, 1)])).toEqual([])
  })

  it('detects a beginning gap but excludes the trailing space', () => {
    expect(findProgressionGaps([chord('later', 1, 1)])).toEqual([{ id: 'gap-start-0', startBar: 0, durationBars: 1 }])
  })

  it('keeps precise interior gap boundaries', () => {
    const left = chord('left', 0, 0.5)
    const right = chord('right', 1, 1)

    expect(findProgressionGaps([right, left])).toEqual([{ id: 'gap-left-right', startBar: 0.5, durationBars: 0.5 }])
  })

  it('includes a gap exactly at the configured minimum duration', () => {
    const left = chord('left', 0, 0.5)
    const right = chord('right', 0.5 + MIN_GAP_DURATION_BARS, 1)

    expect(findProgressionGaps([left, right])).toEqual([
      { id: 'gap-left-right', startBar: 0.5, durationBars: MIN_GAP_DURATION_BARS }
    ])
  })

  it('uses a caller supplied minimum and ignores gaps below it', () => {
    const pair = [chord('left', 0, 0.5), chord('right', 0.75, 1)]

    expect(findProgressionGaps(pair, 0.25)).toEqual([{ id: 'gap-left-right', startBar: 0.5, durationBars: 0.25 }])
    expect(findProgressionGaps(pair, 0.250001)).toEqual([])
  })

  it('does not turn tiny floating point distances into qualifying gaps', () => {
    expect(findProgressionGaps([chord('left', 0, 0.5), chord('right', 0.5000000001, 1)])).toEqual([])
  })

  it('uses the furthest occupied end for unsorted, overlapping and nested chords', () => {
    const input = [chord('nested', 0.5, 0.25), chord('right', 2, 1), chord('wide', 0, 1.5), chord('overlap', 1, 0.75)]
    const original = [...input]

    expect(findProgressionGaps(input, 0.25)).toEqual([{ id: 'gap-overlap-right', startBar: 1.75, durationBars: 0.25 }])
    expect(input).toEqual(original)
    expect(input.map(({ id }) => id)).toEqual(['nested', 'right', 'wide', 'overlap'])
  })

  it('produces stable IDs for the same gap boundaries', () => {
    const chords = [chord('left', 0, 0.5), chord('right', 1, 1)]
    const tiedEnds = [chord('z-wide', 0, 1), chord('a-wide', 0.25, 0.75), chord('next', 1.5, 1)]

    expect(findProgressionGaps(chords)).toEqual(findProgressionGaps(chords))
    expect(findProgressionGaps(chords)[0]?.id).toBe('gap-left-right')
    expect(findProgressionGaps(tiedEnds)).toEqual(findProgressionGaps([...tiedEnds].reverse()))
  })
})

describe('closeProgressionGaps', () => {
  it('returns an empty progression for empty input', () => {
    expect(closeProgressionGaps([])).toEqual([])
  })
  it('sorts chronologically and packs chords from bar zero without mutating inputs', () => {
    const late = chord('late', 2, 1)
    const early = chord('early', 0.5, 0.5)
    const input = [late, early]

    const result = closeProgressionGaps(input)

    expect(result.map(({ id, startBar }) => ({ id, startBar }))).toEqual([
      { id: 'early', startBar: 0 },
      { id: 'late', startBar: 0.5 }
    ])
    expect(input.map(({ id, startBar }) => ({ id, startBar }))).toEqual([
      { id: 'late', startBar: 2 },
      { id: 'early', startBar: 0.5 }
    ])
    expect(result[0]).not.toBe(early)
    expect(result[1]).not.toBe(late)
  })

  it('keeps contiguous chords aligned and preserves fractional durations', () => {
    const input = [chord('a', 0, 0.375), chord('b', 0.375, 0.625), chord('c', 1, 0.25)]

    expect(closeProgressionGaps(input).map(({ startBar }) => startBar)).toEqual([0, 0.375, 1])
  })
})

describe('hasProgressionGaps', () => {
  it('reports only qualifying leading or interior gaps', () => {
    expect(hasProgressionGaps([])).toBe(false)
    expect(hasProgressionGaps([chord('later', 1, 1)])).toBe(true)
    expect(hasProgressionGaps([chord('a', 0, 1), chord('b', 1, 1)])).toBe(false)
    expect(hasProgressionGaps([chord('a', 0, 1), chord('b', 1 + MIN_GAP_DURATION_BARS, 1)])).toBe(true)
  })
})
