import type { NativeSynthPatch } from '../../core/synth/patch'
import { modulationSourceValue } from '../../core/synth/modulation'
import { parameterFromNormalized, parameterToNormalized, type ParameterId } from '../../core/synth/parameters'
import { decibelsToGain } from '../../core/audio/gain-staging'
import { trackedCutoff } from '../../core/synth/tuning'
import type { NativeVoiceGraph } from './native-voice-graph'

type TargetId =
  'filter.cutoffHz' | 'filter.resonance' | 'oscA.levelDb' | 'oscB.levelDb' | 'oscA.detuneCents' | 'oscB.detuneCents'
const targets: TargetId[] = [
  'filter.cutoffHz',
  'filter.resonance',
  'oscA.levelDb',
  'oscB.levelDb',
  'oscA.detuneCents',
  'oscB.detuneCents'
]

function baseValue(patch: NativeSynthPatch, id: TargetId): number {
  if (id === 'filter.cutoffHz') return patch.filter.cutoffHz
  if (id === 'filter.resonance') return patch.filter.resonance
  const key = id.startsWith('oscA') ? 'A' : 'B'
  return id.endsWith('levelDb') ? patch.oscillators[key].levelDb : patch.oscillators[key].detuneCents
}

function destination(graph: NativeVoiceGraph, id: TargetId): AudioParam[] {
  if (id === 'filter.cutoffHz') return graph.filters.map((node) => node.frequency)
  if (id === 'filter.resonance') return graph.filters.map((node) => node.Q)
  const key = id.startsWith('oscA') ? 'A' : 'B'
  if (id.endsWith('levelDb')) return [graph.sourceGains[key].gain]
  return graph.groups[key].map((osc) => osc.detune)
}

function mappedValue(
  id: TargetId,
  normalized: number,
  patch: NativeSynthPatch,
  midi: number,
  sampleRate: number
): number {
  const value = parameterFromNormalized(id, normalized)
  if (id === 'filter.cutoffHz') return trackedCutoff(value, midi, patch.filter.keytracking, sampleRate)
  if (id.endsWith('levelDb')) return decibelsToGain(value)
  if (id.endsWith('detuneCents')) return value - baseValue(patch, id)
  return value
}

function syncFrequency(rate: number, sync: boolean, bpm: number): number {
  // A synced rate is cycles per quarter note; both modes remain bounded control-rate modulation.
  return sync ? (bpm / 60) * rate : rate
}

export class GlobalLfoBank {
  private readonly oscillators: (OscillatorNode | null)[] = [null, null]
  private readonly patch: NativeSynthPatch
  private bpm: number

  constructor(context: BaseAudioContext, patch: NativeSynthPatch, bpm: number) {
    this.patch = patch
    this.bpm = bpm
    patch.lfos.forEach((config, index) => {
      if (config.retrigger || !patch.modulation.some((route) => route.source === `lfo${index + 1}`)) return
      const oscillator = context.createOscillator()
      oscillator.type = config.waveform
      oscillator.frequency.value = syncFrequency(config.rate, config.sync, bpm)
      oscillator.start()
      this.oscillators[index] = oscillator
    })
  }

  source(index: number): OscillatorNode | null {
    return this.oscillators[index]
  }

  setTempo(bpm: number, time: number): void {
    this.bpm = bpm
    this.oscillators.forEach((oscillator, index) => {
      if (oscillator && this.patch.lfos[index].sync)
        oscillator.frequency.setTargetAtTime(syncFrequency(this.patch.lfos[index].rate, true, bpm), time, 0.01)
    })
  }

  get tempo(): number {
    return this.bpm
  }

  dispose(): void {
    for (const oscillator of this.oscillators) {
      if (!oscillator) continue
      oscillator.stop()
      oscillator.disconnect()
    }
  }
}

export class VoiceModulationRuntime {
  private readonly nodes: AudioNode[] = []
  private readonly ownedSources: AudioScheduledSourceNode[] = []
  private readonly sharedConnections: { source: AudioNode; destination: AudioNode }[] = []
  private readonly sources = new Map<string, AudioNode>()
  private readonly envelopes: ConstantSourceNode[] = []
  private readonly localLfos: OscillatorNode[] = []
  private readonly bases = new Map<TargetId, ConstantSourceNode>()
  private readonly patch: NativeSynthPatch
  private readonly start: number
  private released = false

  constructor(
    context: BaseAudioContext,
    graph: NativeVoiceGraph,
    patch: NativeSynthPatch,
    midi: number,
    velocity: number,
    start: number,
    global: GlobalLfoBank
  ) {
    this.patch = patch
    this.start = start
    const used = new Set<string>(patch.modulation.map((route) => route.source))
    patch.modEnvelopes.forEach((envelope, index) => {
      const name = `modEnv${index + 1}`
      if (!used.has(name)) return
      const source = context.createConstantSource()
      source.offset.setValueAtTime(-1, start)
      source.offset.linearRampToValueAtTime(1, start + envelope.attack)
      source.offset.linearRampToValueAtTime(
        envelope.sustain * 2 - 1,
        start + envelope.attack + Math.max(envelope.decay, 0.0001)
      )
      source.start(start)
      this.envelopes[index] = source
      this.sources.set(name, source)
      this.nodes.push(source)
      this.ownedSources.push(source)
    })
    patch.lfos.forEach((config, index) => {
      const name = `lfo${index + 1}`
      if (!used.has(name)) return
      const shared = global.source(index)
      if (shared) this.sources.set(name, shared)
      else {
        const oscillator = context.createOscillator()
        oscillator.type = config.waveform
        oscillator.frequency.value = syncFrequency(config.rate, config.sync, global.tempo)
        oscillator.start(start)
        this.sources.set(name, oscillator)
        this.localLfos[index] = oscillator
        this.nodes.push(oscillator)
        this.ownedSources.push(oscillator)
      }
    })
    const constants: Record<string, number> = {
      velocity: velocity * 2 - 1,
      keytrack: Math.max(-1, Math.min(1, (midi - 60) / 60))
    }
    patch.macros.forEach((value, index) => {
      constants[`macro${index + 1}`] = value * 2 - 1
    })
    for (const [name, value] of Object.entries(constants)) {
      if (!used.has(name)) continue
      const source = context.createConstantSource()
      source.offset.value = value
      source.start(start)
      this.sources.set(name, source)
      this.nodes.push(source)
      this.ownedSources.push(source)
    }
    for (const id of targets) {
      const routes = patch.modulation.filter((route) => route.target === id)
      if (!routes.length) continue
      const base = context.createConstantSource()
      base.offset.value = parameterToNormalized(id, baseValue(patch, id))
      base.start(start)
      this.bases.set(id, base)
      this.nodes.push(base)
      this.ownedSources.push(base)
      const sum = context.createGain()
      sum.gain.value = 1
      base.connect(sum)
      this.nodes.push(sum)
      for (const route of routes) {
        const source = this.sources.get(route.source)!
        const curve = context.createWaveShaper()
        curve.curve = Float32Array.from({ length: 1025 }, (_, index) =>
          modulationSourceValue(index / 512 - 1, route.polarity, route.curve)
        )
        const depth = context.createGain()
        depth.gain.value = route.depth
        source.connect(curve).connect(depth).connect(sum)
        if (route.source.startsWith('lfo') && !this.ownedSources.includes(source as AudioScheduledSourceNode))
          this.sharedConnections.push({ source, destination: curve })
        this.nodes.push(curve, depth)
      }
      const shape = context.createWaveShaper()
      shape.curve = Float32Array.from({ length: 2049 }, (_, index) =>
        mappedValue(id, index / 1024 - 1, patch, midi, context.sampleRate)
      )
      sum.connect(shape)
      this.nodes.push(shape)
      for (const param of destination(graph, id)) {
        param.setValueAtTime(0, start)
        shape.connect(param)
      }
    }
  }

  hasTarget(id: string): boolean {
    return this.bases.has(id as TargetId)
  }

  setMacro(index: number, value: number, time: number): void {
    const source = this.sources.get(`macro${index + 1}`) as ConstantSourceNode | undefined
    source?.offset.setTargetAtTime(value * 2 - 1, time, 0.007)
  }

  setBase(id: string, value: number, time: number): void {
    const source = this.bases.get(id as TargetId)
    if (source) source.offset.setTargetAtTime(parameterToNormalized(id as ParameterId, value), time, 0.007)
  }

  setTempo(bpm: number, time: number): void {
    this.localLfos.forEach((oscillator, index) => {
      if (oscillator && this.patch.lfos[index].sync)
        oscillator.frequency.setTargetAtTime(syncFrequency(this.patch.lfos[index].rate, true, bpm), time, 0.01)
    })
  }

  release(time: number): void {
    if (this.released) return
    this.released = true
    this.envelopes.forEach((source, index) => {
      if (!source) return
      const envelope = this.patch.modEnvelopes[index]
      const elapsed = Math.max(0, time - this.start)
      const level =
        elapsed < envelope.attack
          ? elapsed / envelope.attack
          : elapsed < envelope.attack + envelope.decay
            ? 1 + ((envelope.sustain - 1) * (elapsed - envelope.attack)) / Math.max(envelope.decay, 0.0001)
            : envelope.sustain
      source.offset.cancelScheduledValues(time)
      source.offset.setValueAtTime(level * 2 - 1, time)
      source.offset.linearRampToValueAtTime(-1, time + envelope.release)
    })
  }

  dispose(): void {
    for (const { source, destination } of this.sharedConnections) source.disconnect(destination)
    for (const source of this.ownedSources) {
      try {
        source.stop()
      } catch {
        /* Already stopped by voice disposal. */
      }
    }
    for (const node of this.nodes) {
      node.disconnect()
    }
  }
}
