/**
 * Pure timing policy for voice-graph replacement and abrupt silencing.
 *
 * Replacing an instrument disposes the previous graph immediately. That truncates notes that are
 * still sounding, so the runtime instead prepares the new graph, crossfades the two outputs and
 * retires the old graph under a bounded tail lifetime. Both graphs are audible during the
 * crossfade, which temporarily doubles CPU and level; the equal-power split below keeps the
 * summed linear gain at unity, so no headroom is added or removed.
 */

/** Temporary overlap window where two voice graphs are summed. */
export const DEFAULT_CROSSFADE_SECONDS = 0.05

/** Fallback graph retention when a patch exposes no finite release time. */
export const DEFAULT_TAIL_LIFETIME_SECONDS = 1.2

/** Notes are released this long after the crossfade, so the audible level is already zero. */
export const TAIL_RELEASE_FRACTION = 0.4

/** Disposal happens only after `release`, once the bounded tail has decayed. */
export const TAIL_DECAY_MARGIN_SECONDS = 0.5

export const MIN_FADE_SECONDS = 0.005
export const MAX_FADE_SECONDS = 1

export interface VoiceGraphTimeline {
  /** Crossfade length applied to both the new and the retired voice graph. */
  crossfadeSeconds: number
  /** Time after the crossfade start at which the retired graph is released. */
  releaseAfterSeconds: number
  /** Time after the crossfade start at which the retired graph may be disposed. */
  disposeAfterSeconds: number
  /** Retained tail budget derived from the patch release time. */
  tailSeconds: number
}

export function clampFadeSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_CROSSFADE_SECONDS
  return Math.min(MAX_FADE_SECONDS, Math.max(MIN_FADE_SECONDS, seconds))
}

/**
 * Reads a synth release time in seconds from a Tone options bag. Tone accepts either a number or
 * a time string such as `'8n'`, which cannot be converted without the transport, so non-numeric
 * release values fall back to the bounded default lifetime.
 */
export function extractReleaseSeconds(options: Record<string, unknown> | null | undefined): number {
  const envelope = options?.envelope
  if (!envelope || typeof envelope !== 'object') return 0
  const release = (envelope as { release?: unknown }).release
  if (typeof release !== 'number' || !Number.isFinite(release) || release < 0) return 0
  return release
}

export function planVoiceGraphTimeline(
  releaseSeconds: number,
  crossfadeSeconds: number = DEFAULT_CROSSFADE_SECONDS
): VoiceGraphTimeline {
  const crossfade = clampFadeSeconds(crossfadeSeconds)
  const tailSeconds =
    Number.isFinite(releaseSeconds) && releaseSeconds > 0
      ? Math.min(releaseSeconds, DEFAULT_TAIL_LIFETIME_SECONDS)
      : DEFAULT_TAIL_LIFETIME_SECONDS
  return {
    crossfadeSeconds: crossfade,
    releaseAfterSeconds: crossfade + tailSeconds * TAIL_RELEASE_FRACTION,
    disposeAfterSeconds: crossfade + tailSeconds + TAIL_DECAY_MARGIN_SECONDS,
    tailSeconds
  }
}

/** Linear crossfade pair whose sum stays at unity. */
export function crossfadeGainPair(progress: number): { outgoing: number; incoming: number } {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 1))
  return { outgoing: 1 - clamped, incoming: clamped }
}

/** Fade lengths per transport/preview action; silence first, then recover on the audio clock. */
export interface SilencePolicy {
  fadeInSeconds: number
  fadeOutSeconds: number
}

export const PANIC_SILENCE_POLICY: SilencePolicy = { fadeInSeconds: 0.008, fadeOutSeconds: 0.035 }
export const TRUNCATE_SILENCE_POLICY: SilencePolicy = { fadeInSeconds: 0.006, fadeOutSeconds: 0.012 }
