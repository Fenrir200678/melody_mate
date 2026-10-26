import { z } from 'zod'
import { PLUGIN_LIMITS, DEFAULT_TAKE_CAPACITY } from '../../config/defaults'
import { ProjectSchema } from '../schemas/project.schema'
import { AppNoteSchema } from '../schemas/note.schema'
import { ChordEventSchema } from '../schemas/chord.schema'
import { GeneratorParamsSchema } from '../schemas/generator.schema'
import { CustomRhythmPatternSchema, SavedCustomRhythmPresetsSchema } from '../schemas/custom-rhythm.schema'
import { SeedSchema, TakeSnapshotSchema } from '../schemas/take.schema'

export const PLUGIN_PROTOCOL_VERSION = 1
export const PluginSessionSchema = z.object({
  project: ProjectSchema,
  melody: z.object({
    notes: z.array(AppNoteSchema).max(PLUGIN_LIMITS.maxNotes),
    generatorParams: GeneratorParamsSchema,
    variationMode: z.enum(['mutate', 'transform']),
    mutationAxes: z.object({ rhythm: z.boolean(), pitch: z.boolean(), ornament: z.boolean(), simplify: z.boolean() }),
    mutationStrength: z.number().min(0).max(1),
    keepOriginalAsTake: z.boolean()
  }),
  harmony: z.object({
    chords: z.array(ChordEventSchema).max(PLUGIN_LIMITS.maxNotes),
    useChords: z.boolean(),
    isMuted: z.boolean(),
    backingVolume: z.number().min(0).max(1),
    adherence: z.number().min(0).max(1),
    chordRegister: z.number().int().min(1).max(6),
    defaultChordDuration: z.number().positive(),
    voicingStyle: z.enum(['close', 'drop-2', 'bass-triad']),
    autoSmooth: z.boolean(),
    paletteClickMode: z.enum(['preview', 'insert'])
  }),
  rhythm: z.object({
    pattern: CustomRhythmPatternSchema,
    savedPresets: SavedCustomRhythmPresetsSchema,
    activeSavedPresetId: z.string().nullable()
  }),
  takes: z.object({
    takes: z.array(TakeSnapshotSchema).max(DEFAULT_TAKE_CAPACITY),
    currentSeed: SeedSchema,
    seedLocked: z.boolean(),
    selectedTakeId: z.string().nullable(),
    compareEnabled: z.boolean()
  }),
  output: z.object({ enabled: z.boolean(), repeat: z.boolean() })
})
export type PluginSession = z.infer<typeof PluginSessionSchema>

export const PlaybackSnapshotSchema = z
  .object({
    lengthPpq: z.number().finite().positive().max(4096),
    repeat: z.boolean(),
    notes: z
      .array(
        z.object({
          startPpq: z.number().finite().min(0),
          endPpq: z.number().finite().positive(),
          pitch: z.number().int().min(0).max(127),
          velocity: z.number().int().min(1).max(127),
          channel: z.number().int().min(1).max(16),
          track: z.enum(['melody', 'chords'])
        })
      )
      .max(PLUGIN_LIMITS.maxNotes)
  })
  .superRefine((snapshot, context) => {
    for (const note of snapshot.notes) {
      if (note.endPpq <= note.startPpq || note.endPpq > snapshot.lengthPpq)
        context.addIssue({ code: 'custom', message: 'Note lies outside the sequence.' })
    }
  })
export const PluginDocumentSchema = z.object({
  version: z.literal(PLUGIN_PROTOCOL_VERSION),
  session: PluginSessionSchema,
  playback: PlaybackSnapshotSchema,
  midiBase64: z.string().max(PLUGIN_LIMITS.maxStateBytes),
  filename: z.string().regex(/^[a-zA-Z0-9_#.-]+\.mid$/)
})
export type PluginDocument = z.infer<typeof PluginDocumentSchema>
