import { Note } from 'tonal'
import { getActiveChordNotes } from '../generator/chord.lookup'
import type { AppNote } from '../schemas/note.schema'
import { getScaleNotes } from '../theory/scale.engine'
import type { MelodyAnalysisContext, MelodyMetrics } from './types'

// Seconds, sevenths and tritones carry more harmonic friction than thirds or fifths.
const DISSONANCE_WEIGHTS = [0, 1, 0.8, 0.3, 0.25, 0.15, 1, 0.1, 0.35, 0.4, 0.8, 1] as const
const clampUnit = (value: number): number => Math.max(0, Math.min(1, value))

function emptyMetrics(bars: number): MelodyMetrics {
  return {
    rangeSemitones: 0,
    rangeLabel: '–',
    motionBalance: { steps: 0, leaps: 0, repeats: 0 },
    syncopationRatio: 0,
    chordToneRatio: null,
    repetitionScore: 0,
    tensionPerBar: Array.from({ length: bars }, () => 0),
    contourClarity: 0,
    rhythmPredictability: 0,
    resolution: null
  }
}

function motionMetrics(notes: readonly AppNote[]): Pick<MelodyMetrics, 'motionBalance' | 'contourClarity'> {
  const motionBalance = { steps: 0, leaps: 0, repeats: 0 }
  const directions: number[] = []
  for (let i = 1; i < notes.length; i++) {
    const delta = notes[i].midi - notes[i - 1].midi
    if (delta === 0) motionBalance.repeats++
    else {
      motionBalance[Math.abs(delta) <= 2 ? 'steps' : 'leaps']++
      directions.push(Math.sign(delta))
    }
  }
  const transitions = notes.length - 1
  if (transitions > 0) {
    motionBalance.steps /= transitions
    motionBalance.leaps /= transitions
    motionBalance.repeats /= transitions
  }
  let changes = 0
  for (let i = 1; i < directions.length; i++) {
    if (directions[i] !== directions[i - 1]) changes++
  }
  // Repeated pitches have no direction and cannot obscure an otherwise clear contour.
  const contourClarity = transitions <= 0 ? 0 : 1 - changes / Math.max(1, directions.length - 1)
  return { motionBalance, contourClarity }
}

function rhythmPredictability(notes: readonly AppNote[], snapStep: number): number {
  const counts = new Map<number, number>()
  for (let i = 1; i < notes.length; i++) {
    const delta = notes[i].step - notes[i - 1].step
    if (delta <= 0) continue
    const bucket = Math.round(delta / snapStep)
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }
  if (counts.size === 0) return 0
  if (counts.size === 1) return 1
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
  const entropy = [...counts.values()].reduce((sum, count) => {
    const probability = count / total
    return sum - probability * Math.log2(probability)
  }, 0)
  return clampUnit(1 - entropy / Math.log2(counts.size))
}

function repetitionScore(bars: readonly AppNote[][], stepsPerBar: number, snapStep: number): number {
  if (bars.length < 2) return 0
  const grams = bars.map((notes) => {
    const tokens = notes.map((note) =>
      JSON.stringify([
        note.midi,
        Math.round((note.step % stepsPerBar) / snapStep),
        Math.round(note.durationSteps / snapStep)
      ])
    )
    return new Set(tokens.slice(1).map((token, i) => `${tokens[i]}:${token}`))
  })
  // A hook can return after a contrasting bar (ABAB), so use each bar's best recurrence.
  const bestMatches = grams.map((left, i) => {
    let best = 0
    if (left.size === 0) return best
    for (let j = 0; j < grams.length; j++) {
      if (i === j) continue
      const right = grams[j]!
      const intersection = [...left].filter((gram) => right.has(gram)).length
      const union = left.size + right.size - intersection
      best = Math.max(best, union > 0 ? intersection / union : 0)
    }
    return best
  })
  return bestMatches.reduce((sum, score) => sum + score, 0) / bars.length
}

function chordChromas(step: number, context: MelodyAnalysisContext): number[] {
  return getActiveChordNotes(step, context.stepsPerBar, context.chords)
    .map((pitch) => Note.chroma(pitch))
    .filter((chroma): chroma is number => chroma !== undefined)
}

function harmonicMetrics(
  notes: readonly AppNote[],
  barNotes: readonly AppNote[][],
  context: MelodyAnalysisContext,
  endStep: number
): Pick<MelodyMetrics, 'chordToneRatio' | 'tensionPerBar' | 'resolution'> {
  const scaleChromas = new Set(getScaleNotes(context.key, context.scale).map((pitch) => Note.chroma(pitch)))
  const minMidi = (context.minOctave + 1) * 12
  const maxMidi = (context.maxOctave + 2) * 12 - 1
  let chordToneCount = 0
  let harmonizedCount = 0
  const tension = new Map<AppNote, number>()
  for (const note of notes) {
    const chroma = note.midi % 12
    const chord = chordChromas(note.step, context)
    if (chord.length > 0) harmonizedCount++
    const isChordTone = chord.includes(chroma)
    if (isChordTone) chordToneCount++
    let dissonance = 0
    if (!isChordTone && chord.length > 0) {
      dissonance = chord.reduce((sum, tone) => sum + DISSONANCE_WEIGHTS[(chroma - tone + 12) % 12]!, 0)
      dissonance /= chord.length
      if (!scaleChromas.has(chroma)) dissonance = Math.max(dissonance, 0.9)
    }
    const registerHeight = clampUnit((note.midi - minMidi) / Math.max(1, maxMidi - minMidi))
    tension.set(note, dissonance + 0.3 * registerHeight)
  }
  const last = notes[notes.length - 1]!
  const closingChord = chordChromas(endStep - 1e-7, context)
  const resolution =
    closingChord.length === 0
      ? null
      : closingChord.includes(last.midi % 12)
        ? last.midi % 12 === Note.chroma(context.key)
          ? 1
          : 0.5
        : 0
  return {
    chordToneRatio: harmonizedCount > 0 ? chordToneCount / harmonizedCount : null,
    tensionPerBar: barNotes.map((bar) =>
      bar.length === 0 ? 0 : bar.reduce((sum, note) => sum + tension.get(note)!, 0) / bar.length
    ),
    resolution
  }
}

/** Analyze sounding onsets; rests are gaps or muted notes in the project's AppNote model. */
export function computeMelodyMetrics(notes: readonly AppNote[], context: MelodyAnalysisContext): MelodyMetrics {
  const { stepsPerBar, snapStep } = context
  const beatSteps = context.beatSteps ?? stepsPerBar / 4
  const startStep = context.startStep ?? 0
  if (
    ![stepsPerBar, snapStep, beatSteps].every((value) => Number.isFinite(value) && value > 0) ||
    !Number.isFinite(startStep) ||
    startStep < 0 ||
    startStep % stepsPerBar !== 0 ||
    !Number.isInteger(context.minOctave) ||
    !Number.isInteger(context.maxOctave) ||
    context.minOctave > context.maxOctave ||
    (context.bars !== undefined && (!Number.isInteger(context.bars) || context.bars < 0))
  ) {
    throw new RangeError('Analysis requires a valid grid, register and bar-aligned region')
  }
  const validNotes = notes.filter(
    (note) =>
      Number.isInteger(note.midi) &&
      note.midi >= 0 &&
      note.midi <= 127 &&
      Number.isFinite(note.step) &&
      note.step >= startStep &&
      Number.isFinite(note.durationSteps) &&
      note.durationSteps > 0
  )
  const inferredEnd = validNotes.reduce((end, note) => Math.max(end, note.step + note.durationSteps), startStep)
  const bars = context.bars ?? Math.ceil((inferredEnd - startStep) / stepsPerBar)
  const endStep = startStep + bars * stepsPerBar
  const sounding = validNotes.filter((note) => !note.isMuted && note.step < endStep).sort((a, b) => a.step - b.step)
  if (sounding.length === 0) return emptyMetrics(bars)
  const barNotes: AppNote[][] = Array.from({ length: bars }, () => [])
  for (const note of sounding) barNotes[Math.floor((note.step - startStep) / stepsPerBar)]!.push(note)
  const lowest = sounding.reduce((low, note) => (note.midi < low.midi ? note : low))
  const highest = sounding.reduce((high, note) => (note.midi > high.midi ? note : high))
  return {
    rangeSemitones: highest.midi - lowest.midi,
    rangeLabel: `${lowest.pitch} – ${highest.pitch}`,
    ...motionMetrics(sounding),
    syncopationRatio:
      sounding.filter((note) => Math.abs(note.step / beatSteps - Math.round(note.step / beatSteps)) > 1e-7).length /
      sounding.length,
    ...harmonicMetrics(sounding, barNotes, context, endStep),
    repetitionScore: repetitionScore(barNotes, stepsPerBar, snapStep),
    rhythmPredictability: rhythmPredictability(sounding, snapStep)
  }
}
