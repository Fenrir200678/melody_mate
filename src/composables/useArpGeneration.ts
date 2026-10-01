import { computed, ref, shallowRef, type Ref } from 'vue'
import {
  arpCandidateSignature,
  buildArpCandidate,
  type ArpCandidate,
  type ArpCandidateInputs
} from '../core/generator/arp-candidate'
import { varyArpNotes, type ArpVariationMode } from '../core/generator/arp-variation'
import { canCycleArpInversions } from '../core/generator/arp-inversion'
import { DEFAULT_ARP_VARIATION_SEED } from '../config/defaults'
import type { GeneratorParams } from '../core/schemas/generator.schema'
import type { AppNote } from '../core/schemas/note.schema'
import type { TrainedMarkovArtifact, TrainedModelIndexEntry } from '../core/schemas/trained-markov.schema'
import type { TakeScope } from '../core/takes/scope'
import { loadTrainedModel, loadTrainedModelIndex } from '../services/trained-model-service'
import { useHarmonyStore } from '../stores/harmony.store'
import { useProjectStore } from '../stores/project.store'
import { useTakesStore } from '../stores/takes.store'
import { nextArpSeed } from './arpSeed'

export type ArpModelStatus = 'loading' | 'available' | 'fallback' | 'error'
export type ArpCandidateState = 'empty' | 'loading' | 'ready' | 'stale'

export function useArpGeneration(
  generatorParams: Ref<GeneratorParams>,
  isGenerating: Ref<boolean>,
  setGeneratorParams: (params: Partial<GeneratorParams>) => void,
  replaceNotesInScope: (notes: AppNote[], scope: TakeScope) => void,
  onCandidateInvalidated: () => void
) {
  const arpModel = ref<TrainedModelIndexEntry | null>(null)
  const arpModelStatus = ref<ArpModelStatus>('loading')
  const arpStatusMessage = ref('Loading arpeggio models')
  const arpArtifact = shallowRef<TrainedMarkovArtifact | null>(null)
  const arpCandidate = shallowRef<ArpCandidate | null>(null)
  const arpVariationSeed = ref(DEFAULT_ARP_VARIATION_SEED)
  const arpVariationMessage = ref('')
  let indexLoaded = false
  let loadRevision = 0
  let candidateRevision = 0

  const activeModel = computed(() => (arpModelStatus.value === 'available' ? arpArtifact.value : null))

  // Lazy: stores are only touched when the candidate is read, which keeps store creation acyclic.
  const arpInputs = computed<ArpCandidateInputs>(() => {
    const projectStore = useProjectStore()
    const harmonyStore = useHarmonyStore()
    const params = generatorParams.value
    const chords = harmonyStore.useChords ? harmonyStore.chords : undefined
    return {
      key: projectStore.key,
      scale: projectStore.scale,
      range: { ...projectStore.workRange },
      pattern: params.arpPattern,
      rate: params.arpRate,
      octaveRange: params.arpOctaveRange,
      octaveMode: params.arpOctaveMode,
      baseOctave: params.arpBaseOctave,
      pitchSource: params.arpPitchSource,
      inversionCycling: params.arpInversionCycling && canCycleArpInversions(chords),
      gate: params.arpGate,
      adherence: params.arpAdherence,
      accent: params.arpAccent,
      density: params.arpDensity,
      seed: params.arpSeed,
      chords
    }
  })

  const arpInputsKey = computed(() =>
    arpCandidateSignature(arpInputs.value, activeModel.value?.role === 'arp' ? activeModel.value.id : null)
  )

  const arpCandidateState = computed<ArpCandidateState>(() => {
    if (arpModelStatus.value === 'loading') return 'loading'
    if (!arpCandidate.value) return 'empty'
    return arpCandidate.value.signature === arpInputsKey.value ? 'ready' : 'stale'
  })

  async function loadArpModel(): Promise<TrainedMarkovArtifact | null> {
    const revision = ++loadRevision
    arpModelStatus.value = 'loading'
    arpStatusMessage.value = 'Loading arpeggio model'
    try {
      const model = await loadTrainedModel('arp')
      if (revision === loadRevision) {
        arpArtifact.value = model
        arpModelStatus.value = model ? 'available' : 'fallback'
        arpStatusMessage.value = model ? '' : 'Using deterministic chord sequence fallback'
      }
      return model
    } catch {
      if (revision === loadRevision) {
        arpArtifact.value = null
        arpModelStatus.value = 'error'
        arpStatusMessage.value = 'Model unavailable; using deterministic chord sequence fallback'
      }
      return null
    }
  }

  async function loadArpModels(): Promise<void> {
    if (indexLoaded) return
    arpModelStatus.value = 'loading'
    arpStatusMessage.value = 'Loading arpeggio model'
    try {
      const index = await loadTrainedModelIndex()
      arpModel.value = index?.models.find((entry) => entry.role === 'arp') ?? null
      indexLoaded = true
      if (!arpModel.value) {
        arpArtifact.value = null
        arpModelStatus.value = 'fallback'
        arpStatusMessage.value = 'No trained arp model; using deterministic chord sequence fallback'
        return
      }
      await loadArpModel()
    } catch {
      indexLoaded = true
      arpArtifact.value = null
      arpModelStatus.value = 'error'
      arpStatusMessage.value = 'Model index unavailable; using deterministic chord sequence fallback'
    }
  }

  function buildCandidate(): ArpCandidate {
    const candidate = buildArpCandidate(arpInputs.value, activeModel.value, ++candidateRevision)
    arpCandidate.value = candidate
    arpVariationMessage.value = ''
    return candidate
  }

  /** Returns the candidate for the current inputs, rebuilding it only when its inputs changed. */
  function syncArpCandidate(): ArpCandidate | null {
    const current = arpCandidate.value
    if (current && current.signature === arpInputsKey.value) return current
    onCandidateInvalidated()
    return arpModelStatus.value === 'loading' ? null : buildCandidate()
  }

  /** Auto mode rolls a new seed; a locked seed rebuilds the identical candidate. */
  function shuffleArp(): ArpCandidate | null {
    if (!generatorParams.value.arpSeedLocked) {
      setGeneratorParams({ arpSeed: nextArpSeed(generatorParams.value.arpSeed) })
    }
    onCandidateInvalidated()
    return arpModelStatus.value === 'loading' ? null : buildCandidate()
  }

  function discardArpCandidate(): void {
    onCandidateInvalidated()
    arpCandidate.value = null
    arpVariationMessage.value = ''
  }

  function setArpVariationSeed(seed: number): void {
    if (Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xffffffff) arpVariationSeed.value = seed
  }

  function nextArpVariationSeed(): void {
    arpVariationSeed.value = nextArpSeed(arpVariationSeed.value)
  }

  function rerollArpVariation(mode: ArpVariationMode): boolean {
    if (arpCandidateState.value !== 'ready') return false
    const current = arpCandidate.value!
    const notes = varyArpNotes(current.notes, current.inputs, mode, arpVariationSeed.value)
    const changed = notes.some((note, index) =>
      mode === 'pitches'
        ? note.midi !== current.notes[index].midi || note.pitch !== current.notes[index].pitch
        : note.velocity !== current.notes[index].velocity || note.durationSteps !== current.notes[index].durationSteps
    )
    if (!changed) {
      arpVariationMessage.value = mode === 'pitches' ? 'No alternate pitches available' : 'No alternate feel available'
      return false
    }
    onCandidateInvalidated()
    arpCandidate.value = {
      ...current,
      revision: ++candidateRevision,
      notes,
      variations: [...current.variations, { mode, seed: arpVariationSeed.value }]
    }
    arpVariationMessage.value = mode === 'pitches' ? 'Pitches varied' : 'Feel varied'
    return true
  }

  function resetArpVariation(): void {
    if (arpCandidateState.value !== 'ready') return
    const current = arpCandidate.value!
    if (current.variations.length === 0) return
    onCandidateInvalidated()
    arpCandidate.value = { ...current, revision: ++candidateRevision, notes: current.baseNotes, variations: [] }
    arpVariationMessage.value = 'Original candidate restored'
  }

  /** Replaces the work range with the candidate's own notes; never rolls a seed or runs the model again. */
  async function applyArp(): Promise<boolean> {
    if (isGenerating.value) return false
    isGenerating.value = true
    try {
      if (!indexLoaded) await loadArpModels()
      const candidate = syncArpCandidate()
      if (!candidate) return false
      const projectStore = useProjectStore()
      const takesStore = useTakesStore()
      const { range, seed } = candidate.inputs
      const captured = takesStore.captureTake(
        candidate.notes,
        generatorParams.value,
        {
          key: projectStore.key,
          scale: projectStore.scale,
          bpm: projectStore.bpm,
          bars: projectStore.bars,
          rangeStartStep: range.startStep,
          rangeEndStep: range.endStep
        },
        seed,
        { deduplicateBySeed: false, arpVariations: candidate.variations.length ? candidate.variations : undefined }
      )
      if (!captured) {
        arpVariationMessage.value = 'Take rack is full; unlock or remove a take'
        return false
      }
      replaceNotesInScope(candidate.notes, range)
      takesStore.markSeedUsed(seed)
      return true
    } finally {
      isGenerating.value = false
    }
  }

  return {
    applyArp,
    rerollArpVariation,
    resetArpVariation,
    setArpVariationSeed,
    nextArpVariationSeed,
    shuffleArp,
    syncArpCandidate,
    discardArpCandidate,
    loadArpModels,
    arpModel,
    arpModelStatus,
    arpStatusMessage,
    arpCandidate,
    arpVariationSeed,
    arpVariationMessage,
    arpCandidateState,
    arpInputsKey
  }
}
