import type { MidiStatus, MidiStatusSnapshot } from './runtime.types'

const STATUSES: Record<MidiStatus, Omit<MidiStatusSnapshot, 'status'>> = {
  unsupported: { message: 'Web MIDI is not supported in this browser.', recovery: 'none' },
  'insecure-context': { message: 'MIDI access requires HTTPS or localhost.', recovery: 'use-https' },
  'not-enabled': { message: 'MIDI is not enabled.', recovery: 'enable' },
  requesting: { message: 'Requesting MIDI permission.', recovery: 'none' },
  denied: { message: 'MIDI access was denied by permission or browser policy.', recovery: 'check-permission' },
  'no-outputs': { message: 'No connected MIDI outputs are available.', recovery: 'refresh' },
  available: { message: 'Select a MIDI output explicitly.', recovery: 'select-port' },
  opening: { message: 'Opening the selected MIDI output.', recovery: 'none' },
  ready: { message: 'MIDI output is open. Device reception is not confirmed.', recovery: 'none' },
  disconnected: { message: 'The selected MIDI output is unavailable. Reconnect and open it again.', recovery: 'retry' },
  error: { message: 'The MIDI operation failed. Check the device and retry.', recovery: 'retry' }
}

export function midiStatus(status: MidiStatus): MidiStatusSnapshot {
  return { status, ...STATUSES[status] }
}

export function browserMidiEnvironment() {
  return {
    secureContext: globalThis.isSecureContext === true,
    requestAccess:
      typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function'
        ? (options: { sysex: false }) => navigator.requestMIDIAccess(options)
        : undefined
  }
}
