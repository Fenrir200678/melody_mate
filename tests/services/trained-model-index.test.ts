import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TrainedMarkovArtifactSchema, TrainedModelIndexSchema } from '../../src/core/schemas/trained-markov.schema'

const modelsDir = fileURLToPath(new URL('../../markov-tables/', import.meta.url))

describe('shipped trained models', () => {
  it('contains one valid, checksum-matched artifact for each generator role', () => {
    const index = TrainedModelIndexSchema.parse(
      JSON.parse(readFileSync(new URL('index.json', `file://${modelsDir}/`), 'utf8'))
    )
    expect(index.models.map((model) => model.role).sort()).toEqual(['arp', 'bass', 'melody'])
    expect(new Set(index.models.map((model) => model.id)).size).toBe(index.models.length)
    expect(
      readdirSync(modelsDir)
        .filter((file) => file.endsWith('.json'))
        .sort()
    ).toEqual(['index.json', ...index.models.map((model) => model.file)].sort())

    for (const entry of index.models) {
      const bytes = readFileSync(new URL(entry.file, `file://${modelsDir}/`))
      const artifact = TrainedMarkovArtifactSchema.parse(JSON.parse(bytes.toString('utf8')))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256)
      expect(artifact.id).toBe(entry.id)
      expect(artifact.role).toBe(entry.role)
      expect(artifact.style).toBe(entry.style)
      expect(artifact.stats).toEqual(entry.stats)
      expect(artifact.configHash).toBe(index.configHash)
      expect(artifact.manifestHash).toBe(index.manifestHash)
      expect(artifact.corpusHash).toBe(index.corpusHash)
      expect(Object.keys(artifact.counts)).toHaveLength(entry.stats.contexts)
      expect(Object.values(artifact.counts[''] ?? {}).reduce((sum, count) => sum + count, 0)).toBe(entry.stats.notes)
    }
  })
})
