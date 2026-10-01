import { describe, expect, it } from 'vitest'
import {
  getButtonLayoutClasses,
  getButtonSizeClasses,
  getButtonVariantClasses,
  resolveButtonTitle
} from '@/utils/button.utils'

describe('button.utils', () => {
  describe('resolveButtonTitle', () => {
    it('returns disabledReason when disabled is true', () => {
      expect(resolveButtonTitle('Save', 'Save take', true, 'Rack is full')).toBe('Rack is full')
    })

    it('returns title when not disabled', () => {
      expect(resolveButtonTitle('Save', 'Save take', false, 'Reason')).toBe('Save')
    })

    it('falls back to ariaLabel if title is not provided', () => {
      expect(resolveButtonTitle(undefined, 'Save take', false)).toBe('Save take')
    })
  })

  describe('getButtonLayoutClasses', () => {
    it('returns inline-flex and justify-center by default', () => {
      expect(getButtonLayoutClasses()).toBe('inline-flex justify-center')
    })

    it('returns flex w-full and justify-start when block is true without align', () => {
      expect(getButtonLayoutClasses(true)).toBe('flex w-full justify-start')
    })

    it('respects explicit align when block is true', () => {
      expect(getButtonLayoutClasses(true, 'center')).toBe('flex w-full justify-center')
      expect(getButtonLayoutClasses(true, 'between')).toBe('flex w-full justify-between')
    })

    it('respects explicit align when block is false', () => {
      expect(getButtonLayoutClasses(false, 'start')).toBe('inline-flex justify-start')
      expect(getButtonLayoutClasses(false, 'between')).toBe('inline-flex justify-between')
    })
  })

  describe('getButtonSizeClasses', () => {
    it('maps xs to 20px chip scale', () => {
      const res = getButtonSizeClasses('xs')
      expect(res.button).toContain('h-5 px-2 text-micro rounded-chip')
      expect(res.icon).toBe('h-3 w-3 shrink-0')
    })

    it('maps sm to 24px standard control scale', () => {
      const res = getButtonSizeClasses('sm')
      expect(res.button).toContain('h-6 px-2.5 text-micro rounded-control')
      expect(res.icon).toBe('h-3 w-3 shrink-0')
    })

    it('maps md to 28px button scale', () => {
      const res = getButtonSizeClasses('md')
      expect(res.button).toContain('h-7 px-3 text-xs rounded-control')
      expect(res.icon).toBe('h-3.5 w-3.5 shrink-0')
    })

    it('maps lg to 32px button scale', () => {
      const res = getButtonSizeClasses('lg')
      expect(res.button).toContain('h-8 px-4 text-xs font-semibold rounded-control')
      expect(res.icon).toBe('h-4 w-4 shrink-0')
    })

    it('applies auto-height when autoHeight is true', () => {
      const res = getButtonSizeClasses('md', true)
      expect(res.button).toContain('h-auto py-1.5 px-3 text-xs rounded-control')
    })
  })

  describe('getButtonVariantClasses', () => {
    it('produces active styles when active is true', () => {
      const classes = getButtonVariantClasses('surface', 'signal', true)
      expect(classes).toContain('bg-daw-signal/20')
      expect(classes).toContain('border-daw-signal')
    })

    it('produces primary appearance styles', () => {
      const classes = getButtonVariantClasses('primary', 'signal', false)
      expect(classes).toContain('bg-daw-signal')
      expect(classes).toContain('text-daw-bg')
    })

    it('produces primary pulse and chord appearance styles', () => {
      const pulseClasses = getButtonVariantClasses('primary', 'pulse', false)
      expect(pulseClasses).toContain('bg-daw-pulse')
      expect(pulseClasses).toContain('text-daw-bg')

      const chordClasses = getButtonVariantClasses('primary', 'chord', false)
      expect(chordClasses).toContain('bg-daw-chord')
      expect(chordClasses).toContain('text-daw-bg')
    })

    it('produces surface appearance with default variant', () => {
      const classes = getButtonVariantClasses('surface', 'default', false)
      expect(classes).toContain('bg-daw-surface')
      expect(classes).toContain('text-daw-text')
    })
  })
})
