import type { ChordEvent } from '@/core/schemas/chord.schema'
import { chordNoteKey, parseChordNoteKey } from '@/core/schemas/chord.schema'
import {
  MIN_CHORD_DURATION_BARS,
  deriveChordIdentity,
  resolveChordOverlaps,
  type DiatonicChord
} from '@/core/theory/chord.engine'
import { midiToPitch, pitchToMidi, snapMidiToScale, transposeMidiInScale } from '@/core/theory/scale.engine'
import { midiToPixelY, stepToPixelX } from './geometry'
import type { TransformOptions } from './noteOps'

export { chordNoteKey, parseChordNoteKey }

export type ChordHitZone = 'note' | 'block' | 'resize-end' | 'outside'

export interface ChordHitResult {
  chord: ChordEvent | null
  /** Index into chord.voicing; -1 when the hit was not on a voicing note rect */
  noteIndex: number
  zone: ChordHitZone
}

export interface ChordDragOptions {
  totalBars: number
}

export function chordStepRange(chord: ChordEvent, stepsPerBar: number): { startStep: number; endStep: number } {
  return {
    startStep: chord.startBar * stepsPerBar,
    endStep: (chord.startBar + chord.durationBars) * stepsPerBar
  }
}

/**
 * Hit-tests chord voicing note rects and chord block bodies at a pixel position.
 * Resize-end (right block edge) takes priority over note and block zones.
 */
export function getChordHitAtPixel(
  pixelX: number,
  pixelY: number,
  chords: ChordEvent[],
  options: TransformOptions,
  stepsPerBar: number
): ChordHitResult {
  const handleW = options.resizeHandleWidth ?? 8

  for (let i = chords.length - 1; i >= 0; i--) {
    const chord = chords[i]
    const { startStep, endStep } = chordStepRange(chord, stepsPerBar)
    const x = stepToPixelX(startStep, options.stepWidth, options.scrollX, options.keyboardWidth)
    const w = Math.max(6, (endStep - startStep) * options.stepWidth)
    if (pixelX < x || pixelX > x + w) continue

    const midis = chord.voicing.map((p) => pitchToMidi(p))
    if (midis.length === 0) continue

    const topMidi = Math.max(...midis)
    const bottomMidi = Math.min(...midis)
    const blockTopY = midiToPixelY(topMidi, options.rowHeight, options.scrollY, options.maxMidi)
    const blockBottomY =
      midiToPixelY(bottomMidi, options.rowHeight, options.scrollY, options.maxMidi) + options.rowHeight

    const insideBlock = pixelY >= blockTopY && pixelY <= blockBottomY
    if (pixelX >= x + w - handleW) {
      if (insideBlock) {
        return { chord, noteIndex: -1, zone: 'resize-end' }
      }
      continue
    }

    for (let n = 0; n < midis.length; n++) {
      const noteY = midiToPixelY(midis[n], options.rowHeight, options.scrollY, options.maxMidi)
      if (pixelY >= noteY && pixelY <= noteY + options.rowHeight - 2) {
        return { chord, noteIndex: n, zone: 'note' }
      }
    }

    if (insideBlock) {
      return { chord, noteIndex: -1, zone: 'block' }
    }
  }

  return { chord: null, noteIndex: -1, zone: 'outside' }
}

function roundBars(bars: number): number {
  return Math.round(bars * 10000) / 10000
}

/**
 * Quantizes a bar-space delta to a whole number of sequencer steps.
 */
export function quantizeDeltaBars(deltaBars: number, snapStep: number, stepsPerBar: number): number {
  if (snapStep <= 0 || stepsPerBar <= 0) return deltaBars
  const deltaSteps = deltaBars * stepsPerBar
  const snappedSteps = Math.round(deltaSteps / snapStep) * snapStep
  return snappedSteps / stepsPerBar
}

/**
 * Moves whole chords horizontally by a bar delta, preserving relative offsets and
 * clamping the group inside [0, totalBars].
 */
export function moveChordsByBars(
  chords: ChordEvent[],
  targetIds: string[],
  deltaBars: number,
  opts: ChordDragOptions
): ChordEvent[] {
  const targets = chords.filter((c) => targetIds.includes(c.id))
  if (targets.length === 0) return [...chords]

  const minStart = Math.min(...targets.map((c) => c.startBar))
  const maxEnd = Math.max(...targets.map((c) => c.startBar + c.durationBars))

  let effective = deltaBars
  if (minStart + effective < 0) {
    effective = -minStart
  }
  if (maxEnd + effective > opts.totalBars) {
    effective = Math.max(-minStart, opts.totalBars - maxEnd)
  }

  return chords.map((c) => (targetIds.includes(c.id) ? { ...c, startBar: roundBars(c.startBar + effective) } : c))
}

export interface TransposeWholeChordsOptions {
  scaleLock?: {
    isLocked: boolean
    rootKey: string
    scale: string
  }
}

/**
 * Transposes whole chords vertically by a delta of semitones.
 * Preserves voicing intervals across the group, clamping to [0, 127].
 * When scale lock is enabled, each resulting pitch is snapped to the active scale.
 */
export function transposeWholeChords(
  chords: ChordEvent[],
  targetIds: string[],
  deltaSemitones: number,
  options?: TransposeWholeChordsOptions
): ChordEvent[] {
  if (deltaSemitones === 0 || targetIds.length === 0) return [...chords]
  const targets = chords.filter((c) => targetIds.includes(c.id))
  if (targets.length === 0) return [...chords]

  const allMidis = targets.flatMap((c) => c.voicing.map((p) => pitchToMidi(p)))
  if (allMidis.length === 0) return [...chords]

  const minMidi = Math.min(...allMidis)
  const maxMidi = Math.max(...allMidis)

  let effective = deltaSemitones
  if (minMidi + effective < 0) {
    effective = -minMidi
  }
  if (maxMidi + effective > 127) {
    effective = 127 - maxMidi
  }

  if (effective === 0) return [...chords]

  const scaleLock = options?.scaleLock

  return chords.map((c) => {
    if (!targetIds.includes(c.id)) return c
    const midis = c.voicing.map((p) => pitchToMidi(p) + effective)

    const processedMidis = scaleLock?.isLocked
      ? midis.map((m) => snapMidiToScale(m, scaleLock.rootKey, scaleLock.scale))
      : midis

    const uniqueSortedMidis = Array.from(new Set(processedMidis)).sort((a, b) => a - b)
    const finalMidis = uniqueSortedMidis.length > 0 ? uniqueSortedMidis : midis
    const newVoicing = finalMidis.map((m) => midiToPitch(m))

    return { ...c, voicing: newVoicing }
  })
}

/**
 * Resizes one chord's duration in bar space, honoring the minimum chord duration
 * and the project end.
 */
export function resizeChordByBars(
  chords: ChordEvent[],
  targetId: string,
  deltaBars: number,
  opts: ChordDragOptions
): ChordEvent[] {
  return chords.map((c) => {
    if (c.id !== targetId) return c
    const maxDuration = Math.max(MIN_CHORD_DURATION_BARS, opts.totalBars - c.startBar)
    const snapped = Math.round((c.durationBars + deltaBars) / MIN_CHORD_DURATION_BARS) * MIN_CHORD_DURATION_BARS
    const duration = Math.max(MIN_CHORD_DURATION_BARS, Math.min(maxDuration, roundBars(snapped)))
    return { ...c, durationBars: duration }
  })
}

/**
 * Sets an absolute duration (bar space) for one chord.
 */
export function setChordDurationBars(
  chords: ChordEvent[],
  targetId: string,
  durationBars: number,
  opts: ChordDragOptions
): ChordEvent[] {
  return chords.map((c) => {
    if (c.id !== targetId) return c
    const maxDuration = Math.max(MIN_CHORD_DURATION_BARS, opts.totalBars - c.startBar)
    const snapped = Math.round(durationBars / MIN_CHORD_DURATION_BARS) * MIN_CHORD_DURATION_BARS
    const duration = Math.max(MIN_CHORD_DURATION_BARS, Math.min(maxDuration, roundBars(snapped)))
    return { ...c, durationBars: duration }
  })
}

/**
 * Sets a chord's duration and automatically realigns subsequent sequential chords in time,
 * maintaining a contiguous timeline progression without gaps or overlaps.
 */
export function realignChordsAfterDurationChange(
  chords: ChordEvent[],
  targetId: string,
  durationBars: number,
  opts: ChordDragOptions
): ChordEvent[] {
  const targetIndex = chords.findIndex((c) => c.id === targetId)
  if (targetIndex === -1) {
    return [...chords]
  }

  const targetChord = chords[targetIndex]
  const maxDuration = Math.max(MIN_CHORD_DURATION_BARS, opts.totalBars - targetChord.startBar)
  const snapped = Math.round(durationBars / MIN_CHORD_DURATION_BARS) * MIN_CHORD_DURATION_BARS
  const clampedDuration = Math.max(MIN_CHORD_DURATION_BARS, Math.min(maxDuration, roundBars(snapped)))

  const result: ChordEvent[] = []

  // Preceding chords stay untouched
  for (let i = 0; i < targetIndex; i++) {
    result.push({ ...chords[i] })
  }

  // Target chord updated
  const updatedTarget: ChordEvent = {
    ...targetChord,
    durationBars: clampedDuration
  }
  result.push(updatedTarget)

  // Subsequent chords are shifted so each starts where the previous ends
  let currentStartBar = updatedTarget.startBar + updatedTarget.durationBars

  for (let i = targetIndex + 1; i < chords.length; i++) {
    const chord = chords[i]
    if (currentStartBar >= opts.totalBars) {
      result.push({
        ...chord,
        startBar: opts.totalBars - MIN_CHORD_DURATION_BARS,
        durationBars: MIN_CHORD_DURATION_BARS
      })
    } else {
      const remainingBars = opts.totalBars - currentStartBar
      const chordDuration = Math.max(MIN_CHORD_DURATION_BARS, Math.min(chord.durationBars, roundBars(remainingBars)))
      result.push({
        ...chord,
        startBar: roundBars(currentStartBar),
        durationBars: chordDuration
      })
      currentStartBar += chordDuration
    }
  }

  return result
}

/**
 * Swaps a chord with its predecessor ('up') or successor ('down') in the timeline,
 * then sequentially recalculates startBar positions starting from Bar 0.
 */
export function reorderChordInProgression(
  chords: ChordEvent[],
  chordId: string,
  direction: 'up' | 'down'
): ChordEvent[] {
  const index = chords.findIndex((c) => c.id === chordId)
  if (index === -1) return [...chords]

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= chords.length) {
    return [...chords]
  }

  const reordered = [...chords]
  const temp = reordered[index]
  reordered[index] = reordered[targetIndex]
  reordered[targetIndex] = temp

  // Re-anchor sequential startBars from Bar 0
  let currentStart = 0
  return reordered.map((chord) => {
    const updated = {
      ...chord,
      startBar: roundBars(currentStart)
    }
    currentStart += chord.durationBars
    return updated
  })
}

/**
 * Transposes a single voicing note of one chord to an absolute MIDI pitch (preview only;
 * identity re-derivation happens on commit).
 */
export function setChordVoicingPitch(
  chords: ChordEvent[],
  chordId: string,
  noteIndex: number,
  midi: number
): ChordEvent[] {
  const clamped = Math.max(0, Math.min(127, Math.round(midi)))
  return chords.map((c) => {
    if (c.id !== chordId || noteIndex < 0 || noteIndex >= c.voicing.length) return c
    const voicing = [...c.voicing]
    voicing[noteIndex] = midiToPitch(clamped)
    return { ...c, voicing }
  })
}

export function findChordAtStep(step: number, chords: ChordEvent[], stepsPerBar: number): ChordEvent | null {
  for (const c of chords) {
    const { startStep, endStep } = chordStepRange(c, stepsPerBar)
    if (step >= startStep && step < endStep) {
      return c
    }
  }
  return null
}

export function addChordVoicingNote(chords: ChordEvent[], chordId: string, pitch: string): ChordEvent[] {
  return chords.map((c) => {
    if (c.id !== chordId) return c
    if (c.voicing.includes(pitch)) return c
    const voicing = [...c.voicing, pitch].sort((a, b) => pitchToMidi(a) - pitchToMidi(b))
    return { ...c, voicing }
  })
}

/**
 * Removes a voicing note; a chord without remaining notes is dropped entirely.
 */
export function removeChordVoicingNoteAt(chords: ChordEvent[], chordId: string, noteIndex: number): ChordEvent[] {
  const result: ChordEvent[] = []
  for (const c of chords) {
    if (c.id !== chordId) {
      result.push(c)
      continue
    }
    const voicing = c.voicing.filter((_, i) => i !== noteIndex)
    if (voicing.length > 0) {
      result.push({ ...c, voicing })
    }
  }
  return result
}

/**
 * Creates a full ChordEvent (with a fresh UUID and absolute start clamped inside the project)
 * from step-space draw coordinates. Name/roman are placeholders until commit-time renaming.
 * Rejects positions where less than the minimum chord duration remains before the project end.
 */
export function createChordDraft(
  startBar: number,
  durationBars: number,
  firstPitch: string,
  opts: ChordDragOptions
): ChordEvent | null {
  const clampedStart = roundBars(Math.max(0, startBar))
  if (opts.totalBars - clampedStart < MIN_CHORD_DURATION_BARS) return null

  const snappedDuration = Math.max(
    MIN_CHORD_DURATION_BARS,
    Math.round(durationBars / MIN_CHORD_DURATION_BARS) * MIN_CHORD_DURATION_BARS
  )
  const clampedDuration = roundBars(Math.min(snappedDuration, opts.totalBars - clampedStart))

  return {
    id: crypto.randomUUID(),
    name: firstPitch,
    roman: '–',
    notes: [firstPitch],
    voicing: [firstPitch],
    startBar: clampedStart,
    durationBars: clampedDuration,
    inversion: 0
  }
}

/**
 * Finalizes a drag/draw gesture: resolves time overlaps between chords and sorts the
 * timeline by start bar so playback scheduling and rendering stay deterministic.
 */
export function finalizeChords(chords: ChordEvent[]): ChordEvent[] {
  return resolveChordOverlaps(chords)
}

export interface CloneChordsResult {
  clonedChords: ChordEvent[]
  newKeys: string[]
}

/**
 * Clones selected chords shifted by their total time span (at least 0.25 bars).
 */
export function cloneChords(chords: ChordEvent[], selectedNoteKeys: string[], totalBars: number): CloneChordsResult {
  if (selectedNoteKeys.length === 0) return { clonedChords: [], newKeys: [] }

  const selectedChordIds = new Set<string>()
  for (const key of selectedNoteKeys) {
    const parsed = parseChordNoteKey(key)
    if (parsed) selectedChordIds.add(parsed.chordId)
  }

  const targets = chords.filter((c) => selectedChordIds.has(c.id))
  if (targets.length === 0) return { clonedChords: [], newKeys: [] }

  const minStartBar = Math.min(...targets.map((c) => c.startBar))
  const maxEndBar = Math.max(...targets.map((c) => c.startBar + c.durationBars))
  const spanBars = maxEndBar - minStartBar
  const deltaBars = Math.max(0.25, spanBars)

  const clonedChords: ChordEvent[] = []
  const newKeys: string[] = []

  for (const c of targets) {
    const newStart = c.startBar + deltaBars
    if (newStart >= totalBars) continue

    const duration = Math.min(c.durationBars, totalBars - newStart)
    if (duration < 0.25) continue

    const newId = crypto.randomUUID()
    const newChord: ChordEvent = {
      ...c,
      id: newId,
      startBar: newStart,
      durationBars: duration,
      voicing: [...c.voicing],
      notes: [...c.notes]
    }
    clonedChords.push(newChord)
    for (let i = 0; i < newChord.voicing.length; i++) {
      newKeys.push(chordNoteKey(newId, i))
    }
  }

  return { clonedChords, newKeys }
}

export interface TransposeChordVoicingsResult {
  nextChords: ChordEvent[]
  newSelectedKeys: string[]
  hasChanged: boolean
  firstTransposedChord: ChordEvent | null
  singleTransposedPitch: string | null
}

/**
 * Transposes targeted chord voicing notes, keeping them sorted ascending and clamped to [0, 127].
 */
export function transposeChordVoicings(
  chords: ChordEvent[],
  selectedKeys: string[],
  semitones: number,
  palette: DiatonicChord[],
  key: string,
  scale: string,
  options?: { isScaleLocked?: boolean }
): TransposeChordVoicingsResult {
  if (selectedKeys.length === 0 || semitones === 0) {
    return {
      nextChords: chords,
      newSelectedKeys: selectedKeys,
      hasChanged: false,
      firstTransposedChord: null,
      singleTransposedPitch: null
    }
  }

  const selectedIndicesByChord = new Map<string, Set<number>>()
  for (const k of selectedKeys) {
    const parsed = parseChordNoteKey(k)
    if (!parsed) continue
    let set = selectedIndicesByChord.get(parsed.chordId)
    if (!set) {
      set = new Set<number>()
      selectedIndicesByChord.set(parsed.chordId, set)
    }
    set.add(parsed.noteIndex)
  }

  if (selectedIndicesByChord.size === 0) {
    return {
      nextChords: chords,
      newSelectedKeys: selectedKeys,
      hasChanged: false,
      firstTransposedChord: null,
      singleTransposedPitch: null
    }
  }

  let anyChanged = false
  const newSelectedKeys: string[] = []

  const nextChords = chords.map((c) => {
    const selectedIndices = selectedIndicesByChord.get(c.id)
    if (!selectedIndices || selectedIndices.size === 0) return c

    const selectedMidis = Array.from(selectedIndices)
      .map((i) => (c.voicing[i] ? pitchToMidi(c.voicing[i]) : null))
      .filter((m): m is number => m !== null)

    if (selectedMidis.length === 0) return c

    const minMidi = Math.min(...selectedMidis)
    const maxMidi = Math.max(...selectedMidis)

    let effectiveSemitones = semitones
    if (minMidi + effectiveSemitones < 0) {
      effectiveSemitones = -minMidi
    }
    if (maxMidi + effectiveSemitones > 127) {
      effectiveSemitones = 127 - maxMidi
    }

    if (effectiveSemitones === 0) {
      for (const idx of selectedIndices) {
        if (idx < c.voicing.length) {
          newSelectedKeys.push(chordNoteKey(c.id, idx))
        }
      }
      return c
    }

    anyChanged = true

    interface VoicingItem {
      pitch: string
      midi: number
      isSelected: boolean
    }

    const isDiatonic = Boolean(options?.isScaleLocked && Math.abs(semitones) % 12 !== 0)

    const items: VoicingItem[] = c.voicing.map((pitch, idx) => {
      const isSel = selectedIndices.has(idx)
      const oldMidi = pitchToMidi(pitch)
      const newMidi = isSel
        ? isDiatonic
          ? transposeMidiInScale(oldMidi, semitones, key, scale)
          : Math.max(0, Math.min(127, oldMidi + effectiveSemitones))
        : oldMidi
      return {
        pitch: midiToPitch(newMidi),
        midi: newMidi,
        isSelected: isSel
      }
    })

    items.sort((a, b) => a.midi - b.midi)

    items.forEach((item, newIdx) => {
      if (item.isSelected) {
        newSelectedKeys.push(chordNoteKey(c.id, newIdx))
      }
    })

    const newVoicing = items.map((item) => item.pitch)
    const identity = deriveChordIdentity(newVoicing, palette, key, scale)

    return {
      ...c,
      voicing: newVoicing,
      ...identity
    }
  })

  if (!anyChanged) {
    return {
      nextChords: chords,
      newSelectedKeys: selectedKeys,
      hasChanged: false,
      firstTransposedChord: null,
      singleTransposedPitch: null
    }
  }

  const firstTransposedChord = nextChords.find((c) => selectedIndicesByChord.has(c.id)) ?? null
  let singleTransposedPitch: string | null = null
  if (firstTransposedChord) {
    const selCount = selectedIndicesByChord.get(firstTransposedChord.id)?.size ?? 0
    if (selCount === 1) {
      const selKey = newSelectedKeys.find((k) => k.startsWith(firstTransposedChord.id + ':'))
      const parsed = selKey ? parseChordNoteKey(selKey) : null
      singleTransposedPitch = parsed ? firstTransposedChord.voicing[parsed.noteIndex] : null
    }
  }

  return {
    nextChords,
    newSelectedKeys,
    hasChanged: true,
    firstTransposedChord,
    singleTransposedPitch
  }
}
