import type * as Tone from 'tone'
import type { InstrumentHost } from '../instrument-host'
import type { EffectsRack, TrackId } from '../mixer'
import { extractReleaseSeconds, planVoiceGraphTimeline } from '../../core/audio/voice-lifecycle'

type RetireTimer = ReturnType<typeof setTimeout>

/** A voice graph that is crossfaded out and disposed after its bounded tail lifetime. */
interface RetiredVoiceGraph {
  gain: Tone.Gain
  synth: InstrumentHost
  disposeTimer: RetireTimer | null
}

/**
 * Owns the crossfade-and-retire lifecycle of replaced voice graphs.
 *
 * Replacing an instrument disposes the previous graph immediately, which truncates notes that are
 * still sounding. The manager instead crossfades the new graph in, keeps the retired graph audible
 * for its bounded tail lifetime and only then silences and disposes it. The replace/dispose paths
 * are guarded so the dispose timer and an explicit `dispose()` cannot finalize a graph twice.
 */
export class VoiceGraphManager {
  private readonly retireTimers = new Set<RetireTimer>()
  private retiredGraphs: RetiredVoiceGraph[] = []

  private readonly effectsRack: EffectsRack

  constructor(effectsRack: EffectsRack) {
    this.effectsRack = effectsRack
  }

  replace(
    track: TrackId,
    next: InstrumentHost,
    retired: InstrumentHost | null,
    options: Record<string, unknown>
  ): void {
    const timeline = planVoiceGraphTimeline(extractReleaseSeconds(options))
    const outgoing = this.effectsRack.replaceVoiceGraph(
      track,
      (target) => next.connect(target as unknown as AudioNode),
      timeline.crossfadeSeconds
    )
    if (!retired) {
      this.effectsRack.releaseVoiceGraph(outgoing)
      outgoing.dispose()
      return
    }

    const entry: RetiredVoiceGraph = { gain: outgoing, synth: retired, disposeTimer: null }
    this.retiredGraphs.push(entry)
    const disposeTimer = setTimeout(() => {
      this.retireTimers.delete(disposeTimer)
      this.finalize(entry)
    }, timeline.disposeAfterSeconds * 1000)
    entry.disposeTimer = disposeTimer
    this.retireTimers.add(disposeTimer)
  }

  /**
   * Silences and disposes a retired voice graph exactly once. The dispose timer and an explicit
   * `dispose()` call can both reach this path, so the entry guards against double disposal.
   */
  private finalize(entry: RetiredVoiceGraph): void {
    if (entry.disposeTimer) {
      clearTimeout(entry.disposeTimer)
      this.retireTimers.delete(entry.disposeTimer)
      entry.disposeTimer = null
    }
    const index = this.retiredGraphs.indexOf(entry)
    if (index < 0) return
    this.retiredGraphs.splice(index, 1)
    this.effectsRack.releaseVoiceGraph(entry.gain)
    entry.synth.dispose()
    entry.gain.dispose()
  }

  dispose(): void {
    for (const timer of this.retireTimers) clearTimeout(timer)
    this.retireTimers.clear()
    for (const entry of [...this.retiredGraphs]) this.finalize(entry)
    this.retiredGraphs = []
  }
}
