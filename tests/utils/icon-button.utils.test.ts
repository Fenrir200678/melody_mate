import { describe, expect, it } from 'vitest'
import {
  getIconButtonSizeClasses,
  getIconButtonVariantClasses,
  resolveIconButtonAriaLabel,
  resolveIconButtonTitle
} from '@/utils/icon-button.utils'

describe('icon-button.utils', () => {
  describe('resolveIconButtonTitle', () => {
    it('returns disabledReason when disabled is true', () => {
      expect(resolveIconButtonTitle('Delete', 'Delete item', true, 'Cannot delete last item')).toBe(
        'Cannot delete last item'
      )
    })

    it('returns title when not disabled', () => {
      expect(resolveIconButtonTitle('Delete', 'Delete item', false, 'Reason')).toBe('Delete')
    })

    it('falls back to ariaLabel if title is not provided', () => {
      expect(resolveIconButtonTitle(undefined, 'Delete item', false)).toBe('Delete item')
    })
  })

  describe('resolveIconButtonAriaLabel', () => {
    it('returns ariaLabel if provided', () => {
      expect(resolveIconButtonAriaLabel('Trash', 'Delete take')).toBe('Delete take')
    })

    it('falls back to title if ariaLabel is undefined', () => {
      expect(resolveIconButtonAriaLabel('Delete take', undefined)).toBe('Delete take')
    })
  })

  describe('getIconButtonSizeClasses', () => {
    it('maps xs to 20px chip scale', () => {
      const res = getIconButtonSizeClasses('xs')
      expect(res.button).toContain('h-5 w-5 rounded-chip')
      expect(res.icon).toBe('h-3 w-3')
    })

    it('maps sm to 24px standard control scale', () => {
      const res = getIconButtonSizeClasses('sm')
      expect(res.button).toContain('h-6 w-6 rounded-control')
      expect(res.icon).toBe('h-3.5 w-3.5')
    })

    it('maps md to 28px button scale', () => {
      const res = getIconButtonSizeClasses('md')
      expect(res.button).toContain('h-7 w-7 rounded-control')
      expect(res.icon).toBe('h-4 w-4')
    })
  })

  describe('getIconButtonVariantClasses', () => {
    it('produces danger classes correctly for panel appearance', () => {
      const classes = getIconButtonVariantClasses('panel', 'danger', false)
      expect(classes).toContain('bg-daw-panel')
      expect(classes).toContain('border-daw-border')
      expect(classes).toContain('text-daw-danger')
      expect(classes).toContain('hover:bg-daw-danger/15')
    })

    it('produces ghost classes with transparent borders in idle state', () => {
      const classes = getIconButtonVariantClasses('ghost', 'pulse', false)
      expect(classes).toContain('bg-transparent')
      expect(classes).toContain('border-transparent')
      expect(classes).toContain('text-daw-pulse')
    })

    it('produces active classes when active is true', () => {
      const classes = getIconButtonVariantClasses('panel', 'signal', true)
      expect(classes).toContain('bg-daw-signal/20')
      expect(classes).toContain('border-daw-signal')
      expect(classes).toContain('text-daw-signal')
    })
  })
})
