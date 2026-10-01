import { z } from 'zod'
import { DEFAULT_AUDIO_SOUND_IDS } from '../../config/defaults'
import { defaultPreviewControls } from '../presets/preview-sounds'

export const PROJECT_AUDIO_SNAPSHOT_VERSION = 3
export const DEFAULT_MASTER_VOLUME = 0.9
export const DEFAULT_LEAD_VOLUME = 0.9
export const DEFAULT_CHORD_VOLUME = 0.75

const finite = z.number().finite()
const previewControlsSchema = z.strictObject({
  attack: finite.min(0).max(100),
  decay: finite.min(0).max(100),
  sustain: finite.min(0).max(100),
  release: finite.min(0).max(100),
  cutoff: finite.min(0).max(100),
  delay: finite.min(0).max(100),
  chorus: finite.min(0).max(100),
  reverb: finite.min(0).max(100)
})

const trackSchema = z.strictObject({
  soundId: z.string().min(1).max(80),
  controls: previewControlsSchema,
  volume: finite.min(0).max(1),
  muted: z.boolean(),
  solo: z.boolean()
})

export const ProjectAudioSnapshotSchema = z.strictObject({
  version: z.literal(PROJECT_AUDIO_SNAPSHOT_VERSION),
  lead: trackSchema,
  chord: trackSchema,
  master: z.strictObject({ volume: finite.min(0).max(1), busCompressorActive: z.boolean() })
})

export type ProjectAudioSnapshot = z.infer<typeof ProjectAudioSnapshotSchema>

export function parseProjectAudioSnapshot(value: unknown): ProjectAudioSnapshot {
  return ProjectAudioSnapshotSchema.parse(value)
}

export function createDefaultProjectAudioSnapshot(): ProjectAudioSnapshot {
  return parseProjectAudioSnapshot({
    version: PROJECT_AUDIO_SNAPSHOT_VERSION,
    lead: {
      soundId: DEFAULT_AUDIO_SOUND_IDS.lead,
      controls: defaultPreviewControls(DEFAULT_AUDIO_SOUND_IDS.lead),
      volume: DEFAULT_LEAD_VOLUME,
      muted: false,
      solo: false
    },
    chord: {
      soundId: DEFAULT_AUDIO_SOUND_IDS.chord,
      controls: defaultPreviewControls(DEFAULT_AUDIO_SOUND_IDS.chord),
      volume: DEFAULT_CHORD_VOLUME,
      muted: false,
      solo: false
    },
    master: { volume: DEFAULT_MASTER_VOLUME, busCompressorActive: true }
  })
}
