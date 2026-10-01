import { TRAINED_ARTIFACT_VERSION, TrainedMarkovArtifactSchema } from '../../src/core/schemas/trained-markov.schema'

export const arpTestModel = TrainedMarkovArtifactSchema.parse({
  artifactVersion: TRAINED_ARTIFACT_VERSION,
  kind: 'melodymate-markov',
  id: 'arp-candidate-test',
  role: 'arp',
  style: 'test',
  representation: { type: 'tonic-relative-chroma', symbolCount: 12 },
  maxOrder: 1,
  backoffStrength: 4,
  configHash: '0123456789abcdef',
  manifestHash: '0123456789abcdef',
  stats: { files: 1, tracks: 1, sequences: 1, notes: 101003, contexts: 2, transitions: 101003 },
  counts: { '': { '0': 1, '2': 100000, '4': 1, '7': 1000 }, '0': { '2': 100000, '4': 1, '7': 1000 } }
})
