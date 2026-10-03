import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { isReactive } from 'vue'

const { toneMock } = await vi.hoisted(async () => {
  const { createToneMock } = await import('../helpers/tone-mock')
  const created = createToneMock()
  return { toneMock: created.toneMock }
})
vi.mock('tone', () => toneMock)

import { useMidiOutputStore } from '../../src/stores/midi-output.store'
import { DEFAULT_MIDI_ENABLED_ROUTE_MODE } from '../../src/config/defaults'
import { AccessFake, PortFake } from '../audio/midi/port-fake'

describe('MIDI output store snapshots', () => {
  let pinia: ReturnType<typeof createPinia>
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    const context = { ...toneMock.getContext(), lookAhead: 0.1, updateInterval: 0.05 }
    toneMock.getContext.mockReturnValue(context as never)
  })

  afterEach(() => {
    disposePinia(pinia)
    vi.unstubAllGlobals()
  })

  it('orchestrates explicit actions with plain status state and no port reactivity', async () => {
    const port = new PortFake()
    const access = new AccessFake(port)
    const requestMIDIAccess = vi.fn(async () => access)
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { requestMIDIAccess })
    const store = useMidiOutputStore()
    expect(store.snapshot.status).toBe('not-enabled')
    expect(requestMIDIAccess).not.toHaveBeenCalled()
    await store.enable()
    expect(store.snapshot.status).toBe('available')
    expect(isReactive(port)).toBe(false)
    expect(store.snapshot.outputs[0]).not.toBe(port)
    expect(Object.keys(store.$state)).toEqual(['snapshot', 'settings'])
    await store.open('lead', port.id)
    expect(store.snapshot.routes.lead.status).toBe('ready')
    await store.disable()
    expect(store.snapshot.enabled).toBe(false)
    expect(store.snapshot.outputs).toEqual([])
    store.$dispose()
    expect(access.listeners.size).toBe(0)
  })

  it('detaches runtime listeners when the Pinia scope is disposed', async () => {
    const access = new AccessFake()
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { requestMIDIAccess: async () => access })
    const store = useMidiOutputStore()
    await store.enable()
    expect(store.snapshot.status).toBe('no-outputs')
    disposePinia(pinia)
    expect(access.listeners.size).toBe(0)
    access.outputs.set('new', new PortFake('new'))
    access.change()
    expect(store.snapshot.outputs).toEqual([])
  })

  it('keeps shared access alive until the last runtime owner releases it', async () => {
    const access = new AccessFake(new PortFake())
    const requestMIDIAccess = vi.fn(async () => access)
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { requestMIDIAccess })
    const first = useMidiOutputStore(pinia)
    const secondPinia = createPinia()
    const second = useMidiOutputStore(secondPinia)
    try {
      await first.enable()
      expect(second.snapshot.enabled).toBe(true)
      disposePinia(pinia)
      expect(access.listeners.size).toBe(1)
      await second.open('chord', 'output-a')
      expect(second.snapshot.routes.chord.status).toBe('ready')
      expect(requestMIDIAccess).toHaveBeenCalledTimes(1)
    } finally {
      disposePinia(secondPinia)
    }
    expect(access.listeners.size).toBe(0)
  })

  it('automatically routes tracks to MIDI when enabled with autoRoute and reverts on disable', async () => {
    const port = new PortFake('default-port')
    const access = new AccessFake(port)
    const requestMIDIAccess = vi.fn(async () => access)
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { requestMIDIAccess })
    const store = useMidiOutputStore()

    expect(store.settings.lead.mode).toBe('internal')
    expect(store.settings.chord.mode).toBe('internal')

    await store.enable({ autoRoute: true })

    expect(store.settings.lead.mode).toBe(DEFAULT_MIDI_ENABLED_ROUTE_MODE)
    expect(store.settings.lead.port?.id).toBe('default-port')
    expect(store.settings.lead.channel).toBe(1)

    expect(store.settings.chord.mode).toBe(DEFAULT_MIDI_ENABLED_ROUTE_MODE)
    expect(store.settings.chord.port?.id).toBe('default-port')
    expect(store.settings.chord.channel).toBe(2)

    await store.disable()

    expect(store.settings.lead.mode).toBe('internal')
    expect(store.settings.chord.mode).toBe('internal')
  })
})
