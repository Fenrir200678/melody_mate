import type { NativeSynthPatch } from './patch'

export type AmpEnvelope = NativeSynthPatch['amp']

export function envelopeValueAt(elapsed: number, amp: AmpEnvelope): number {
  if (elapsed <= 0) return 0
  if (elapsed < amp.attack) return elapsed / amp.attack
  if (amp.decay === 0) return amp.sustain
  return amp.sustain + (1 - amp.sustain) * Math.max(0, 1 - (elapsed - amp.attack) / amp.decay)
}

export function releaseEnd(time: number, amp: AmpEnvelope): number {
  return time + amp.release
}
