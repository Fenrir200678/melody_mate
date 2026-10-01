export function midiToHz(midi: number, detuneCents = 0): number {
  return 440 * 2 ** ((midi - 69 + detuneCents / 100) / 12)
}

export function trackedCutoff(cutoffHz: number, midi: number, amount: number, sampleRate: number): number {
  return Math.max(20, Math.min(sampleRate * 0.45, cutoffHz * 2 ** (((midi - 60) * amount) / 12)))
}
