import * as Tone from 'tone'
import { EffectsRack } from '../mixer'
import { createChordSynth, createLeadSynth } from '../instruments/tone-synth-factory'
import { CHORD_PRESETS, LEAD_PRESETS, type SynthPresetDefinition } from '../../core/presets/synths'
import {
  accumulateStereoSamples,
  createStereoMeterMeasurements,
  toStereoMeterReading
} from '../../core/audio-analysis/stereo-metering'
import { MasterOutput } from '../mixer/master-output'
import {
  DEFAULT_LIMITER_CEILING_DB,
  DEFAULT_LIMITER_LOOKAHEAD_MS,
  lookaheadMsToSamples
} from '../../core/audio-dsp/peak-limiter'
import { decibelsToGain } from '../../core/audio/gain-staging'
export { renderNativeBankCalibrationFixtures } from './native-voice-render'
export type { NativeBankCalibrationResult } from './native-voice-render'

export const AUDIO_RENDER_FIXTURES = [
  'silence',
  'single-note',
  'dense-chord',
  'overlapping-releases',
  'both-tracks-and-preview',
  'send-and-resonance-extremes'
] as const

export type AudioRenderFixtureName = (typeof AUDIO_RENDER_FIXTURES)[number]

export interface AudioRenderResult {
  fixture: AudioRenderFixtureName
  sampleRate: number
  durationSeconds: number
  protectionStatus: string
  measurements: ReturnType<typeof toStereoMeterReading>
}

export interface PresetCalibrationResult {
  category: 'lead' | 'chord'
  presetId: string
  outputTrimDb: number
  sampleRate: number
  protectionStatus: string
  stereo: ReturnType<typeof toStereoMeterReading>
  monoFoldDown: ReturnType<typeof toStereoMeterReading>
}

const FIXTURE_DURATION_SECONDS = 4

function createRackForPreset(definition: SynthPresetDefinition): EffectsRack {
  const macros = definition.defaultMacros ?? {}
  return new EffectsRack({
    leadCutoff: macros.cutoff ?? 4200,
    leadResonance: macros.resonance ?? 1,
    leadDelaySend: macros.delaySend ?? 0,
    leadReverbSend: macros.reverbSend ?? 0.25,
    chordCutoff: macros.cutoff ?? 3800,
    chordChorusSend: macros.chorusSend ?? 0.05,
    chordReverbSend: macros.reverbSend ?? 0.3,
    leadVolume: 0.9,
    chordVolume: 0.75,
    masterVolume: 0.9,
    isLeadMuted: false,
    isChordMuted: false,
    isLeadSolo: false,
    isChordSolo: false,
    isBusCompressorActive: true
  })
}

export interface AudioRenderOptions {
  /** Route the fixture through the real final output protection stage. */
  withProtection?: boolean
}

export async function renderAudioFixture(
  fixture: AudioRenderFixtureName,
  sampleRate: number,
  options: AudioRenderOptions = {}
): Promise<AudioRenderResult> {
  let protectionStatus = 'idle'
  const buffer = await Tone.Offline(
    async ({ transport }) => {
      if (fixture === 'silence') return
      const rack = new EffectsRack({
        leadCutoff: 4200,
        leadResonance: fixture === 'send-and-resonance-extremes' ? 12 : 1,
        leadDelaySend: fixture === 'send-and-resonance-extremes' ? 1 : 0,
        leadReverbSend: fixture === 'send-and-resonance-extremes' ? 1 : 0.25,
        chordCutoff: 3800,
        chordChorusSend: fixture === 'send-and-resonance-extremes' ? 1 : 0.05,
        chordReverbSend: fixture === 'send-and-resonance-extremes' ? 1 : 0.3,
        leadVolume: 0.9,
        chordVolume: 0.75,
        masterVolume: 0.9,
        isLeadMuted: false,
        isChordMuted: false,
        isLeadSolo: false,
        isChordSolo: false,
        isBusCompressorActive: true
      })
      const lead = createLeadSynth('soft-triangle-keys').connect(rack.leadInput)
      const leadPreview = createLeadSynth('soft-triangle-keys').connect(rack.leadInput)
      const chords = createChordSynth('triangle-comp').connect(rack.chordInput)
      const chordPreview = createChordSynth('triangle-comp').connect(rack.chordInput)
      transport.bpm.value = 120
      if (options.withProtection) {
        await rack.initializeOutputProtection()
        protectionStatus = rack.getProtectionSnapshot().status
      }

      if (fixture === 'single-note') lead.triggerAttackRelease('C4', '2n', 0, 0.8)
      if (fixture === 'dense-chord') chords.triggerAttackRelease(['C3', 'E3', 'G3', 'B3', 'D4'], '1n', 0, 0.8)
      if (fixture === 'overlapping-releases') {
        lead.triggerAttackRelease('C4', '1n', 0, 0.8)
        lead.triggerAttackRelease('E4', '1n', '8n', 0.8)
        lead.triggerAttackRelease('G4', '1n', '4n', 0.8)
      }
      if (fixture === 'both-tracks-and-preview') {
        lead.triggerAttackRelease('C4', '2n', 0, 0.75)
        leadPreview.triggerAttackRelease('G4', '8n', '8n', 0.75)
        chords.triggerAttackRelease(['C3', 'E3', 'G3'], '1n', 0, 0.7)
        chordPreview.triggerAttackRelease(['D3', 'F3', 'A3'], '2n', '2n', 0.7)
      }
      if (fixture === 'send-and-resonance-extremes') {
        lead.triggerAttackRelease('C4', '1n', 0, 0.9)
        chords.triggerAttackRelease(['C2', 'G2', 'C3', 'E3', 'G3'], '1n', 0, 0.9)
      }
    },
    FIXTURE_DURATION_SECONDS,
    2,
    sampleRate
  )

  const measurements = createStereoMeterMeasurements()
  accumulateStereoSamples(measurements, buffer.getChannelData(0), buffer.getChannelData(1))
  return {
    fixture,
    sampleRate,
    durationSeconds: FIXTURE_DURATION_SECONDS,
    protectionStatus,
    measurements: toStereoMeterReading(measurements)
  }
}

export async function renderPresetCalibrationFixtures(
  sampleRate: number,
  options: AudioRenderOptions = {}
): Promise<PresetCalibrationResult[]> {
  const results: PresetCalibrationResult[] = []
  for (const definition of [...LEAD_PRESETS, ...CHORD_PRESETS]) {
    let protectionStatus = 'idle'
    const buffer = await Tone.Offline(
      async () => {
        const rack = createRackForPreset(definition)
        const synth = definition.category === 'lead' ? createLeadSynth(definition) : createChordSynth(definition)
        synth.connect(definition.category === 'lead' ? rack.leadInput : rack.chordInput)
        const notes = definition.category === 'lead' ? ['C4'] : ['C3', 'E3', 'G3', 'B3']
        if (options.withProtection) {
          await rack.initializeOutputProtection()
          protectionStatus = rack.getProtectionSnapshot().status
        }
        synth.triggerAttackRelease(notes, '2n', 0, 0.8)
      },
      FIXTURE_DURATION_SECONDS,
      2,
      sampleRate
    )
    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)
    const stereo = createStereoMeterMeasurements()
    accumulateStereoSamples(stereo, left, right)
    const mono = new Float32Array(left.length)
    for (let frame = 0; frame < mono.length; frame += 1) mono[frame] = (left[frame] + right[frame]) / 2
    const monoFoldDown = createStereoMeterMeasurements()
    accumulateStereoSamples(monoFoldDown, mono, mono)
    results.push({
      category: definition.category === 'lead' ? 'lead' : 'chord',
      presetId: definition.id,
      outputTrimDb: definition.outputTrimDb,
      sampleRate,
      protectionStatus,
      stereo: toStereoMeterReading(stereo),
      monoFoldDown: toStereoMeterReading(monoFoldDown)
    })
  }
  return results
}

export const LIMITER_RENDER_FIXTURES = [
  'impulse',
  'sustained-overload',
  'correlated-stereo',
  'high-frequency-alternation',
  'silence',
  'non-finite'
] as const

export type LimiterRenderFixtureName = (typeof LIMITER_RENDER_FIXTURES)[number]

export interface LimiterRenderResult {
  fixture: LimiterRenderFixtureName
  sampleRate: number
  durationSeconds: number
  ceilingDb: number
  ceilingLinear: number
  workletReady: boolean
  error: string | null
  latencySamples: number
  latencyMs: number
  measurements: ReturnType<typeof toStereoMeterReading> | null
}

const LIMITER_FIXTURE_DURATION_SECONDS = 1

/** Deterministic, non-musical stress signals used to probe the protection ceiling. */
export function buildLimiterFixtureSignal(
  fixture: LimiterRenderFixtureName,
  sampleRate: number,
  durationSeconds = LIMITER_FIXTURE_DURATION_SECONDS
): { left: Float32Array<ArrayBuffer>; right: Float32Array<ArrayBuffer> } {
  const frames = Math.max(1, Math.round(sampleRate * durationSeconds))
  const left = new Float32Array(frames)
  const right = new Float32Array(frames)

  if (fixture === 'impulse') {
    left[Math.round(frames * 0.1)] = 8
    right[Math.round(frames * 0.1)] = 8
  } else if (fixture === 'sustained-overload') {
    for (let frame = 0; frame < frames; frame += 1) {
      const value = 4 * Math.sin((2 * Math.PI * 220 * frame) / sampleRate)
      left[frame] = value
      right[frame] = value
    }
  } else if (fixture === 'correlated-stereo') {
    left.fill(3)
    right.fill(3)
  } else if (fixture === 'high-frequency-alternation') {
    for (let frame = 0; frame < frames; frame += 1) {
      const value = frame % 2 === 0 ? 1.5 : -1.5
      left[frame] = value
      right[frame] = value
    }
  } else if (fixture === 'non-finite') {
    left.fill(2)
    right.fill(2)
    left[Math.round(frames * 0.25)] = Number.NaN
    right[Math.round(frames * 0.5)] = Number.POSITIVE_INFINITY
  }

  return { left, right }
}

/**
 * Renders a deterministic stress signal through the real final protection stage inside an
 * OfflineAudioContext, including AudioWorklet loading. Returns measured post-protection sample
 * peaks; it is a developer diagnostic and never presented as a listening test.
 */
export async function renderLimiterFixture(
  fixture: LimiterRenderFixtureName,
  sampleRate: number
): Promise<LimiterRenderResult> {
  const { left, right } = buildLimiterFixtureSignal(fixture, sampleRate)
  const ceilingLinear = decibelsToGain(DEFAULT_LIMITER_CEILING_DB)
  const latencySamples = lookaheadMsToSamples(DEFAULT_LIMITER_LOOKAHEAD_MS, sampleRate)
  let workletReady = false
  let failure: string | null = null

  const buffer = await Tone.Offline(
    async () => {
      const toneContext = Tone.getContext()
      const rawContext = toneContext.rawContext as BaseAudioContext
      const output = new MasterOutput()
      workletReady = await output.initialize(
        rawContext,
        (name, options) => toneContext.createAudioWorkletNode(name, options) as unknown as AudioWorkletNode
      )
      if (!workletReady) {
        failure = output.getError() ?? 'Peak limiter worklet did not load.'
        return
      }

      const audioBuffer = rawContext.createBuffer(2, left.length, sampleRate)
      audioBuffer.copyToChannel(left, 0)
      audioBuffer.copyToChannel(right, 1)
      const source = rawContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(output.input.input as unknown as AudioNode)
      output.output.toDestination()
      source.start(0)
    },
    LIMITER_FIXTURE_DURATION_SECONDS,
    2,
    sampleRate
  )

  if (!workletReady) {
    return {
      fixture,
      sampleRate,
      durationSeconds: LIMITER_FIXTURE_DURATION_SECONDS,
      ceilingDb: DEFAULT_LIMITER_CEILING_DB,
      ceilingLinear,
      workletReady,
      error: failure,
      latencySamples,
      latencyMs: (latencySamples / sampleRate) * 1000,
      measurements: null
    }
  }

  const measurements = createStereoMeterMeasurements()
  accumulateStereoSamples(measurements, buffer.getChannelData(0), buffer.getChannelData(1))
  return {
    fixture,
    sampleRate,
    durationSeconds: LIMITER_FIXTURE_DURATION_SECONDS,
    ceilingDb: DEFAULT_LIMITER_CEILING_DB,
    ceilingLinear,
    workletReady,
    error: null,
    latencySamples,
    latencyMs: (latencySamples / sampleRate) * 1000,
    measurements: toStereoMeterReading(measurements)
  }
}
