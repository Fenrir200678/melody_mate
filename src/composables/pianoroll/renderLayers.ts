import { Note } from 'tonal'
import type { WorkRange } from '@/core/generator/work-range'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import { chordNoteKey } from '@/core/schemas/chord.schema'
import type { AppNote } from '@/core/schemas/note.schema'
import { isNoteInScale, midiToPitch, pitchToMidi } from '@/core/theory/scale.engine'
import { isNoteInViewport, midiToPixelY, stepToPixelX, type ViewportBounds } from './geometry'

// Voicing pitch -> MIDI resolution happens for every chord note on every drawn frame,
// so parse results are memoized (bounded by the finite pitch-name space).
const pitchMidiCache = new Map<string, number>()

function cachedPitchToMidi(pitch: string): number {
  let midi = pitchMidiCache.get(pitch)
  if (midi === undefined) {
    midi = pitchToMidi(pitch)
    pitchMidiCache.set(pitch, midi)
  }
  return midi
}

export interface RenderTransform {
  width: number
  height: number
  stepWidth: number
  rowHeight: number
  scrollX: number
  scrollY: number
  keyboardWidth: number
  minMidi: number
  maxMidi: number
}

/**
 * Immutable per-frame snapshot of everything the canvas layers need. Built once by
 * the render pipeline so individual layer functions stay pure and side-effect free
 * (apart from their canvas draw calls).
 */
export interface RenderContext {
  ctx: CanvasRenderingContext2D
  t: RenderTransform
  bounds: ViewportBounds
  notes: AppNote[]
  chords: ChordEvent[]
  rootKey: string
  scale: string
  rootPc: string
  bars: number
  totalProjectSteps: number
  stepsPerBar: number
  activeTrack: 'melody' | 'chords'
  isProjectShorterThanScreen: boolean
  projectEndX: number
  isPlaying: boolean
  playheadStep: number
  selectedIds: string[]
  selectedChordNoteIds: string[]
  isScaleLocked: boolean
  dragNotes: AppNote[]
  dragChords: ChordEvent[]
  lassoRect: { x: number; y: number; width: number; height: number } | null
  flashedKeyMidi: number | null
  workRange?: WorkRange
  loopStartStep?: number
  loopEndStep?: number
  isLooping?: boolean
  sectionLetters?: string[]
}

/**
 * Layer 1 & 2: Background, chromatic rows with scale highlighting, bar shading and the step grid.
 */
export function drawGridLayer(rc: RenderContext): void {
  const { ctx, t } = rc
  const { width, height, stepWidth, rowHeight, scrollX, scrollY, keyboardWidth, minMidi, maxMidi } = t

  ctx.fillStyle = '#0b0c0f'
  ctx.fillRect(0, 0, width, height)

  // Render chromatic rows
  for (let midi = maxMidi; midi >= minMidi; midi--) {
    const y = midiToPixelY(midi, rowHeight, scrollY, maxMidi)
    if (y + rowHeight < 0 || y > height) continue

    const pitch = midiToPitch(midi)
    const inScale = isNoteInScale(pitch, rc.rootKey, rc.scale)

    // Scale rows read slightly brighter/cooler so the active scale is highlighted on the grid;
    // non-scale rows recede. With Scale Lock on, an amber wash flags them as out-of-key / non-editable.
    if (inScale) {
      ctx.fillStyle = '#1c2029'
    } else {
      ctx.fillStyle = rc.isScaleLocked ? 'color-mix(in oklab, #e0a34a 15%, transparent)' : '#101115'
    }
    ctx.fillRect(keyboardWidth, y, width - keyboardWidth, rowHeight)

    // Row divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(keyboardWidth, y + rowHeight)
    ctx.lineTo(width, y + rowHeight)
    ctx.stroke()

    // Tonic / Root pitch guideline (fine 1px line)
    if (Note.pitchClass(pitch) === rc.rootPc) {
      ctx.strokeStyle = 'rgba(91, 141, 255, 0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(keyboardWidth, y + rowHeight)
      ctx.lineTo(width, y + rowHeight)
      ctx.stroke()
    }
  }

  // Inactive overlay beyond project bars when shorter than screen
  if (rc.isProjectShorterThanScreen && rc.projectEndX < width) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
    ctx.fillRect(rc.projectEndX, 0, width - rc.projectEndX, height)
  }

  // Alternating bar shading
  for (let bar = 0; bar < rc.bars; bar++) {
    if (bar % 2 === 1 && !(rc.activeTrack === 'melody' && rc.sectionLetters?.[bar])) {
      const barStartX = stepToPixelX(bar * 16, stepWidth, scrollX, keyboardWidth)
      const barW = 16 * stepWidth
      const clampedX = Math.max(keyboardWidth, barStartX)
      const clampedW = barW - (clampedX - barStartX)
      if (clampedW > 0 && clampedX < width) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.015)'
        ctx.fillRect(clampedX, 0, clampedW, height)
      }
    }
  }

  // Vertical grid step / beat / bar lines
  const firstVisibleStep = Math.max(0, Math.floor(rc.bounds.startStep))
  const lastVisibleStep = rc.isProjectShorterThanScreen
    ? Math.ceil(rc.bounds.endStep)
    : Math.min(rc.totalProjectSteps, Math.ceil(rc.bounds.endStep))

  for (let step = firstVisibleStep; step <= lastVisibleStep; step++) {
    const x = Math.round(stepToPixelX(step, stepWidth, scrollX, keyboardWidth)) + 0.5
    if (x < keyboardWidth || x > width) continue

    const isBeyondProject = step > rc.totalProjectSteps

    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)

    if (step % 16 === 0) {
      ctx.strokeStyle = isBeyondProject ? 'rgba(255, 255, 255, 0.04)' : '#2a2c33' // Heavy bar line
      ctx.lineWidth = 1.5
    } else if (step % 4 === 0) {
      ctx.strokeStyle = isBeyondProject ? 'rgba(255, 255, 255, 0.025)' : 'rgba(255, 255, 255, 0.07)' // Quarter beat line
      ctx.lineWidth = 1
    } else {
      ctx.strokeStyle = isBeyondProject ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.03)' // 16th step line
      ctx.lineWidth = 1
    }
    ctx.stroke()
  }

  // Distinct project end boundary marker if project ends before screen edge
  if (rc.isProjectShorterThanScreen && rc.projectEndX >= keyboardWidth && rc.projectEndX <= width) {
    ctx.save()
    ctx.strokeStyle = '#4a5061'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(rc.projectEndX, 0)
    ctx.lineTo(rc.projectEndX, height)
    ctx.stroke()
    ctx.restore()
  }
}

/**
 * Layer 3: Ghost chord note rectangles underneath the melody grid area (clipped to the track).
 */
export function drawGhostChordLayer(rc: RenderContext): void {
  const { ctx, t } = rc
  const { height, stepWidth, rowHeight, scrollX, scrollY, keyboardWidth, maxMidi } = t

  ctx.save()
  ctx.beginPath()
  ctx.rect(keyboardWidth, 0, t.width - keyboardWidth, height)
  ctx.clip()

  for (const chord of rc.chords) {
    const chordStartStep = chord.startBar * rc.stepsPerBar
    const chordDurationSteps = chord.durationBars * rc.stepsPerBar
    const chordEndStep = chordStartStep + chordDurationSteps
    if (chordEndStep < rc.bounds.startStep || chordStartStep > rc.bounds.endStep) continue

    for (const chordNoteStr of chord.voicing) {
      const midi = cachedPitchToMidi(chordNoteStr)
      if (midi < rc.bounds.minMidi || midi > rc.bounds.maxMidi) continue

      const x = stepToPixelX(chordStartStep, stepWidth, scrollX, keyboardWidth)
      const w = chordDurationSteps * stepWidth
      const y = midiToPixelY(midi, rowHeight, scrollY, maxMidi)
      const h = rowHeight

      ctx.fillStyle = 'rgba(155, 107, 255, 0.22)'
      ctx.strokeStyle = 'rgba(155, 107, 255, 0.4)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(x + 1, y + 1, Math.max(4, w - 2), h - 2, 3)
      ctx.fill()
      ctx.stroke()

      if (w > 28) {
        ctx.fillStyle = 'rgba(233, 234, 238, 0.6)'
        ctx.font = '9px Geist Mono, monospace'
        ctx.fillText(chordNoteStr, x + 4, y + h - 4)
      }
    }
  }
  ctx.restore()
}

/**
 * Layer 4: Melody notes, drag preview ghosts and the marquee lasso box (clipped to the track).
 */
export function drawNotesLayer(rc: RenderContext): void {
  const { ctx, t } = rc
  const { width, height, stepWidth, rowHeight, scrollX, scrollY, keyboardWidth, maxMidi } = t

  ctx.save()
  ctx.beginPath()
  ctx.rect(keyboardWidth, 0, width - keyboardWidth, height)
  ctx.clip()

  const dragNoteIds = new Set(rc.dragNotes.map((n) => n.id))

  for (const note of rc.notes) {
    if (!isNoteInViewport(note, rc.bounds)) continue

    const x = stepToPixelX(note.step, stepWidth, scrollX, keyboardWidth)
    const w = Math.max(3, note.durationSteps * stepWidth - 1)
    const y = midiToPixelY(note.midi, rowHeight, scrollY, maxMidi)
    const h = rowHeight - 2

    const isNotePlaying =
      !note.isMuted && rc.isPlaying && rc.playheadStep >= note.step && rc.playheadStep < note.step + note.durationSteps
    const isSelected = rc.selectedIds.includes(note.id)
    const isBeingDragged = dragNoteIds.has(note.id)
    const inScale = isNoteInScale(note.pitch, rc.rootKey, rc.scale)

    // Ghost original note with lower opacity while dragging/resizing
    const alpha = isBeingDragged ? 0.22 : Math.max(0.35, Math.min(1.0, note.velocity / 127))
    const baseRgb = inScale ? '91, 141, 255' : '245, 158, 11'
    const selectColor = inScale ? '#7ca5ff' : '#fbbf24'
    const glowColor = inScale ? 'rgba(91, 141, 255, 0.75)' : 'rgba(245, 158, 11, 0.75)'

    // Muted notes render hollow (almost transparent fill) with clear boundary lines
    const fillColor = note.isMuted
      ? isSelected
        ? isBeingDragged
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(255, 255, 255, 0.1)'
        : `rgba(${baseRgb}, 0.08)`
      : isSelected
        ? isBeingDragged
          ? inScale
            ? 'rgba(124, 165, 255, 0.3)'
            : 'rgba(251, 191, 36, 0.3)'
          : selectColor
        : `rgba(${baseRgb}, ${alpha})`

    if (isNotePlaying) {
      ctx.save()
      ctx.shadowBlur = 10
      ctx.shadowColor = glowColor
      ctx.fillStyle = selectColor
      ctx.beginPath()
      ctx.roundRect(x, y + 1, w, h, 3)
      ctx.fill()
      ctx.restore()
    } else {
      ctx.fillStyle = fillColor
      ctx.beginPath()
      ctx.roundRect(x, y + 1, w, h, 3)
      ctx.fill()
    }

    ctx.strokeStyle = isSelected
      ? '#ffffff'
      : note.isMuted
        ? inScale
          ? 'rgba(91, 141, 255, 0.45)'
          : 'rgba(245, 158, 11, 0.45)'
        : inScale
          ? 'rgba(255, 255, 255, 0.22)'
          : 'rgba(251, 191, 36, 0.65)'
    ctx.lineWidth = isSelected ? 1.5 : 1
    ctx.beginPath()
    ctx.roundRect(x, y + 1, w, h, 3)
    ctx.stroke()

    if (w > 22) {
      ctx.fillStyle = note.isMuted
        ? 'rgba(255, 255, 255, 0.4)'
        : isBeingDragged
          ? 'rgba(255, 255, 255, 0.5)'
          : '#ffffff'
      ctx.font = '10px Geist Mono, monospace'
      ctx.textBaseline = 'middle'
      ctx.fillText(note.pitch, x + 4, y + 1 + h / 2)
    }
  }

  // Render Drag Preview / Ghost Notes
  for (const note of rc.dragNotes) {
    if (!isNoteInViewport(note, rc.bounds)) continue

    const x = stepToPixelX(note.step, stepWidth, scrollX, keyboardWidth)
    const w = Math.max(3, note.durationSteps * stepWidth - 1)
    const y = midiToPixelY(note.midi, rowHeight, scrollY, maxMidi)
    const h = rowHeight - 2
    const inScale = isNoteInScale(note.pitch, rc.rootKey, rc.scale)

    const selectColor = inScale ? '#7ca5ff' : '#fbbf24'
    const glowColor = inScale ? 'rgba(91, 141, 255, 0.65)' : 'rgba(245, 158, 11, 0.65)'

    ctx.save()
    ctx.shadowBlur = 8
    ctx.shadowColor = glowColor
    ctx.fillStyle = selectColor
    ctx.beginPath()
    ctx.roundRect(x, y + 1, w, h, 3)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()

    if (w > 22) {
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px Geist Mono, monospace'
      ctx.textBaseline = 'middle'
      ctx.fillText(note.pitch, x + 4, y + 1 + h / 2)
    }
  }

  // Render Marquee Lasso Selection Box
  drawLassoOverlay(rc)
  ctx.restore()
}

function drawLassoOverlay(rc: RenderContext): void {
  const lassoRect = rc.lassoRect
  if (!lassoRect || lassoRect.width <= 0 || lassoRect.height <= 0) return

  const { ctx } = rc
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.fillRect(lassoRect.x, lassoRect.y, lassoRect.width, lassoRect.height)
  ctx.strokeRect(lassoRect.x + 0.5, lassoRect.y + 0.5, lassoRect.width, lassoRect.height)
  ctx.restore()
}

/**
 * Chord track mode: melody notes rendered as a semi-transparent ghost layer
 * underneath the editable chord notes.
 */
export function drawGhostNotesLayer(rc: RenderContext): void {
  const { ctx, t } = rc
  const { width, height, stepWidth, rowHeight, scrollX, scrollY, keyboardWidth, maxMidi } = t

  ctx.save()
  ctx.beginPath()
  ctx.rect(keyboardWidth, 0, width - keyboardWidth, height)
  ctx.clip()

  for (const note of rc.notes) {
    if (!isNoteInViewport(note, rc.bounds)) continue

    const x = stepToPixelX(note.step, stepWidth, scrollX, keyboardWidth)
    const w = Math.max(3, note.durationSteps * stepWidth - 1)
    const y = midiToPixelY(note.midi, rowHeight, scrollY, maxMidi)
    const h = rowHeight - 2

    ctx.fillStyle = note.isMuted ? 'rgba(91, 141, 255, 0.1)' : 'rgba(91, 141, 255, 0.2)'
    ctx.beginPath()
    ctx.roundRect(x, y + 1, w, h, 3)
    ctx.fill()

    ctx.strokeStyle = 'rgba(91, 141, 255, 0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x, y + 1, w, h, 3)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Chord track mode: editable voicing note rectangles plus chord block boundaries
 * with name labels. Dragged chords render as glowing previews.
 */
export function drawChordNotesLayer(rc: RenderContext): void {
  const { ctx, t } = rc
  const { width, height, stepWidth, rowHeight, scrollX, scrollY, keyboardWidth, maxMidi } = t

  ctx.save()
  ctx.beginPath()
  ctx.rect(keyboardWidth, 0, width - keyboardWidth, height)
  ctx.clip()

  // Preview replacements win over the committed chord of the same id; skip the merge
  // allocations entirely while no chord drag is active (the common per-frame case).
  let renderChords: ChordEvent[] = rc.chords
  let dragChordIds: Set<string> | null = null
  if (rc.dragChords.length > 0) {
    const ids = new Set(rc.dragChords.map((c) => c.id))
    dragChordIds = ids
    renderChords = [...rc.chords.filter((c) => !ids.has(c.id)), ...rc.dragChords]
  }
  const selectedSet = rc.selectedChordNoteIds.length === 0 ? null : new Set(rc.selectedChordNoteIds)

  for (const chord of renderChords) {
    const chordStartStep = chord.startBar * rc.stepsPerBar
    const chordDurationSteps = chord.durationBars * rc.stepsPerBar
    const chordEndStep = chordStartStep + chordDurationSteps
    if (chordEndStep < rc.bounds.startStep || chordStartStep > rc.bounds.endStep) continue

    const x = stepToPixelX(chordStartStep, stepWidth, scrollX, keyboardWidth)
    const w = chordDurationSteps * stepWidth
    const midis = chord.voicing.map((p) => cachedPitchToMidi(p))
    if (midis.length === 0) continue

    const topMidi = Math.max(...midis)
    const bottomMidi = Math.min(...midis)
    const blockTopY = midiToPixelY(topMidi, rowHeight, scrollY, maxMidi)
    const blockBottomY = midiToPixelY(bottomMidi, rowHeight, scrollY, maxMidi) + rowHeight
    if (blockBottomY < 0 || blockTopY > height) continue

    const isChordBeingDragged = dragChordIds?.has(chord.id) === true

    // Block backdrop + time boundaries
    ctx.fillStyle = isChordBeingDragged ? 'rgba(155, 107, 255, 0.16)' : 'rgba(155, 107, 255, 0.07)'
    ctx.fillRect(x, blockTopY, w, blockBottomY - blockTopY)

    ctx.strokeStyle = isChordBeingDragged ? 'rgba(186, 156, 255, 0.9)' : 'rgba(155, 107, 255, 0.55)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(x) + 0.5, blockTopY)
    ctx.lineTo(Math.round(x) + 0.5, blockBottomY)
    ctx.moveTo(Math.round(x + w) - 0.5, blockTopY)
    ctx.lineTo(Math.round(x + w) - 0.5, blockBottomY)
    ctx.stroke()

    // Chord name label above the topmost voicing note
    if (w > 34) {
      ctx.fillStyle = 'rgba(203, 185, 255, 0.95)'
      ctx.font = 'bold 10px Geist Mono, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      const label = chord.roman && chord.roman !== '–' ? `${chord.name} (${chord.roman})` : chord.name
      ctx.fillText(label, x + 5, Math.max(11, blockTopY - 4))
    }

    for (let i = 0; i < chord.voicing.length; i++) {
      const pitch = chord.voicing[i]
      const midi = midis[i]
      if (midi < rc.bounds.minMidi || midi > rc.bounds.maxMidi) continue

      const y = midiToPixelY(midi, rowHeight, scrollY, maxMidi)
      const h = rowHeight - 2
      const isSelected = selectedSet?.has(chordNoteKey(chord.id, i)) ?? false
      const isNotePlaying = rc.isPlaying && rc.playheadStep >= chordStartStep && rc.playheadStep < chordEndStep

      if (isChordBeingDragged || isNotePlaying) {
        ctx.save()
        ctx.shadowBlur = 8
        ctx.shadowColor = 'rgba(155, 107, 255, 0.65)'
        ctx.fillStyle = isSelected ? '#c4a8ff' : '#a982ff'
        ctx.beginPath()
        ctx.roundRect(x + 1, y + 1, Math.max(4, w - 2), h, 3)
        ctx.fill()
        ctx.restore()
      } else {
        ctx.fillStyle = isSelected ? '#c4a8ff' : 'rgba(155, 107, 255, 0.85)'
        ctx.beginPath()
        ctx.roundRect(x + 1, y + 1, Math.max(4, w - 2), h, 3)
        ctx.fill()
      }

      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.28)'
      ctx.lineWidth = isSelected ? 1.5 : 1
      ctx.beginPath()
      ctx.roundRect(x + 1, y + 1, Math.max(4, w - 2), h, 3)
      ctx.stroke()

      if (w > 28) {
        ctx.fillStyle = isChordBeingDragged ? 'rgba(255, 255, 255, 0.6)' : '#ffffff'
        ctx.font = '10px Geist Mono, monospace'
        ctx.textBaseline = 'middle'
        ctx.fillText(pitch, x + 5, y + 1 + h / 2)
      }
    }
  }

  drawLassoOverlay(rc)
  ctx.restore()
}

/**
 * Layer 5: Sticky left piano keyboard with scale- and root-key highlighting.
 */
export function drawKeyboardLayer(rc: RenderContext): void {
  const { ctx, t } = rc
  const { height, rowHeight, scrollY, keyboardWidth, minMidi, maxMidi } = t

  ctx.save()
  for (let midi = maxMidi; midi >= minMidi; midi--) {
    const y = midiToPixelY(midi, rowHeight, scrollY, maxMidi)
    if (y + rowHeight < 0 || y > height) continue

    const pitch = midiToPitch(midi)
    const pc = Note.pitchClass(pitch)
    const chroma = Note.chroma(pitch)
    const isBlack = chroma !== undefined && [1, 3, 6, 8, 10].includes(chroma)
    const inScaleKey = isNoteInScale(pitch, rc.rootKey, rc.scale)

    // Realistic piano look: bright natural keys. In-scale keys stay brighter while
    // non-scale keys recede subtly, giving scale highlighting directly on the keyboard.
    if (isBlack) {
      ctx.fillStyle = inScaleKey ? '#16171b' : '#0f1013'
    } else {
      ctx.fillStyle = inScaleKey ? '#d9dce3' : '#b7bbc4'
    }
    ctx.fillRect(0, y, keyboardWidth, rowHeight)

    // Flash the clicked key: a signal-colored tint plus focus ring, mirroring a DAW key press
    if (midi === rc.flashedKeyMidi) {
      ctx.fillStyle = 'rgba(91, 141, 255, 0.45)'
      ctx.fillRect(0, y, keyboardWidth, rowHeight)
      ctx.strokeStyle = '#5b8dff'
      ctx.lineWidth = 2
      ctx.strokeRect(1, y + 1, keyboardWidth - 2, rowHeight - 2)
    }

    ctx.strokeStyle = '#15161a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y + rowHeight)
    ctx.lineTo(keyboardWidth, y + rowHeight)
    ctx.stroke()

    const isC = pc === 'C'
    const isRoot = pc === rc.rootPc

    if (isRoot) {
      ctx.fillStyle = '#5b8dff'
      ctx.beginPath()
      ctx.arc(8, y + rowHeight / 2, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }

    if (isC || isRoot) {
      // Keep label legible against bright natural keys and dark accidental keys
      if (isRoot) {
        ctx.fillStyle = isBlack ? '#5b8dff' : '#2f6ae0'
      } else {
        ctx.fillStyle = isBlack ? '#8d8f99' : '#3a3d47'
      }
      ctx.font = '10px Geist Mono, monospace'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(pitch, keyboardWidth - 6, y + rowHeight / 2)
    }
  }

  // Keyboard right separator line
  ctx.strokeStyle = '#2a2c33'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(keyboardWidth, 0)
  ctx.lineTo(keyboardWidth, height)
  ctx.stroke()
  ctx.restore()
}

/**
 * Layer 6: Playhead line (sub-step position for smooth per-frame motion).
 */
export function drawPlayheadLayer(rc: RenderContext): void {
  const { ctx, t } = rc
  const { height, stepWidth, scrollX, keyboardWidth } = t

  const playheadX = stepToPixelX(rc.playheadStep, stepWidth, scrollX, keyboardWidth)
  if (playheadX >= keyboardWidth && playheadX <= t.width) {
    ctx.save()
    ctx.strokeStyle = '#5b8dff'
    ctx.lineWidth = 2
    ctx.shadowBlur = 6
    ctx.shadowColor = 'rgba(91, 141, 255, 0.75)'
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, height)
    ctx.stroke()
    ctx.restore()
  }
}

/**
 * Layer 2.5: Loop region boundary vertical guidelines and subtle active zone shading.
 */
export function drawLoopRegionLayer(rc: RenderContext): void {
  const { ctx, t } = rc
  const { height, stepWidth, scrollX, keyboardWidth, width } = t

  if (rc.loopStartStep === undefined || rc.loopEndStep === undefined) return
  if (rc.loopStartStep >= rc.loopEndStep) return

  const startX = Math.round(stepToPixelX(rc.loopStartStep, stepWidth, scrollX, keyboardWidth)) + 0.5
  const endX = Math.round(stepToPixelX(rc.loopEndStep, stepWidth, scrollX, keyboardWidth)) + 0.5

  ctx.save()
  ctx.beginPath()
  ctx.rect(keyboardWidth, 0, width - keyboardWidth, height)
  ctx.clip()

  // 1. Subtle signal-tinted wash over the active loop area
  const clampedStartX = Math.max(keyboardWidth, startX)
  const clampedEndX = Math.min(width, endX)
  if (clampedEndX > clampedStartX) {
    ctx.fillStyle = 'rgba(91, 141, 255, 0.025)'
    ctx.fillRect(clampedStartX, 0, clampedEndX - clampedStartX, height)
  }

  // 2. Fine vertical blue guidelines at the loop start and loop end
  ctx.strokeStyle = 'rgba(91, 141, 255, 0.75)'
  ctx.lineWidth = 1.5

  if (startX >= keyboardWidth && startX <= width) {
    ctx.beginPath()
    ctx.moveTo(startX, 0)
    ctx.lineTo(startX, height)
    ctx.stroke()
  }

  if (endX >= keyboardWidth && endX <= width) {
    ctx.beginPath()
    ctx.moveTo(endX, 0)
    ctx.lineTo(endX, height)
    ctx.stroke()
  }

  ctx.restore()
}
