import { describe, expect, it } from 'vitest'
import { calculateAdsrGeometry } from '../../src/utils/canvas/adsr-render'

describe('calculateAdsrGeometry', () => {
  it('returns null for degenerate or too small dimensions', () => {
    expect(calculateAdsrGeometry({ attack: 10, decay: 20, sustain: 50, release: 30 }, 10, 50)).toBeNull()
    expect(calculateAdsrGeometry({ attack: 10, decay: 20, sustain: 50, release: 30 }, 100, 10)).toBeNull()
    expect(calculateAdsrGeometry({ attack: 10, decay: 20, sustain: 50, release: 30 }, -5, -5)).toBeNull()
  })

  it('calculates strictly monotonically increasing x-coordinates across all envelope phases', () => {
    const geom = calculateAdsrGeometry({ attack: 20, decay: 30, sustain: 60, release: 40 }, 200, 60)
    expect(geom).not.toBeNull()
    if (!geom) return

    expect(geom.x0).toBeLessThan(geom.x1)
    expect(geom.x1).toBeLessThan(geom.x2)
    expect(geom.x2).toBeLessThan(geom.x3)
    expect(geom.x3).toBeLessThan(geom.x4)
  })

  it('guarantees non-zero phase widths even when attack, decay and release are zero', () => {
    const geom = calculateAdsrGeometry({ attack: 0, decay: 0, sustain: 0, release: 0 }, 200, 60)
    expect(geom).not.toBeNull()
    if (!geom) return

    expect(geom.dxA).toBeGreaterThan(0)
    expect(geom.dxD).toBeGreaterThan(0)
    expect(geom.dxS).toBeGreaterThan(0)
    expect(geom.dxR).toBeGreaterThan(0)
    expect(geom.x0).toBeLessThan(geom.x1)
    expect(geom.x1).toBeLessThan(geom.x2)
    expect(geom.x2).toBeLessThan(geom.x3)
    expect(geom.x3).toBeLessThan(geom.x4)
  })

  it('maps sustain levels accurately to y-coordinates', () => {
    const width = 200
    const height = 60
    const fullSustain = calculateAdsrGeometry({ attack: 10, decay: 10, sustain: 100, release: 10 }, width, height)
    const zeroSustain = calculateAdsrGeometry({ attack: 10, decay: 10, sustain: 0, release: 10 }, width, height)
    const midSustain = calculateAdsrGeometry({ attack: 10, decay: 10, sustain: 50, release: 10 }, width, height)

    expect(fullSustain).not.toBeNull()
    expect(zeroSustain).not.toBeNull()
    expect(midSustain).not.toBeNull()
    if (!fullSustain || !zeroSustain || !midSustain) return

    // At 100% sustain, ySus equals yTop (the peak level)
    expect(fullSustain.ySus).toBe(fullSustain.yTop)

    // At 0% sustain, ySus equals y0 (the baseline 0-amplitude level)
    expect(zeroSustain.ySus).toBe(zeroSustain.y0)

    // At 50% sustain, ySus is halfway between yTop and y0
    const expectedMidY = (midSustain.y0 + midSustain.yTop) / 2
    expect(midSustain.ySus).toBeCloseTo(expectedMidY, 1)
  })

  it('clamps out-of-range envelope parameter percentages to 0–100', () => {
    const normal = calculateAdsrGeometry({ attack: 100, decay: 100, sustain: 100, release: 100 }, 200, 60)
    const overflow = calculateAdsrGeometry({ attack: 999, decay: 500, sustain: 200, release: 150 }, 200, 60)
    expect(normal).not.toBeNull()
    expect(overflow).not.toBeNull()
    if (!normal || !overflow) return

    expect(overflow.dxA).toBeCloseTo(normal.dxA, 2)
    expect(overflow.ySus).toBe(normal.ySus)
  })

  it('allocates wider phase segments when envelope parameters increase', () => {
    const shortAtk = calculateAdsrGeometry({ attack: 5, decay: 50, sustain: 50, release: 50 }, 200, 60)
    const longAtk = calculateAdsrGeometry({ attack: 95, decay: 50, sustain: 50, release: 50 }, 200, 60)

    expect(shortAtk).not.toBeNull()
    expect(longAtk).not.toBeNull()
    if (!shortAtk || !longAtk) return

    expect(longAtk.dxA).toBeGreaterThan(shortAtk.dxA)
  })

  it('keeps Bézier control points within the respective phase bounds', () => {
    const geom = calculateAdsrGeometry({ attack: 40, decay: 50, sustain: 30, release: 60 }, 200, 60)
    expect(geom).not.toBeNull()
    if (!geom) return

    expect(geom.cpAx).toBeGreaterThanOrEqual(geom.x0)
    expect(geom.cpAx).toBeLessThanOrEqual(geom.x1)

    expect(geom.cpDx).toBeGreaterThanOrEqual(geom.x1)
    expect(geom.cpDx).toBeLessThanOrEqual(geom.x2)

    expect(geom.cpRx).toBeGreaterThanOrEqual(geom.x3)
    expect(geom.cpRx).toBeLessThanOrEqual(geom.x4)
  })

  it('produces a steep, nearly vertical attack segment with midpoint control when attack is zero', () => {
    const geom = calculateAdsrGeometry({ attack: 0, decay: 50, sustain: 50, release: 50 }, 200, 60)
    expect(geom).not.toBeNull()
    if (!geom) return

    // Near-vertical rise: dxA is minimal
    expect(geom.dxA).toBeLessThan(3)
    // Straight line: control point is centered between start and end
    expect(geom.cpAx).toBeCloseTo((geom.x0 + geom.x1) / 2, 1)
  })
})
