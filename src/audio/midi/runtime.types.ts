import type { MidiTrackKey } from '../../core/midi/output.types'

export type MidiStatus =
  | 'unsupported'
  | 'insecure-context'
  | 'not-enabled'
  | 'requesting'
  | 'denied'
  | 'no-outputs'
  | 'available'
  | 'opening'
  | 'ready'
  | 'disconnected'
  | 'error'

export interface MidiStatusSnapshot {
  status: MidiStatus
  message: string
  recovery: 'none' | 'enable' | 'retry' | 'refresh' | 'select-port' | 'check-permission' | 'use-https'
}

export interface MidiPortSnapshot {
  id: string
  name: string | null
  manufacturer: string | null
  state: MIDIPortDeviceState
  connection: MIDIPortConnectionState
}

export interface MidiRouteSnapshot extends MidiStatusSnapshot {
  desiredPortId: string | null
  activePortId: string | null
}

export interface MidiAccessSnapshot extends MidiStatusSnapshot {
  enabled: boolean
  disposed: boolean
  outputs: MidiPortSnapshot[]
  routes: Record<MidiTrackKey, MidiRouteSnapshot>
}

export interface MidiOutputPort extends MidiPortSnapshot {
  send(data: number[], timestamp: number): void
  clear?: () => void
  open(): Promise<unknown>
  close(): Promise<unknown>
}

export interface MidiAccessHandle {
  outputs: ReadonlyMap<string, MidiOutputPort>
  addEventListener(type: 'statechange', listener: () => void): void
  removeEventListener(type: 'statechange', listener: () => void): void
}

export interface MidiAccessEnvironment {
  secureContext: boolean
  requestAccess?: (options: { sysex: false }) => Promise<MidiAccessHandle>
}

export type MidiCleanupReason = 'close' | 'switch' | 'disable' | 'disconnect' | 'dispose'
export type MidiCleanupHook = (context: {
  port: MidiOutputPort
  track: MidiTrackKey
  reason: MidiCleanupReason
}) => void | Promise<void>
