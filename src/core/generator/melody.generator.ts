import { Note } from 'tonal'
import { humanizeNoteDuration, humanizeVelocity } from '../rhythm/humanize'
import { getRhythmPresetCycleSteps, type RhythmPreset } from '../rhythm/presets'
import type { ChordEvent } from '../schemas/chord.schema'
import type { GeneratorParams } from '../schemas/generator.schema'
import { AppNoteSchema, type AppNote } from '../schemas/note.schema'
import type { ProjectConfig } from '../schemas/project.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import type { CustomRhythmPattern } from '../schemas/custom-rhythm.schema'
import type { TrainedMarkovArtifact } from '../schemas/trained-markov.schema'
import { getPentatonicEquivalent, midiToPitch, pitchToMidi, snapPitchToScale } from '../theory/scale.engine'
import { getActiveChordNotes } from './chord.lookup'
import { buildCandidatePool, evaluateAndPickCandidate, type CandidateNote, type HeuristicContext } from './heuristics'
import { buildMarkovTable, generateScaleTrainingSequences, type MarkovTable } from './markov.engine'
import { getTrainedMarkovTable, makeTonicRelativeEncoder, type PitchClassEncoder } from './trained-markov'
import { applyCallAndResponse } from './call-response'
import { planContourFrames } from './contour-plan'
import { applyMotifStructure } from './motifs'
import { generateRhythmOnsets } from './rhythm-onsets'
import { applyPitchOnlyStructure } from './pitch-structure'

export interface MelodyGeneratorOptions {
  project: ProjectConfig
  generator: GeneratorParams
  chords?: ChordEvent[]
  chordAdherence?: number
  rhythmPreset?: RhythmPreset
  customPattern?: CustomRhythmPattern
  startWithRoot?: boolean
  endWithRoot?: boolean
  minOctave?: number
  maxOctave?: number
  temperature?: number
  rng?: () => number
  rangeStartStep?: number
  rangeEndStep?: number
  /** Offline-trained model data (already loaded and validated by the caller).
   * When present it replaces the synthetic scale model as the Markov prior. */
  trainedModel?: TrainedMarkovArtifact | null
}

// Scale training data depends only on key/scale/order, so trained tables are
// reused across generations (bounded by the finite key x scale x order space)
const markovCache = new Map<string, MarkovTable>()

function getOrBuildMarkovTable(root: string, scaleName: string, order: number): MarkovTable {
  const cacheKey = `${root}|${scaleName}|${order}`
  let table = markovCache.get(cacheKey)
  if (!table) {
    table = buildMarkovTable(generateScaleTrainingSequences(root, scaleName), order)
    markovCache.set(cacheKey, table)
  }
  return table
}

function resolveRootCandidate(pool: CandidateNote[], rootPc: string, centerMidi: number): CandidateNote {
  return pool
    .filter((candidate) => candidate.pitchClass === rootPc)
    .reduce((best, candidate) =>
      Math.abs(candidate.midi - centerMidi) < Math.abs(best.midi - centerMidi) ? candidate : best
    )
}

/**
 * Primary orchestration function to generate a validated melodic line.
 */
export function generateMelody(options: MelodyGeneratorOptions): AppNote[] {
  const rng = options.rng ?? Math.random
  const { project, generator } = options

  const stepsPerBar = STEPS_PER_BAR
  const projectTotalSteps = (project.bars ?? 4) * stepsPerBar
  const rangeStartStep = Math.max(0, options.rangeStartStep ?? 0)
  const rangeEndStep = Math.min(projectTotalSteps, options.rangeEndStep ?? projectTotalSteps)
  const totalSteps = Math.max(1, rangeEndStep - rangeStartStep)
  const bars = Math.max(1, Math.round(totalSteps / stepsPerBar))
  const beatSteps = Math.max(1, Math.round(stepsPerBar / 4))

  const minOctave = options.minOctave ?? generator.minOctave ?? 3
  const maxOctave = options.maxOctave ?? generator.maxOctave ?? 5
  const loOctave = Math.min(minOctave, maxOctave)
  const hiOctave = Math.max(minOctave, maxOctave)
  const temperature = options.temperature ?? 1.0
  const chordAdherence = options.chordAdherence ?? generator.chordAdherence
  const rootPc = Note.pitchClass(project.key) || project.key
  const startWithRoot = options.startWithRoot ?? generator.startWithRoot ?? false
  const endWithRoot = options.endWithRoot ?? generator.endWithRoot ?? false

  // 1. Generate rhythm onsets
  const onsets = generateRhythmOnsets({
    generator,
    rhythmPreset: options.rhythmPreset,
    customPattern: options.customPattern,
    rangeStartStep,
    rangeEndStep,
    rng
  })
  if (onsets.length === 0) {
    return []
  }

  const effectiveScale = generator.pentatonicMode ? getPentatonicEquivalent(project.scale) : project.scale

  // 2. Resolve the Markov prior: the offline-trained artifact wins when the
  // caller supplied one; otherwise the synthetic scale model is the fallback.
  const markovOrder = generator.markovOrder ?? 2
  const trainedModel = options.trainedModel ?? null
  const markovTable = trainedModel
    ? getTrainedMarkovTable(trainedModel)
    : getOrBuildMarkovTable(project.key, effectiveScale, markovOrder)
  // Trained symbols are tonic-relative chroma offsets, so lookups project the
  // spelled pitch classes of pool/history into that rotation-invariant space.
  const markovSymbolEncoder: PitchClassEncoder | undefined = trainedModel ? makeTonicRelativeEncoder(rootPc) : undefined

  // 3. Sequential pitch selection via Candidate Pool & Heuristics Softmax
  const rawNotes: AppNote[] = []
  const history: CandidateNote[] = []

  // Candidate pools only change with the active chord, so they are reused per chord
  const poolCache = new Map<string, CandidateNote[]>()

  const minMidi = pitchToMidi(`C${loOctave}`)
  const maxMidi = pitchToMidi(`B${hiOctave}`)
  const rootCandidate = resolveRootCandidate(
    buildCandidatePool(project.key, effectiveScale, loOctave, hiOctave, []),
    rootPc,
    (minMidi + maxMidi) / 2
  )
  const contourFrames = planContourFrames(onsets, totalSteps, stepsPerBar, minMidi, maxMidi, generator.contour)

  for (let i = 0; i < onsets.length; i++) {
    const onset = onsets[i]
    const relativeStep = onset.step
    const absoluteStep = rangeStartStep + relativeStep
    const isFirstNote = i === 0
    const isLastNote = i === onsets.length - 1
    const stepInBar = absoluteStep % stepsPerBar

    const currentChordNotes = getActiveChordNotes(absoluteStep, stepsPerBar, options.chords, project.key)

    const poolKey = currentChordNotes.join('|')
    let pool = poolCache.get(poolKey)
    if (!pool) {
      pool = buildCandidatePool(project.key, effectiveScale, loOctave, hiOctave, currentChordNotes)
      poolCache.set(poolKey, pool)
    }

    let chosenCandidate: CandidateNote

    if ((isFirstNote && startWithRoot) || (isLastNote && endWithRoot)) {
      // Deterministic root start/resolution
      chosenCandidate = pool.find((candidate) => candidate.midi === rootCandidate.midi) ?? rootCandidate
    } else {
      const contourFrame = contourFrames[i]

      const context: HeuristicContext = {
        history,
        stepInBar,
        stepsPerBar,
        contourProgress: contourFrame.progress,
        contourMinMidi: contourFrame.minMidi,
        contourMaxMidi: contourFrame.maxMidi,
        contour: generator.contour,
        contourStrength: generator.contourStrength,
        minOctave: loOctave,
        maxOctave: hiOctave,
        pentatonicMode: generator.pentatonicMode,
        chordAdherence,
        markovTable,
        markovOrder,
        markovSymbolEncoder,
        temperature
      }

      chosenCandidate = evaluateAndPickCandidate(pool, context, {}, rng)
    }

    history.push(chosenCandidate)

    // Keep accents intact through phrase transformations before adding final variation.
    let baseVel = onset.velocity ?? 86
    if (generator.rhythmMode !== 'custom' && stepInBar === 0) {
      baseVel = 106 // Beat 1
    } else if (generator.rhythmMode !== 'custom' && stepInBar === beatSteps * 2) {
      baseVel = 98 // Beat 3
    } else if (generator.rhythmMode !== 'custom' && stepInBar % beatSteps === 0) {
      baseVel = 92 // Beats 2 and 4
    }

    const accentStrength = generator.accentStrength ?? 1
    const accentedVelocity = Math.round(86 + (baseVel - 86) * accentStrength)
    const durationSteps = Math.min(onset.durationSteps, Math.max(1, rangeEndStep - absoluteStep))

    rawNotes.push({
      id: crypto.randomUUID(),
      pitch: chosenCandidate.pitch,
      midi: chosenCandidate.midi,
      step: absoluteStep,
      durationSteps,
      velocity: accentedVelocity,
      isMuted: false
    })
  }

  // 4. Apply Motif Structures if specified (bypassed if Call & Response is active)
  let structuredNotes = rawNotes
  // Multi-bar presets already carry a phrase; structure controls vary pitches
  // without replacing the answer bar or shortening notes across bar lines.
  const preserveRhythm =
    generator.rhythmMode === 'custom' ||
    (generator.rhythmMode === 'preset' &&
      options.rhythmPreset !== undefined &&
      getRhythmPresetCycleSteps(options.rhythmPreset) > stepsPerBar)
  if (preserveRhythm) {
    structuredNotes = applyPitchOnlyStructure(
      rawNotes,
      generator,
      bars,
      stepsPerBar,
      rangeStartStep,
      options.chords,
      project.key,
      effectiveScale,
      rng,
      loOctave,
      hiOctave,
      chordAdherence
    )
  } else if (generator.motif && generator.motif !== 'FREE' && !generator.callAndResponse) {
    structuredNotes = applyMotifStructure(structuredNotes, {
      pattern: generator.motif,
      bars,
      stepsPerBar,
      chords: options.chords,
      root: project.key,
      scaleName: effectiveScale,
      rng,
      startStep: rangeStartStep,
      minOctave: loOctave,
      maxOctave: hiOctave,
      motifVariation: generator.motifVariation,
      pentatonicMode: generator.pentatonicMode,
      chordAdherence
    })
  }

  // 5. Apply Call & Response if enabled
  if (generator.callAndResponse && !preserveRhythm) {
    structuredNotes = applyCallAndResponse(
      structuredNotes,
      bars,
      stepsPerBar,
      project.key,
      effectiveScale,
      options.chords,
      0,
      rng,
      rangeStartStep,
      {
        style: generator.answerStyle,
        variation: generator.answerVariation,
        chordAdherence,
        pentatonicMode: generator.pentatonicMode,
        minOctave: loOctave,
        maxOctave: hiOctave
      }
    )
  }

  // 6. Final boundary constraints & schema verification
  const finalNotes: AppNote[] = []
  const rootPitch = rootCandidate.pitch
  const rootMidi = rootCandidate.midi
  // Length variation must not shift the seeded velocity pattern.
  const velocities = structuredNotes.map((note) => humanizeVelocity(note.velocity, generator.velocityVariation, rng))

  for (let idx = 0; idx < structuredNotes.length; idx++) {
    const n = structuredNotes[idx]
    let pitch: string
    let midi: number

    // Enforce root constraints if transformed
    if ((idx === 0 && startWithRoot) || (idx === structuredNotes.length - 1 && endWithRoot)) {
      pitch = rootPitch
      midi = rootMidi
    } else {
      let clampedMidi = n.midi
      while (clampedMidi < minMidi) {
        clampedMidi += 12
      }
      while (clampedMidi > maxMidi) {
        clampedMidi -= 12
      }
      const candidatePitch = midiToPitch(clampedMidi)
      const scalePitch = snapPitchToScale(candidatePitch, project.key, effectiveScale)
      const candidateChroma = Note.chroma(candidatePitch)
      const isAlteredChordTone =
        !generator.pentatonicMode &&
        pitchToMidi(scalePitch) !== clampedMidi &&
        candidateChroma !== undefined &&
        getActiveChordNotes(n.step, stepsPerBar, options.chords).some(
          (chordNote) => Note.chroma(chordNote) === candidateChroma
        )

      // Preserve an explicit chord alteration after phrase transformations.
      pitch = isAlteredChordTone ? candidatePitch : scalePitch
      midi = pitchToMidi(pitch)
    }

    const validated = AppNoteSchema.parse({
      id: n.id,
      pitch,
      midi,
      step: n.step,
      durationSteps:
        generator.rhythmMode === 'custom'
          ? n.durationSteps
          : humanizeNoteDuration(
              n.durationSteps,
              generator.noteLength,
              generator.noteLengthVariation,
              Math.min(structuredNotes[idx + 1]?.step ?? rangeEndStep, rangeEndStep) - n.step,
              rng
            ),
      velocity: velocities[idx],
      isMuted: n.isMuted
    })

    finalNotes.push(validated)
  }

  return finalNotes.sort((a, b) => a.step - b.step)
}
