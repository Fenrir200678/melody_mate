import { describe, expect, it, vi } from 'vitest'
import { MidiAccessManager } from '../../../src/audio/midi/access-manager'
import { AccessFake, PortFake, deferred } from './port-fake'

function fixture(...ports: PortFake[]) {
  const access = new AccessFake(...ports)
  const requestAccess = vi.fn(async () => access)
  const manager = new MidiAccessManager({ secureContext: true, requestAccess })
  return { access, requestAccess, manager }
}

describe('MIDI access and port lifecycle', () => {
  it('detects capability without requesting permission or opening ports', async () => {
    const { manager, requestAccess } = fixture(new PortFake())
    expect(manager.getSnapshot().status).toBe('not-enabled')
    expect(requestAccess).not.toHaveBeenCalled()
    expect(await manager.open('lead', 'output-a')).toBe(false)
    const unsupported = new MidiAccessManager({ secureContext: true })
    await unsupported.enable()
    expect(unsupported.getSnapshot().status).toBe('unsupported')
    const insecure = new MidiAccessManager({ secureContext: false, requestAccess })
    await insecure.enable()
    expect(insecure.getSnapshot().status).toBe('insecure-context')
    expect(requestAccess).not.toHaveBeenCalled()
  })

  it('deduplicates explicit permission and reuses one access across disable/enable', async () => {
    const permission = deferred<AccessFake>()
    const requestAccess = vi.fn(() => permission.promise)
    const manager = new MidiAccessManager({ secureContext: true, requestAccess })
    const first = manager.enable()
    expect(manager.enable()).toBe(first)
    expect(manager.getSnapshot().status).toBe('requesting')
    expect(requestAccess).toHaveBeenCalledExactlyOnceWith({ sysex: false })
    await manager.disable()
    const access = new AccessFake()
    permission.resolve(access)
    await first
    expect(manager.getSnapshot()).toMatchObject({ enabled: false, status: 'not-enabled' })
    expect(access.listeners.size).toBe(0)
    await manager.enable()
    expect(requestAccess).toHaveBeenCalledTimes(1)
    expect(manager.getSnapshot().status).toBe('no-outputs')
    expect(access.listeners.size).toBe(1)
  })

  it('handles denial, system errors and explicit retry', async () => {
    const requestAccess = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'))
      .mockRejectedValueOnce(new Error('System failure'))
      .mockResolvedValueOnce(new AccessFake())
    const manager = new MidiAccessManager({ secureContext: true, requestAccess })
    await manager.enable()
    expect(manager.getSnapshot()).toMatchObject({ status: 'denied', recovery: 'check-permission' })
    await manager.enable()
    expect(manager.getSnapshot().status).toBe('error')
    await manager.enable()
    expect(manager.getSnapshot().status).toBe('no-outputs')
  })

  it('publishes isolated plain snapshots and follows hotplug without selecting a device', async () => {
    const { manager, access } = fixture()
    await manager.enable()
    const port = new PortFake()
    access.outputs.set(port.id, port)
    access.change()
    const state = manager.getSnapshot()
    expect(state.status).toBe('available')
    expect(state.outputs[0]).toEqual({
      id: port.id,
      name: port.name,
      manufacturer: port.manufacturer,
      state: 'connected',
      connection: 'closed'
    })
    state.outputs[0]!.name = 'Changed'
    state.routes.lead.desiredPortId = 'Changed'
    expect(manager.getSnapshot().outputs[0]!.name).toBe(port.name)
    expect(manager.getSnapshot().routes.lead.desiredPortId).toBeNull()
    expect(port.open).not.toHaveBeenCalled()
    expect(await manager.open('lead', 'missing')).toBe(false)
    expect(manager.getSnapshot().routes.lead.status).toBe('disconnected')
  })

  it('shares one open across tracks and closes only after the final usage', async () => {
    const port = new PortFake()
    port.openGate = deferred<void>()
    const { manager } = fixture(port)
    const hook = vi.fn()
    manager.setCleanupHook(hook)
    await manager.enable()
    const lead = manager.open('lead', port.id)
    expect(manager.open('lead', port.id)).toBe(lead)
    const chord = manager.open('chord', port.id)
    await vi.waitFor(() => expect(port.open).toHaveBeenCalledTimes(1))
    expect(manager.getSnapshot().routes.lead.status).toBe('opening')
    port.openGate.resolve()
    expect(await lead).toBe(true)
    expect(await chord).toBe(true)
    await manager.close('lead')
    expect(port.close).not.toHaveBeenCalled()
    expect(manager.getOpenOutput('chord')).toBe(port)
    await manager.close('chord')
    expect(port.close).toHaveBeenCalledTimes(1)
    expect(hook).toHaveBeenCalledTimes(2)
  })

  it.each(['disable', 'dispose'] as const)(
    'invalidates a pending open on %s and closes its late result',
    async (action) => {
      const port = new PortFake()
      port.openGate = deferred<void>()
      const { manager, access } = fixture(port)
      await manager.enable()
      const opening = manager.open('lead', port.id)
      await vi.waitFor(() => expect(port.open).toHaveBeenCalledTimes(1))
      const stopping = manager[action]()
      expect(manager.getOpenOutput('lead')).toBeUndefined()
      expect(manager.getSnapshot().enabled).toBe(false)
      expect(access.listeners.size).toBe(0)
      port.openGate.resolve()
      await stopping
      expect(await opening).toBe(false)
      expect(port.connection).toBe('closed')
      expect(manager.getSnapshot().routes.lead.status).toBe('not-enabled')
    }
  )

  it('ignores permission completion after disposal and removes snapshot subscriptions', async () => {
    const permission = deferred<AccessFake>()
    const manager = new MidiAccessManager({ secureContext: true, requestAccess: () => permission.promise })
    const listener = vi.fn()
    manager.subscribe(listener)
    const enabling = manager.enable()
    await manager.dispose()
    listener.mockClear()
    const access = new AccessFake(new PortFake())
    permission.resolve(access)
    await enabling
    await manager.enable()
    access.change()
    expect(listener).not.toHaveBeenCalled()
    expect(access.listeners.size).toBe(0)
    expect(manager.getSnapshot()).toMatchObject({ disposed: true, enabled: false })
  })

  it('allows a new enable while old permission is pending without a second access request', async () => {
    const permission = deferred<AccessFake>()
    const requestAccess = vi.fn(() => permission.promise)
    const manager = new MidiAccessManager({ secureContext: true, requestAccess })
    const old = manager.enable()
    await manager.disable()
    const fresh = manager.enable()
    const access = new AccessFake(new PortFake())
    permission.resolve(access)
    await Promise.all([old, fresh])
    expect(manager.getSnapshot()).toMatchObject({ enabled: true, status: 'available' })
    expect(requestAccess).toHaveBeenCalledTimes(1)
    expect(access.listeners.size).toBe(1)
  })

  it('keeps the existing route when another port fails to open and never treats pending as ready', async () => {
    const old = new PortFake('old')
    const busy = new PortFake('busy')
    busy.failOpen = true
    const pending = new PortFake('pending')
    pending.pendingOpen = true
    const { manager } = fixture(old, busy, pending)
    await manager.enable()
    await manager.open('lead', old.id)
    expect(await manager.open('lead', busy.id)).toBe(false)
    expect(manager.getOpenOutput('lead')).toBe(old)
    expect(manager.getSnapshot().routes.lead).toMatchObject({ status: 'error', activePortId: old.id })
    expect(await manager.open('chord', pending.id)).toBe(false)
    expect(manager.getOpenOutput('chord')).toBeUndefined()
    expect(pending.connection).toBe('closed')
  })

  it('invalidates replaced and disconnected outputs, retaining desired IDs without reopening', async () => {
    const port = new PortFake()
    const { manager, access } = fixture(port)
    await manager.enable()
    await manager.open('lead', port.id)
    port.state = 'disconnected'
    port.connection = 'pending'
    access.outputs.delete(port.id)
    access.change()
    expect(manager.getSnapshot().routes.lead).toMatchObject({
      status: 'disconnected',
      desiredPortId: port.id,
      activePortId: null
    })
    const replacement = new PortFake(port.id)
    access.outputs.set(port.id, replacement)
    access.change()
    expect(replacement.open).not.toHaveBeenCalled()
    expect(manager.getOpenOutput('lead')).toBeUndefined()
    expect(await manager.open('lead', port.id)).toBe(true)
    await manager.disable()
    expect(port.connection).toBe('closed')
    expect(replacement.connection).toBe('closed')
  })

  it('rejects a replaced port object when its pending open settles without a hotplug event', async () => {
    const port = new PortFake()
    port.openGate = deferred<void>()
    const { manager, access } = fixture(port)
    await manager.enable()
    const opening = manager.open('lead', port.id)
    await vi.waitFor(() => expect(port.open).toHaveBeenCalledTimes(1))
    access.outputs.set(port.id, new PortFake(port.id))
    port.openGate.resolve()
    expect(await opening).toBe(false)
    expect(port.connection).toBe('closed')
    expect(manager.getSnapshot().routes.lead.status).toBe('disconnected')
  })

  it('serializes close/reopen and survives cleanup failures on all resources', async () => {
    const port = new PortFake()
    const other = new PortFake('other')
    const { manager } = fixture(port, other)
    await manager.enable()
    await manager.open('lead', port.id)
    port.closeGate = deferred<void>()
    const closing = manager.close('lead')
    await vi.waitFor(() => expect(port.close).toHaveBeenCalledTimes(1))
    const opening = manager.open('lead', port.id)
    expect(port.open).toHaveBeenCalledTimes(1)
    port.closeGate.resolve()
    await closing
    expect(await opening).toBe(true)
    expect(port.connection).toBe('open')
    await manager.open('chord', other.id)
    manager.setCleanupHook(() => {
      throw new Error('Cleanup failed')
    })
    await manager.disable()
    expect(port.connection).toBe('closed')
    expect(other.connection).toBe('closed')
    expect(manager.getSnapshot().enabled).toBe(false)
  })

  it('cancels a pending switch when the already-active port is selected again', async () => {
    const old = new PortFake('old')
    const candidate = new PortFake('candidate')
    candidate.openGate = deferred<void>()
    const { manager } = fixture(old, candidate)
    await manager.enable()
    await manager.open('lead', old.id)
    const switching = manager.open('lead', candidate.id)
    await vi.waitFor(() => expect(candidate.open).toHaveBeenCalledTimes(1))
    expect(await manager.open('lead', old.id)).toBe(true)
    candidate.openGate.resolve()
    expect(await switching).toBe(false)
    expect(manager.getOpenOutput('lead')).toBe(old)
    expect(manager.getSnapshot().routes.lead.desiredPortId).toBe(old.id)
    expect(candidate.connection).toBe('closed')
  })

  it('synchronously cancels pending opens without releasing active routes', async () => {
    const active = new PortFake('active')
    const candidate = new PortFake('candidate')
    candidate.openGate = deferred<void>()
    const { manager } = fixture(active, candidate)
    await manager.enable()
    await manager.open('lead', active.id)
    const opening = manager.open('lead', candidate.id)
    await vi.waitFor(() => expect(candidate.open).toHaveBeenCalledOnce())

    manager.cancelPending()
    expect(manager.getOpenOutput('lead')).toBe(active)
    candidate.openGate.resolve()

    expect(await opening).toBe(false)
    expect(manager.getOpenOutput('lead')).toBe(active)
    expect(candidate.connection).toBe('closed')
    expect(active.close).not.toHaveBeenCalled()
  })

  it('rejects unsafe preparation before cleaning the active route', async () => {
    const active = new PortFake('active')
    const candidate = new PortFake('candidate')
    const { manager } = fixture(active, candidate)
    const cleanup = vi.fn()
    manager.setCleanupHook(cleanup)
    await manager.enable()
    await manager.open('lead', active.id)
    cleanup.mockClear()

    expect(await manager.open('lead', candidate.id, () => false)).toBe(false)
    expect(manager.getOpenOutput('lead')).toBe(active)
    expect(cleanup).not.toHaveBeenCalled()
    expect(candidate.connection).toBe('closed')
  })

  it('prepares a candidate before cleaning the existing route', async () => {
    const active = new PortFake('active')
    const candidate = new PortFake('candidate')
    const { manager } = fixture(active, candidate)
    const order: string[] = []
    manager.setCleanupHook(() => {
      order.push('cleanup')
    })
    await manager.enable()
    await manager.open('lead', active.id)
    order.length = 0

    expect(
      await manager.open('lead', candidate.id, (port) => {
        expect(port).toBe(candidate)
        order.push('prepare')
      })
    ).toBe(true)
    expect(order).toEqual(['prepare', 'cleanup'])
    expect(manager.getOpenOutput('lead')).toBe(candidate)
  })

  it.each(['opening', 'cleanup'] as const)(
    'retains the active route if a candidate disconnects during %s',
    async (phase) => {
      const old = new PortFake('old')
      const candidate = new PortFake('candidate')
      const gate = deferred<void>()
      const { manager, access } = fixture(old, candidate)
      await manager.enable()
      await manager.open('lead', old.id)
      const hook = vi.fn(() => gate.promise)
      if (phase === 'opening') candidate.openGate = gate
      else manager.setCleanupHook(hook)
      const switching = manager.open('lead', candidate.id)
      await vi.waitFor(() => expect(phase === 'opening' ? candidate.open : hook).toHaveBeenCalledTimes(1))
      candidate.state = 'disconnected'
      access.outputs.delete(candidate.id)
      access.change()
      expect(manager.getOpenOutput('lead')).toBe(old)
      gate.resolve()
      expect(await switching).toBe(false)
      expect(manager.getOpenOutput('lead')).toBe(old)
      expect(old.close).not.toHaveBeenCalled()
      expect(candidate.connection).toBe('closed')
    }
  )

  it('waits for already-running closes on repeated disable and dispose', async () => {
    const port = new PortFake()
    const { manager } = fixture(port)
    await manager.enable()
    await manager.open('lead', port.id)
    port.closeGate = deferred<void>()
    const closing = manager.close('lead')
    await vi.waitFor(() => expect(port.close).toHaveBeenCalledTimes(1))
    const disabled = vi.fn()
    const disposed = vi.fn()
    const stopping = manager.disable().then(disabled)
    const disposing = manager.dispose().then(disposed)
    await Promise.resolve()
    await Promise.resolve()
    expect(disabled).not.toHaveBeenCalled()
    expect(disposed).not.toHaveBeenCalled()
    port.closeGate.resolve()
    await Promise.all([closing, stopping, disposing])
    expect(port.connection).toBe('closed')
    expect(port.close).toHaveBeenCalledTimes(1)
  })

  it('reports close failure without preventing other resources from closing', async () => {
    const port = new PortFake()
    const { manager } = fixture(port)
    await manager.enable()
    await manager.open('lead', port.id)
    port.failClose = true
    await manager.close('lead')
    expect(manager.getSnapshot().routes.lead).toMatchObject({ status: 'error', recovery: 'retry', activePortId: null })
    expect(manager.getOpenOutput('lead')).toBeUndefined()
  })

  it('cannot reactivate a superseded device when its open finishes late', async () => {
    const stale = new PortFake('stale')
    stale.openGate = deferred<void>()
    const fresh = new PortFake('fresh')
    const { manager } = fixture(stale, fresh)
    await manager.enable()
    const opening = manager.open('lead', stale.id)
    await vi.waitFor(() => expect(stale.open).toHaveBeenCalledTimes(1))
    expect(await manager.open('lead', fresh.id)).toBe(true)
    stale.openGate.resolve()
    expect(await opening).toBe(false)
    expect(manager.getOpenOutput('lead')).toBe(fresh)
    expect(stale.connection).toBe('closed')
    expect(manager.getSnapshot().routes.lead).toMatchObject({
      status: 'ready',
      desiredPortId: fresh.id,
      activePortId: fresh.id
    })
  })

  it('reopens safely after disable while a previous open is still pending', async () => {
    const port = new PortFake()
    port.openGate = deferred<void>()
    const { manager } = fixture(port)
    await manager.enable()
    const stale = manager.open('lead', port.id)
    await vi.waitFor(() => expect(port.open).toHaveBeenCalledTimes(1))
    const disabling = manager.disable()
    await manager.enable()
    const fresh = manager.open('lead', port.id)
    port.openGate.resolve()
    await disabling
    expect(await stale).toBe(false)
    expect(await fresh).toBe(true)
    expect(manager.getOpenOutput('lead')).toBe(port)
    expect(manager.getSnapshot().routes.lead.status).toBe('ready')
  })
})
