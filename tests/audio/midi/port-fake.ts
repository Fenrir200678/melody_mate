import { vi } from 'vitest'
import type { MidiAccessHandle, MidiOutputPort } from '../../../src/audio/midi/runtime.types'

export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

export class PortFake implements MidiOutputPort {
  send = vi.fn((_data: number[], _timestamp: number) => {})
  clear = vi.fn(() => {})
  id: string
  name = 'Test output'
  manufacturer = 'Test manufacturer'
  state: MIDIPortDeviceState = 'connected'
  connection: MIDIPortConnectionState = 'closed'
  openGate?: ReturnType<typeof deferred<void>>
  closeGate?: ReturnType<typeof deferred<void>>
  failOpen = false
  failClose = false
  pendingOpen = false
  constructor(id = 'output-a') {
    this.id = id
  }
  open = vi.fn(async () => {
    await this.openGate?.promise
    if (this.failOpen) throw new DOMException('Port busy', 'InvalidAccessError')
    this.connection = this.pendingOpen || this.state === 'disconnected' ? 'pending' : 'open'
  })
  close = vi.fn(async () => {
    await this.closeGate?.promise
    if (this.failClose) throw new Error('Close failed')
    this.connection = 'closed'
  })
}

export class AccessFake implements MidiAccessHandle {
  outputs = new Map<string, PortFake>()
  listeners = new Set<() => void>()
  addEventListener = vi.fn((_type: 'statechange', listener: () => void) => {
    this.listeners.add(listener)
  })
  removeEventListener = vi.fn((_type: 'statechange', listener: () => void) => {
    this.listeners.delete(listener)
  })
  constructor(...ports: PortFake[]) {
    for (const port of ports) this.outputs.set(port.id, port)
  }
  change() {
    for (const listener of [...this.listeners]) listener()
  }
}
