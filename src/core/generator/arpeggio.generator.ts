import { Chord, Note } from 'tonal'
import type { ChordEvent } from '../schemas/chord.schema'
import type { AppNote } from '../schemas/note.schema'
import type { ArpOctaveMode, ArpPitchSource } from '../schemas/generator.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import type { TrainedMarkovArtifact } from '../schemas/trained-markov.schema'
import { getScaleNotes, midiToPitch } from '../theory/scale.engine'
import { getChordNotes } from '../theory/chord.engine'
import { createRng } from './rng'
import { getMarkovProbability, type MarkovTable } from './markov.engine'
import { getTrainedMarkovTable, makeTonicRelativeEncoder } from './trained-markov'
import { patternIndex, type ArpeggioPattern } from './arp-pattern'
import { arpOctavePool } from './arp-octave'
import { cycleArpInversion, getArpInversionAnchors, getArpInversionBarOffset } from './arp-inversion'
import { calculateArpVelocity, maskArpBarSteps } from './arp-rhythm'
import { findActiveArpChord, getArpChordVoicingPitches, getArpVoicingPassingPitches } from './arp-voicing'
import { DEFAULT_GENERATOR_PARAMS } from '../../config/defaults'
import type { WorkRange } from './work-range'

export type ArpeggioRate = '1/4' | '1/8' | '1/16' | '1/8d' | '1/4d'

export interface ArpeggioGeneratorOptions {
  key: string
  scale: string
  range: WorkRange
  pattern: ArpeggioPattern
  rate: ArpeggioRate
  octaveRange: number
  octaveMode?: ArpOctaveMode
  baseOctave?: number
  /** Pitch pool origin; defaults to the pitch-classes window so existing callers stay stable. */
  pitchSource?: ArpPitchSource
  inversionCycling?: boolean
  gate?: number
  adherence?: number
  accent?: number
  density?: number
  seed: number
  chords?: readonly ChordEvent[]
  trainedModel?: TrainedMarkovArtifact | null
}

const RATE_STEPS: Record<ArpeggioRate, number> = {
  '1/16': 1,
  '1/8': 2,
  '1/8d': 3,
  '1/4': 4,
  '1/4d': 6
}
const FALLBACK_DEGREES = [0, 5, 3, 4]

interface Harmony {
  chord: ChordEvent | undefined
  identity: string
  chromas: Set<number>
  rootChroma: number | undefined
  /** Absolute Chord Studio pitches, or null when the mode rebuilds the pool from pitch classes. */
  voicingMidis: number[] | null
}

function syntheticTriad(key: string, scale: string, bar: number, seed: number): Set<number> {
  const scaleNotes = getScaleNotes(key, scale)
  const notes = scaleNotes.length >= 3 ? scaleNotes : getScaleNotes(key, 'major')
  if (notes.length === 0) return new Set([0, 4, 7])
  const degree =
    FALLBACK_DEGREES[(bar + ((seed >>> 0) % FALLBACK_DEGREES.length)) % FALLBACK_DEGREES.length] % notes.length
  return new Set([0, 2, 4].map((offset) => Note.chroma(notes[(degree + offset) % notes.length]) ?? 0))
}

/**
 * Resolves the active pitch chromas (0–11) at a given step, either from user chords or synthetic diatonic triads.
 */
export function getArpHarmonyChromas(
  step: number,
  options: Pick<ArpeggioGeneratorOptions, 'key' | 'scale' | 'seed' | 'chords'>
): Set<number> {
  const active = findActiveArpChord(options.chords, step)
  if (active) {
    const chromas = new Set(
      (active.notes.length > 0 ? active.notes : getChordNotes(active.name))
        .map((pitch) => Note.chroma(pitch))
        .filter((chroma): chroma is number => chroma !== undefined)
    )
    if (chromas.size > 0) return chromas
  }
  const bar = Math.floor(step / STEPS_PER_BAR)
  return syntheticTriad(options.key, options.scale, bar, options.seed)
}

/**
 * Checks whether a given MIDI pitch or note is an active chord tone at the specified step.
 */
export function isArpChordTone(
  step: number,
  midi: number,
  options: Pick<ArpeggioGeneratorOptions, 'key' | 'scale' | 'seed' | 'chords'>
): boolean {
  const chromas = getArpHarmonyChromas(step, options)
  return chromas.has(midi % 12)
}

function harmonyAt(step: number, options: ArpeggioGeneratorOptions): Harmony {
  const active = findActiveArpChord(options.chords, step)
  const bar = Math.floor(step / STEPS_PER_BAR)
  const chromas = getArpHarmonyChromas(step, options)
  // Chord names carry the real root (also for slash chords); note lists may start on an inversion's bass.
  const namedRoot = active ? Note.chroma(Chord.get(active.name).tonic ?? '') : undefined
  const wantsVoicing = options.pitchSource === 'chord-voicing'
  return {
    chord: active,
    identity: active ? active.id : `synthetic:${bar}`,
    chromas,
    rootChroma: namedRoot !== undefined && chromas.has(namedRoot) ? namedRoot : chromas.values().next().value,
    // Why: In voicing mode a missing or invalid voicing falls back to the synthetic pitch-class
    // pool rather than silently transposing the chord into another register.
    voicingMidis: wantsVoicing ? (getArpChordVoicingPitches(active)?.midis ?? null) : null
  }
}

/**
 * Pedal-bass alternates with the lowest available chord root without transposing it out of the
 * selected register or the absolute Chord Studio voicing.
 */
function rootFirstPool(pool: number[], rootChroma: number | undefined): number[] {
  const inRegister = pool.find((midi) => midi % 12 === rootChroma)
  if (inRegister === undefined) return pool
  return [inRegister, ...pool.filter((midi) => midi % 12 !== rootChroma)]
}

function pitchPool(chromas: Set<number>, octaveRange: number, baseOctave?: number): number[] {
  const count = Number.isFinite(octaveRange) ? Math.max(1, Math.min(4, Math.trunc(octaveRange))) : 1
  const startOct = Number.isFinite(baseOctave)
    ? Math.max(1, Math.min(6, Math.trunc(baseOctave!)))
    : 4 - Math.floor(count / 2)
  const lowerMidi = (startOct + 1) * 12
  const upperMidi = lowerMidi + count * 12
  const pitches: number[] = []
  for (let midi = lowerMidi; midi < upperMidi; midi++) {
    if (chromas.has(midi % 12)) pitches.push(midi)
  }
  return pitches
}

function noteId(seed: number, index: number): string {
  const seedHex = (seed >>> 0).toString(16).padStart(8, '0')
  const indexHex = (index >>> 0).toString(16).padStart(8, '0')
  const hash = (Math.imul(seed ^ index, 2654435761) >>> 0).toString(16).padStart(8, '0')
  return `${hash}-${seedHex.slice(0, 4)}-4${seedHex.slice(5)}-8${indexHex.slice(5)}-${seedHex.slice(0, 4)}${indexHex}`
}

/**
 * Bar-local steps the generator iteration actually visits, starting at its first step inside the
 * bar. Why: a work range may start off the global rate grid (e.g. any dotted-rate range that does
 * not begin on a multiple of 3), and rest masking must judge exactly the steps that will play —
 * a grid-derived mask would be phase-shifted against them and could silence whole bars.
 */
function visitedBarSteps(firstStep: number, bar: number, end: number, rateSteps: number): number[] {
  const barStart = bar * STEPS_PER_BAR
  const limit = Math.min(end, barStart + STEPS_PER_BAR)
  const steps: number[] = []
  for (let step = firstStep; step < limit; step += rateSteps) {
    steps.push(step - barStart)
  }
  return steps
}

function pickModelIndex(
  candidates: number[],
  preferred: number,
  pool: number[],
  history: string[],
  table: MarkovTable | null,
  order: number,
  encode: ReturnType<typeof makeTonicRelativeEncoder>
): number {
  if (!table || candidates.length < 2) return preferred
  let winner = preferred
  let best = -Infinity
  for (const index of candidates) {
    const symbol = encode(Note.pitchClass(midiToPitch(pool[index])))
    const probability = getMarkovProbability(history, symbol, table, order)
    const score = Math.log(probability + 0.001) - Math.abs(index - preferred) * 0.28
    if (score > best) {
      best = score
      winner = index
    }
  }
  return winner
}

/** Builds a broken-chord lead phrase using only the active or temporary harmony. */
export function generateArpeggio(options: ArpeggioGeneratorOptions): AppNote[] {
  const start = Math.max(0, Math.ceil(options.range.startStep))
  const end = Math.max(start, Math.floor(options.range.endStep))
  if (end <= start) return []

  const rateSteps = RATE_STEPS[options.rate]
  const effectiveGate = Number.isFinite(options.gate)
    ? Math.max(20, Math.min(100, options.gate!))
    : DEFAULT_GENERATOR_PARAMS.arpGate
  const effectiveAdherence = Number.isFinite(options.adherence)
    ? Math.max(0, Math.min(100, options.adherence!))
    : DEFAULT_GENERATOR_PARAMS.arpAdherence
  const effectiveAccent = Number.isFinite(options.accent)
    ? Math.max(0, Math.min(100, options.accent!))
    : DEFAULT_GENERATOR_PARAMS.arpAccent
  const effectiveDensity = Number.isFinite(options.density)
    ? Math.max(50, Math.min(100, options.density!))
    : DEFAULT_GENERATOR_PARAMS.arpDensity
  const scaleNotes = getScaleNotes(options.key, options.scale)
  const scaleChromas = new Set(
    (scaleNotes.length > 0 ? scaleNotes : getScaleNotes(options.key, 'major'))
      .map((pitch) => Note.chroma(pitch))
      .filter((chroma): chroma is number => chroma !== undefined)
  )
  const scalePool = pitchPool(scaleChromas, options.octaveRange, options.baseOctave)
  const rng = createRng(options.seed)
  const notes: AppNote[] = []
  const history: string[] = []
  const encode = makeTonicRelativeEncoder(options.key)
  const model = options.trainedModel?.role === 'arp' ? options.trainedModel : null
  const table = model ? getTrainedMarkovTable(model) : null
  const inversionCycling = options.inversionCycling ?? DEFAULT_GENERATOR_PARAMS.arpInversionCycling
  const inversionAnchors = inversionCycling ? getArpInversionAnchors(options.chords) : null
  let previousHarmony = ''
  let octavePosition = 0
  let previousIndex: number | null = null
  let previousMidi: number | null = null
  let direction = 1
  let currentBar = -1
  let barActiveSteps: Set<number> | null = null

  for (let step = start; step < end; step += rateSteps) {
    const stepInBar = step % STEPS_PER_BAR
    const bar = Math.floor(step / STEPS_PER_BAR)
    if (bar !== currentBar) {
      currentBar = bar
      barActiveSteps =
        effectiveDensity >= 100
          ? null
          : maskArpBarSteps(visitedBarSteps(step, bar, end, rateSteps), effectiveDensity, options.seed, bar)
    }
    if (barActiveSteps && !barActiveSteps.has(stepInBar)) {
      continue
    }

    const harmony = harmonyAt(step, options)
    const registerPool =
      harmony.voicingMidis && harmony.voicingMidis.length > 0
        ? harmony.voicingMidis
        : pitchPool(harmony.chromas, options.octaveRange, options.baseOctave)
    if (registerPool.length === 0) continue

    const harmonyIdentity = inversionCycling ? `${harmony.identity}:${bar}` : harmony.identity
    if (harmonyIdentity !== previousHarmony) {
      previousHarmony = harmonyIdentity
      previousIndex = null
      direction = 1
      octavePosition = 0
    }

    const octaveTraversal = options.pitchSource !== 'chord-voicing' && options.octaveRange > 1
    const octave = octaveTraversal
      ? arpOctavePool(
          registerPool,
          options.octaveMode ?? DEFAULT_GENERATOR_PARAMS.arpOctaveMode,
          options.pattern,
          octavePosition
        )
      : null
    const anchor = harmony.chord ? inversionAnchors?.get(harmony.chord) : undefined
    const activePool = inversionCycling
      ? cycleArpInversion(
          octave?.pool ?? registerPool,
          getArpInversionBarOffset(step, anchor),
          harmony.rootChroma,
          anchor?.inversion ?? 0,
          harmony.voicingMidis ? getArpChordVoicingPitches(anchor)?.lowMidi : undefined
        )
      : (octave?.pool ?? registerPool)
    const pool = options.pattern === 'pedal-bass' ? rootFirstPool(activePool, harmony.rootChroma) : activePool
    if (octave && octavePosition % octave.cycleLength === 0) {
      previousIndex = null
      direction = 1
    }
    octavePosition++

    if (options.pattern === 'chord-rhythm') {
      // Why: Chord Rhythm triggers the full chord voicing in rhythmic pulses (rhythm-gating/stabs)
      // rather than monophonic broken-chord steps, bypassing melodic Markov pitch selection.
      const rawDuration = Math.max(0.25, (rateSteps * effectiveGate) / 100)
      const durationSteps = Math.min(rawDuration, end - step)
      if (durationSteps <= 0) continue
      const velocity = calculateArpVelocity(stepInBar, effectiveAccent)
      for (const midi of pool) {
        const pitch = midiToPitch(midi)
        notes.push({
          id: noteId(options.seed, notes.length),
          pitch,
          midi,
          step,
          durationSteps,
          velocity,
          isMuted: false
        })
      }
      continue
    }

    const target = patternIndex(options.pattern, pool, previousIndex, direction, rng)
    const index = pickModelIndex(
      target.alternatives,
      target.preferred,
      pool,
      history,
      table,
      model?.maxOrder ?? 0,
      encode
    )
    direction = target.direction
    previousIndex = index
    const chordMidi = pool[index]
    // Why: Passing tones lean along the audible melodic travel. The pattern's `direction` state is
    // not a travel sign (pedal-bass/pinky-top/converge/diverge carry a cycle counter, `down` never flips it), so the
    // bias is derived from the previously sounding pitch instead.
    const travel = previousMidi === null ? 0 : Math.sign(chordMidi - previousMidi)

    const isDownbeat = stepInBar === 0 || stepInBar === 8 // Beat 1 & 3
    const isMediumBeat = stepInBar === 4 || stepInBar === 12 // Beat 2 & 4

    // Metric weighting heuristic: Downbeats (beats 1 & 3) strongly anchor chord progressions to prevent
    // harmonic ambiguity, whereas weak offbeats accommodate fluid diatonic passing and neighbor tones.
    let metricAdherence = effectiveAdherence
    if (isDownbeat) {
      metricAdherence = Math.min(100, effectiveAdherence + 40)
    } else if (isMediumBeat) {
      metricAdherence = Math.min(100, effectiveAdherence + 20)
    }

    const useChordTone = effectiveAdherence >= 100 || rng() * 100 < metricAdherence

    let midi = chordMidi
    if (!useChordTone) {
      // Stepwise passing tone heuristic: select adjacent diatonic scale tones within 1–2 semitones that
      // are non-chord tones to create smooth classical/counterpoint transitions without sudden leaping dissonance.
      const passingCandidates = harmony.voicingMidis
        ? getArpVoicingPassingPitches(chordMidi, scaleChromas, harmony.chromas, travel)
        : scalePool.filter(
            (pitch) =>
              Math.abs(pitch - chordMidi) >= 1 &&
              Math.abs(pitch - chordMidi) <= 2 &&
              !harmony.chromas.has(pitch % 12) &&
              (!octave || Math.floor(pitch / 12) === Math.floor(chordMidi / 12))
          )
      if (passingCandidates.length > 0) {
        // Bias selection toward current arpeggio momentum to preserve voice leading contour.
        const directional =
          travel === 0
            ? passingCandidates
            : passingCandidates.filter((pitch) => (travel > 0 ? pitch > chordMidi : pitch < chordMidi))
        const candidates = directional.length > 0 ? directional : passingCandidates
        midi = candidates[Math.floor(rng() * candidates.length)]
      }
    }

    const pitch = midiToPitch(midi)
    history.push(encode(Note.pitchClass(pitch)))
    // Gate scales durationSteps proportionally to rateSteps grid resolution.
    // Floating-point durations (e.g. 0.5 steps at 1/16) are fully supported across engine and piano roll.
    // Clamped to at least 0.25 steps (64th note) so notes never collapse to zero length,
    // and clamped to the work range end so notes never spill over.
    // In polyrhythmic divisions (1/8d, 1/4d), notes cross bar lines seamlessly without artificial chopping.
    const rawDuration = Math.max(0.25, (rateSteps * effectiveGate) / 100)
    const durationSteps = Math.min(rawDuration, end - step)
    if (durationSteps <= 0) continue
    const velocity = calculateArpVelocity(stepInBar, effectiveAccent)
    previousMidi = midi
    notes.push({ id: noteId(options.seed, notes.length), pitch, midi, step, durationSteps, velocity, isMuted: false })
  }

  return notes
}
