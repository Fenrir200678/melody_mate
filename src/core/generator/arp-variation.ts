import type { AppNote } from '../schemas/note.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import { generateArpeggio, getArpHarmonyChromas } from './arpeggio.generator'
import type { ArpeggioPattern } from './arp-pattern'
import { calculateArpVelocity } from './arp-rhythm'
import type { ArpCandidateInputs } from './arp-candidate'
import { createRng } from './rng'
import { DEFAULT_GENERATOR_PARAMS } from '../../config/defaults'
import { findActiveArpChord, getArpChordVoicingPitches } from './arp-voicing'

export type ArpVariationMode = 'pitches' | 'feel'

/** Rerolls one musical dimension while keeping every other note property intact. */
export function varyArpNotes(
  notes: readonly AppNote[],
  inputs: ArpCandidateInputs,
  mode: ArpVariationMode,
  seed: number
): AppNote[] {
  if (notes.length === 0) return []
  return mode === 'pitches' ? varyPitches(notes, inputs, seed) : varyFeel(notes, inputs, seed)
}

function varyPitches(notes: readonly AppNote[], inputs: ArpCandidateInputs, seed: number): AppNote[] {
  // Reuse the generator's chord/adherence rules under several contour-compatible patterns.
  // The displayed onset list stays authoritative, so density never changes note count.
  const patterns: ArpeggioPattern[] = [
    'up',
    'down',
    'up-down',
    'down-up',
    'pedal-bass',
    'pinky-top',
    'converge',
    'diverge',
    'random',
    'brown'
  ]
  const choices = new Map<number, Map<number, string>>()
  for (const pattern of patterns) {
    const generated = generateArpeggio({ ...inputs, pattern, seed: inputs.seed, density: 100 })
    for (const candidate of generated) {
      if (!notes.some((note) => note.step === candidate.step)) continue
      if (!isAllowedVariationPitch(candidate.midi, candidate.step, inputs)) continue
      const pitches = choices.get(candidate.step) ?? new Map<number, string>()
      pitches.set(candidate.midi, candidate.pitch)
      choices.set(candidate.step, pitches)
    }
  }

  const rng = createRng(seed)
  return notes.map((note) => {
    const candidates = [...(choices.get(note.step)?.entries() ?? [])]
    if (candidates.length === 0) return { ...note }
    const alternatives = candidates.filter(([midi]) => midi !== note.midi)
    const available = alternatives.length > 0 ? alternatives : candidates
    // Prefer a neighboring pitch to preserve the original line's local contour and range.
    const distance = Math.min(...available.map(([midi]) => Math.abs(midi - note.midi)))
    const nearby = available.filter(([midi]) => Math.abs(midi - note.midi) <= distance + 2)
    const [midi, pitch] = nearby[Math.floor(rng() * nearby.length)]
    return midi === note.midi ? { ...note } : { ...note, midi, pitch }
  })
}

function isAllowedVariationPitch(midi: number, step: number, inputs: ArpCandidateInputs): boolean {
  const chord = findActiveArpChord(inputs.chords, step)
  const voicing = inputs.pitchSource === 'chord-voicing' ? getArpChordVoicingPitches(chord) : null
  const adherence = Number.isFinite(inputs.adherence)
    ? Math.max(0, Math.min(100, inputs.adherence!))
    : DEFAULT_GENERATOR_PARAMS.arpAdherence
  const harmony = getArpHarmonyChromas(step, inputs)

  if (voicing && !voicing.midis.includes(midi)) return false
  if (adherence >= 100 && !harmony.has(midi % 12)) return false
  if (inputs.pitchSource === 'chord-voicing' && voicing) return true

  const octaveCount = Number.isFinite(inputs.octaveRange) ? Math.max(1, Math.min(4, Math.trunc(inputs.octaveRange))) : 1
  const startOctave = Number.isFinite(inputs.baseOctave)
    ? Math.max(1, Math.min(6, Math.trunc(inputs.baseOctave!)))
    : 4 - Math.floor(octaveCount / 2)
  const lowerMidi = (startOctave + 1) * 12
  const upperMidi = lowerMidi + octaveCount * 12
  return midi >= lowerMidi && midi < upperMidi
}

function varyFeel(notes: readonly AppNote[], inputs: ArpCandidateInputs, seed: number): AppNote[] {
  const rng = createRng(seed)
  const sorted = [...notes].sort((a, b) => a.step - b.step)
  const endStep = inputs.range.endStep
  const accent = Number.isFinite(inputs.accent)
    ? Math.max(0, Math.min(100, inputs.accent!))
    : DEFAULT_GENERATOR_PARAMS.arpAccent
  const accentShift = (rng() * 2 - 1) * 22
  const variedAccent = Math.max(0, Math.min(100, accent + accentShift))

  return notes.map((note) => {
    const next = sorted.find((item) => item.step > note.step)
    const available = Math.max(0, Math.min(endStep, next?.step ?? endStep) - note.step)
    if (available <= 0) return { ...note }

    const gateFactor = 0.75 + rng() * 0.5
    const durationSteps = Math.min(available, Math.max(0.25, note.durationSteps * gateFactor))

    // A small seed-controlled accent change keeps downbeats stronger than offbeats.
    const metricVelocity = calculateArpVelocity(note.step % STEPS_PER_BAR, variedAccent)
    const velocity = Math.max(1, Math.min(127, metricVelocity))
    return { ...note, durationSteps, velocity }
  })
}
