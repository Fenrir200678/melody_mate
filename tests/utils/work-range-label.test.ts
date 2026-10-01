import { describe, expect, it } from 'vitest'
import { formatWorkRangeLabel } from '../../src/utils/work-range-label'

describe('formatWorkRangeLabel', () => {
  it('uses concise bar labels for whole-bar ranges', () => {
    expect(formatWorkRangeLabel({ startStep: 0, endStep: 16 })).toBe('Bar 1')
    expect(formatWorkRangeLabel({ startStep: 16, endStep: 32 })).toBe('Bar 2')
    expect(formatWorkRangeLabel({ startStep: 0, endStep: 32 })).toBe('Bars 1–2')
  })

  it('shows inclusive step endpoints for partial ranges within a bar', () => {
    expect(formatWorkRangeLabel({ startStep: 3, endStep: 8 })).toBe('Bar 1, steps 4–8')
  })

  it('shows the exact bar and step endpoints for ranges crossing bars', () => {
    expect(formatWorkRangeLabel({ startStep: 14, endStep: 18 })).toBe('Bar 1, step 15 → Bar 2, step 2')
    expect(formatWorkRangeLabel({ startStep: 4, endStep: 70 })).toBe('Bar 1, step 5 → Bar 5, step 6')
  })
})
