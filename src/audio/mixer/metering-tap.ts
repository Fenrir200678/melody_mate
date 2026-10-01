import * as Tone from 'tone'
import { createPassThroughMeter, MasterMetering, type MasterMeterReadings } from './metering'
import { createWorkletNode } from './worklet-node'

export interface MeterInsertTarget {
  /** Node carrying the signal to tap. */
  readonly source: Tone.ToneAudioNode
  /** Node that must receive the signal again after the tap. */
  readonly destination: Tone.ToneAudioNode
  /**
   * Raw input of `destination`. Resolved lazily, because it only exists on a real audio graph
   * and must stay untouched when the worklet context is unavailable.
   */
  readonly destinationInput: () => AudioNode
}

export interface MeterInsertTargets {
  readonly preMaster: MeterInsertTarget
  readonly postMaster: MeterInsertTarget
}

/**
 * Inserts the pass-through metering worklets into the master path. Both worklets are created
 * before any re-routing happens, so a failed load leaves the existing graph untouched and the
 * rack can keep reporting levels through its legacy meter.
 */
export class MasterMeteringTap {
  private readonly metering = new MasterMetering()
  private preMasterWorklet: AudioWorkletNode | null = null
  private postMasterWorklet: AudioWorkletNode | null = null
  private error: string | null = null

  async initialize(createTargets: () => MeterInsertTargets): Promise<boolean> {
    if (this.preMasterWorklet && this.postMasterWorklet) return true
    const context = Tone.getContext().rawContext
    if (!context || !('audioWorklet' in context)) return false

    try {
      const [preMaster, postMaster] = await Promise.all([
        createPassThroughMeter(
          context as BaseAudioContext,
          (reading) => this.metering.update('preMaster', reading),
          createWorkletNode
        ),
        createPassThroughMeter(
          context as BaseAudioContext,
          (reading) => this.metering.update('postMaster', reading),
          createWorkletNode
        )
      ])

      const targets = createTargets()
      this.insert(preMaster, targets.preMaster)
      this.insert(postMaster, targets.postMaster)
      this.preMasterWorklet = preMaster
      this.postMasterWorklet = postMaster
      this.error = null
      return true
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Metering worklets failed to load.'
      return false
    }
  }

  getReadings(): MasterMeterReadings {
    return this.metering.getReadings()
  }

  getError(): string | null {
    return this.error
  }

  dispose(): void {
    this.preMasterWorklet?.disconnect()
    this.preMasterWorklet = null
    this.postMasterWorklet?.disconnect()
    this.postMasterWorklet = null
  }

  private insert(worklet: AudioWorkletNode, target: MeterInsertTarget): void {
    target.source.disconnect(target.destination)
    target.source.connect(worklet as unknown as Tone.ToneAudioNode)
    worklet.connect(target.destinationInput())
  }
}
