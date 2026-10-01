import { WORK_RANGE_EDGE } from '@/config/ui-defaults'
import { stepToPixelX } from './geometry'
import type { RenderContext } from './renderLayers'

export function drawWorkRangeLayer(rc: RenderContext): void {
  if (!rc.workRange) return
  const { ctx, t, workRange } = rc
  if (workRange.startStep === 0 && workRange.endStep === rc.totalProjectSteps) return
  const start = stepToPixelX(workRange.startStep, t.stepWidth, t.scrollX, t.keyboardWidth)
  const end = stepToPixelX(workRange.endStep, t.stepWidth, t.scrollX, t.keyboardWidth)
  const left = Math.max(t.keyboardWidth, start)
  const right = Math.min(t.width, end)
  if (right <= left) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(t.keyboardWidth, 0, t.width - t.keyboardWidth, t.height)
  ctx.clip()
  // Dashed edges distinguish the editing target from the solid playback-loop boundaries.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)'
  ctx.fillRect(left, 0, right - left, t.height)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  for (const x of [start, end]) {
    ctx.beginPath()
    ctx.moveTo(Math.round(x) + 0.5, 0)
    ctx.lineTo(Math.round(x) + 0.5, t.height)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawWorkRangeGripsLayer(rc: RenderContext): void {
  if (!rc.workRange) return
  const { ctx, t, workRange } = rc
  if (workRange.startStep === 0 && workRange.endStep === rc.totalProjectSteps) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(t.keyboardWidth, 0, t.width - t.keyboardWidth, t.height)
  ctx.clip()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  for (const step of [workRange.startStep, workRange.endStep]) {
    const x = stepToPixelX(step, t.stepWidth, t.scrollX, t.keyboardWidth)
    ctx.fillRect(
      Math.round(x) - WORK_RANGE_EDGE.gripWidthPx / 2,
      WORK_RANGE_EDGE.gripTopPx,
      WORK_RANGE_EDGE.gripWidthPx,
      WORK_RANGE_EDGE.gripHeightPx
    )
  }
  ctx.restore()
}
