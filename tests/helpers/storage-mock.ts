/**
 * Minimal `window.localStorage` double for Node tests. It can fail writes for a specific key so
 * quota/commit-marker failure paths stay testable without a browser.
 */
export interface MockLocalStorage {
  storage: Storage
  failWritesFor: (key: string | null) => void
}

export function installMockLocalStorage(): MockLocalStorage {
  const map = new Map<string, string>()
  let failingKey: string | null = null

  const storage: Storage = {
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      if (failingKey !== null && failingKey === key) throw new Error('Quota exceeded')
      map.set(key, String(value))
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size
    }
  }

  const globalWindow = globalThis as unknown as { window?: { localStorage?: Storage } }
  globalWindow.window = { ...(globalWindow.window ?? {}), localStorage: storage }
  ;(globalThis as unknown as { localStorage?: Storage }).localStorage = storage

  return {
    storage,
    failWritesFor: (key: string | null) => {
      failingKey = key
    }
  }
}
