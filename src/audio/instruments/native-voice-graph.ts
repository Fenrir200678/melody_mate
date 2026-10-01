import type { NativeSynthPatch } from '../../core/synth/patch'
import { decibelsToGain } from '../../core/audio/gain-staging'
import { midiToHz, trackedCutoff } from '../../core/synth/tuning'
import { unisonPositions } from '../../core/synth/unison'

export interface NativeVoiceGraph {
  envelope: GainNode
  mix: GainNode
  filters: BiquadFilterNode[]
  oscillators: OscillatorNode[]
  groups: { A: OscillatorNode[]; B: OscillatorNode[] }
  sourceGains: { A: GainNode; B: GainNode; sub: GainNode; noise: GainNode }
  nodes: AudioNode[]
  stop(time: number): void
  dispose(): void
}

function noiseBuffer(context: BaseAudioContext, type: 'white' | 'pink', seed: number): AudioBuffer {
  const length = Math.ceil(context.sampleRate * 2)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  let state = seed >>> 0
  let pink = 0
  for (let i = 0; i < length; i++) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    const white = (state / 4294967296) * 2 - 1
    pink = 0.98 * pink + 0.02 * white
    data[i] = type === 'white' ? white : pink * 4
  }
  return buffer
}

export function createNativeVoiceGraph(
  context: BaseAudioContext,
  output: AudioNode,
  patch: NativeSynthPatch,
  midi: number,
  startTime: number,
  seed = 1,
  onDispose?: () => void
): NativeVoiceGraph {
  const nodes: AudioNode[] = []
  const oscillators: OscillatorNode[] = []
  const groups = { A: [] as OscillatorNode[], B: [] as OscillatorNode[] }
  const filters: BiquadFilterNode[] = []
  const envelope = context.createGain()
  envelope.gain.value = 0
  nodes.push(envelope)
  let last: AudioNode = envelope
  for (let i = 0; i < patch.filter.slope / 12; i++) {
    const filter = context.createBiquadFilter()
    filter.type = patch.filter.type
    filter.frequency.value = trackedCutoff(patch.filter.cutoffHz, midi, patch.filter.keytracking, context.sampleRate)
    filter.Q.value = patch.filter.resonance
    last.connect(filter)
    last = filter
    filters.push(filter)
    nodes.push(filter)
  }
  last.connect(output)
  const mix = context.createGain()
  const oscAGain = patch.oscillators.A.enabled !== false ? decibelsToGain(patch.oscillators.A.levelDb) : 0
  const oscBGain = patch.oscillators.B.enabled !== false ? decibelsToGain(patch.oscillators.B.levelDb) : 0
  const subGain = patch.sub.enabled !== false ? decibelsToGain(patch.sub.levelDb) : 0
  const noiseGain = patch.noise.enabled !== false ? decibelsToGain(patch.noise.levelDb) : 0
  const sourceSum = oscAGain + oscBGain + subGain + noiseGain
  mix.gain.value = 1 / Math.max(1, sourceSum)
  mix.connect(envelope)
  nodes.push(mix)

  function gain(levelDb: number, enabled = true): GainNode {
    const node = context.createGain()
    node.gain.value = enabled ? decibelsToGain(levelDb) : 0
    node.connect(mix)
    nodes.push(node)
    return node
  }
  const sourceGains = {
    A: gain(patch.oscillators.A.levelDb, patch.oscillators.A.enabled !== false),
    B: gain(patch.oscillators.B.levelDb, patch.oscillators.B.enabled !== false),
    sub: gain(patch.sub.levelDb, patch.sub.enabled !== false),
    noise: gain(patch.noise.levelDb, patch.noise.enabled !== false)
  }
  for (const key of ['A', 'B'] as const) {
    const config = patch.oscillators[key]
    for (const position of unisonPositions(config.unison, config.unisonDetuneCents, config.panSpread)) {
      const osc = context.createOscillator()
      osc.type = config.waveform
      osc.frequency.value = midiToHz(midi, config.detuneCents + position.detuneCents)
      const level = context.createGain()
      level.gain.value = position.gain
      const pan = context.createStereoPanner()
      pan.pan.value = position.pan
      osc.connect(level).connect(pan).connect(sourceGains[key])
      nodes.push(osc, level, pan)
      oscillators.push(osc)
      groups[key].push(osc)
      osc.start(startTime)
    }
  }
  const sub = context.createOscillator()
  sub.type = patch.sub.waveform
  sub.frequency.value = midiToHz(midi - 12)
  sub.connect(sourceGains.sub)
  sub.start(startTime)
  oscillators.push(sub)
  nodes.push(sub)
  const noise = context.createBufferSource()
  noise.buffer = noiseBuffer(context, patch.noise.type, seed)
  noise.loop = true
  noise.connect(sourceGains.noise)
  noise.start(startTime)
  nodes.push(noise)
  let stopTime = Infinity
  let disposed = false
  return {
    envelope,
    mix,
    filters,
    oscillators,
    groups,
    sourceGains,
    nodes,
    stop(time) {
      const safeTime = Math.max(startTime + 0.001, time)
      if (safeTime >= stopTime) return
      stopTime = safeTime
      for (const osc of oscillators) osc.stop(safeTime)
      noise.stop(safeTime)
      // Source onended fires in both live and offline contexts, so tails clean up without wall-clock timers.
      noise.onended = () => this.dispose()
    },
    dispose() {
      if (disposed) return
      disposed = true
      noise.onended = null
      for (const node of nodes) node.disconnect()
      onDispose?.()
    }
  }
}
