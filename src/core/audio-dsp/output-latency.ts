/**
 * Shared playback/display latency policy. The output protection stage delays the audible signal
 * by a fixed lookahead, so the transport position a listener hears is earlier than the raw
 * transport clock. Visual position must use the compensated value; scheduling must not.
 */
export function compensateOutputLatency(transportSeconds: number, latencySeconds: number): number {
  if (!Number.isFinite(transportSeconds)) return 0
  const latency = Number.isFinite(latencySeconds) && latencySeconds > 0 ? latencySeconds : 0
  return Math.max(0, transportSeconds - latency)
}

export function transportSecondsToPlayheadStep(
  transportSeconds: number,
  stepDurationSeconds: number,
  latencySeconds: number
): number {
  if (!Number.isFinite(stepDurationSeconds) || stepDurationSeconds <= 0) return 0
  return compensateOutputLatency(transportSeconds, latencySeconds) / stepDurationSeconds
}

export function latencySamplesToSeconds(latencySamples: number, sampleRate: number): number {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return 0
  const samples = Number.isFinite(latencySamples) && latencySamples > 0 ? latencySamples : 0
  return samples / sampleRate
}
