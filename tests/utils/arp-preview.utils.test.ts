import { describe, expect, it } from 'vitest'
import { ARP_PREVIEW_BAR_WIDTH_PX } from '../../src/config/ui-defaults'
import { calculateArpPreviewLayout, calculateArpTimeGrid } from '../../src/utils/arp/arp-preview.utils'
import type { ChordEvent } from '../../src/core/schemas/chord.schema'
import type { AppNote } from '../../src/core/schemas/note.schema'

describe('calculateArpTimeGrid', () => {
  const chord = (id: string, name: string, startBar: number, durationBars: number): ChordEvent => ({
    id,
    name,
    roman: '',
    notes: [],
    voicing: [],
    startBar,
    durationBars
  })

  it('places bar lines, beats and chord spans for a multi-bar range that starts mid-project', () => {
    const grid = calculateArpTimeGrid({ startStep: 16, endStep: 48 }, [
      chord('a', 'C', 0, 2),
      chord('b', 'G', 2, 2),
      chord('c', 'Am', 4, 1)
    ])

    expect(grid.bars).toEqual([
      { bar: 2, xPercent: 0, isBoundary: false },
      { bar: 3, xPercent: 50, isBoundary: true }
    ])
    expect(grid.beats).toEqual([12.5, 25, 37.5, 62.5, 75, 87.5])
    expect(grid.chords).toEqual([
      { id: 'a', name: 'C', xPercent: 0, widthPercent: 50 },
      { id: 'b', name: 'G', xPercent: 50, widthPercent: 50 }
    ])
    expect(grid.contentWidthPx).toBe(2 * ARP_PREVIEW_BAR_WIDTH_PX)
  })

  it('labels a partial first bar at the range start and clips chords to the range', () => {
    const grid = calculateArpTimeGrid({ startStep: 24, endStep: 40 }, [chord('a', 'C', 1, 2)])

    expect(grid.bars).toEqual([
      { bar: 2, xPercent: 0, isBoundary: false },
      { bar: 3, xPercent: 50, isBoundary: true }
    ])
    expect(grid.chords).toEqual([{ id: 'a', name: 'C', xPercent: 0, widthPercent: 100 }])
  })

  it('returns no chord spans without chords', () => {
    expect(calculateArpTimeGrid({ startStep: 0, endStep: 16 }, undefined).chords).toEqual([])
  })
})

describe('calculateArpPreviewLayout', () => {
  const sampleNotes: AppNote[] = [
    { id: '1', pitch: 'C3', midi: 48, step: 0, durationSteps: 2, velocity: 100, isMuted: false },
    { id: '2', pitch: 'E3', midi: 52, step: 2, durationSteps: 2, velocity: 100, isMuted: false },
    { id: '3', pitch: 'G3', midi: 55, step: 4, durationSteps: 2, velocity: 100, isMuted: false },
    { id: '4', pitch: 'C4', midi: 60, step: 6, durationSteps: 2, velocity: 100, isMuted: false }
  ]

  it('generates octave lanes matching octaveRange and baseOctave', () => {
    const { lanes } = calculateArpPreviewLayout(sampleNotes, 3, 2, 16, 0)
    expect(lanes).toHaveLength(2)
    expect(lanes[0].label).toBe('C4')
    expect(lanes[1].label).toBe('C3')
  })

  it('calculates monotonic x positions for ascending steps', () => {
    const { notes } = calculateArpPreviewLayout(sampleNotes, 3, 2, 16, 0)
    expect(notes).toHaveLength(4)
    expect(notes[0].xPercent).toBe(0)
    expect(notes[1].xPercent).toBe(12.5) // 2 / 16 * 100
    expect(notes[2].xPercent).toBe(25) // 4 / 16 * 100
    expect(notes[3].xPercent).toBe(37.5) // 6 / 16 * 100
  })

  it('places higher pitch notes higher vertically (smaller yPercent)', () => {
    const { notes } = calculateArpPreviewLayout(sampleNotes, 3, 2, 16, 0)
    // C3 (48) vs C4 (60)
    expect(notes[3].yPercent).toBeLessThan(notes[0].yPercent)
  })

  it('clamps octave bounds safely', () => {
    const { lanes } = calculateArpPreviewLayout([], 0, 10, 16, 0)
    expect(lanes).toHaveLength(4) // max range 4
    expect(lanes[lanes.length - 1].label).toBe('C1') // min base 1
  })

  it('flags notes with isChordTone predicate or defaults to true', () => {
    const { notes: defaultNotes } = calculateArpPreviewLayout(sampleNotes, 3, 2, 16, 0)
    expect(defaultNotes.every((n) => n.isChordTone)).toBe(true)

    const { notes: customNotes } = calculateArpPreviewLayout(sampleNotes, 3, 2, 16, 0, (note) => note.midi === 48)
    expect(customNotes[0].isChordTone).toBe(true)
    expect(customNotes[1].isChordTone).toBe(false)
  })

  it('preserves note velocity in visual note layout', () => {
    const notesWithDynamics: AppNote[] = [
      { id: '1', pitch: 'C3', midi: 48, step: 0, durationSteps: 2, velocity: 118, isMuted: false },
      { id: '2', pitch: 'E3', midi: 52, step: 2, durationSteps: 2, velocity: 71, isMuted: false }
    ]
    const { notes } = calculateArpPreviewLayout(notesWithDynamics, 3, 2, 16, 0)
    expect(notes[0].velocity).toBe(118)
    expect(notes[1].velocity).toBe(71)
  })
})
