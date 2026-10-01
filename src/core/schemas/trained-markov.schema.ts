import { z } from 'zod'

// Bumped whenever the artifact layout changes; the app never migrates old
// artifacts, it falls back to the synthetic scale model instead.
export const TRAINED_ARTIFACT_VERSION = 1

export const TrainedRoleSchema = z.enum(['melody', 'bass', 'arp'])
export type TrainedRole = z.infer<typeof TrainedRoleSchema>

export const TrainedRepresentationSchema = z.strictObject({
  // Symbols are semitone offsets from the project tonic: (chroma - tonic) % 12.
  // One artifact therefore works in every key without retraining.
  type: z.literal('tonic-relative-chroma'),
  symbolCount: z.literal(12)
})

export const TrainedStatsSchema = z.strictObject({
  files: z.number().int().nonnegative(),
  tracks: z.number().int().nonnegative(),
  sequences: z.number().int().nonnegative(),
  notes: z.number().int().nonnegative(),
  contexts: z.number().int().nonnegative(),
  transitions: z.number().int().nonnegative()
})

const shortHashSchema = z.string().regex(/^[0-9a-f]{16}$/)

const TrainedCountsSchema = z.record(z.string(), z.record(z.string(), z.number().nonnegative()))

export type TrainedCounts = z.infer<typeof TrainedCountsSchema>

function isSymbolKey(key: string): boolean {
  return /^\d{1,2}$/.test(key) && Number(key) < 12
}

function isContextKey(key: string, maxOrder: number): boolean {
  if (key === '') return true
  const parts = key.split('|')
  return parts.length <= Math.max(1, maxOrder) && parts.every(isSymbolKey)
}

export const TrainedMarkovArtifactSchema = z
  .strictObject({
    artifactVersion: z.literal(TRAINED_ARTIFACT_VERSION),
    kind: z.literal('melodymate-markov'),
    id: z.string().min(1),
    role: TrainedRoleSchema,
    style: z.string().min(1),
    representation: TrainedRepresentationSchema,
    maxOrder: z.number().int().min(0).max(4),
    // Informational mirror of the app-side backoff constant used at read time.
    backoffStrength: z.number().positive(),
    generatedBy: z.string().optional(),
    config: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]))
      .optional(),
    configHash: shortHashSchema,
    extractionHash: shortHashSchema.optional(),
    manifestHash: shortHashSchema,
    corpusHash: shortHashSchema.optional(),
    stats: TrainedStatsSchema,
    counts: TrainedCountsSchema
  })
  .superRefine((artifact, ctx) => {
    const contexts = Object.keys(artifact.counts)
    if (contexts.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['counts'], message: 'Trained artifact contains no contexts.' })
      return
    }
    const unigrams = artifact.counts['']
    if (!unigrams || Object.keys(unigrams).length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['counts'],
        message: 'Trained artifact is missing the order-0 unigram context.'
      })
    }
    for (const [contextKey, bucket] of Object.entries(artifact.counts)) {
      if (!isContextKey(contextKey, artifact.maxOrder)) {
        ctx.addIssue({
          code: 'custom',
          path: ['counts'],
          message: `Invalid context key '${contextKey}' for maxOrder ${artifact.maxOrder}.`
        })
        continue
      }
      if (Object.keys(bucket).length === 0) {
        ctx.addIssue({ code: 'custom', path: ['counts'], message: `Context '${contextKey}' has no successors.` })
      }
      for (const [symbol, count] of Object.entries(bucket)) {
        if (!isSymbolKey(symbol)) {
          ctx.addIssue({ code: 'custom', path: ['counts'], message: `Invalid symbol key '${symbol}'.` })
        } else if (!Number.isFinite(count) || count <= 0) {
          ctx.addIssue({ code: 'custom', path: ['counts'], message: `Non-positive count for '${symbol}'.` })
        }
      }
    }
  })

export type TrainedMarkovArtifact = z.infer<typeof TrainedMarkovArtifactSchema>

export const TrainedModelIndexEntrySchema = z.strictObject({
  // Basename only: an index can never point the loader outside its base URL.
  file: z.string().regex(/^[\w.-]+\.json$/),
  id: z.string().min(1),
  role: TrainedRoleSchema,
  style: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  maxOrder: z.number().int().min(0).max(4),
  representation: TrainedRepresentationSchema.optional(),
  stats: TrainedStatsSchema
})

export type TrainedModelIndexEntry = z.infer<typeof TrainedModelIndexEntrySchema>

export const TrainedModelIndexSchema = z.strictObject({
  artifactVersion: z.literal(TRAINED_ARTIFACT_VERSION),
  kind: z.literal('melodymate-markov-index'),
  generatedBy: z.string().optional(),
  configHash: shortHashSchema.optional(),
  manifestHash: shortHashSchema.optional(),
  corpusHash: shortHashSchema.optional(),
  models: z.array(TrainedModelIndexEntrySchema).min(1)
})

export type TrainedModelIndex = z.infer<typeof TrainedModelIndexSchema>
