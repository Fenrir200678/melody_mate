import { describe, it, expect } from 'vitest'
import {
  AppNoteSchema,
  ChordEventSchema,
  PROJECT_SCHEMA_VERSION,
  ProjectSchema,
  SynthConfigSchema,
  GeneratorParamsSchema
} from '@/core/schemas'
import {
  DEFAULT_AUDIO_SOUND_IDS,
  DEFAULT_GENERATOR_PARAMS,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_SYNTH_MACROS,
  PROJECT_BAR_BOUNDS
} from '@/config/defaults'

describe('Zod Schema Validation', () => {
  describe('AppNoteSchema', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'

    it('should parse a valid note payload with all fields', () => {
      const payload = {
        id: validUuid,
        pitch: 'C4',
        midi: 60,
        step: 0,
        durationSteps: 4,
        velocity: 110,
        isMuted: false
      }

      const parsed = AppNoteSchema.parse(payload)
      expect(parsed).toEqual(payload)
    })

    it('should apply default velocity (100) and isMuted (false) when omitted', () => {
      const payload = {
        id: validUuid,
        pitch: 'D#4',
        midi: 63,
        step: 4,
        durationSteps: 2
      }

      const parsed = AppNoteSchema.parse(payload)
      expect(parsed.velocity).toBe(100)
      expect(parsed.isMuted).toBe(false)
    })

    it('should reject invalid UUIDs', () => {
      expect(() =>
        AppNoteSchema.parse({
          id: 'invalid-id-123',
          pitch: 'C4',
          midi: 60,
          step: 0,
          durationSteps: 4
        })
      ).toThrow()
    })

    it('should reject MIDI notes outside 0-127 range', () => {
      expect(() =>
        AppNoteSchema.parse({
          id: validUuid,
          pitch: 'C-2',
          midi: -1,
          step: 0,
          durationSteps: 4
        })
      ).toThrow()

      expect(() =>
        AppNoteSchema.parse({
          id: validUuid,
          pitch: 'G9',
          midi: 128,
          step: 0,
          durationSteps: 4
        })
      ).toThrow()
    })

    it('should reject negative steps or durationSteps < 1', () => {
      expect(() =>
        AppNoteSchema.parse({
          id: validUuid,
          pitch: 'C4',
          midi: 60,
          step: -1,
          durationSteps: 4
        })
      ).toThrow()

      expect(() =>
        AppNoteSchema.parse({
          id: validUuid,
          pitch: 'C4',
          midi: 60,
          step: 0,
          durationSteps: 0
        })
      ).toThrow()
    })

    it('should reject velocity outside 1-127 range', () => {
      expect(() =>
        AppNoteSchema.parse({
          id: validUuid,
          pitch: 'C4',
          midi: 60,
          step: 0,
          durationSteps: 4,
          velocity: 0
        })
      ).toThrow()

      expect(() =>
        AppNoteSchema.parse({
          id: validUuid,
          pitch: 'C4',
          midi: 60,
          step: 0,
          durationSteps: 4,
          velocity: 128
        })
      ).toThrow()
    })
  })

  describe('ChordEventSchema', () => {
    const validUuid = '987fcdeb-51a2-43f7-9abc-def012345678'

    it('should parse a valid chord event', () => {
      const payload = {
        id: validUuid,
        name: 'Am7',
        roman: 'vi',
        notes: ['A3', 'C4', 'E4', 'G4'],
        voicing: ['A3', 'C4', 'E4', 'G4'],
        startBar: 0,
        durationBars: 1,
        inversion: 0
      }

      const parsed = ChordEventSchema.parse(payload)
      expect(parsed).toEqual(payload)
    })

    it('should apply default inversion (0) when omitted', () => {
      const payload = {
        id: validUuid,
        name: 'Am7',
        roman: 'vi',
        notes: ['A3', 'C4', 'E4', 'G4'],
        voicing: ['A3', 'C4', 'E4', 'G4'],
        startBar: 0,
        durationBars: 1
      }

      const parsed = ChordEventSchema.parse(payload)
      expect(parsed.inversion).toBe(0)
    })

    it('should accept fractional durationBars down to 0.25 (1 beat in 4/4)', () => {
      const payload = {
        id: validUuid,
        name: 'Cmaj',
        roman: 'I',
        notes: ['C4', 'E4', 'G4'],
        voicing: ['C4', 'E4', 'G4'],
        startBar: 1.5,
        durationBars: 0.25
      }

      const parsed = ChordEventSchema.parse(payload)
      expect(parsed.durationBars).toBe(0.25)
    })

    it('should reject a missing or empty voicing array', () => {
      expect(() =>
        ChordEventSchema.parse({
          id: validUuid,
          name: 'Cmaj',
          roman: 'I',
          notes: ['C4', 'E4', 'G4'],
          startBar: 0,
          durationBars: 1
        })
      ).toThrow()

      expect(() =>
        ChordEventSchema.parse({
          id: validUuid,
          name: 'Cmaj',
          roman: 'I',
          notes: ['C4', 'E4', 'G4'],
          voicing: [],
          startBar: 0,
          durationBars: 1
        })
      ).toThrow()
    })

    it('should reject durations below one sixteenth note or negative startBar', () => {
      expect(() =>
        ChordEventSchema.parse({
          id: validUuid,
          name: 'Cmaj',
          roman: 'I',
          notes: ['C4'],
          voicing: ['C4'],
          startBar: 0,
          durationBars: 0.01
        })
      ).toThrow()

      expect(() =>
        ChordEventSchema.parse({
          id: validUuid,
          name: 'Cmaj',
          roman: 'I',
          notes: ['C4'],
          voicing: ['C4'],
          startBar: -0.5,
          durationBars: 1
        })
      ).toThrow()
    })
  })

  describe('ProjectSchema', () => {
    it('should parse an empty object with complete default values', () => {
      const parsed = ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION })

      expect(parsed).toEqual({
        version: PROJECT_SCHEMA_VERSION,
        ...DEFAULT_PROJECT_SETTINGS
      })
    })

    it('should allow setting isLooping to false', () => {
      const parsed = ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, isLooping: false })
      expect(parsed.isLooping).toBe(false)
    })

    it('should reject outdated or invalid schema versions', () => {
      expect(() =>
        ProjectSchema.parse({
          version: 1
        })
      ).toThrow()
    })

    it('should enforce BPM bounds between 40 and 280', () => {
      expect(() => ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, bpm: 39 })).toThrow()
      expect(() => ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, bpm: 281 })).toThrow()
      expect(ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, bpm: 40 }).bpm).toBe(40)
      expect(ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, bpm: 280 }).bpm).toBe(280)
    })

    it('should enforce bars within PROJECT_BAR_BOUNDS', () => {
      expect(() => ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, bars: PROJECT_BAR_BOUNDS.min - 1 })).toThrow()
      expect(() => ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, bars: PROJECT_BAR_BOUNDS.max + 1 })).toThrow()
      expect(ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, bars: 8 }).bars).toBe(8)
    })

    it('should enforce swing and timing looseness within 0.0 to 1.0', () => {
      expect(() => ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, swing: -0.1 })).toThrow()
      expect(() => ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, swing: 1.1 })).toThrow()
      expect(() => ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, timingLooseness: -0.1 })).toThrow()
      expect(() => ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, timingLooseness: 1.1 })).toThrow()
    })
  })

  describe('SynthConfigSchema', () => {
    it('should parse an empty object with sensible default synth values', () => {
      const parsed = SynthConfigSchema.parse({})

      expect(parsed).toEqual({
        leadPreset: DEFAULT_AUDIO_SOUND_IDS.lead,
        chordPreset: DEFAULT_AUDIO_SOUND_IDS.chord,
        ...DEFAULT_SYNTH_MACROS
      })
    })

    it('should reject invalid preset names', () => {
      expect(() =>
        SynthConfigSchema.parse({
          leadPreset: '' as never
        })
      ).toThrow()

      expect(() =>
        SynthConfigSchema.parse({
          chordPreset: '' as never
        })
      ).toThrow()
    })

    it('should enforce filter and send parameter bounds', () => {
      expect(() => SynthConfigSchema.parse({ leadCutoff: 10 })).toThrow()
      expect(() => SynthConfigSchema.parse({ leadCutoff: 25000 })).toThrow()
      expect(() => SynthConfigSchema.parse({ leadResonance: -1 })).toThrow()
      expect(() => SynthConfigSchema.parse({ leadResonance: 25 })).toThrow()
      expect(() => SynthConfigSchema.parse({ leadDelaySend: -0.1 })).toThrow()
      expect(() => SynthConfigSchema.parse({ leadDelaySend: 1.5 })).toThrow()
      expect(() => SynthConfigSchema.parse({ leadReverbSend: -0.1 })).toThrow()
      expect(() => SynthConfigSchema.parse({ leadReverbSend: 1.2 })).toThrow()
      expect(() => SynthConfigSchema.parse({ chordCutoff: 10 })).toThrow()
      expect(() => SynthConfigSchema.parse({ chordChorusSend: -0.1 })).toThrow()
      expect(() => SynthConfigSchema.parse({ chordReverbSend: 1.2 })).toThrow()
    })
  })

  describe('GeneratorParamsSchema', () => {
    it('should parse an empty object with standard generative defaults', () => {
      const parsed = GeneratorParamsSchema.parse({})
      expect(parsed).toEqual(DEFAULT_GENERATOR_PARAMS)
    })

    it('should validate chordAdherence bounds (0.0 to 1.0)', () => {
      expect(GeneratorParamsSchema.parse({ chordAdherence: 0 }).chordAdherence).toBe(0)
      expect(GeneratorParamsSchema.parse({ chordAdherence: 1 }).chordAdherence).toBe(1)
      expect(GeneratorParamsSchema.parse({ chordAdherence: 0.5 }).chordAdherence).toBe(0.5)
      expect(() => GeneratorParamsSchema.parse({ chordAdherence: -0.1 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ chordAdherence: 1.1 })).toThrow()
    })

    it('should validate minOctave and maxOctave bounds and constraints', () => {
      const custom = GeneratorParamsSchema.parse({ minOctave: 2, maxOctave: 4 })
      expect(custom.minOctave).toBe(2)
      expect(custom.maxOctave).toBe(4)

      // minOctave must be <= maxOctave
      expect(() => GeneratorParamsSchema.parse({ minOctave: 5, maxOctave: 4 })).toThrow()

      // out of 1-7 bounds
      expect(() => GeneratorParamsSchema.parse({ minOctave: 0 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ maxOctave: 8 })).toThrow()
    })

    it('should validate rhythmMode and rhythmPresetId', () => {
      expect(GeneratorParamsSchema.parse({ rhythmMode: 'preset' }).rhythmMode).toBe('preset')
      expect(GeneratorParamsSchema.parse({ rhythmMode: 'euclidean' }).rhythmMode).toBe('euclidean')
      expect(() => GeneratorParamsSchema.parse({ rhythmMode: 'random' as never })).toThrow()
      expect(GeneratorParamsSchema.parse({ rhythmPresetId: 'arpeggio-flow' }).rhythmPresetId).toBe('arpeggio-flow')
    })

    it('should reject Markov orders outside 1-4', () => {
      expect(() => GeneratorParamsSchema.parse({ markovOrder: 0 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ markovOrder: 5 })).toThrow()
      expect(GeneratorParamsSchema.parse({ markovOrder: 1 }).markovOrder).toBe(1)
      expect(GeneratorParamsSchema.parse({ markovOrder: 4 }).markovOrder).toBe(4)
    })

    it('should reject invalid Euclidean rhythm parameters', () => {
      expect(() => GeneratorParamsSchema.parse({ euclideanPulses: 0 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ euclideanPulses: 33 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ euclideanSteps: 0 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ euclideanSteps: 33 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ euclideanRotation: -1 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ euclideanRotation: 32 })).toThrow()
    })

    it('should reject restProbability outside 0.0 to 1.0', () => {
      expect(() => GeneratorParamsSchema.parse({ restProbability: -0.1 })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ restProbability: 1.05 })).toThrow()
    })

    it('should reject unsupported motif patterns and contours', () => {
      expect(() => GeneratorParamsSchema.parse({ motif: 'ABCDE' as never })).toThrow()
      expect(() => GeneratorParamsSchema.parse({ contour: 'zigzag' as never })).toThrow()
    })

    it('should hydrate a legacy storage payload without the new pattern values', () => {
      // loadGeneratorParamsFromStorage runs safeParse with defaults on the raw payload
      const result = GeneratorParamsSchema.safeParse({ minOctave: 3, maxOctave: 4, markovOrder: 2 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.motif).toBe(DEFAULT_GENERATOR_PARAMS.motif)
      }
    })
  })
})
