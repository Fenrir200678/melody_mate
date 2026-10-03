import { describe, expect, it } from 'vitest'
import {
  formatFullPortTitle,
  formatOffset,
  formatPortLabel,
  formatRoutingSummary,
  getRouteStatusBadge
} from '../../src/utils/midi-ui.utils'

describe('midi-ui.utils', () => {
  describe('formatPortLabel', () => {
    it('returns the port name if present and unique', () => {
      const port = { id: 'p1', name: 'IAC Driver Bus 1', manufacturer: 'Apple Inc.' }
      expect(formatPortLabel(port)).toBe('IAC Driver Bus 1 (Apple Inc.)')
    })

    it('omits manufacturer if already part of name', () => {
      const port = { id: 'p1', name: 'Apple IAC Driver', manufacturer: 'Apple' }
      expect(formatPortLabel(port)).toBe('Apple IAC Driver')
    })

    it('falls back to ID when name is empty or missing', () => {
      expect(formatPortLabel({ id: 'usb-midi-out', name: null })).toBe('usb-midi-out')
      expect(formatPortLabel({ id: 'usb-midi-out', name: '   ' })).toBe('usb-midi-out')
    })

    it('disambiguates duplicate port names using manufacturer and ID', () => {
      const allPorts = [
        { id: 'dev-1', name: 'USB Interface', manufacturer: 'Focusrite' },
        { id: 'dev-2', name: 'USB Interface', manufacturer: 'Focusrite' }
      ]
      const label1 = formatPortLabel(allPorts[0], allPorts)
      const label2 = formatPortLabel(allPorts[1], allPorts)
      expect(label1).toBe('USB Interface (Focusrite · dev-1)')
      expect(label2).toBe('USB Interface (Focusrite · dev-2)')
    })
  })

  describe('formatFullPortTitle', () => {
    it('generates a descriptive tooltip title', () => {
      const title = formatFullPortTitle({ id: 'p1', name: 'Synth Out', manufacturer: 'Moog' })
      expect(title).toBe('Synth Out · Moog · ID: p1')
    })
  })

  describe('formatOffset', () => {
    it('formats 0 ms without sign', () => {
      expect(formatOffset(0)).toBe('0 ms')
    })

    it('formats positive offsets with plus sign', () => {
      expect(formatOffset(15)).toBe('+15 ms')
    })

    it('formats negative offsets with minus sign', () => {
      expect(formatOffset(-25)).toBe('-25 ms')
    })
  })

  describe('getRouteStatusBadge', () => {
    it('returns internal badge when mode is internal', () => {
      const badge = getRouteStatusBadge('ready', 'internal', true)
      expect(badge.label).toBe('Internal')
      expect(badge.variant).toBe('muted')
    })

    it('returns No Port when mode is midi but port is missing', () => {
      const badge = getRouteStatusBadge('available', 'midi', false)
      expect(badge.label).toBe('No Port')
      expect(badge.variant).toBe('danger')
    })

    it('returns Ready with track variant when ready', () => {
      const badge = getRouteStatusBadge('ready', 'midi', true, 'chord')
      expect(badge.label).toBe('Ready')
      expect(badge.variant).toBe('chord')
    })

    it('returns Disconnected when status is disconnected', () => {
      const badge = getRouteStatusBadge('disconnected', 'both', true)
      expect(badge.label).toBe('Disconnected')
      expect(badge.variant).toBe('danger')
    })
  })

  describe('formatRoutingSummary', () => {
    it('summarizes internal mode', () => {
      const summary = formatRoutingSummary('internal', null, 1, 'ready')
      expect(summary.text).toBe('Internal synth')
      expect(summary.isWarning).toBe(false)
    })

    it('summarizes active MIDI mode', () => {
      const port = { id: 'p1', name: 'IAC Bus 1' }
      const summary = formatRoutingSummary('midi', port, 1, 'ready')
      expect(summary.text).toBe('MIDI · IAC Bus 1 · Ch 1')
      expect(summary.isWarning).toBe(false)
    })

    it('flags disconnected state', () => {
      const port = { id: 'p1', name: 'USB Synth' }
      const summary = formatRoutingSummary('both', port, 2, 'disconnected')
      expect(summary.text).toContain('(Disconnected)')
      expect(summary.isWarning).toBe(true)
    })
  })
})
