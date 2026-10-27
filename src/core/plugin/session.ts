import { z } from 'zod'
import { PLUGIN_LIMITS, DEFAULT_TAKE_CAPACITY } from '../../config/defaults'
import { ProjectSchema } from '../schemas/project.schema'
import { AppNoteSchema } from '../schemas/note.schema'
import { ChordEventSchema } from '../schemas/chord.schema'
import { GeneratorParamsSchema } from '../schemas/generator.schema'
import { CustomRhythmPatternSchema, SavedCustomRhythmPresetsSchema } from '../schemas/custom-rhythm.schema'
import { SeedSchema, TakeSnapshotSchema } from '../schemas/take.schema'
import { DEFAULT_UI_DIMENSIONS, CANVAS_GRID_BOUNDS } from '../../config/ui-defaults'

const PluginUiSchema = z.object({
  activeTool: z.enum(['select', 'lasso', 'pencil', 'eraser', 'pan']),
  activeTrack: z.enum(['melody', 'chords']),
  isScaleLocked: z.boolean(),
  followPlayhead: z.boolean(),
  snapStep: z.number().int().min(1).max(256),
  stepWidth: z.number().min(CANVAS_GRID_BOUNDS.minStepWidth).max(CANVAS_GRID_BOUNDS.maxStepWidth),
  rowHeight: z.number().min(CANVAS_GRID_BOUNDS.minRowHeight).max(CANVAS_GRID_BOUNDS.maxRowHeight),
  wideLeftSidebarOpen: z.boolean(),
  wideRightSidebarOpen: z.boolean(),
  leftSidebarWidth: z.number().min(DEFAULT_UI_DIMENSIONS.leftSidebar.minWidth).max(DEFAULT_UI_DIMENSIONS.leftSidebar.maxWidth),
  rightSidebarWidth: z.number().min(DEFAULT_UI_DIMENSIONS.rightSidebar.minWidth).max(DEFAULT_UI_DIMENSIONS.rightSidebar.maxWidth),
  activeStudioDock: z.enum(['chord', 'rhythm', 'arp']).nullable(),
  chordStudioHeight: z.number().min(DEFAULT_UI_DIMENSIONS.chordStudio.minHeight).max(DEFAULT_UI_DIMENSIONS.chordStudio.maxHeight),
  rhythmStudioHeight: z.number().min(DEFAULT_UI_DIMENSIONS.rhythmStudio.minHeight).max(DEFAULT_UI_DIMENSIONS.rhythmStudio.maxHeight),
  arpStudioHeight: z.number().min(DEFAULT_UI_DIMENSIONS.arpStudio.minHeight).max(DEFAULT_UI_DIMENSIONS.arpStudio.maxHeight),
  isVelocityLaneOpen: z.boolean(),
  velocityLaneHeight: z.number().min(DEFAULT_UI_DIMENSIONS.velocityLane.minHeight).max(DEFAULT_UI_DIMENSIONS.velocityLane.maxHeight),
  modules: z.record(z.string().max(128), z.boolean()).refine(value => Object.keys(value).length <= 64)
})

export const PLUGIN_PROTOCOL_VERSION = 2
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
  output: z.object({
    enabled: z.boolean(),
    repeat: z.boolean(),
    melodyChannel: z.number().int().min(0).max(16),
    chordsChannel: z.number().int().min(0).max(16)
  }),
  ui: PluginUiSchema.optional()
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
export const PluginDocumentSchema = z
  .object({
    version: z.literal(PLUGIN_PROTOCOL_VERSION),
    session: PluginSessionSchema,
    playback: PlaybackSnapshotSchema,
    midiBase64: z.string().max(PLUGIN_LIMITS.maxStateBytes),
    filename: z.string().regex(/^[a-zA-Z0-9_#.-]+\.mid$/)
  })
  .superRefine((document, context) => {
    const { output } = document.session
    if (document.playback.repeat !== output.repeat)
      context.addIssue({
        code: 'custom',
        path: ['playback', 'repeat'],
        message: 'Playback repeat does not match session output.'
      })
    for (const [index, note] of document.playback.notes.entries()) {
      const channel = note.track === 'melody' ? output.melodyChannel : output.chordsChannel
      if (!output.enabled || channel === 0 || note.channel !== channel)
        context.addIssue({
          code: 'custom',
          path: ['playback', 'notes', index, 'channel'],
          message: 'Playback channel does not match track routing.'
        })
    }
  })
export type PluginDocument = z.infer<typeof PluginDocumentSchema>
