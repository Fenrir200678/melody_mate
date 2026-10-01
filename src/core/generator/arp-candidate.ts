import type { ChordEvent } from '../schemas/chord.schema'
import type { AppNote } from '../schemas/note.schema'
import type { TrainedMarkovArtifact } from '../schemas/trained-markov.schema'
import { generateArpeggio, type ArpeggioGeneratorOptions } from './arpeggio.generator'
import type { ArpVariationMode } from './arp-variation'
import type { WorkRange } from './work-range'

/** Everything the arpeggio output depends on, apart from the trained model. */
export type ArpCandidateInputs = Omit<ArpeggioGeneratorOptions, 'trainedModel' | 'chords'> & {
  chords?: readonly ChordEvent[]
}

/** One generated arpeggio for a work range; display, audition and apply all share its notes. */
export interface ArpCandidate {
  revision: number
  signature: string
  inputs: ArpCandidateInputs
  modelId: string | null
  baseNotes: AppNote[]
  variations: { mode: ArpVariationMode; seed: number }[]
  notes: AppNote[]
}

export function arpCandidateSignature(inputs: ArpCandidateInputs, modelId: string | null): string {
  const { chords, range, ...rest } = inputs
  return JSON.stringify([
    rest,
    [range.startStep, range.endStep],
    chords?.map((chord) => [
      chord.id,
      chord.name,
      chord.startBar,
      chord.durationBars,
      chord.notes,
      chord.voicing,
      chord.inversion
    ]) ?? null,
    modelId
  ])
}

export function buildArpCandidate(
  inputs: ArpCandidateInputs,
  model: TrainedMarkovArtifact | null,
  revision: number
): ArpCandidate {
  const trained = model?.role === 'arp' ? model : null
  const range: WorkRange = { ...inputs.range }
  const snapshot: ArpCandidateInputs = { ...inputs, range, chords: inputs.chords?.map((chord) => ({ ...chord })) }
  const modelId = trained?.id ?? null
  const notes = generateArpeggio({ ...snapshot, trainedModel: trained })
  return {
    revision,
    signature: arpCandidateSignature(snapshot, modelId),
    inputs: snapshot,
    modelId,
    baseNotes: notes,
    variations: [],
    notes
  }
}
