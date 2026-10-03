import { clamp } from '../knob.utils'

export interface StereoMeterState {
  leftPeakDb: number
  rightPeakDb: number
  leftRmsDb: number
  rightRmsDb: number
  leftPeakHoldDb: number
  rightPeakHoldDb: number
  gainReductionDb: number
  ceilingDb: number
}

export interface StereoMeterGeometry {
  width: number
  height: number
  startX: number
  barWidth: number
  gap: number
  leftBarX: number
  rightBarX: number
  grBarX: number
  scaleX: number
  clipTopY: number
  clipHeight: number
  meterTopY: number
  meterBottomY: number
  meterHeight: number
  ceilingY: number
  labelY: number
  ticks: Array<{ db: number; y: number; label: string }>
  grTicks: Array<{ db: number; y: number; label: string }>
}

export const METER_MIN_DB = -48
export const METER_MAX_DB = 3
export const METER_MAX_GR_DB = 12
export const METER_SCALE_DBS = [3, 0, -6, -12, -24, -48] as const
export const METER_GR_DBS = [0, 3, 6, 12] as const

/**
 * Maps a decibel value into a 0..1 ratio within [minDb, maxDb].
 */
export function dbToMeterRatio(db: number, minDb = METER_MIN_DB, maxDb = METER_MAX_DB): number {
  if (!Number.isFinite(db) || db <= minDb) return 0
  if (db >= maxDb) return 1
  return (db - minDb) / (maxDb - minDb)
}

/**
 * Maps a decibel value to a vertical pixel coordinate (top = maxDb, bottom = minDb).
 */
export function dbToMeterY(
  db: number,
  topY: number,
  bottomY: number,
  minDb = METER_MIN_DB,
  maxDb = METER_MAX_DB
): number {
  const ratio = dbToMeterRatio(db, minDb, maxDb)
  return bottomY - ratio * (bottomY - topY)
}

/**
 * Maps gain reduction in dB (positive magnitude) into a 0..1 ratio within [0, maxGrDb].
 */
export function grToMeterRatio(grDb: number, maxGrDb = METER_MAX_GR_DB): number {
  if (!Number.isFinite(grDb) || grDb <= 0.05) return 0
  return clamp(grDb / maxGrDb, 0, 1)
}

/**
 * Calculates stereo meter layout geometry. Pure function without canvas side-effects.
 */
export function calculateStereoMeterGeometry(
  width: number,
  height: number,
  ceilingDb = -1
): StereoMeterGeometry | null {
  if (width < 60 || height < 40) {
    return null
  }

  const padTop = 3
  const padBottom = 3
  const labelHeight = 12
  const clipHeight = 3
  const clipGap = 3

  const clipTopY = padTop
  const meterTopY = clipTopY + clipHeight + clipGap
  const meterBottomY = height - padBottom - labelHeight - 2
  const meterHeight = meterBottomY - meterTopY
  const labelY = height - padBottom

  if (meterHeight <= 10) {
    return null
  }

  // Bar proportions
  const barWidth = Math.max(10, Math.min(22, Math.floor((width - 60) / 4)))
  const gap = 3
  const scaleWidth = 26
  const grBarWidth = Math.max(8, Math.min(16, Math.floor(barWidth * 0.85)))

  // Total cluster: L(bar) + gap + R(bar) + 6px + Scale(scaleWidth) + 6px + GR(grBarWidth)
  const totalClusterWidth = barWidth * 2 + gap + 6 + scaleWidth + 6 + grBarWidth
  const startX = Math.max(4, Math.floor((width - totalClusterWidth) / 2))

  const leftBarX = startX
  const rightBarX = leftBarX + barWidth + gap
  const scaleX = rightBarX + barWidth + 6
  const grBarX = scaleX + scaleWidth + 6

  const ceilingY = dbToMeterY(ceilingDb, meterTopY, meterBottomY)

  const ticks = METER_SCALE_DBS.map((db) => ({
    db,
    y: dbToMeterY(db, meterTopY, meterBottomY),
    label: db > 0 ? `+${db}` : `${db}`
  }))

  const grTicks = METER_GR_DBS.map((db) => ({
    db,
    y: meterTopY + grToMeterRatio(db) * meterHeight,
    label: db === 0 ? '0' : `-${db}`
  }))

  return {
    width,
    height,
    startX,
    barWidth,
    gap,
    leftBarX,
    rightBarX,
    grBarX,
    scaleX,
    clipTopY,
    clipHeight,
    meterTopY,
    meterBottomY,
    meterHeight,
    ceilingY,
    labelY,
    ticks,
    grTicks
  }
}

/**
 * Creates the vertical color gradient for stereo level bars.
 */
function createMeterGradient(ctx: CanvasRenderingContext2D, topY: number, bottomY: number): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, bottomY, 0, topY)
  gradient.addColorStop(0.0, '#2fd9b9') // -48 dB: studio cyan
  gradient.addColorStop(0.65, '#38bdf8') // -18 dB: cyan-blue
  gradient.addColorStop(0.82, '#eab308') // -6 dB: amber yellow
  gradient.addColorStop(0.92, '#f97316') // -1 dB: warm orange
  gradient.addColorStop(1.0, '#ef4444') // +3 dB: clip red
  return gradient
}

/**
 * Renders the dual vertical stereo peak/RMS meter with Gain Reduction into a canvas.
 */
export function renderStereoMeter(
  canvas: HTMLCanvasElement,
  state: StereoMeterState,
  containerWidth?: number,
  containerHeight?: number
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let width = containerWidth
  let height = containerHeight

  if (width === undefined || height === undefined) {
    const rect = canvas.getBoundingClientRect()
    width = rect.width
    height = rect.height
  }

  if (width <= 0 || height <= 0) return

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const pixelWidth = Math.floor(width * dpr)
  const pixelHeight = Math.floor(height * dpr)

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }

  const geom = calculateStereoMeterGeometry(width, height, state.ceilingDb)
  if (!geom) return

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)

  const isLeftClip = Number.isFinite(state.leftPeakDb) && state.leftPeakDb >= 0
  const isRightClip = Number.isFinite(state.rightPeakDb) && state.rightPeakDb >= 0

  // 1. Clip LEDs at top of L and R bars
  const drawClipLed = (x: number, isClip: boolean) => {
    ctx.fillStyle = isClip ? '#ef4444' : 'rgba(239, 68, 68, 0.15)'
    if (isClip) {
      ctx.shadowColor = '#ef4444'
      ctx.shadowBlur = 6
    }
    ctx.beginPath()
    ctx.roundRect(x, geom.clipTopY, geom.barWidth, geom.clipHeight, 1)
    ctx.fill()
    ctx.shadowBlur = 0
  }
  drawClipLed(geom.leftBarX, isLeftClip)
  drawClipLed(geom.rightBarX, isRightClip)

  // 2. Background slots for L, R and GR tracks
  ctx.fillStyle = '#16181d'
  const drawTrackBackground = (x: number, w: number) => {
    ctx.beginPath()
    ctx.roundRect(x, geom.meterTopY, w, geom.meterHeight, 2)
    ctx.fill()
  }
  drawTrackBackground(geom.leftBarX, geom.barWidth)
  drawTrackBackground(geom.rightBarX, geom.barWidth)
  drawTrackBackground(geom.grBarX, geom.grBarX - geom.scaleX > 0 ? geom.barWidth * 0.85 : 10)

  // 3. Scale markings & horizontal grid hairlines
  ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  for (const tick of geom.ticks) {
    const isZero = tick.db === 0
    const isClipMark = tick.db > 0

    // Hairline tick mark
    ctx.strokeStyle = isZero ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(geom.scaleX, Math.round(tick.y) + 0.5)
    ctx.lineTo(geom.scaleX + 4, Math.round(tick.y) + 0.5)
    ctx.stroke()

    // Scale label
    ctx.fillStyle = isClipMark ? '#ef4444' : isZero ? '#f97316' : '#71717a'
    ctx.fillText(tick.label, geom.scaleX + 6, tick.y)
  }

  // 4. Color Gradient for L and R level bars
  const gradient = createMeterGradient(ctx, geom.meterTopY, geom.meterBottomY)

  // Helper to draw a single channel (L or R) with RMS + Peak + Peak Hold
  const drawChannelBar = (x: number, peakDb: number, rmsDb: number, peakHoldDb: number) => {
    const peakRatio = dbToMeterRatio(peakDb)
    const rmsRatio = dbToMeterRatio(rmsDb)

    // RMS body (darker/translucent under-layer)
    if (rmsRatio > 0.01) {
      const rmsH = Math.min(geom.meterHeight, rmsRatio * geom.meterHeight)
      const rmsY = geom.meterBottomY - rmsH
      ctx.fillStyle = gradient
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.roundRect(x, rmsY, geom.barWidth, rmsH, [0, 0, 2, 2])
      ctx.fill()
      ctx.globalAlpha = 1.0
    }

    // Peak level (active bright bar)
    if (peakRatio > 0.01) {
      const peakH = Math.min(geom.meterHeight, peakRatio * geom.meterHeight)
      const peakY = geom.meterBottomY - peakH
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(x, peakY, geom.barWidth, peakH, [1, 1, 2, 2])
      ctx.fill()
    }

    // Peak Hold Indicator
    if (peakHoldDb > METER_MIN_DB) {
      const holdY = Math.round(dbToMeterY(peakHoldDb, geom.meterTopY, geom.meterBottomY))
      const isHoldClip = peakHoldDb >= 0
      ctx.fillStyle = isHoldClip ? '#ef4444' : '#ffffff'
      if (isHoldClip) {
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 4
      }
      ctx.fillRect(x, Math.max(geom.meterTopY, holdY - 1), geom.barWidth, 2)
      ctx.shadowBlur = 0
    }
  }

  drawChannelBar(geom.leftBarX, state.leftPeakDb, state.leftRmsDb, state.leftPeakHoldDb)
  drawChannelBar(geom.rightBarX, state.rightPeakDb, state.rightRmsDb, state.rightPeakHoldDb)

  // 5. Ceiling Marker Line across L and R bars
  if (state.ceilingDb > METER_MIN_DB && state.ceilingDb < METER_MAX_DB) {
    const ceilY = Math.round(geom.ceilingY) + 0.5
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 1])
    ctx.beginPath()
    ctx.moveTo(geom.leftBarX, ceilY)
    ctx.lineTo(geom.rightBarX + geom.barWidth, ceilY)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 6. Gain Reduction (GR) Bar (fills DOWNWARDS from top)
  const grRatio = grToMeterRatio(state.gainReductionDb)
  const grWidth = Math.max(8, Math.min(16, Math.floor(geom.barWidth * 0.85)))
  if (grRatio > 0.01) {
    const grH = Math.min(geom.meterHeight, grRatio * geom.meterHeight)
    ctx.fillStyle = '#f97316'
    ctx.shadowColor = '#f97316'
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.roundRect(geom.grBarX, geom.meterTopY, grWidth, grH, [2, 2, 1, 1])
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // Hairline ticks on GR track
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1
  for (const grTick of geom.grTicks) {
    const y = Math.round(grTick.y) + 0.5
    ctx.beginPath()
    ctx.moveTo(geom.grBarX, y)
    ctx.lineTo(geom.grBarX + grWidth, y)
    ctx.stroke()
  }

  // 7. Channel / Track Label tags below each bar (L, R, GR)
  ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillStyle = '#94a3b8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  ctx.fillText('L', geom.leftBarX + geom.barWidth / 2, geom.labelY - 10)
  ctx.fillText('R', geom.rightBarX + geom.barWidth / 2, geom.labelY - 10)
  ctx.fillText('GR', geom.grBarX + grWidth / 2, geom.labelY - 10)

  ctx.restore()
}
