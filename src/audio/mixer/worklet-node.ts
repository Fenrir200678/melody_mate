import * as Tone from 'tone'
import type { WorkletNodeFactory } from './metering'

/**
 * Tone wraps its raw context with `standardized-audio-context`, so worklet nodes must be
 * created through Tone's context-aware factory instead of the native constructor.
 */
export const createWorkletNode: WorkletNodeFactory = (name, options) =>
  Tone.getContext().createAudioWorkletNode(name, options) as unknown as AudioWorkletNode
