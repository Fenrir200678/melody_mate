import { selectTrainedIndexEntry } from '../core/generator/trained-markov'
import {
  TrainedMarkovArtifactSchema,
  TrainedModelIndexSchema,
  type TrainedMarkovArtifact,
  type TrainedModelIndex,
  type TrainedModelIndexEntry,
  type TrainedRole
} from '../core/schemas/trained-markov.schema'

/**
 * On-demand loader for offline-trained Markov transition tables.
 *
 * Tables are shipped in the `markov-tables/` project directory and dynamically
 * imported on first generation, then cached. Any failure — missing file,
 * schema violation, or corrupt data — resolves to null so the generator
 * silently keeps using its synthetic scale model.
 */

export type TableLoader = () => Promise<unknown>

const DEFAULT_LOADERS: Record<string, TableLoader> = {
  'index.json': () => import('@markov-tables/index.json'),
  'melodymate-markov-arp-default.json': () => import('@markov-tables/melodymate-markov-arp-default.json'),
  'melodymate-markov-bass-default.json': () => import('@markov-tables/melodymate-markov-bass-default.json'),
  'melodymate-markov-melody-default.json': () => import('@markov-tables/melodymate-markov-melody-default.json')
}

let customLoaders: Record<string, TableLoader> | null = null

function getLoader(filename: string): TableLoader | undefined {
  if (customLoaders) {
    return customLoaders[filename]
  }
  return DEFAULT_LOADERS[filename]
}

function unwrapModule(mod: unknown): unknown {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default: unknown }).default
  }
  return mod
}

let indexPromise: Promise<TrainedModelIndex | null> | null = null
const artifactCache = new Map<string, Promise<TrainedMarkovArtifact | null>>()

export function loadTrainedModelIndex(): Promise<TrainedModelIndex | null> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const loader = getLoader('index.json')
      if (!loader) return null
      try {
        const raw = await loader()
        const parsed = TrainedModelIndexSchema.safeParse(unwrapModule(raw))
        return parsed.success ? parsed.data : null
      } catch {
        return null
      }
    })()
  }
  return indexPromise
}

export async function loadTrainedModel(role: TrainedRole = 'melody'): Promise<TrainedMarkovArtifact | null> {
  const index = await loadTrainedModelIndex()
  if (!index) return null
  const entry = selectTrainedIndexEntry(index.models, role)
  if (!entry) return null
  return loadTrainedArtifact(entry)
}

function loadTrainedArtifact(entry: TrainedModelIndexEntry): Promise<TrainedMarkovArtifact | null> {
  const cacheKey = `${entry.file}@${entry.id}`
  let pending = artifactCache.get(cacheKey)
  if (!pending) {
    pending = (async () => {
      const loader = getLoader(entry.file)
      if (!loader) return null
      try {
        const raw = await loader()
        const parsed = TrainedMarkovArtifactSchema.safeParse(unwrapModule(raw))
        if (!parsed.success) return null
        const artifact = parsed.data
        if (artifact.id !== entry.id || artifact.role !== entry.role || artifact.style !== entry.style) {
          return null
        }
        return artifact
      } catch {
        return null
      }
    })()
    artifactCache.set(cacheKey, pending)
  }
  return pending
}

export function resetTrainedModelCache(): void {
  indexPromise = null
  artifactCache.clear()
}

/** Testing helper to stub table loaders without network mocking. */
export function setTrainedModelLoadersForTesting(loaders: Record<string, TableLoader> | null): void {
  customLoaders = loaders
  resetTrainedModelCache()
}
