import {
  accumulateStereoSamples,
  createStereoMeterMeasurements,
  toStereoMeterReading
} from '../../core/audio-analysis/stereo-metering'
import { NATIVE_DIAGNOSTIC_PATCH, NATIVE_FACTORY_PATCHES } from '../../core/synth/factory-patches'
import type { NativeSynthPatch } from '../../core/synth/patch'
import { InstrumentInsertEffects } from '../instruments/insert-effects'
import { NativeVoice } from '../instruments/native-voice'

export async function renderNativeVoice(
  sampleRate: number,
  midi: number,
  velocity: number,
  patch: NativeSynthPatch = NATIVE_DIAGNOSTIC_PATCH,
  holdSeconds = 0.5
) {
  const duration = 0.1 + holdSeconds + patch.amp.release + 0.2
  const context = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate)
  const voice = new NativeVoice(context, patch)
  voice.connect(context.destination)
  voice.trigger(midi, velocity, 0.1)
  voice.release(0.1 + holdSeconds)
  const buffer = await context.startRendering()
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  const stereo = createStereoMeterMeasurements()
  accumulateStereoSamples(stereo, left, right)
  const mono = new Float32Array(left.length)
  for (let i = 0; i < mono.length; i++) mono[i] = (left[i] + right[i]) / 2
  const folded = createStereoMeterMeasurements()
  accumulateStereoSamples(folded, mono, mono)
  return { sampleRate, midi, velocity, stereo: toStereoMeterReading(stereo), mono: toStereoMeterReading(folded) }
}

/** Developer-only matrix; run in a browser audio context, then retain the returned measurements. */
export async function renderNativeVoiceMatrix(sampleRate = 48000) {
  const results = []
  for (const midi of [36, 84]) {
    for (const velocity of [0.25, 0.9]) {
      for (const source of ['all', 'A', 'B', 'sub', 'noise'] as const) {
        for (const release of [0.02, 1.2]) {
          const patch = structuredClone(NATIVE_DIAGNOSTIC_PATCH)
          patch.amp.release = release
          if (source !== 'all') {
            if (source !== 'A') patch.oscillators.A.levelDb = -60
            if (source !== 'B') patch.oscillators.B.levelDb = -60
            if (source !== 'sub') patch.sub.levelDb = -60
            if (source !== 'noise') patch.noise.levelDb = -60
          }
          results.push({ source, release, ...(await renderNativeVoice(sampleRate, midi, velocity, patch)) })
        }
      }
    }
  }
  return results
}

export interface NativeBankCalibrationResult {
  patchId: string
  name: string
  category: string
  sampleRate: number
  notes: number[]
  velocity: number
  outputTrimDb: number
  stereo: ReturnType<typeof toStereoMeterReading>
  monoFoldDown: ReturnType<typeof toStereoMeterReading>
  monoLossDb: number
  overloads: number
  nonFinite: number
}

/**
 * Renders all native factory patches through the complete instrument chain (voices -> inserts -> trim)
 * in an OfflineAudioContext to verify headroom, phase safety and non-finite sanitization.
 */
export async function renderNativeBankCalibrationFixtures(sampleRate = 48000): Promise<NativeBankCalibrationResult[]> {
  const results: NativeBankCalibrationResult[] = []

  for (const patch of NATIVE_FACTORY_PATCHES) {
    const isBass = patch.tags.includes('bass')
    const isChord = patch.category === 'chord' && patch.voice.mode === 'poly'
    const notes = isChord ? [48, 52, 55, 59] : isBass ? [36] : [60]
    const velocity = 0.8
    const holdSeconds = isChord ? 1.0 : 0.6
    const duration = 0.1 + holdSeconds + patch.amp.release + 0.3
    const context = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate)

    const inserts = new InstrumentInsertEffects(context, patch.inserts, patch.outputTrimDb)
    inserts.output.connect(context.destination)

    const voices = notes.map(() => new NativeVoice(context, patch, undefined, false))
    voices.forEach((voice, index) => {
      voice.connect(inserts.input)
      voice.trigger(notes[index], velocity, 0.1)
      voice.release(0.1 + holdSeconds)
    })

    const buffer = await context.startRendering()
    inserts.dispose()

    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)
    const stereo = createStereoMeterMeasurements()
    accumulateStereoSamples(stereo, left, right)
    const mono = new Float32Array(left.length)
    for (let i = 0; i < mono.length; i++) mono[i] = (left[i] + right[i]) / 2
    const folded = createStereoMeterMeasurements()
    accumulateStereoSamples(folded, mono, mono)

    const stereoReading = toStereoMeterReading(stereo)
    const monoReading = toStereoMeterReading(folded)
    const stereoPeakMax = Math.max(stereoReading.leftPeakDb, stereoReading.rightPeakDb)
    const monoPeakMax = monoReading.leftPeakDb
    const monoLossDb = Number.isFinite(stereoPeakMax) && Number.isFinite(monoPeakMax) ? stereoPeakMax - monoPeakMax : 0

    results.push({
      patchId: patch.id,
      name: patch.name,
      category: patch.category,
      sampleRate,
      notes,
      velocity,
      outputTrimDb: patch.outputTrimDb,
      stereo: stereoReading,
      monoFoldDown: monoReading,
      monoLossDb,
      overloads: stereoReading.overloadSamples,
      nonFinite: stereoReading.nonFiniteSamples
    })
  }

  return results
}
