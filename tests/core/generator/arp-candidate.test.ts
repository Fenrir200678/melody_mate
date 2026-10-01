import { describe, expect, it } from 'vitest'
import {
  arpCandidateSignature,
  buildArpCandidate,
  type ArpCandidateInputs
} from '../../../src/core/generator/arp-candidate'
import { generateArpeggio } from '../../../src/core/generator/arpeggio.generator'
import { findActiveArpChord, getArpChordVoicingPitches } from '../../../src/core/generator/arp-voicing'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import { STEPS_PER_BAR } from '../../../src/core/schemas/project.schema'
import { arpTestModel as model } from '../../helpers/arp-model'

const cChord: ChordEvent = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'C',
  roman: 'I',
  notes: ['C', 'E', 'G'],
  voicing: ['C3', 'E3', 'G3'],
  startBar: 0,
  durationBars: 2
}

const gChord: ChordEvent = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'G',
  roman: 'V',
  notes: ['G', 'B', 'D'],
  voicing: ['G3', 'B3', 'D4'],
  startBar: 2,
  durationBars: 2
}

const inputs: ArpCandidateInputs = {
  key: 'C',
  scale: 'major',
  range: { startStep: STEPS_PER_BAR + 4, endStep: STEPS_PER_BAR * 3 + 8 },
  pattern: 'up-down',
  rate: '1/16',
  octaveRange: 2,
  baseOctave: 3,
  gate: 80,
  adherence: 70,
  accent: 60,
  density: 75,
  seed: 4242,
  chords: [cChord, gChord]
}

describe('buildArpCandidate', () => {
  it('carries exactly the notes the generator produces for a multi-bar range starting mid-project', () => {
    const candidate = buildArpCandidate(inputs, null, 1)

    expect(candidate.notes).toEqual(generateArpeggio({ ...inputs, trainedModel: null }))
    expect(candidate.notes.length).toBeGreaterThan(0)
    expect(candidate.notes.every((note) => note.step >= inputs.range.startStep)).toBe(true)
    expect(candidate.notes.every((note) => note.step + note.durationSteps <= inputs.range.endStep)).toBe(true)
    const bars = new Set(candidate.notes.map((note) => Math.floor(note.step / STEPS_PER_BAR)))
    expect(bars).toEqual(new Set([1, 2, 3]))
  })

  it('embeds the trained model in the notes and the identity instead of deciding later', () => {
    const fallback = buildArpCandidate(inputs, null, 1)
    const trained = buildArpCandidate(inputs, model, 2)

    expect(trained.modelId).toBe(model.id)
    expect(fallback.modelId).toBeNull()
    expect(trained.notes).toEqual(generateArpeggio({ ...inputs, trainedModel: model }))
    expect(trained.signature).not.toBe(fallback.signature)
  })

  it('reproduces identical notes and signature for identical inputs regardless of revision', () => {
    const first = buildArpCandidate(inputs, null, 1)
    const again = buildArpCandidate(inputs, null, 7)

    expect(again.notes).toEqual(first.notes)
    expect(again.signature).toBe(first.signature)
    expect(again.revision).toBe(7)
  })

  it('keeps preview, audition and apply on one result in chord-voicing mode', () => {
    const voiced: ArpCandidateInputs = { ...inputs, pitchSource: 'chord-voicing' }
    const candidate = buildArpCandidate(voiced, model, 1)
    const regenerated = buildArpCandidate(voiced, model, 2)

    expect(candidate.notes).toEqual(regenerated.notes)
    expect(candidate.inputs.pitchSource).toBe('chord-voicing')

    // Every note is a voicing pitch of the chord active at its step, or a local diatonic
    // passing tone at most two semitones from one — never a pitch from another register.
    for (const note of candidate.notes) {
      const voicing = getArpChordVoicingPitches(findActiveArpChord(voiced.chords, note.step))!.midis
      const nearVoicing = voicing.some(
        (midi) => note.midi === midi || (Math.abs(note.midi - midi) <= 2 && !voicing.includes(note.midi))
      )
      expect(nearVoicing).toBe(true)
      expect(note.midi).toBeLessThanOrEqual(64)
    }
    expect(buildArpCandidate({ ...voiced, seed: voiced.seed + 1 }, model, 3).signature).not.toBe(candidate.signature)
  })

  it('snapshots inputs so later chord or range mutations cannot change the candidate', () => {
    const mutableRange = { ...inputs.range }
    const mutableChords = inputs.chords!.map((chord) => ({ ...chord }))
    const candidate = buildArpCandidate({ ...inputs, range: mutableRange, chords: mutableChords }, null, 1)

    mutableRange.endStep = mutableRange.startStep + 1
    mutableChords[0].name = 'Changed'

    expect(candidate.inputs.range).toEqual(inputs.range)
    expect(candidate.inputs.chords?.[0].name).toBe(cChord.name)
  })
})

describe('arpCandidateSignature', () => {
  const reference = arpCandidateSignature(inputs, null)

  it.each<[string, ArpCandidateInputs, string | null]>([
    ['seed', { ...inputs, seed: inputs.seed + 1 }, null],
    ['key', { ...inputs, key: 'D' }, null],
    ['scale', { ...inputs, scale: 'minor' }, null],
    ['pattern', { ...inputs, pattern: 'down' }, null],
    ['rate', { ...inputs, rate: '1/8' }, null],
    ['density', { ...inputs, density: 60 }, null],
    ['work range', { ...inputs, range: { ...inputs.range, startStep: inputs.range.startStep + 1 } }, null],
    ['chord voicing', { ...inputs, chords: [{ ...cChord, voicing: ['C4', 'E4', 'G4'] }, gChord] }, null],
    ['chord usage', { ...inputs, chords: undefined }, null],
    ['pitch source', { ...inputs, pitchSource: 'chord-voicing' }, null],
    ['inversion cycling', { ...inputs, inversionCycling: true }, null],
    ['chord inversion', { ...inputs, chords: [{ ...cChord, inversion: 1 }, gChord] }, null],
    ['model', inputs, 'other-model']
  ])('changes when the %s changes', (_label, changed, modelId) => {
    expect(arpCandidateSignature(changed, modelId)).not.toBe(reference)
  })
})
