export function nextArpSeed(previous: number, draw: () => number = drawRandomSeed): number {
  const candidate = draw() >>> 0
  return candidate === previous ? (candidate + 1) >>> 0 : candidate
}

export function parseArpSeedInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const seed = Number(trimmed)
  return Number.isSafeInteger(seed) && seed <= 4_294_967_295 ? seed : null
}

function drawRandomSeed(): number {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) return cryptoApi.getRandomValues(new Uint32Array(1))[0]
  return Math.floor(Math.random() * 4_294_967_296) >>> 0
}
