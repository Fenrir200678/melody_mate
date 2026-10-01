import { clamp } from '../knob.utils'

export interface AdsrRenderParams {
  attack: number // 0–100%
  decay: number // 0–100%
  sustain: number // 0–100%
  release: number // 0–100%
  variant?: 'signal' | 'chord'
}

export interface AdsrGeometry {
  x0: number
  y0: number
  x1: number
  yTop: number
  x2: number
  ySus: number
  x3: number
  x4: number
  cpAx: number
  cpAy: number
  cpDx: number
  cpDy: number
  cpRx: number
  cpRy: number
  dxA: number
  dxD: number
  dxS: number
  dxR: number
  usableWidth: number
  usableHeight: number
  padLeft: number
  padTop: number
  padBottom: number
}

/**
 * Calculates the geometry and Bézier control points for an ADSR envelope curve.
 * Pure mathematical helper without DOM or canvas side effects.
 */
export function calculateAdsrGeometry(params: AdsrRenderParams, width: number, height: number): AdsrGeometry | null {
  if (width < 20 || height < 15) {
    return null
  }

  const padLeft = 6
  const padRight = 6
  const padTop = 10
  const padBottom = 6

  const usableWidth = width - padLeft - padRight
  const usableHeight = height - padTop - padBottom

  if (usableWidth <= 0 || usableHeight <= 0) {
    return null
  }

  const a = clamp(params.attack, 0, 100) / 100
  const d = clamp(params.decay, 0, 100) / 100
  const s = clamp(params.sustain, 0, 100) / 100
  const r = clamp(params.release, 0, 100) / 100

  // Minimum weights guarantee that each envelope phase remains legible.
  // Attack starts razor-thin at 0% (straight, direct vertical rise for plucks/percussive hits)
  // and expands smoothly as attack time increases.
  const wA = 0.008 + 0.992 * Math.pow(a, 1.25)
  const wD = 0.08 + 0.92 * d
  const wS = 0.28 // Fixed display proportion for the sustained key-hold state
  const wR = 0.08 + 0.92 * r
  const totalWeight = wA + wD + wS + wR

  const dxA = usableWidth * (wA / totalWeight)
  const dxD = usableWidth * (wD / totalWeight)
  const dxS = usableWidth * (wS / totalWeight)
  const dxR = usableWidth - (dxA + dxD + dxS)

  const x0 = padLeft
  const x1 = x0 + dxA
  const x2 = x1 + dxD
  const x3 = x2 + dxS
  const x4 = x0 + usableWidth

  const y0 = height - padBottom
  const yTop = padTop
  const ySus = y0 - s * usableHeight

  // Attack: at a = 0 it is a steep, straight vertical rise (midpoint control point);
  // as attack increases, it becomes a convex/punchy upward ramp.
  const cpAx = x0 + (0.5 - 0.25 * a) * dxA
  const cpAy = y0 - (0.5 + 0.35 * a) * usableHeight

  // Decay: exponential falloff ending horizontally at sustain level (zero tangent)
  const cpDx = x1 + 0.28 * dxD
  const cpDy = ySus

  // Release: exponential falloff landing horizontally at baseline zero
  const cpRx = x3 + 0.28 * dxR
  const cpRy = y0

  return {
    x0,
    y0,
    x1,
    yTop,
    x2,
    ySus,
    x3,
    x4,
    cpAx,
    cpAy,
    cpDx,
    cpDy,
    cpRx,
    cpRy,
    dxA,
    dxD,
    dxS,
    dxR,
    usableWidth,
    usableHeight,
    padLeft,
    padTop,
    padBottom
  }
}

/**
 * Draws the ADSR envelope visualization on an active 2D rendering context.
 */
export function drawAdsrEnvelope(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: AdsrRenderParams
): void {
  const geom = calculateAdsrGeometry(params, width, height)
  if (!geom) return

  const isChord = params.variant === 'chord'
  const accent = isChord ? '#9b6bff' : '#5b8dff'
  const accentLine = isChord ? 'rgba(230, 215, 255, 0.95)' : 'rgba(215, 235, 255, 0.95)'
  const glow = isChord ? 'rgba(155, 107, 255, 0.55)' : 'rgba(91, 141, 255, 0.55)'

  const { x0, y0, x1, yTop, x2, ySus, x3, x4, cpAx, cpAy, cpDx, cpDy, cpRx, cpRy, padTop } = geom

  // 1. Background panel
  ctx.fillStyle = '#131418'
  ctx.beginPath()
  ctx.roundRect(0, 0, width, height, 4)
  ctx.fill()

  // 2. Subtle baseline at 0 amplitude
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x4, y0)
  ctx.stroke()

  // 3. Faint phase divider guidelines (dashed vertical lines at transitions)
  ctx.save()
  ctx.setLineDash([1, 3])
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
  ctx.lineWidth = 1
  for (const x of [x1, x2, x3]) {
    ctx.beginPath()
    ctx.moveTo(x, padTop)
    ctx.lineTo(x, y0)
    ctx.stroke()
  }

  // 4. Subtle sustain level reference line (across decay & sustain phase)
  const s = clamp(params.sustain, 0, 100) / 100
  if (s > 0.02 && s < 0.98) {
    ctx.setLineDash([2, 3])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.beginPath()
    ctx.moveTo(x1, ySus)
    ctx.lineTo(x3, ySus)
    ctx.stroke()
  }
  ctx.restore()

  // 5. Phase micro labels (A, D, S, R) at top edge
  ctx.font = '600 8.5px Geist, Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
  const labelAx = Math.max(x0 + 5, (x0 + x1) / 2)
  ctx.fillText('A', labelAx, 2)
  ctx.fillText('D', (x1 + x2) / 2, 2)
  ctx.fillText('S', (x2 + x3) / 2, 2)
  ctx.fillText('R', (x3 + x4) / 2, 2)

  // 6. Gradient fill under envelope
  const fillGrad = ctx.createLinearGradient(0, yTop, 0, y0)
  if (isChord) {
    fillGrad.addColorStop(0, 'rgba(155, 107, 255, 0.32)')
    fillGrad.addColorStop(0.65, 'rgba(155, 107, 255, 0.08)')
    fillGrad.addColorStop(1, 'rgba(155, 107, 255, 0.0)')
  } else {
    fillGrad.addColorStop(0, 'rgba(91, 141, 255, 0.32)')
    fillGrad.addColorStop(0.65, 'rgba(91, 141, 255, 0.08)')
    fillGrad.addColorStop(1, 'rgba(91, 141, 255, 0.0)')
  }

  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(cpAx, cpAy, x1, yTop)
  ctx.quadraticCurveTo(cpDx, cpDy, x2, ySus)
  ctx.lineTo(x3, ySus)
  ctx.quadraticCurveTo(cpRx, cpRy, x4, y0)
  ctx.lineTo(x4, y0)
  ctx.lineTo(x0, y0)
  ctx.closePath()
  ctx.fillStyle = fillGrad
  ctx.fill()

  // 7. Curve stroke: glow pass followed by crisp core line
  const traceCurve = () => {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(cpAx, cpAy, x1, yTop)
    ctx.quadraticCurveTo(cpDx, cpDy, x2, ySus)
    ctx.lineTo(x3, ySus)
    ctx.quadraticCurveTo(cpRx, cpRy, x4, y0)
  }

  ctx.save()
  traceCurve()
  ctx.shadowColor = glow
  ctx.shadowBlur = 6
  ctx.strokeStyle = accent
  ctx.lineWidth = 1.75
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()

  traceCurve()
  ctx.shadowBlur = 0
  ctx.strokeStyle = accentLine
  ctx.lineWidth = 1.25
  ctx.stroke()
  ctx.restore()

  // 8. Key handle markers (dots at critical phase points)
  const drawNode = (x: number, y: number, radius = 2) => {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = accent
    ctx.lineWidth = 1
    ctx.stroke()
  }

  drawNode(x1, yTop, 2.25)
  drawNode(x2, ySus, 2)
  drawNode(x3, ySus, 2)
}

/**
 * Renders the ADSR envelope onto a canvas element with HiDPI / devicePixelRatio support.
 */
export function renderAdsrCanvas(canvas: HTMLCanvasElement, params: AdsrRenderParams): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const targetW = Math.floor(rect.width * dpr)
  const targetH = Math.floor(rect.height * dpr)

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, rect.width, rect.height)

  drawAdsrEnvelope(ctx, rect.width, rect.height, params)

  ctx.restore()
}
