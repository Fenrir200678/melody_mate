import type { ChordEvent } from '@/core/schemas/chord.schema'
import type { AppNote } from '@/core/schemas/note.schema'
import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
import type { WorkRange } from '@/core/generator/work-range'
import { ARP_PREVIEW_BAR_WIDTH_PX } from '@/config/ui-defaults'

export interface ArpTimeGrid {
  bars: { bar: number; xPercent: number; isBoundary: boolean }[]
  beats: number[]
  chords: { id: string; name: string; xPercent: number; widthPercent: number }[]
  contentWidthPx: number
}

/**
 * Bar, beat and chord-span positions for a work range, in percent of the range width.
 * Ranges that do not start on a bar line keep their partial first bar labelled at x=0.
 */
export function calculateArpTimeGrid(range: WorkRange, chords: readonly ChordEvent[] | undefined): ArpTimeGrid {
  const total = Math.max(1, range.endStep - range.startStep)
  const percent = (step: number) => ((step - range.startStep) / total) * 100

  const bars: ArpTimeGrid['bars'] = []
  const lastBar = Math.ceil(range.endStep / STEPS_PER_BAR) - 1
  for (let bar = Math.floor(range.startStep / STEPS_PER_BAR); bar <= lastBar; bar++) {
    const barStart = bar * STEPS_PER_BAR
    bars.push({
      bar: bar + 1,
      xPercent: percent(Math.max(barStart, range.startStep)),
      isBoundary: barStart > range.startStep
    })
  }

  const beats: number[] = []
  const firstBeat = Math.ceil((range.startStep + 1) / 4) * 4
  for (let step = firstBeat; step < range.endStep; step += 4) {
    if (step % STEPS_PER_BAR !== 0) beats.push(percent(step))
  }

  const spans = (chords ?? []).flatMap((chord) => {
    const start = Math.max(range.startStep, chord.startBar * STEPS_PER_BAR)
    const end = Math.min(range.endStep, (chord.startBar + chord.durationBars) * STEPS_PER_BAR)
    return end > start
      ? [{ id: chord.id, name: chord.name, xPercent: percent(start), widthPercent: ((end - start) / total) * 100 }]
      : []
  })

  return {
    bars,
    beats,
    chords: spans,
    contentWidthPx: Math.round((total / STEPS_PER_BAR) * ARP_PREVIEW_BAR_WIDTH_PX)
  }
}

export interface ArpVisualNote {
  id: string
  step: number
  pitch: string
  midi: number
  velocity: number
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
  isChordTone: boolean
}

export interface ArpOctaveLane {
  octave: number
  label: string
  yPercent: number
  heightPercent: number
}

/** Vertical window for the preview: derived from the register knobs, or from the real chord voicing. */
export interface ArpPreviewRegister {
  lowestMidi: number
  lowestOctave: number
  octaveCount: number
}

/** Register window spanned by the base-octave/octave-range knobs (pitch-classes mode). */
export function arpRegisterFromOctaves(baseOctave: number, octaveRange: number): ArpPreviewRegister {
  const safeRange = Math.max(1, Math.min(4, Math.trunc(octaveRange)))
  const safeBase = Math.max(1, Math.min(6, Math.trunc(baseOctave)))
  return { lowestMidi: (safeBase + 1) * 12, lowestOctave: safeBase, octaveCount: safeRange }
}

/**
 * Calculates SVG percentage coordinates for notes in the arpeggio preview grid.
 */
export function calculateArpPreviewLayout(
  notes: readonly AppNote[],
  baseOctave: number,
  octaveRange: number,
  totalSteps = 16,
  startStep = 0,
  isChordTone?: (note: AppNote) => boolean,
  registerOverride?: ArpPreviewRegister
): {
  notes: ArpVisualNote[]
  lanes: ArpOctaveLane[]
} {
  const register = registerOverride ?? arpRegisterFromOctaves(baseOctave, octaveRange)
  const safeRange = register.octaveCount
  const lowestMidi = register.lowestMidi
  const totalSemitones = safeRange * 12
  const safeSteps = Math.max(4, totalSteps)

  const lanes: ArpOctaveLane[] = []
  const laneHeight = 100 / safeRange
  for (let i = 0; i < safeRange; i++) {
    const oct = register.lowestOctave + (safeRange - 1 - i)
    lanes.push({
      octave: oct,
      label: `C${oct}`,
      yPercent: i * laneHeight,
      heightPercent: laneHeight
    })
  }

  const visualNotes: ArpVisualNote[] = notes.map((note) => {
    const semitoneOffset = note.midi - lowestMidi
    const clampedOffset = Math.max(0, Math.min(totalSemitones - 1, semitoneOffset))
    const relPitch = (clampedOffset + 0.5) / totalSemitones

    const noteHeightPercent = Math.max(4, 90 / totalSemitones)
    const yPercent = Math.max(2, Math.min(98 - noteHeightPercent, (1 - relPitch) * 100 - noteHeightPercent / 2))

    const noteStart = note.step - startStep
    const xPercent = Math.max(0, Math.min(99, (noteStart / safeSteps) * 100))
    const rawWidth = (note.durationSteps / safeSteps) * 100
    const widthPercent = Math.max(2, rawWidth - 0.8)

    return {
      id: note.id,
      step: note.step,
      pitch: note.pitch,
      midi: note.midi,
      velocity: note.velocity,
      xPercent,
      yPercent,
      widthPercent,
      heightPercent: noteHeightPercent,
      isChordTone: isChordTone ? isChordTone(note) : true
    }
  })

  return { notes: visualNotes, lanes }
}
