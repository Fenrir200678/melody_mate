import type { AppNote } from '@/core/schemas/note.schema'

export function drawContour(canvas: HTMLCanvasElement, notes: readonly AppNote[], totalSteps: number): void {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!width || !height) return
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(ratio, ratio)
  const sounding = notes.filter((note) => !note.isMuted && note.step < totalSteps).sort((a, b) => a.step - b.step)
  if (!sounding.length) return
  const low = Math.min(...sounding.map((note) => note.midi))
  const high = Math.max(...sounding.map((note) => note.midi))
  const colors = getComputedStyle(canvas)
  ctx.strokeStyle = colors.getPropertyValue('--color-daw-signal').trim()
  ctx.fillStyle = ctx.strokeStyle
  ctx.lineWidth = 1.5
  const point = (note: AppNote) => ({
    x: 4 + (note.step / Math.max(1, totalSteps)) * (width - 8),
    y: high === low ? height / 2 : height - 4 - ((note.midi - low) / (high - low)) * (height - 8)
  })
  ctx.beginPath()
  sounding.forEach((note, index) => {
    const { x, y } = point(note)
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
  for (const note of sounding) {
    const { x, y } = point(note)
    ctx.beginPath()
    ctx.arc(x, y, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
}
