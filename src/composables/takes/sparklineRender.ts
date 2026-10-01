import type { AppNote } from '@/core/schemas/note.schema'
import { pitchToMidi } from '@/core/theory/scale.engine'

export function drawTakeSparkline(canvas: HTMLCanvasElement, notes: AppNote[], key: string): void {
  const context = canvas.getContext('2d')
  if (!context) return
  const width = 32
  const height = 16
  const ratio = window.devicePixelRatio || 1
  canvas.width = width * ratio
  canvas.height = height * ratio
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  const ordered = notes.filter((note) => !note.isMuted).sort((a, b) => a.step - b.step)
  if (!ordered.length) return
  const low = Math.min(...ordered.map((note) => note.midi)) - 2
  const high = Math.max(...ordered.map((note) => note.midi)) + 2
  const start = ordered[0]!.step
  const end = Math.max(...ordered.map((note) => note.step + note.durationSteps))
  const y = (midi: number) => height - 2 - ((midi - low) / (high - low)) * (height - 4)
  const x = (step: number) => 2 + ((step - start) / Math.max(1, end - start)) * (width - 4)
  const colors = getComputedStyle(canvas)
  const root = pitchToMidi(`${key}4`)
  const reference = root + Math.round(((low + high) / 2 - root) / 12) * 12
  if (reference >= low && reference <= high) {
    context.strokeStyle = colors.getPropertyValue('--color-daw-border').trim()
    context.lineWidth = 0.5
    context.beginPath()
    context.moveTo(0, y(reference))
    context.lineTo(width, y(reference))
    context.stroke()
  }
  context.strokeStyle = colors.getPropertyValue('--color-daw-signal').trim()
  context.lineWidth = 1.25
  context.beginPath()
  ordered.forEach((note, index) => {
    if (index === 0) context.moveTo(x(note.step), y(note.midi))
    else context.lineTo(x(note.step), y(note.midi))
  })
  const last = ordered.at(-1)!
  context.lineTo(x(last.step + last.durationSteps), y(last.midi))
  context.stroke()
}
