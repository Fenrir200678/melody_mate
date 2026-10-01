import { z } from 'zod'
import { DEFAULT_PROJECT_SETTINGS, PROJECT_BAR_BOUNDS } from '../../config/defaults'

export const SubdivisionEnum = z.enum(['4n', '8n', '16n', '32n'])
export type Subdivision = z.infer<typeof SubdivisionEnum>

// Every stored event step is a sixteenth note: 16 steps per 4/4 bar.
export const STEPS_PER_BAR = 16

// Bumped whenever the persisted project document shape changes; older documents are discarded
// deliberately instead of being migrated, because the project has no production users yet.
export const PROJECT_SCHEMA_VERSION = 7

export const ProjectSchema = z.object({
  version: z.literal(PROJECT_SCHEMA_VERSION),
  bpm: z.number().min(40).max(280).default(DEFAULT_PROJECT_SETTINGS.bpm),
  key: z.string().default(DEFAULT_PROJECT_SETTINGS.key),
  scale: z.string().default(DEFAULT_PROJECT_SETTINGS.scale),
  bars: z.number().int().min(PROJECT_BAR_BOUNDS.min).max(PROJECT_BAR_BOUNDS.max).default(DEFAULT_PROJECT_SETTINGS.bars),
  swing: z.number().min(0).max(1).default(DEFAULT_PROJECT_SETTINGS.swing),
  timingLooseness: z.number().min(0).max(1).default(DEFAULT_PROJECT_SETTINGS.timingLooseness),
  loopStartStep: z.number().int().min(0).default(DEFAULT_PROJECT_SETTINGS.loopStartStep),
  loopEndStep: z.number().int().min(1).default(DEFAULT_PROJECT_SETTINGS.loopEndStep),
  workRange: z
    .object({
      startStep: z.number().int().min(0),
      endStep: z.number().int().min(1)
    })
    .default(DEFAULT_PROJECT_SETTINGS.workRange),
  isLooping: z.boolean().default(DEFAULT_PROJECT_SETTINGS.isLooping),
  // Revision of the matching project-audio document. 0 means no audio snapshot is committed.
  audioSavedAt: z.number().int().min(0).default(DEFAULT_PROJECT_SETTINGS.audioSavedAt)
})

export type ProjectConfig = z.infer<typeof ProjectSchema>

/**
 * Maps a subdivision to its nominal units per 4/4 bar for grid conversion.
 * Stored note, chord, loop, transport and MIDI positions always use STEPS_PER_BAR.
 */
export function subdivisionToStepsPerBar(subdivision: Subdivision): number {
  switch (subdivision) {
    case '4n':
      return 4
    case '8n':
      return 8
    case '16n':
      return 16
    case '32n':
      return 32
    default:
      return 16
  }
}
