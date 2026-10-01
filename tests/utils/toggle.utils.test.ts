import { describe, expect, it } from 'vitest'
import { resolveToggleAriaLabel, resolveToggleStatus, resolveToggleTitle } from '@/utils/toggle.utils'

describe('toggle.utils', () => {
  describe('resolveToggleTitle', () => {
    it('returns disabledReason when disabled is true', () => {
      expect(resolveToggleTitle('Start on Root', 'Custom Title', true, 'Overridden by setting')).toBe(
        'Overridden by setting'
      )
    })

    it('returns custom title when provided and not disabled with reason', () => {
      expect(resolveToggleTitle('Start on Root', 'Custom Title', false, 'Overridden by setting')).toBe('Custom Title')
    })

    it('falls back to label when title is not provided', () => {
      expect(resolveToggleTitle('Start on Root')).toBe('Start on Root')
    })

    it('returns undefined if nothing is provided', () => {
      expect(resolveToggleTitle()).toBeUndefined()
    })
  })

  describe('resolveToggleAriaLabel', () => {
    it('prefers ariaLabel over label', () => {
      expect(resolveToggleAriaLabel('Display Label', 'Aria Label')).toBe('Aria Label')
    })

    it('falls back to label if ariaLabel is missing', () => {
      expect(resolveToggleAriaLabel('Display Label')).toBe('Display Label')
    })

    it('returns undefined if neither is provided', () => {
      expect(resolveToggleAriaLabel()).toBeUndefined()
    })
  })

  describe('resolveToggleStatus', () => {
    it('returns default On/Off status', () => {
      expect(resolveToggleStatus(true)).toBe('On')
      expect(resolveToggleStatus(false)).toBe('Off')
    })

    it('respects custom status labels', () => {
      expect(resolveToggleStatus(true, { on: 'Active', off: 'Bypassed' })).toBe('Active')
      expect(resolveToggleStatus(false, { on: 'Active', off: 'Bypassed' })).toBe('Bypassed')
    })
  })
})
