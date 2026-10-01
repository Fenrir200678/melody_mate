import { describe, expect, it } from 'vitest'
import {
  clearTrainedTableCache,
  getTrainedMarkovTable,
  makeTonicRelativeEncoder,
  selectTrainedIndexEntry,
  trainedCountsToMarkovTable
} from '../../../src/core/generator/trained-markov'
import {
  buildCandidatePool,
  evaluateAndPickCandidate,
  type CandidateNote
} from '../../../src/core/generator/heuristics'
import { getMarkovProbability } from '../../../src/core/generator/markov.engine'
import { generateMelody } from '../../../src/core/generator/melody.generator'
import { GeneratorParamsSchema } from '../../../src/core/schemas/generator.schema'
import { ProjectSchema, PROJECT_SCHEMA_VERSION } from '../../../src/core/schemas/project.schema'
import {
  TrainedMarkovArtifactSchema,
  TrainedModelIndexSchema,
  type TrainedCounts,
  type TrainedMarkovArtifact,
  type TrainedModelIndexEntry
} from '../../../src/core/schemas/trained-markov.schema'

const HASH16 = '0123456789abcdef'

function makeArtifact(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    artifactVersion: 1,
    kind: 'melodymate-markov',
    id: 'melody:default',
    role: 'melody',
    style: 'default',
    representation: { type: 'tonic-relative-chroma', symbolCount: 12 },
    maxOrder: 4,
    backoffStrength: 4,
    generatedBy: 'melodymate-train 0.1.0',
    config: { max_order: 4, phrase_gap_beats: 2.0, include_roles: ['melody', 'bass', 'arp'] },
    configHash: HASH16,
    extractionHash: HASH16,
    manifestHash: HASH16,
    corpusHash: HASH16,
    stats: { files: 1, tracks: 1, sequences: 1, notes: 10, contexts: 3, transitions: 9 },
    counts: {
      '': { '0': 10, '7': 10, '9': 10 },
      '7': { '9': 8, '0': 2 },
      '0|7': { '9': 1 }
    },
    ...overrides
  }
}

function parseArtifact(overrides: Parameters<typeof makeArtifact>[0] = {}): TrainedMarkovArtifact {
  const parsed = TrainedMarkovArtifactSchema.safeParse(makeArtifact(overrides))
  expect(parsed.success).toBe(true)
  if (!parsed.success) throw new Error('fixture artifact must parse')
  return parsed.data
}

function indexEntry(overrides: Partial<TrainedModelIndexEntry> = {}): TrainedModelIndexEntry {
  return {
    file: 'melodymate-markov-melody-default.json',
    id: 'melody:default',
    role: 'melody',
    style: 'default',
    sha256: 'a'.repeat(64),
    maxOrder: 4,
    stats: { files: 1, tracks: 1, sequences: 1, notes: 10, contexts: 3, transitions: 9 },
    ...overrides
  }
}

describe('trained-markov artifact schema', () => {
  it('accepts a well-formed artifact', () => {
    expect(TrainedMarkovArtifactSchema.safeParse(makeArtifact()).success).toBe(true)
  })

  it('rejects unknown artifact versions', () => {
    expect(TrainedMarkovArtifactSchema.safeParse(makeArtifact({ artifactVersion: 2 })).success).toBe(false)
  })

  it('rejects unknown top-level fields', () => {
    expect(TrainedMarkovArtifactSchema.safeParse(makeArtifact({ sourcePaths: ['/private/midi'] })).success).toBe(false)
  })

  it('rejects symbols outside the 12-tone alphabet', () => {
    expect(TrainedMarkovArtifactSchema.safeParse(makeArtifact({ counts: { '': { '12': 1 } } })).success).toBe(false)
    expect(TrainedMarkovArtifactSchema.safeParse(makeArtifact({ counts: { '': { C: 1 } } })).success).toBe(false)
  })

  it('rejects a missing order-0 unigram context', () => {
    expect(TrainedMarkovArtifactSchema.safeParse(makeArtifact({ counts: { '7': { '9': 1 } } })).success).toBe(false)
    expect(TrainedMarkovArtifactSchema.safeParse(makeArtifact({ counts: {} })).success).toBe(false)
  })

  it('rejects contexts longer than maxOrder', () => {
    const artifact = makeArtifact({ maxOrder: 2, counts: { '': { '0': 1 }, '0|2|4': { '5': 1 } } })
    expect(TrainedMarkovArtifactSchema.safeParse(artifact).success).toBe(false)
  })

  it('rejects malformed context keys and non-positive counts', () => {
    expect(
      TrainedMarkovArtifactSchema.safeParse(makeArtifact({ counts: { '': { '0': 1 }, 'x|9': { '0': 1 } } })).success
    ).toBe(false)
    expect(TrainedMarkovArtifactSchema.safeParse(makeArtifact({ counts: { '': { '0': -3 } } })).success).toBe(false)
    expect(TrainedMarkovArtifactSchema.safeParse(makeArtifact({ counts: { '': { '0': 0 } } })).success).toBe(false)
  })

  it('accepts fractional weighted counts from variant deduplication', () => {
    expect(
      TrainedMarkovArtifactSchema.safeParse(makeArtifact({ counts: { '': { '0': 0.5, '7': 0.5 } } })).success
    ).toBe(true)
  })

  it('validates the model index and forbids path-like file references', () => {
    const index = {
      artifactVersion: 1,
      kind: 'melodymate-markov-index',
      generatedBy: 'melodymate-train 0.1.0',
      configHash: HASH16,
      models: [indexEntry()]
    }
    expect(TrainedModelIndexSchema.safeParse(index).success).toBe(true)
    expect(TrainedModelIndexSchema.safeParse({ ...index, models: [] }).success).toBe(false)
    expect(
      TrainedModelIndexSchema.safeParse({ ...index, models: [indexEntry({ file: '../secret/midi.json' })] }).success
    ).toBe(false)
  })
})

describe('trained table conversion and backoff', () => {
  it('converts counts into a MarkovTable consumable by getMarkovProbability', () => {
    const counts: TrainedCounts = { '': { '0': 10, '7': 10, '9': 10 }, '7': { '9': 8, '0': 2 } }
    const table = trainedCountsToMarkovTable(counts)
    expect(table.get('')?.get('0')).toBe(10)
    expect(table.get('7')?.get('9')).toBe(8)
  })

  it('interpolates trained contexts with the existing backoff logic', () => {
    const table = trainedCountsToMarkovTable({
      '': { '0': 10, '7': 10, '9': 10 },
      '7': { '9': 8, '0': 2 },
      '0|7': { '9': 1 }
    })
    // Unigram start: 10/30; order 1: (8 + 4/3) / 14; order 2: (1 + 4*p1) / 5
    const p1 = (8 + 4 * (1 / 3)) / 14
    const expected = (1 + 4 * p1) / 5
    expect(getMarkovProbability(['0', '7'], '9', table, 2)).toBeCloseTo(expected, 10)
  })

  it('caches the converted table per artifact', () => {
    clearTrainedTableCache()
    const artifact = parseArtifact()
    expect(getTrainedMarkovTable(artifact)).toBe(getTrainedMarkovTable(artifact))
  })
})

describe('tonic-relative encoder', () => {
  it('maps pitch classes to semitone offsets from the tonic', () => {
    const encodeC = makeTonicRelativeEncoder('C')
    expect(encodeC('C')).toBe('0')
    expect(encodeC('D')).toBe('2')
    expect(encodeC('B')).toBe('11')
    expect(encodeC('Bb')).toBe('10')

    const encodeG = makeTonicRelativeEncoder('G')
    expect(encodeG('G')).toBe('0')
    expect(encodeG('D')).toBe('7')
    expect(encodeG('F#')).toBe('11')
  })

  it('yields identical probabilities for transposed contexts', () => {
    const table = trainedCountsToMarkovTable({
      '': { '0': 10, '2': 4, '4': 4, '7': 10, '9': 10 },
      '0': { '2': 6, '4': 2 },
      '0|2': { '4': 5, '9': 1 }
    })
    const encodeC = makeTonicRelativeEncoder('C')
    const encodeG = makeTonicRelativeEncoder('G')

    const inC = getMarkovProbability([encodeC('C'), encodeC('D')], encodeC('E'), table, 2)
    const inG = getMarkovProbability([encodeG('G'), encodeG('A')], encodeG('B'), table, 2)
    expect(inC).toBeCloseTo(inG, 12)
    expect(inC).toBeGreaterThan(0)
  })
})

describe('trained model selection', () => {
  const blues = indexEntry({
    id: 'melody:blues',
    style: 'blues',
    stats: { files: 1, tracks: 1, sequences: 1, notes: 100, contexts: 3, transitions: 9 }
  })
  const bigDefault = indexEntry({
    id: 'melody:default',
    style: 'default',
    stats: { files: 2, tracks: 2, sequences: 2, notes: 500, contexts: 3, transitions: 9 }
  })
  const bass = indexEntry({
    id: 'bass:default',
    role: 'bass',
    file: 'melodymate-markov-bass-default.json',
    stats: { files: 1, tracks: 1, sequences: 1, notes: 900, contexts: 3, transitions: 9 }
  })

  it('selects the melody model with the most trained notes by default', () => {
    expect(selectTrainedIndexEntry([blues, bigDefault, bass], 'melody')?.id).toBe('melody:default')
  })

  it('prefers an exact style match when a preference is given', () => {
    expect(selectTrainedIndexEntry([blues, bigDefault, bass], 'melody', 'blues')?.id).toBe('melody:blues')
  })

  it('falls back to the richest model for unknown styles', () => {
    expect(selectTrainedIndexEntry([blues, bigDefault, bass], 'melody', 'techno')?.id).toBe('melody:default')
  })

  it('returns null when the role has no model', () => {
    expect(selectTrainedIndexEntry([blues, bigDefault, bass], 'arp')).toBeNull()
    expect(selectTrainedIndexEntry([], 'melody')).toBeNull()
  })

  it('breaks ties lexicographically by id', () => {
    const twinA = indexEntry({ id: 'melody:aaa', style: 'aaa' })
    const twinB = indexEntry({ id: 'melody:bbb', style: 'bbb' })
    expect(selectTrainedIndexEntry([twinB, twinA], 'melody')?.id).toBe('melody:aaa')
  })
})

describe('heuristics integration', () => {
  function contextCandidate(pitch: string, midi: number, pitchClass: string): CandidateNote {
    return { pitch, midi, pitchClass, degree: null, isChordTone: false }
  }

  it('steers candidate picking through the trained symbol space', () => {
    const table = trainedCountsToMarkovTable({
      '': { '0': 10, '2': 10, '9': 10, '4': 10, '5': 10, '7': 10, '11': 10 },
      '0': { '9': 200, '2': 1, '4': 1, '5': 1, '7': 1, '11': 1, '0': 1 }
    })
    const pool = buildCandidatePool('C', 'major', 4, 4, [])
    const picked = evaluateAndPickCandidate(
      pool,
      {
        history: [contextCandidate('C4', 60, 'C')],
        stepInBar: 0,
        stepsPerBar: 16,
        contourProgress: 0.5,
        contourMinMidi: 60,
        contourMaxMidi: 71,
        contour: 'free',
        contourStrength: 0,
        minOctave: 4,
        maxOctave: 4,
        targetOctave: 4,
        pentatonicMode: false,
        chordAdherence: 0,
        markovTable: table,
        markovOrder: 1,
        markovSymbolEncoder: makeTonicRelativeEncoder('C'),
        temperature: 0.05
      },
      {
        stepwiseMotion: 0,
        leapRecovery: 0,
        repetitionPenalty: 0,
        contourAdherence: 0,
        rangeAwareness: 0,
        chordAdherence: 0,
        markovPrior: 20
      },
      () => 0.5
    )
    expect(picked.pitchClass).toBe('A')
  })
})

describe('melody.generator with trained model', () => {
  const baseProject = ProjectSchema.parse({
    version: PROJECT_SCHEMA_VERSION,
    key: 'C',
    scale: 'major',
    bars: 2
  })
  const baseGenerator = GeneratorParamsSchema.parse({
    rhythmMode: 'euclidean',
    motif: 'FREE',
    callAndResponse: false,
    markovOrder: 2,
    euclideanPulses: 6,
    euclideanSteps: 16,
    euclideanRotation: 0,
    restProbability: 0,
    contour: 'free'
  })

  function seededRng(seed: number): () => number {
    let state = seed
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296
      return state / 4294967296
    }
  }

  const tonicOnly = parseArtifact({
    id: 'melody:tonic',
    maxOrder: 0,
    counts: { '': { '0': 100 } },
    stats: { files: 1, tracks: 1, sequences: 1, notes: 100, contexts: 1, transitions: 0 }
  })

  it('biases generation toward the trained tonic compared with the synthetic fallback', () => {
    const withTrained = generateMelody({
      project: baseProject,
      generator: baseGenerator,
      rng: seededRng(42),
      temperature: 0.4,
      trainedModel: tonicOnly
    })
    const withSynthetic = generateMelody({
      project: baseProject,
      generator: baseGenerator,
      rng: seededRng(42),
      temperature: 0.4
    })

    expect(withTrained.length).toBeGreaterThan(0)
    expect(withTrained.length).toBe(withSynthetic.length)

    const tonicShare = (notes: { pitch: string }[]) =>
      notes.filter((note) => note.pitch.replace(/\d/g, '') === 'C').length / notes.length
    expect(tonicShare(withTrained)).toBeGreaterThan(tonicShare(withSynthetic))
  })

  it('rotates the trained tonic with the project key', () => {
    // The artifact knows nothing about absolute keys; the same tonic-only model
    // must bias toward G when the project is in G major.
    const projectG = { ...baseProject, key: 'G' }
    const notesG = generateMelody({
      project: projectG,
      generator: baseGenerator,
      rng: seededRng(7),
      temperature: 0.4,
      trainedModel: tonicOnly
    })
    const syntheticG = generateMelody({
      project: projectG,
      generator: baseGenerator,
      rng: seededRng(7),
      temperature: 0.4
    })

    expect(notesG.length).toBeGreaterThan(0)
    expect(notesG.length).toBe(syntheticG.length)
    const gShare = (notes: { pitch: string }[]) =>
      notes.filter((note) => note.pitch.replace(/\d/g, '').startsWith('G')).length / notes.length
    expect(gShare(notesG)).toBeGreaterThan(gShare(syntheticG))
  })

  it('falls back to the synthetic model when trainedModel is null', () => {
    const explicitNull = generateMelody({
      project: baseProject,
      generator: baseGenerator,
      rng: seededRng(1),
      trainedModel: null
    })
    const omitted = generateMelody({
      project: baseProject,
      generator: baseGenerator,
      rng: seededRng(1)
    })
    expect(explicitNull.map((n) => n.midi)).toEqual(omitted.map((n) => n.midi))
  })
})
