import type { MidiTrackKey } from '../../core/midi/output.types'
import { MidiPortResource } from './port-resource'
import { browserMidiEnvironment, midiStatus } from './status'
import type {
  MidiAccessEnvironment,
  MidiAccessHandle,
  MidiAccessSnapshot,
  MidiCleanupHook,
  MidiCleanupReason,
  MidiOutputPort,
  MidiRouteSnapshot,
  MidiStatus
} from './runtime.types'

interface Lease {
  resource: MidiPortResource
  token: symbol
}
interface Route {
  state: MidiRouteSnapshot
  active?: Lease
  pending?: Lease
  operation?: Promise<boolean>
  operationId: number
}

export type MidiRoutePreparation = (port: MidiOutputPort) => boolean | void

export class MidiAccessManager {
  private readonly environment: MidiAccessEnvironment
  private access?: MidiAccessHandle
  private permission?: Promise<MidiAccessHandle>
  private enabling?: Promise<void>
  private generation = 0
  private enabled = false
  private disposed = false
  private status: MidiStatus
  private listeners = new Set<(snapshot: MidiAccessSnapshot) => void>()
  private resources = new WeakMap<MidiOutputPort, MidiPortResource>()
  private cleanups = new Set<Promise<void>>()
  private cleanupHook?: MidiCleanupHook
  private routes: Record<MidiTrackKey, Route> = {
    lead: { state: { ...midiStatus('not-enabled'), desiredPortId: null, activePortId: null }, operationId: 0 },
    chord: { state: { ...midiStatus('not-enabled'), desiredPortId: null, activePortId: null }, operationId: 0 }
  }

  constructor(environment: MidiAccessEnvironment = browserMidiEnvironment()) {
    this.environment = environment
    this.status = this.initialStatus()
  }

  private initialStatus(): MidiStatus {
    if (!this.environment.secureContext) return 'insecure-context'
    return this.environment.requestAccess ? 'not-enabled' : 'unsupported'
  }

  getSnapshot(): MidiAccessSnapshot {
    return {
      ...midiStatus(this.status),
      enabled: this.enabled,
      disposed: this.disposed,
      outputs:
        this.enabled && this.access
          ? Array.from(this.access.outputs.values(), (port) => ({
              id: port.id,
              name: port.name,
              manufacturer: port.manufacturer,
              state: port.state,
              connection: port.connection
            }))
          : [],
      routes: { lead: { ...this.routes.lead.state }, chord: { ...this.routes.chord.state } }
    }
  }

  subscribe(listener: (snapshot: MidiAccessSnapshot) => void): () => void {
    if (this.disposed) return () => {}
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private publish(): void {
    for (const listener of this.listeners) listener(this.getSnapshot())
  }

  setCleanupHook(hook?: MidiCleanupHook): void {
    this.cleanupHook = hook
  }

  restoreDesiredPorts(ports: Record<MidiTrackKey, string | null>): void {
    void this.disable()
    for (const track of ['lead', 'chord'] as const) {
      this.routes[track].state = {
        ...midiStatus('not-enabled'),
        desiredPortId: ports[track],
        activePortId: null
      }
    }
    this.publish()
  }

  enable(): Promise<void> {
    if (this.disposed || this.enabled) return Promise.resolve()
    if (this.enabling) return this.enabling
    this.status = this.initialStatus()
    if (this.status !== 'not-enabled') {
      this.publish()
      return Promise.resolve()
    }
    const generation = ++this.generation
    this.status = 'requesting'
    // Invoke in the explicit action's call stack; requesting permission cannot be canceled.
    if (!this.permission) {
      try {
        this.permission = this.environment.requestAccess!({ sysex: false }).then((access) => {
          this.access = access
          return access
        })
      } catch (error) {
        this.permission = Promise.reject(error)
      }
      const request = this.permission
      void request.catch(() => {
        if (this.permission === request) this.permission = undefined
      })
    }
    const operation = this.permission
      .then((access) => {
        if (this.disposed || this.generation !== generation) return
        this.enabled = true
        access.addEventListener('statechange', this.refresh)
        this.refresh()
      })
      .catch((error) => {
        if (this.disposed || this.generation !== generation) return
        const name = error instanceof Error ? error.name : ''
        this.status = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error'
        this.publish()
      })
      .finally(() => {
        if (this.enabling === operation) this.enabling = undefined
      })
    this.enabling = operation
    this.publish()
    return operation
  }

  readonly refresh = (): void => {
    if (!this.enabled || !this.access || this.disposed) return
    for (const track of ['lead', 'chord'] as const) {
      const route = this.routes[track]
      const invalid = (lease?: Lease) =>
        lease &&
        (lease.resource.port.state !== 'connected' ||
          this.access!.outputs.get(lease.resource.port.id) !== lease.resource.port)
      if (invalid(route.active) || (route.active && route.active.resource.port.connection !== 'open')) {
        void this.releaseRoute(track, 'disconnect', 'disconnected')
      } else if (invalid(route.pending)) {
        const pending = route.pending!
        route.pending = undefined
        route.operation = undefined
        route.state = { ...route.state, ...midiStatus('disconnected') }
        void this.releaseLease(pending, track, 'disconnect')
      }
      if (!route.active && !route.pending && route.state.desiredPortId) {
        const port = this.access.outputs.get(route.state.desiredPortId)
        route.state = {
          ...route.state,
          ...midiStatus(port?.state === 'connected' ? 'available' : 'disconnected')
        }
      }
    }
    this.status = Array.from(this.access.outputs.values()).some((port) => port.state === 'connected')
      ? 'available'
      : 'no-outputs'
    this.publish()
  }

  open(track: MidiTrackKey, portId: string, prepare?: MidiRoutePreparation): Promise<boolean> {
    const route = this.routes[track]
    if (!this.enabled || this.disposed) return Promise.resolve(false)
    if (!prepare && route.pending?.resource.port.id === portId && route.operation) return route.operation
    const operationId = ++route.operationId
    if (route.pending) void this.releaseLease(route.pending, track, 'switch')
    route.pending = undefined
    route.operation = undefined
    if (route.active?.resource.port.id === portId && this.getOpenOutput(track)) {
      try {
        if (prepare?.(route.active.resource.port) === false) return Promise.resolve(false)
      } catch {
        return Promise.resolve(false)
      }
      route.state = { ...route.state, ...midiStatus('ready'), desiredPortId: portId }
      this.publish()
      return Promise.resolve(true)
    }
    route.state = { ...route.state, ...midiStatus('opening'), desiredPortId: portId }
    const port = this.access?.outputs.get(portId)
    if (!port || port.state !== 'connected') {
      route.state = { ...route.state, ...midiStatus('disconnected') }
      this.publish()
      return Promise.resolve(false)
    }
    let resource = this.resources.get(port)
    if (!resource) {
      resource = new MidiPortResource(port)
      this.resources.set(port, resource)
    }
    const lease = { resource, token: Symbol(track) }
    route.pending = lease
    const generation = this.generation
    let preparationRejected = false
    const current = () =>
      this.enabled &&
      !this.disposed &&
      generation === this.generation &&
      route.operationId === operationId &&
      route.pending === lease
    const operation = resource
      .acquire(lease.token)
      .then(async () => {
        if (
          !current() ||
          this.access?.outputs.get(portId) !== port ||
          port.state !== 'connected' ||
          port.connection !== 'open'
        ) {
          if (current()) route.state = { ...route.state, ...midiStatus('disconnected') }
          return false
        }
        if (!current()) return false
        try {
          if (prepare?.(port) === false) {
            preparationRejected = true
            return false
          }
        } catch {
          preparationRejected = true
          return false
        }
        const previous = route.active
        if (previous) await previous.resource.prepareSwitch(previous.token, track, this.cleanupHook)
        if (
          !current() ||
          this.access?.outputs.get(portId) !== port ||
          port.state !== 'connected' ||
          port.connection !== 'open'
        ) {
          if (current()) route.state = { ...route.state, ...midiStatus('disconnected') }
          return false
        }
        route.active = lease
        route.pending = undefined
        route.operation = undefined
        route.state = { ...route.state, ...midiStatus('ready'), activePortId: portId }
        if (previous) await this.releaseLease(previous, track, 'switch', false)
        return (
          this.enabled &&
          !this.disposed &&
          generation === this.generation &&
          route.operationId === operationId &&
          route.active === lease &&
          this.getOpenOutput(track) === port
        )
      })
      .catch(() => {
        if (current())
          route.state = { ...route.state, ...midiStatus(port.state === 'connected' ? 'error' : 'disconnected') }
        return false
      })
      .then(async (success) => {
        if (!success) await this.releaseLease(lease, track, 'close', !preparationRejected)
        if (route.pending === lease) {
          route.pending = undefined
          route.operation = undefined
        }
        if (!this.disposed) this.publish()
        return success
      })
    route.operation = operation
    this.publish()
    return operation
  }

  getOpenOutput(track: MidiTrackKey): MidiOutputPort | undefined {
    const port = this.routes[track].active?.resource.port
    return this.enabled &&
      !this.disposed &&
      port?.state === 'connected' &&
      port.connection === 'open' &&
      this.access?.outputs.get(port.id) === port
      ? port
      : undefined
  }

  private releaseLease(lease: Lease, track: MidiTrackKey, reason: MidiCleanupReason, cleanup = true): Promise<void> {
    const state = this.routes[track].state
    const generation = this.generation
    const operation = lease.resource
      .release(lease.token, track, reason, cleanup ? this.cleanupHook : undefined)
      .catch(() => {
        if (this.enabled && !this.disposed && this.generation === generation && this.routes[track].state === state) {
          this.routes[track].state = { ...this.routes[track].state, ...midiStatus('error') }
          this.publish()
        }
      })
      .finally(() => {
        this.cleanups.delete(operation)
      })
    this.cleanups.add(operation)
    return operation
  }

  private releaseRoute(track: MidiTrackKey, reason: MidiCleanupReason, status: MidiStatus): Promise<void> {
    const route = this.routes[track]
    ++route.operationId
    const leases = [route.active, route.pending].filter((lease): lease is Lease => !!lease)
    route.active = undefined
    route.pending = undefined
    route.operation = undefined
    route.state = { ...route.state, ...midiStatus(status), activePortId: null }
    return Promise.all(leases.map((lease) => this.releaseLease(lease, track, reason))).then(() => {})
  }

  close(track: MidiTrackKey): Promise<void> {
    const operation = this.releaseRoute(track, 'close', this.enabled ? 'available' : 'not-enabled')
    this.publish()
    return operation
  }

  /** Invalidates and closes in-flight route candidates while leaving active routes untouched. */
  cancelPending(): void {
    for (const track of ['lead', 'chord'] as const) {
      const route = this.routes[track]
      const pending = route.pending
      if (!pending) continue
      ++route.operationId
      route.pending = undefined
      route.operation = undefined
      route.state = {
        ...route.state,
        ...midiStatus(route.active ? 'ready' : this.enabled ? 'available' : 'not-enabled'),
        activePortId: route.active?.resource.port.id ?? null
      }
      void this.releaseLease(pending, track, 'close')
    }
    this.publish()
  }

  disable(): Promise<void> {
    return this.stop('disable')
  }

  private stop(reason: 'disable' | 'dispose'): Promise<void> {
    ++this.generation
    this.enabling = undefined
    this.enabled = false
    this.access?.removeEventListener('statechange', this.refresh)
    this.status = this.initialStatus()
    const operations = (['lead', 'chord'] as const).map((track) => this.releaseRoute(track, reason, 'not-enabled'))
    this.publish()
    return Promise.all([...operations, ...this.cleanups]).then(() => {})
  }

  dispose(): Promise<void> {
    this.disposed = true
    const operation = this.stop('dispose')
    this.listeners.clear()
    return operation.then(() => {
      this.resources = new WeakMap()
      this.cleanupHook = undefined
    })
  }
}
