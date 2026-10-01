export function createRng(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed(): number {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) {
    return cryptoApi.getRandomValues(new Uint32Array(1))[0]
  }
  return Math.floor(Math.random() * 4294967296) >>> 0
}

export function createId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID().replaceAll('-', '').slice(0, 12)

  const bytes = new Uint8Array(6)
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes)
  else bytes.forEach((_, index) => (bytes[index] = Math.floor(Math.random() * 256)))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
