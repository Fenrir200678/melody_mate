/**
 * Computes a stable fingerprint for a defaults object from `src/config/`.
 *
 * Persisted settings stamp this fingerprint into their storage payload. When defaults change in
 * code, payloads saved by older app versions no longer match and are discarded instead of
 * shadowing the new config defaults during hydration. This keeps `src/config/defaults.ts`
 * authoritative across restarts without manual storage version bumps.
 */
export function defaultsFingerprint(defaults: object): string {
  const payload = JSON.stringify(defaults)
  // FNV-1a (32-bit): deterministic across runs and platforms for identical key order.
  let hash = 0x811c9dc5
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
