import { getFullySelectedBars } from '@/utils/pianoroll-selection'
import { stepToPixelX } from './geometry'
import type { RenderContext } from './renderLayers'

// Signal, muted text and text tokens at very low opacity preserve deep dark studio background.
const sectionFills: Record<string, string> = {
  A: 'rgba(91, 141, 255, 0.02)',
  B: 'rgba(141, 143, 153, 0.02)',
  C: 'rgba(233, 234, 238, 0.02)'
}

export function drawMotifSectionsLayer(rc: RenderContext): void {
  const letters = rc.sectionLetters ?? []
  if (rc.activeTrack !== 'melody' || letters.length === 0) return

  const { ctx, t } = rc
  const { width, height, stepWidth, scrollX, keyboardWidth } = t
  const trackEnd = Math.min(width, stepToPixelX(rc.bars * rc.stepsPerBar, stepWidth, scrollX, keyboardWidth))
  if (trackEnd <= keyboardWidth) return

  const selectedBars = getFullySelectedBars(rc.notes, rc.selectedIds, rc.stepsPerBar)
  ctx.save()
  ctx.beginPath()
  ctx.rect(keyboardWidth, 0, trackEnd - keyboardWidth, height)
  ctx.clip()

  for (let bar = 0; bar < Math.min(rc.bars, letters.length); bar++) {
    const letter = letters[bar]
    const fill = sectionFills[letter]
    if (!fill) continue

    const startX = stepToPixelX(bar * rc.stepsPerBar, stepWidth, scrollX, keyboardWidth)
    const endX = startX + rc.stepsPerBar * stepWidth
    const left = Math.max(keyboardWidth, startX)
    const right = Math.min(trackEnd, endX)
    if (right <= left) continue

    ctx.fillStyle = fill
    ctx.fillRect(left, 0, right - left, height)
    if (selectedBars.has(bar)) {
      ctx.fillStyle = 'rgba(91, 141, 255, 0.05)'
      ctx.fillRect(left, 0, right - left, height)
    }

    if (bar > 0 && letters[bar - 1] && letters[bar - 1] !== letter && startX >= keyboardWidth) {
      const x = Math.round(startX) + 0.5
      ctx.strokeStyle = 'rgba(141, 143, 153, 0.50)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
  }
  ctx.restore()
}
