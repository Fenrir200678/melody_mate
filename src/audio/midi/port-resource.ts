import type { MidiTrackKey } from '../../core/midi/output.types'
import type { MidiCleanupHook, MidiCleanupReason, MidiOutputPort } from './runtime.types'

export class MidiPortResource {
  readonly port: MidiOutputPort
  private leases = new Set<symbol>()
  private tail: Promise<unknown> = Promise.resolve()
  private opening: Promise<void> | null = null

  constructor(port: MidiOutputPort) {
    this.port = port
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation)
    this.tail = result.catch(() => {})
    return result
  }

  acquire(lease: symbol): Promise<void> {
    this.leases.add(lease)
    if (!this.opening) {
      const operation = this.enqueue(async () => {
        if (this.port.state !== 'connected') throw new Error('MIDI output disconnected.')
        if (this.port.connection !== 'open') await this.port.open()
        if (this.port.state !== 'connected' || this.port.connection !== 'open') {
          throw new Error('MIDI output is not open.')
        }
      })
      this.opening = operation
      void operation
        .finally(() => {
          if (this.opening === operation) this.opening = null
        })
        .catch(() => {})
    }
    return this.opening
  }

  prepareSwitch(lease: symbol, track: MidiTrackKey, hook?: MidiCleanupHook): Promise<void> {
    return this.enqueue(async () => {
      if (this.leases.has(lease)) await hook?.({ port: this.port, track, reason: 'switch' })
    })
  }

  release(lease: symbol, track: MidiTrackKey, reason: MidiCleanupReason, hook?: MidiCleanupHook): Promise<void> {
    if (!this.leases.delete(lease)) return Promise.resolve()
    // A new acquisition must run after this cleanup, even if an old open is still pending.
    this.opening = null
    return this.enqueue(async () => {
      try {
        await hook?.({ port: this.port, track, reason })
      } finally {
        if (!this.leases.size) await this.port.close()
      }
    })
  }
}
