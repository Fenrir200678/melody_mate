import { afterEach, describe, expect, it, vi } from 'vitest'

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'window')
  }
})

describe('getBrowserStorage', () => {
  it('does not access localStorage in plugin mode', async () => {
    const localStorageGetter = vi.fn(() => {
      throw new Error('localStorage must not be accessed')
    })
    const browserWindow = {}
    Object.defineProperty(browserWindow, 'localStorage', { get: localStorageGetter })
    Object.defineProperty(globalThis, 'window', { configurable: true, value: browserWindow })
    vi.stubEnv('MODE', 'plugin')
    vi.resetModules()

    const { IS_PLUGIN } = await import('../../src/platform/environment')
    const { getBrowserStorage } = await import('../../src/platform/storage')

    expect(IS_PLUGIN).toBe(true)
    expect(getBrowserStorage()).toBeUndefined()
    expect(localStorageGetter).not.toHaveBeenCalled()
  })

  it('returns browser storage when available and handles a throwing getter', async () => {
    const browserStorage = {} as Storage
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: browserStorage }
    })
    vi.stubEnv('MODE', 'test')
    vi.resetModules()

    const { IS_PLUGIN } = await import('../../src/platform/environment')
    const { getBrowserStorage } = await import('../../src/platform/storage')

    expect(IS_PLUGIN).toBe(false)
    expect(getBrowserStorage()).toBe(browserStorage)

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: Object.defineProperty({}, 'localStorage', {
        get() {
          throw new Error('Storage access is blocked')
        }
      })
    })
    expect(getBrowserStorage()).toBeUndefined()
  })
})
