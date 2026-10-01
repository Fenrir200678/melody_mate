import { parseSynthPatch, type SynthPatch } from '../../core/synth/patch'
import type * as Tone from 'tone'
import type { SynthPresetDefinition } from '../../core/presets/synths'
import type { InstrumentHost } from '../instrument-host'
import { createSynthFromDefinition, disposeSynth } from './tone-synth-factory'

export class ToneInstrument implements InstrumentHost {
  readonly capabilities = {
    backend: 'tone',
    polyphonic: true,
    scheduledNotes: true,
    continuousParameters: true
  } as const
  readonly latencySeconds = 0
  private readonly active = new Map<string, string[]>()
  private synth: Tone.PolySynth

  constructor(patch: SynthPresetDefinition) {
    const validated = parseSynthPatch(patch)
    if (validated.backend !== 'tone') throw new Error('ToneInstrument requires a Tone patch')
    this.synth = createSynthFromDefinition(validated)
  }

  async prepare(): Promise<void> {
    return Promise.resolve()
  }

  load(patch: SynthPatch): void {
    this.replacePatch(patch)
  }

  connect(destination: AudioNode): void {
    this.synth.connect(destination as unknown as Tone.ToneAudioNode)
  }

  playNote(
    _noteId: string,
    pitches: string | string[],
    duration: number | string,
    time: number,
    velocity: number
  ): void {
    this.synth.triggerAttackRelease(pitches, duration, time, velocity)
  }

  noteOn(noteId: string, pitches: string | string[], time: number, velocity: number): void {
    const notes = Array.isArray(pitches) ? pitches : [pitches]
    this.active.set(noteId, notes)
    this.synth.triggerAttack(notes, time, velocity)
  }

  noteOff(noteId: string, time: number): void {
    const notes = this.active.get(noteId)
    if (!notes) return
    this.active.delete(noteId)
    this.synth.triggerRelease(notes, time)
  }

  setParameter(id: string, value: number, _time: number): void {
    if (id === 'volume') this.synth.volume.value = value
  }

  replacePatch(patch: SynthPatch): void {
    const validated = parseSynthPatch(patch)
    if (validated.backend !== 'tone') throw new Error('ToneInstrument requires a Tone patch')
    this.synth.set(validated.options)
  }

  releaseAll(time?: number): void {
    this.active.clear()
    this.synth.releaseAll(time)
  }

  panic(time?: number): void {
    this.releaseAll(time)
  }

  dispose(): void {
    this.active.clear()
    disposeSynth(this.synth)
  }
}
