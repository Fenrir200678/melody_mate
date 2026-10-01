import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadTrainedModel,
  loadTrainedModelIndex,
  resetTrainedModelCache,
  setTrainedModelLoadersForTesting
} from '../../src/services/trained-model-service'

const HASH16 = '0123456789abcdef'

const ARTIFACT = {
  artifactVersion: 1,
  kind: 'melodymate-markov',
  id: 'melody:default',
  role: 'melody',
  style: 'default',
  representation: { type: 'tonic-relative-chroma', symbolCount: 12 },
  maxOrder: 4,
  backoffStrength: 4,
  configHash: HASH16,
  manifestHash: HASH16,
  stats: { files: 1, tracks: 1, sequences: 1, notes: 4, contexts: 2, transitions: 3 },
  counts: { '': { '0': 2, '2': 1, '4': 1 }, '0': { '2': 1 } }
}

function makeIndex(overrides: Record<string, unknown> = {}) {
  return {
    artifactVersion: 1,
    kind: 'melodymate-markov-index',
    models: [
      {
        file: 'melodymate-markov-melody-default.json',
        id: 'melody:default',
        role: 'melody',
        style: 'default',
        sha256: '0'.repeat(64),
        maxOrder: 4,
        stats: ARTIFACT.stats
      }
    ],
    ...overrides
  }
}

describe('trained-model-service', () => {
  beforeEach(() => {
    resetTrainedModelCache()
    setTrainedModelLoadersForTesting(null)
  })

  afterEach(() => {
    setTrainedModelLoadersForTesting(null)
  })

  it('loads real shipped tables for melody, bass, and arp out of the box', async () => {
    const melody = await loadTrainedModel('melody')
    expect(melody?.role).toBe('melody')
    expect(melody?.counts['']).toBeDefined()

    const arp = await loadTrainedModel('arp')
    expect(arp?.role).toBe('arp')

    const bass = await loadTrainedModel('bass')
    expect(bass?.role).toBe('bass')
  })

  it('loads, validates and returns the selected artifact with custom loaders', async () => {
    setTrainedModelLoadersForTesting({
      'index.json': async () => makeIndex(),
      'melodymate-markov-melody-default.json': async () => ARTIFACT
    })

    const model = await loadTrainedModel('melody')
    expect(model?.id).toBe('melody:default')
    expect(model?.counts['']).toEqual({ '0': 2, '2': 1, '4': 1 })
  })

  it('caches the index and artifact across calls', async () => {
    const indexLoader = vi.fn(async () => makeIndex())
    const artifactLoader = vi.fn(async () => ARTIFACT)

    setTrainedModelLoadersForTesting({
      'index.json': indexLoader,
      'melodymate-markov-melody-default.json': artifactLoader
    })

    await loadTrainedModel('melody')
    await loadTrainedModel('melody')
    await loadTrainedModelIndex()

    expect(indexLoader).toHaveBeenCalledTimes(1)
    expect(artifactLoader).toHaveBeenCalledTimes(1)
  })

  it('falls back to null when a file is missing in loaders', async () => {
    setTrainedModelLoadersForTesting({
      'index.json': async () => null
    })

    expect(await loadTrainedModel('melody')).toBeNull()
    expect(await loadTrainedModel('melody')).toBeNull()
  })

  it('falls back to null on loader errors', async () => {
    setTrainedModelLoadersForTesting({
      'index.json': async () => {
        throw new Error('disk read failed')
      }
    })

    expect(await loadTrainedModel('melody')).toBeNull()
  })

  it('falls back to null when the index fails validation', async () => {
    setTrainedModelLoadersForTesting({
      'index.json': async () => ({ kind: 'invalid-schema' })
    })

    expect(await loadTrainedModelIndex()).toBeNull()
    expect(await loadTrainedModel('melody')).toBeNull()
  })

  it('falls back to null when the artifact fails validation', async () => {
    const broken = { ...ARTIFACT, counts: { '': { '13': 1 } } }
    setTrainedModelLoadersForTesting({
      'index.json': async () => makeIndex(),
      'melodymate-markov-melody-default.json': async () => broken
    })

    expect(await loadTrainedModel('melody')).toBeNull()
  })

  it('returns null when no model exists for the requested role', async () => {
    setTrainedModelLoadersForTesting({
      'index.json': async () => makeIndex(),
      'melodymate-markov-melody-default.json': async () => ARTIFACT
    })

    expect(await loadTrainedModel('bass')).toBeNull()
  })

  it('loads each role from its own indexed artifact', async () => {
    const arp = { ...ARTIFACT, id: 'arp:default', role: 'arp' }
    const bass = { ...ARTIFACT, id: 'bass:default', role: 'bass' }
    const index = makeIndex({
      models: [
        {
          file: 'arp.json',
          id: arp.id,
          role: 'arp',
          style: arp.style,
          sha256: '0'.repeat(64),
          maxOrder: arp.maxOrder,
          stats: arp.stats
        },
        {
          file: 'bass.json',
          id: bass.id,
          role: 'bass',
          style: bass.style,
          sha256: '0'.repeat(64),
          maxOrder: bass.maxOrder,
          stats: bass.stats
        },
        {
          file: 'melody.json',
          id: ARTIFACT.id,
          role: ARTIFACT.role,
          style: ARTIFACT.style,
          sha256: '0'.repeat(64),
          maxOrder: ARTIFACT.maxOrder,
          stats: ARTIFACT.stats
        }
      ]
    })

    setTrainedModelLoadersForTesting({
      'index.json': async () => index,
      'arp.json': async () => arp,
      'bass.json': async () => bass,
      'melody.json': async () => ARTIFACT
    })

    expect((await loadTrainedModel('arp'))?.id).toBe(arp.id)
    expect((await loadTrainedModel('bass'))?.id).toBe(bass.id)
    expect((await loadTrainedModel('melody'))?.id).toBe(ARTIFACT.id)
  })
})
