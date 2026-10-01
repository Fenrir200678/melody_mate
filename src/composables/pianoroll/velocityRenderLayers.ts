import type { AppNote } from '@/core/schemas/note.schema'
import { stepToPixelX } from './geometry'

export const VELOCITY_PADDING_TOP = 14
export const VELOCITY_PADDING_BOTTOM = 10
export const VELOCITY_GUIDE_VALUES = [32, 64, 96, 127] as const

export interface VelocityRenderContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  scrollX: number
  stepWidth: number
  keyboardWidth: number
  bars: number
  notes: AppNote[]
  selectedNoteIds: string[]
  draggingNoteId: string | null
  draggingVelocity: number | null
}

/**
 * Calculates the velocity value (1 - 127) from the vertical mouse coordinate in the lane.
 */
export function computeVelocityFromY(
  mouseY: number,
  height: number,
  paddingTop = VELOCITY_PADDING_TOP,
  paddingBottom = VELOCITY_PADDING_BOTTOM
): number {
  const usableH = Math.max(10, height - paddingTop - paddingBottom)
  const stemBottomY = height - paddingBottom
  const ratio = (stemBottomY - mouseY) / usableH
  return Math.max(1, Math.min(127, Math.round(ratio * 127)))
}

/**
 * Finds the note nearest to a given X coordinate on the velocity lane canvas.
 */
export function findVelocityNoteAtX(
  notes: AppNote[],
  pixelX: number,
  stepWidth: number,
  scrollX: number,
  keyboardWidth: number
): AppNote | null {
  const threshold = Math.max(8, stepWidth * 0.6)
  let closestNote: AppNote | null = null
  let closestDist = Infinity

  for (const note of notes) {
    const x = stepToPixelX(note.step, stepWidth, scrollX, keyboardWidth) + 3
    const dist = Math.abs(pixelX - x)
    if (dist <= threshold && dist < closestDist) {
      closestDist = dist
      closestNote = note
    }
  }

  return closestNote
}

/**
 * Layer 1: Background canvas fill and sticky keyboard spacer.
 */
export function drawVelocityBackgroundLayer(rc: VelocityRenderContext): void {
  const { ctx, width, height, keyboardWidth } = rc

  // Background aligned to DAW theme tokens (--color-daw-bg)
  ctx.fillStyle = '#0b0c0f'
  ctx.fillRect(0, 0, width, height)

  // Sticky keyboard spacer background (--color-daw-panel & --color-daw-border)
  ctx.fillStyle = '#15161a'
  ctx.fillRect(0, 0, keyboardWidth, height)
  ctx.strokeStyle = '#2a2c33'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(keyboardWidth, 0)
  ctx.lineTo(keyboardWidth, height)
  ctx.stroke()
}

/**
 * Layer 2: Horizontal velocity reference guidelines (32, 64, 96, 127) with labels on the keyboard spacer.
 */
export function drawVelocityGuidelinesLayer(rc: VelocityRenderContext): void {
  const { ctx, width, height, keyboardWidth } = rc
  const usableH = Math.max(10, height - VELOCITY_PADDING_TOP - VELOCITY_PADDING_BOTTOM)
  const stemBottomY = height - VELOCITY_PADDING_BOTTOM

  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
  ctx.lineWidth = 1

  for (const vel of VELOCITY_GUIDE_VALUES) {
    const guideY = Math.round(stemBottomY - (vel / 127) * usableH) + 0.5
    ctx.beginPath()
    ctx.moveTo(keyboardWidth, guideY)
    ctx.lineTo(width, guideY)
    ctx.stroke()

    // Value label on spacer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.font = '8px Geist Mono, monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(vel), keyboardWidth - 4, guideY)
  }
  ctx.restore()
}

/**
 * Layer 3: Note velocity stems, heads, active glow, and floating drag badges.
 */
export function drawVelocityStemsLayer(rc: VelocityRenderContext): void {
  const {
    ctx,
    width,
    height,
    scrollX,
    stepWidth,
    keyboardWidth,
    notes,
    selectedNoteIds,
    draggingNoteId,
    draggingVelocity
  } = rc

  const usableH = Math.max(10, height - VELOCITY_PADDING_TOP - VELOCITY_PADDING_BOTTOM)
  const stemBottomY = height - VELOCITY_PADDING_BOTTOM

  ctx.save()
  ctx.beginPath()
  ctx.rect(keyboardWidth, 0, width - keyboardWidth, height)
  ctx.clip()

  // Render unselected notes first, then selected notes on top
  const sortedNotes = [...notes].sort((a, b) => {
    const aSel = selectedNoteIds.includes(a.id) ? 1 : 0
    const bSel = selectedNoteIds.includes(b.id) ? 1 : 0
    return aSel - bSel
  })

  for (const note of sortedNotes) {
    const x = Math.round(stepToPixelX(note.step, stepWidth, scrollX, keyboardWidth) + 3)
    if (x < keyboardWidth - 10 || x > width + 10) continue

    const isSelected = selectedNoteIds.includes(note.id)
    const isDragging = note.id === draggingNoteId
    const effectiveVelocity = isDragging && draggingVelocity !== null ? draggingVelocity : note.velocity
    const ratio = Math.max(0.01, Math.min(1.0, effectiveVelocity / 127))
    const stemTopY = stemBottomY - ratio * usableH

    if (note.isMuted) {
      if (isSelected || isDragging) {
        ctx.save()
        ctx.strokeStyle = 'rgba(47, 217, 185, 0.45)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(x, stemBottomY)
        ctx.lineTo(x, stemTopY)
        ctx.stroke()

        ctx.strokeStyle = '#ffffff'
        ctx.fillStyle = '#0b0c0f'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(x, stemTopY, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      } else {
        ctx.strokeStyle = 'rgba(47, 217, 185, 0.12)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, stemBottomY)
        ctx.lineTo(x, stemTopY)
        ctx.stroke()

        ctx.fillStyle = 'rgba(47, 217, 185, 0.18)'
        ctx.beginPath()
        ctx.arc(x, stemTopY, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      continue
    }

    if (isSelected || isDragging) {
      // Active pulse stem
      ctx.save()
      ctx.strokeStyle = '#2fd9b9'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, stemBottomY)
      ctx.lineTo(x, stemTopY)
      ctx.stroke()

      // Glowing head node
      ctx.shadowColor = 'rgba(47, 217, 185, 0.85)'
      ctx.shadowBlur = 8
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x, stemTopY, 3.5, 0, Math.PI * 2)
      ctx.fill()

      // Floating velocity value badge during active dragging
      if (isDragging) {
        ctx.shadowBlur = 0
        ctx.fillStyle = '#2fd9b9'
        ctx.font = 'bold 9px Geist Mono, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(String(effectiveVelocity), x, stemTopY - 4)
      }
      ctx.restore()
    } else {
      // Dimmed stem
      ctx.strokeStyle = 'rgba(47, 217, 185, 0.38)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x, stemBottomY)
      ctx.lineTo(x, stemTopY)
      ctx.stroke()

      // Dimmed head node
      ctx.fillStyle = '#2fd9b9'
      ctx.beginPath()
      ctx.arc(x, stemTopY, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Draw project end boundary if viewport extends past project length
  const totalProjectSteps = (rc.bars ?? 4) * 16
  const totalProjectWidth = keyboardWidth + totalProjectSteps * stepWidth
  const isProjectShorterThanScreen = totalProjectWidth < width
  const projectEndX = Math.round(stepToPixelX(totalProjectSteps, stepWidth, scrollX, keyboardWidth)) + 0.5

  if (isProjectShorterThanScreen && projectEndX < width) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
    ctx.fillRect(projectEndX, 0, width - projectEndX, height)

    ctx.save()
    ctx.strokeStyle = '#4a5061'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(projectEndX, 0)
    ctx.lineTo(projectEndX, height)
    ctx.stroke()
    ctx.restore()
  }

  ctx.restore()
}

/**
 * Composite function rendering the complete velocity lane canvas.
 */
export function drawVelocityLane(rc: VelocityRenderContext): void {
  drawVelocityBackgroundLayer(rc)
  drawVelocityGuidelinesLayer(rc)
  drawVelocityStemsLayer(rc)
}
