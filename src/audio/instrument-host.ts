import type { SynthPatch } from '../core/synth/patch'

export interface InstrumentCapabilities {
  readonly backend: string
  readonly polyphonic: boolean
  readonly scheduledNotes: boolean
  readonly continuousParameters: boolean
  readonly maxNotes?: number
  readonly maxUnisonPerOscillator?: number
}

/** The audio runtime owns the destination and clock; callers only dispatch note commands. */
export interface InstrumentHost {
  readonly capabilities: InstrumentCapabilities
  readonly latencySeconds: number
  prepare(): Promise<void>
  load(patch: SynthPatch): void
  connect(destination: AudioNode): void
  playNote(noteId: string, pitches: string | string[], duration: number | string, time: number, velocity: number): void
  noteOn(noteId: string, pitches: string | string[], time: number, velocity: number): void
  noteOff(noteId: string, time: number): void
  setParameter(id: string, value: number, time: number): void
  replacePatch(patch: SynthPatch): void
  releaseAll(time?: number): void
  panic(time?: number): void
  dispose(): void
}
