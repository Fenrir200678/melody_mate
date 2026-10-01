import { CustomRhythmPatternSchema } from '../schemas/custom-rhythm.schema'
import type { CustomRhythmEvent, CustomRhythmPattern } from '../schemas/custom-rhythm.schema'
import type { Subdivision } from '../schemas/project.schema'
import { generateEuclideanPattern } from './euclidean'
import type { RhythmPreset } from './types'

export type PatternEditResult = { ok: true; pattern: CustomRhythmPattern } | { ok: false; error: string }

export interface PatternRange {
  startStep: number
  endStep: number
}

export interface ExpandedRhythmEvent extends CustomRhythmEvent {
  absoluteStep: number
}

const STEPS_PER_BAR = 16

/** Copies a Euclidean cycle onto the canonical sixteenth-note grid without changing its phase. */
export function copyEuclidean(
  pulses: number,
  steps: number,
  rotation: number,
  subdivision: Subdivision
): PatternEditResult {
  if (
    !Number.isInteger(pulses) ||
    pulses < 1 ||
    !Number.isInteger(steps) ||
    steps <= 0 ||
    pulses > steps ||
    !Number.isInteger(rotation)
  ) {
    return {
      ok: false,
      error: 'Euclidean pulses, steps, and rotation must be integers with 1 <= pulses <= steps and steps > 0'
    }
  }
  if (subdivision === '32n') {
    return { ok: false, error: '32n Euclidean patterns cannot be represented on the sixteenth-note grid' }
  }

  const stepSize = subdivision === '4n' ? 4 : subdivision === '8n' ? 2 : 1
  const sourcePattern = generateEuclideanPattern(pulses, steps, rotation)
  const sourcePeriod = minimalPeriod(sourcePattern)
  const sourceCycleSteps = sourcePeriod * stepSize
  const patternLength = (sourceCycleSteps * STEPS_PER_BAR) / gcd(sourceCycleSteps, STEPS_PER_BAR)
  if (patternLength > STEPS_PER_BAR * 4) {
    return {
      ok: false,
      error: 'Euclidean cycle needs more than four bars to repeat exactly on the sixteenth-note grid'
    }
  }

  const bars = (patternLength / STEPS_PER_BAR) as 1 | 2 | 3 | 4
  const onsetSteps: number[] = []
  for (let step = 0; step < patternLength; step += stepSize) {
    if (sourcePattern[(step / stepSize) % sourcePeriod]) onsetSteps.push(step)
  }

  const patternEnd = bars * STEPS_PER_BAR
  const events = onsetSteps.map((step, index) => {
    const nextStep = onsetSteps[index + 1] ?? onsetSteps[0] + patternLength
    const gapToNextOnset = nextStep - step
    const maxLength = Math.max(4, stepSize * 2)
    return { step, lengthSteps: Math.min(maxLength, gapToNextOnset, patternEnd - step), velocity: 92 }
  })
  return commit({ bars, events })
}

function minimalPeriod(pattern: boolean[]): number {
  for (let period = 1; period <= pattern.length; period += 1) {
    if (pattern.length % period !== 0) continue
    if (pattern.every((active, index) => active === pattern[index % period])) return period
  }
  return pattern.length
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b]
  return a
}

function commit(candidate: unknown): PatternEditResult {
  const parsed = CustomRhythmPatternSchema.safeParse(candidate)
  return parsed.success
    ? { ok: true, pattern: parsed.data }
    : { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid custom rhythm pattern' }
}

export function insert(pattern: CustomRhythmPattern, event: CustomRhythmEvent): PatternEditResult {
  return commit({ ...pattern, events: [...pattern.events, event].sort((a, b) => a.step - b.step) })
}

export function move(pattern: CustomRhythmPattern, fromStep: number, toStep: number): PatternEditResult {
  const index = pattern.events.findIndex((event) => event.step === fromStep)
  if (index < 0) return { ok: false, error: 'No event exists at the source step' }
  const events = pattern.events.map((event, eventIndex) => (eventIndex === index ? { ...event, step: toStep } : event))
  return commit({ ...pattern, events: events.sort((a, b) => a.step - b.step) })
}

export function resize(pattern: CustomRhythmPattern, step: number, lengthSteps: number): PatternEditResult {
  const index = pattern.events.findIndex((event) => event.step === step)
  if (index < 0) return { ok: false, error: 'No event exists at the requested step' }
  return commit({
    ...pattern,
    events: pattern.events.map((event, i) => (i === index ? { ...event, lengthSteps } : event))
  })
}

export function erase(pattern: CustomRhythmPattern, step: number): PatternEditResult {
  if (!pattern.events.some((event) => event.step === step))
    return { ok: false, error: 'No event exists at the requested step' }
  return commit({ ...pattern, events: pattern.events.filter((event) => event.step !== step) })
}

export function duplicateBar(pattern: CustomRhythmPattern, targetBar: number): PatternEditResult {
  const sourceBar = targetBar
  const destinationBar = sourceBar + 1
  if (!Number.isInteger(sourceBar) || sourceBar < 0 || sourceBar >= pattern.bars || destinationBar > 3) {
    return { ok: false, error: 'Source bar must have a following bar within the four-bar limit' }
  }
  const sourceStart = sourceBar * STEPS_PER_BAR
  const targetStart = destinationBar * STEPS_PER_BAR
  const copies = pattern.events
    .filter((event) => event.step >= sourceStart && event.step < sourceStart + STEPS_PER_BAR)
    .map((event) => ({
      ...event,
      step: targetStart + event.step - sourceStart,
      lengthSteps: Math.min(event.lengthSteps, sourceStart + STEPS_PER_BAR - event.step)
    }))
  return commit({
    bars: Math.max(pattern.bars, destinationBar + 1),
    events: [...pattern.events, ...copies].sort((a, b) => a.step - b.step)
  })
}

export function setVelocity(pattern: CustomRhythmPattern, step: number, velocity: number): PatternEditResult {
  const index = pattern.events.findIndex((event) => event.step === step)
  if (index < 0) return { ok: false, error: 'No event exists at the requested step' }
  return commit({
    ...pattern,
    events: pattern.events.map((event, i) => (i === index ? { ...event, velocity } : event))
  })
}

export function clearPattern(pattern: CustomRhythmPattern): PatternEditResult {
  return commit({ ...pattern, events: [] })
}

export function resizePattern(pattern: CustomRhythmPattern, bars: 1 | 2 | 3 | 4): PatternEditResult {
  const end = bars * STEPS_PER_BAR
  const events = pattern.events
    .filter((event) => event.step < end)
    .map((event) => ({ ...event, lengthSteps: Math.min(event.lengthSteps, end - event.step) }))
  return commit({ bars, events })
}

export function copyPreset(preset: RhythmPreset, bars: 1 | 2 | 3 | 4 = 1): PatternEditResult {
  const unit = preset.subdivision === '8n' ? 2 : 1
  let cursor = 0
  const events: CustomRhythmEvent[] = []
  for (const step of preset.steps) {
    const lengthSteps = step.durationSteps * unit
    if (!Number.isInteger(lengthSteps) || lengthSteps <= 0)
      return { ok: false, error: 'Preset contains an unsupported duration' }
    if (step.isNote) events.push({ step: cursor, lengthSteps, velocity: 92 })
    cursor += lengthSteps
  }
  if (cursor > bars * STEPS_PER_BAR) return { ok: false, error: 'Preset is longer than the requested pattern' }
  return commit({ bars, events })
}

export function expandPattern(pattern: CustomRhythmPattern, range: PatternRange): ExpandedRhythmEvent[] {
  if (
    !Number.isInteger(range.startStep) ||
    !Number.isInteger(range.endStep) ||
    range.startStep < 0 ||
    range.endStep <= range.startStep
  )
    return []
  const cycleLength = pattern.bars * STEPS_PER_BAR
  const expanded: ExpandedRhythmEvent[] = []
  const firstCycle = Math.floor(range.startStep / cycleLength)
  const lastCycle = Math.ceil(range.endStep / cycleLength)
  for (let cycle = firstCycle; cycle < lastCycle; cycle += 1) {
    const offset = cycle * cycleLength
    for (const event of pattern.events) {
      const absoluteStep = offset + event.step
      if (absoluteStep < range.startStep || absoluteStep >= range.endStep) continue
      expanded.push({
        ...event,
        absoluteStep,
        lengthSteps: Math.min(event.lengthSteps, range.endStep - absoluteStep)
      })
    }
  }
  return expanded
}
