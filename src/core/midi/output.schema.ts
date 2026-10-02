import { z } from 'zod'
import { DEFAULT_MIDI_OUTPUT_SETTINGS, MIDI_OUTPUT_BOUNDS } from '../../config/defaults'
import type { MidiOutputSettings, MidiTrackRoute } from './output.types'

const nonEmptyId = z.string().refine((value) => value.trim().length > 0, 'Identity must not be empty.')
const nonNegativeInteger = z.number().int().nonnegative()

export const MidiChannelSchema = z
  .number()
  .int()
  .min(MIDI_OUTPUT_BOUNDS.channel.min)
  .max(MIDI_OUTPUT_BOUNDS.channel.max)
export const MidiPitchSchema = z.number().int().min(MIDI_OUTPUT_BOUNDS.pitch.min).max(MIDI_OUTPUT_BOUNDS.pitch.max)
export const MidiOnVelocitySchema = z
  .number()
  .int()
  .min(MIDI_OUTPUT_BOUNDS.onVelocity.min)
  .max(MIDI_OUTPUT_BOUNDS.onVelocity.max)
export const MidiOffVelocitySchema = z
  .number()
  .int()
  .min(MIDI_OUTPUT_BOUNDS.offVelocity.min)
  .max(MIDI_OUTPUT_BOUNDS.offVelocity.max)

export const DesiredMidiPortSchema = z.strictObject({
  id: nonEmptyId,
  name: z.string().nullable(),
  manufacturer: z.string().nullable()
})

export function createMidiTrackRouteSchema(defaults: MidiTrackRoute) {
  return z.strictObject({
    mode: z.enum(['internal', 'midi', 'both']).default(defaults.mode),
    port: DesiredMidiPortSchema.nullable().default(defaults.port),
    channel: MidiChannelSchema.default(defaults.channel),
    offsetMs: z
      .number()
      .min(MIDI_OUTPUT_BOUNDS.offsetMs.min)
      .max(MIDI_OUTPUT_BOUNDS.offsetMs.max)
      .default(defaults.offsetMs),
    sendPreviews: z.boolean().default(defaults.sendPreviews)
  })
}

export function validateMidiRouteConflict(settings: MidiOutputSettings) {
  const { lead, chord } = settings
  if (
    lead.mode !== 'internal' &&
    chord.mode !== 'internal' &&
    lead.port &&
    chord.port &&
    lead.port.id === chord.port.id &&
    lead.channel === chord.channel
  ) {
    return { portId: lead.port.id, channel: lead.channel, tracks: ['lead', 'chord'] as const }
  }
  return null
}

export const MidiOutputSettingsSchema = z
  .strictObject({
    lead: createMidiTrackRouteSchema(DEFAULT_MIDI_OUTPUT_SETTINGS.lead).prefault({}),
    chord: createMidiTrackRouteSchema(DEFAULT_MIDI_OUTPUT_SETTINGS.chord).prefault({})
  })
  .superRefine((settings, context) => {
    if (validateMidiRouteConflict(settings)) {
      context.addIssue({
        code: 'custom',
        path: ['chord', 'channel'],
        message: 'Active MIDI tracks must use different port/channel pairs.'
      })
    }
  })

export const MidiNoteSourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('melody'), noteId: nonEmptyId }),
  z.strictObject({ kind: z.literal('chord'), chordId: nonEmptyId, midi: MidiPitchSchema }),
  z.strictObject({ kind: z.literal('preview'), sourceId: nonEmptyId })
])

export const MidiNoteIntentSchema = z
  .strictObject({
    track: z.enum(['lead', 'chord']),
    source: MidiNoteSourceSchema,
    sessionId: nonEmptyId,
    generation: nonNegativeInteger,
    loopIteration: nonNegativeInteger,
    eventId: nonEmptyId,
    portId: nonEmptyId,
    channel: MidiChannelSchema,
    midi: MidiPitchSchema,
    velocity: MidiOnVelocitySchema,
    onTimeMs: z.number().nonnegative(),
    offTimeMs: z.number().nonnegative()
  })
  .superRefine((intent, context) => {
    if (intent.offTimeMs <= intent.onTimeMs) {
      context.addIssue({ code: 'custom', path: ['offTimeMs'], message: 'Note-Off must follow Note-On.' })
    }
    if (
      (intent.source.kind === 'melody' && intent.track !== 'lead') ||
      (intent.source.kind === 'chord' && (intent.track !== 'chord' || intent.source.midi !== intent.midi))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['source'],
        message: 'Note source must match the track and MIDI pitch.'
      })
    }
  })
