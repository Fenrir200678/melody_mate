import type { MidiStatus } from '../audio/midi/runtime.types'
import type { OutputRouteMode } from '../core/midi/output.types'

export interface PortIdentifier {
  id: string
  name?: string | null
  manufacturer?: string | null
}

export interface RouteStatusBadge {
  label: string
  variant: 'signal' | 'chord' | 'pulse' | 'danger' | 'muted'
  description: string
}

export const MIDI_CHANNEL_OPTIONS: readonly { value: number; label: string }[] = Array.from({ length: 16 }, (_, i) => ({
  value: i + 1,
  label: `Ch ${i + 1}`
}))

export const MIDI_ROUTE_MODE_OPTIONS = [
  { label: 'Internal', value: 'internal' },
  { label: 'MIDI', value: 'midi' },
  { label: 'Both', value: 'both' }
] as const

/**
 * Formats a port label for display in dropdowns and summaries.
 * Disambiguates duplicate port names using manufacturer or port ID.
 */
export function formatPortLabel(port: PortIdentifier, allPorts?: readonly PortIdentifier[]): string {
  const baseName = (port.name?.trim() || port.id).trim()
  if (!baseName) return port.id

  if (allPorts && allPorts.length > 1) {
    const matching = allPorts.filter((p) => (p.name?.trim() || p.id).trim() === baseName)
    if (matching.length > 1) {
      const details = [port.manufacturer?.trim(), port.id].filter(Boolean).join(' · ')
      return `${baseName} (${details})`
    }
  }

  const manufacturer = port.manufacturer?.trim()
  if (manufacturer && !baseName.toLowerCase().includes(manufacturer.toLowerCase())) {
    return `${baseName} (${manufacturer})`
  }

  return baseName
}

/**
 * Returns a comprehensive tooltip title for accessibility and hover inspecting.
 */
export function formatFullPortTitle(port: PortIdentifier): string {
  const name = port.name?.trim() || 'Generic Port'
  const manufacturer = port.manufacturer?.trim() || 'Unknown manufacturer'
  return `${name} · ${manufacturer} · ID: ${port.id}`
}

/**
 * Formats millisecond offset with sign.
 */
export function formatOffset(offsetMs: number): string {
  if (offsetMs === 0) return '0 ms'
  return `${offsetMs > 0 ? '+' : ''}${offsetMs} ms`
}

/**
 * Returns badge label and visual intent for a track's route status.
 */
export function getRouteStatusBadge(
  status: MidiStatus,
  mode: OutputRouteMode,
  hasPort: boolean,
  trackVariant: 'signal' | 'chord' = 'signal'
): RouteStatusBadge {
  if (mode === 'internal') {
    return {
      label: 'Internal',
      variant: 'muted',
      description: 'Route is set to internal synthesizer only.'
    }
  }

  if (!hasPort) {
    return {
      label: 'No Port',
      variant: 'danger',
      description: 'Select a MIDI port to activate this route.'
    }
  }

  switch (status) {
    case 'ready':
      return {
        label: 'Ready',
        variant: trackVariant,
        description: 'MIDI output is open and ready. Device reception is not confirmed.'
      }
    case 'opening':
      return {
        label: 'Opening…',
        variant: 'pulse',
        description: 'Opening the selected MIDI port.'
      }
    case 'disconnected':
      return {
        label: 'Disconnected',
        variant: 'danger',
        description: 'The selected MIDI device is disconnected.'
      }
    case 'available':
      return {
        label: 'Available',
        variant: 'pulse',
        description: 'Port is available. Select and activate to begin streaming.'
      }
    case 'not-enabled':
      return {
        label: 'MIDI Off',
        variant: 'muted',
        description: 'MIDI is not enabled.'
      }
    case 'unsupported':
    case 'insecure-context':
    case 'denied':
    case 'error':
      return {
        label: 'Error',
        variant: 'danger',
        description: 'MIDI communication is currently unavailable.'
      }
    default:
      return {
        label: status,
        variant: 'muted',
        description: `MIDI status: ${status}`
      }
  }
}

/**
 * Generates a concise summary string for display inside channel strips.
 */
export function formatRoutingSummary(
  mode: OutputRouteMode,
  port: PortIdentifier | null,
  channel: number,
  status: MidiStatus
): { text: string; isWarning: boolean; tooltip: string } {
  if (mode === 'internal') {
    return {
      text: 'Internal synth',
      isWarning: false,
      tooltip: 'Internal audio synthesis. Click to configure MIDI output.'
    }
  }

  const portName = port ? formatPortLabel(port) : 'No port'
  const isDisconnected = status === 'disconnected' || !port
  const modePrefix = mode === 'both' ? 'Both' : 'MIDI'
  const text = `${modePrefix} · ${portName} · Ch ${channel}`

  if (isDisconnected) {
    return {
      text: `${text} (Disconnected)`,
      isWarning: true,
      tooltip: 'Selected MIDI device is disconnected or unavailable. Click to manage.'
    }
  }

  return {
    text,
    isWarning: false,
    tooltip:
      mode === 'both'
        ? `Streaming to internal audio and ${portName} on Channel ${channel}. Click to manage.`
        : `Streaming to ${portName} on Channel ${channel} (internal synth silent). Click to manage.`
  }
}
