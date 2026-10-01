import { Note } from 'tonal'
import type { TrainedMarkovArtifact, TrainedModelIndexEntry, TrainedRole } from '../schemas/trained-markov.schema'
import type { MarkovTable } from './markov.engine'

/** Maps a spelled pitch class ('Bb') into the trained model's symbol space ('10'). */
export type PitchClassEncoder = (pitchClass: string) => string

// Conversion is content-independent, so one table per artifact is enough;
// the tonic-relative symbols work in every key without rebuilding.
const trainedTableCache = new Map<string, MarkovTable>()

export function trainedCountsToMarkovTable(counts: Record<string, Record<string, number>>): MarkovTable {
  const table: MarkovTable = new Map()
  for (const context of Object.keys(counts).sort()) {
    table.set(context, new Map(Object.entries(counts[context])))
  }
  return table
}

export function getTrainedMarkovTable(artifact: TrainedMarkovArtifact): MarkovTable {
  const cacheKey = `${artifact.id}|${artifact.configHash}|${Object.keys(artifact.counts).length}`
  let table = trainedTableCache.get(cacheKey)
  if (!table) {
    table = trainedCountsToMarkovTable(artifact.counts)
    trainedTableCache.set(cacheKey, table)
  }
  return table
}

/**
 * Builds the encoder between the app's spelled pitch classes and the
 * artifact's tonic-relative chroma symbols: symbol = (chroma - tonic) % 12.
 * This is what makes one artifact usable across all keys: candidates and
 * history are projected into the same rotation-invariant space the offline
 * training used.
 */
export function makeTonicRelativeEncoder(tonicPitchClass: string): PitchClassEncoder {
  const tonicChroma = Note.chroma(tonicPitchClass) ?? 0
  return (pitchClass: string) => {
    const chroma = Note.chroma(pitchClass)
    return chroma === undefined ? pitchClass : String((chroma - tonicChroma + 12) % 12)
  }
}

/**
 * Deterministic model selection:
 * 1. only entries for the requested role,
 * 2. an exact style match when a preference is given,
 * 3. the model with the most trained notes,
 * 4. lexicographic id as the final tie-break.
 */
export function selectTrainedIndexEntry(
  entries: readonly TrainedModelIndexEntry[],
  role: TrainedRole,
  stylePreference?: string
): TrainedModelIndexEntry | null {
  let pool = entries.filter((entry) => entry.role === role)
  if (stylePreference) {
    const styled = pool.filter((entry) => entry.style === stylePreference)
    if (styled.length > 0) {
      pool = styled
    }
  }
  if (pool.length === 0) {
    return null
  }
  return [...pool].sort((a, b) => b.stats.notes - a.stats.notes || a.id.localeCompare(b.id))[0]
}

export function clearTrainedTableCache(): void {
  trainedTableCache.clear()
}
