import type { NativeSynthPatch } from '../../core/synth/patch'
import { parseSynthPatch } from '../../core/synth/patch'
import { PARAMETER_DESCRIPTORS, type ParameterId } from '../../core/synth/parameters'
import { decibelsToGain } from '../../core/audio/gain-staging'
import { envelopeValueAt, releaseEnd } from '../../core/synth/envelope'
import { midiToHz, trackedCutoff } from '../../core/synth/tuning'
import { unisonPositions } from '../../core/synth/unison'
import { createNativeVoiceGraph, type NativeVoiceGraph } from './native-voice-graph'
import { GlobalLfoBank, VoiceModulationRuntime } from './modulation-runtime'

interface ActiveGraph {
  graph: NativeVoiceGraph
  start: number
  midi: number
  velocity: number
  patch: NativeSynthPatch
  modulation: VoiceModulationRuntime
}

/** One note voice with overlapping release tails; allocation belongs to Task 27. */
export class NativeVoice {
  readonly output: GainNode
  private current: ActiveGraph | null = null
  private graphs = new Set<NativeVoiceGraph>()
  private patch: NativeSynthPatch
  private seed = 1
  private context: BaseAudioContext
  private readonly globalLfos: GlobalLfoBank
  private readonly ownsGlobalLfos: boolean
  private readonly appliesTrim: boolean

  constructor(context: BaseAudioContext, patch: NativeSynthPatch, globalLfos?: GlobalLfoBank, applyTrim = true) {
    this.context = context
    this.ownsGlobalLfos = !globalLfos
    this.globalLfos = globalLfos ?? new GlobalLfoBank(context, patch, 120)
    this.appliesTrim = applyTrim
    this.patch = this.validate(patch)
    this.output = context.createGain()
    this.output.gain.value = applyTrim ? decibelsToGain(patch.outputTrimDb) : 1.0
  }

  private validate(patch: NativeSynthPatch): NativeSynthPatch {
    const parsed = parseSynthPatch(patch)
    if (parsed.backend !== 'native-subtractive') throw new Error('Native subtractive patch required')
    if (parsed.filter.drive) {
      throw new Error('Filter drive requires later native runtime tasks')
    }
    if (parsed.oscillators.A.phase === 'free' || parsed.oscillators.B.phase === 'free') {
      throw new Error('Free running oscillator phase is not supported by native OscillatorNode')
    }
    return parsed
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination)
  }

  trigger(midi: number, velocity: number, time = this.context.currentTime): void {
    if (!Number.isInteger(midi) || midi < this.patch.voice.minMidi || midi > this.patch.voice.maxMidi)
      throw new RangeError('Pitch outside patch range')
    if (!Number.isFinite(velocity) || velocity < 0 || velocity > 1) throw new RangeError('Velocity must be 0–1')
    if (this.current) this.fadeOut(time)
    const start = Math.max(time, this.context.currentTime)
    const modulationOwner: { current?: VoiceModulationRuntime } = {}
    const graph = createNativeVoiceGraph(this.context, this.output, this.patch, midi, start, this.seed++, () => {
      modulationOwner.current?.dispose()
      this.graphs.delete(graph)
      if (this.graphs.size === 0) this.output.disconnect()
    })
    const modulation = new VoiceModulationRuntime(
      this.context,
      graph,
      this.patch,
      midi,
      velocity,
      start,
      this.globalLfos
    )
    modulationOwner.current = modulation
    const amp = this.patch.amp
    const peak = velocity
    graph.envelope.gain.setValueAtTime(0, start)
    graph.envelope.gain.linearRampToValueAtTime(peak, start + amp.attack)
    graph.envelope.gain.linearRampToValueAtTime(peak * amp.sustain, start + amp.attack + Math.max(amp.decay, 0.0001))
    this.graphs.add(graph)
    this.current = { graph, start, midi, velocity, patch: this.patch, modulation }
  }

  glideTo(midi: number, time: number, seconds: number): void {
    const active = this.current
    if (!active) return
    const when = Math.max(time, this.context.currentTime)
    for (const key of ['A', 'B'] as const) {
      const config = active.patch.oscillators[key]
      const positions = unisonPositions(config.unison, config.unisonDetuneCents, config.panSpread)
      active.graph.groups[key].forEach((osc, index) => {
        const frequency = midiToHz(midi, config.detuneCents + positions[index].detuneCents)
        osc.frequency.cancelScheduledValues(when)
        osc.frequency.setValueAtTime(osc.frequency.value, when)
        if (seconds > 0) osc.frequency.exponentialRampToValueAtTime(frequency, when + seconds)
        else osc.frequency.setValueAtTime(frequency, when)
      })
    }
    for (const filter of active.graph.filters) {
      filter.frequency.setTargetAtTime(
        trackedCutoff(active.patch.filter.cutoffHz, midi, active.patch.filter.keytracking, this.context.sampleRate),
        when,
        Math.max(0.001, seconds / 3)
      )
    }
    const sub = active.graph.oscillators.at(-1)
    if (sub) sub.frequency.setTargetAtTime(midiToHz(midi - 12), when, Math.max(0.001, seconds / 3))
    active.midi = midi
  }

  fadeOut(time = this.context.currentTime, seconds = 0.005): void {
    const active = this.current
    this.current = null
    for (const graph of this.graphs) {
      const when = Math.max(time, this.context.currentTime)
      graph.envelope.gain.cancelScheduledValues(when)
      graph.envelope.gain.setValueAtTime(graph.envelope.gain.value, when)
      graph.envelope.gain.linearRampToValueAtTime(0, when + seconds)
      graph.stop(when + seconds + 0.002)
    }
    active?.modulation.release(Math.max(time, this.context.currentTime))
  }

  release(time = this.context.currentTime): void {
    const active = this.current
    if (!active) return
    const when = Math.max(time, active.start, this.context.currentTime)
    const { gain } = active.graph.envelope
    gain.cancelScheduledValues(when)
    const level = active.velocity * envelopeValueAt(when - active.start, active.patch.amp)
    gain.setValueAtTime(level, when)
    const end = releaseEnd(when, active.patch.amp)
    gain.linearRampToValueAtTime(0, end)
    active.modulation.release(when)
    active.graph.stop(end + 0.002)
  }

  setTempo(bpm: number, time = this.context.currentTime): void {
    this.current?.modulation.setTempo(bpm, time)
  }

  setMacro(index: number, value: number, time = this.context.currentTime): void {
    this.current?.modulation.setMacro(index, value, time)
  }

  setParameter(id: ParameterId, value: number, time = this.context.currentTime): void {
    const descriptor = PARAMETER_DESCRIPTORS[id]
    if (
      !descriptor ||
      descriptor.update === 'topology' ||
      !Number.isFinite(value) ||
      value < descriptor.min ||
      value > descriptor.max
    ) {
      throw new RangeError(`Unsupported continuous value for ${id}`)
    }
    const patch = structuredClone(this.patch)
    const target: AudioParam[] = []
    const active = this.current
    if (active?.modulation.hasTarget(id)) active.modulation.setBase(id, value, Math.max(time, this.context.currentTime))
    if (id === 'outputTrimDb') {
      patch.outputTrimDb = value
      if (this.appliesTrim) target.push(this.output.gain)
    } else if (id === 'filter.cutoffHz') {
      patch.filter.cutoffHz = value
      if (active) for (const node of active.graph.filters) target.push(node.frequency)
    } else if (id === 'filter.resonance') {
      patch.filter.resonance = value
      if (active) for (const node of active.graph.filters) target.push(node.Q)
    } else if (id === 'oscA.levelDb' || id === 'oscB.levelDb') {
      const key = id === 'oscA.levelDb' ? 'A' : 'B'
      patch.oscillators[key].levelDb = value
      if (active) {
        if (patch.oscillators[key].enabled !== false) {
          target.push(active.graph.sourceGains[key].gain)
        }
        const sourceSum =
          (patch.oscillators.A.enabled !== false ? decibelsToGain(patch.oscillators.A.levelDb) : 0) +
          (patch.oscillators.B.enabled !== false ? decibelsToGain(patch.oscillators.B.levelDb) : 0) +
          (patch.sub.enabled !== false ? decibelsToGain(patch.sub.levelDb) : 0) +
          (patch.noise.enabled !== false ? decibelsToGain(patch.noise.levelDb) : 0)
        active.graph.mix.gain.setTargetAtTime(
          1 / Math.max(1, sourceSum),
          Math.max(time, this.context.currentTime),
          0.007
        )
      }
    } else if (id === 'oscA.detuneCents' || id === 'oscB.detuneCents') {
      const key = id === 'oscA.detuneCents' ? 'A' : 'B'
      patch.oscillators[key].detuneCents = value
      if (active && !active.modulation.hasTarget(id)) {
        const config = patch.oscillators[key]
        const positions = unisonPositions(config.unison, config.unisonDetuneCents, config.panSpread)
        active.graph.groups[key].forEach((osc, index) => {
          osc.frequency.setTargetAtTime(
            midiToHz(active.midi, value + positions[index].detuneCents),
            Math.max(time, this.context.currentTime),
            0.007
          )
        })
      }
    } else if (id === 'oscA.unisonDetuneCents' || id === 'oscB.unisonDetuneCents') {
      const key = id === 'oscA.unisonDetuneCents' ? 'A' : 'B'
      patch.oscillators[key].unisonDetuneCents = value
      if (active) {
        const config = patch.oscillators[key]
        const positions = unisonPositions(config.unison, value, config.panSpread)
        active.graph.groups[key].forEach((osc, index) => {
          osc.frequency.setTargetAtTime(
            midiToHz(active.midi, config.detuneCents + positions[index].detuneCents),
            Math.max(time, this.context.currentTime),
            0.007
          )
        })
      }
    } else if (id.startsWith('amp.')) {
      const key = id.slice(4) as keyof NativeSynthPatch['amp']
      patch.amp[key] = value
    } else throw new Error(`Unsupported parameter: ${id}`)
    this.patch = this.validate(patch)
    const scheduled = Math.max(time, this.context.currentTime)
    for (const param of active?.modulation.hasTarget(id) ? [] : target) {
      const mapped =
        id === 'outputTrimDb' || id.endsWith('levelDb')
          ? decibelsToGain(value)
          : id === 'filter.cutoffHz' && active
            ? trackedCutoff(value, active.midi, patch.filter.keytracking, this.context.sampleRate)
            : value
      param.setTargetAtTime(mapped, scheduled, Math.max(0.001, descriptor.smoothingSeconds / 3))
    }
  }

  replacePatch(patch: NativeSynthPatch): void {
    const next = this.validate(patch)
    this.release()
    this.patch = next
    this.output.gain.setTargetAtTime(decibelsToGain(next.outputTrimDb), this.context.currentTime, 0.007)
  }

  panic(): void {
    this.fadeOut(this.context.currentTime)
  }

  dispose(): void {
    this.panic()
    this.output.disconnect()
    if (this.ownsGlobalLfos) this.globalLfos.dispose()
  }
}
