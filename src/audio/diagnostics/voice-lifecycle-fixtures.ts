import { PlaybackEngine } from '../playback-engine'
import { EffectsRack } from '../mixer'
import type { ChordEvent } from '../../core/schemas/chord.schema'
import { ProjectSchema, PROJECT_SCHEMA_VERSION, type ProjectConfig } from '../../core/schemas/project.schema'
import { analyseDiscontinuities, type DiscontinuityReport } from '../../core/audio-analysis/discontinuity'
import {
  accumulateStereoSamples,
  createStereoMeterMeasurements,
  toStereoMeterReading,
  type StereoMeterReading
} from '../../core/audio-analysis/stereo-metering'

export const VOICE_LIFECYCLE_FIXTURES = [
  'engine-silence',
  'cancel-no-voice',
  'cancel-held-voice',
  'preset-switch-crossfade',
  'panic-fade'
] as const

export type VoiceLifecycleFixtureName = (typeof VOICE_LIFECYCLE_FIXTURES)[number]

export interface VoiceLifecycleRenderResult {
  fixture: VoiceLifecycleFixtureName
  sampleRate: number
  durationSeconds: number
  protectionStatus: string
  /** Max |sample| in the 200 ms window before the lifecycle action. */
  peakBeforeAction: number
  /** Max |sample| in the window after the action's fade has completed. */
  tailPeak: number
  /** `tailPeak / peakBeforeAction`; near 1 means the action silenced nothing. */
  tailPeakRatio: number
  /** Number of steps at or above 25 % of full scale inside the measured tail. */
  tailDiscontinuity: DiscontinuityReport
  stereo: StereoMeterReading
}

/** Timeline positions used by the lifecycle fixtures, in seconds at 120 BPM. */
export const VOICE_LIFECYCLE_TIMELINE = {
  actionTime: 0.7,
  tailStart: 0.85,
  minStepDurationSeconds: 0.125
} as const

const CHORDS: ChordEvent[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Am',
    roman: 'vi',
    notes: ['A3', 'C4', 'E4'],
    voicing: ['A3', 'C4', 'E4'],
    startBar: 0,
    durationBars: 8
  }
]

const LEAD_NOTE = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  pitch: 'C4',
  midi: 60,
  step: 0,
  durationSteps: 16,
  velocity: 110,
  isMuted: false
}

interface FixturePlan {
  durationSeconds: number
  render(engine: PlaybackEngine, config: ProjectConfig): void
  action(engine: PlaybackEngine): void
}

function projectConfig(): ReturnType<typeof ProjectSchema.parse> {
  return ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, bpm: 120, bars: 4 })
}

function planFor(fixture: VoiceLifecycleFixtureName): FixturePlan {
  switch (fixture) {
    case 'engine-silence':
      // Baseline noise floor of the offline graph without any voice.
      return { durationSeconds: 2, render: () => undefined, action: () => undefined }
    case 'cancel-no-voice':
      // Same cancellation with nothing sounding; proves the measurement itself reads silence.
      return {
        durationSeconds: 2,
        render: (engine, config) => engine.schedule([], [], config),
        action: (engine) => engine.pause()
      }
    case 'cancel-held-voice':
      return {
        durationSeconds: 2,
        render: (engine, config) => engine.schedule([LEAD_NOTE], CHORDS, config),
        action: (engine) => engine.pause()
      }
    case 'preset-switch-crossfade':
      return {
        durationSeconds: 2,
        // The note sounds from 0.5 s so it is still held when both graphs are replaced at 0.7 s.
        render: (engine, config) => engine.schedule([{ ...LEAD_NOTE, step: 4 }], CHORDS, config),
        action: (engine) => {
          engine.setLeadPreset('analog-saw')
          engine.setChordPreset('warm-ambient-pad')
        }
      }
    case 'panic-fade':
    default:
      return {
        durationSeconds: 2,
        render: (engine, config) => engine.schedule([{ ...LEAD_NOTE, step: 4 }], CHORDS, config),
        action: (engine) => engine.panic()
      }
  }
}

function peakInWindow(left: Float32Array, right: Float32Array, startFrame: number, endFrame: number): number {
  let peak = 0
  const last = Math.min(endFrame, left.length)
  for (let frame = Math.max(0, startFrame); frame < last; frame += 1) {
    peak = Math.max(peak, Math.abs(left[frame]), Math.abs(right[frame]))
  }
  return peak
}

/**
 * Renders one voice-lifecycle scenario through the real `PlaybackEngine` inside an
 * OfflineAudioContext. The offline transport clock runs for real during the render, so a scheduled
 * note-on actually fires; the fixture then applies pause, preset replacement or panic and measures
 * what remains in the rendered output. This is a developer diagnostic: it measures rendered
 * samples, it is not a listening test.
 */
export async function renderVoiceLifecycleFixture(
  fixture: VoiceLifecycleFixtureName,
  sampleRate: number
): Promise<VoiceLifecycleRenderResult> {
  const plan = planFor(fixture)
  const config = projectConfig()
  let protectionStatus = 'idle'
  let engine: PlaybackEngine | null = null

  const Tone = await import('tone')
  const buffer = await Tone.Offline(
    async ({ transport }) => {
      transport.bpm.value = config.bpm
      engine = new PlaybackEngine(new EffectsRack())
      await engine.effectsRack.initializeOutputProtection()
      protectionStatus = engine.effectsRack.getProtectionSnapshot().status

      plan.render(engine, config)
      if (fixture !== 'engine-silence') {
        transport.schedule(() => {
          Tone.setContext(transport.context)
          plan.action(engine!)
        }, VOICE_LIFECYCLE_TIMELINE.actionTime)
      }
      transport.start()
    },
    plan.durationSeconds,
    2,
    sampleRate
  )

  ;(engine as PlaybackEngine | null)?.dispose()

  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  const actionFrame = Math.round(VOICE_LIFECYCLE_TIMELINE.actionTime * sampleRate)
  const tailStartFrame = Math.round(VOICE_LIFECYCLE_TIMELINE.tailStart * sampleRate)
  const peakBeforeAction = peakInWindow(left, right, actionFrame - Math.round(0.2 * sampleRate), actionFrame)
  const tailPeak = peakInWindow(left, right, tailStartFrame, left.length)

  const measurements = createStereoMeterMeasurements()
  accumulateStereoSamples(measurements, left, right)

  return {
    fixture,
    sampleRate,
    durationSeconds: plan.durationSeconds,
    protectionStatus,
    peakBeforeAction,
    tailPeak,
    tailPeakRatio: peakBeforeAction > 0 ? tailPeak / peakBeforeAction : 0,
    tailDiscontinuity: analyseDiscontinuities(left.subarray(tailStartFrame), right.subarray(tailStartFrame), 0.25),
    stereo: toStereoMeterReading(measurements)
  }
}

/** Renders every lifecycle fixture for one sample rate. */
export async function renderAllVoiceLifecycleFixtures(sampleRate: number): Promise<VoiceLifecycleRenderResult[]> {
  const results: VoiceLifecycleRenderResult[] = []
  for (const fixture of VOICE_LIFECYCLE_FIXTURES) {
    results.push(await renderVoiceLifecycleFixture(fixture, sampleRate))
  }
  return results
}
