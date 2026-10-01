import { describe, expect, it } from 'vitest'
import { ELECTRONIC_STAB_PROGRESSIONS } from '../../../src/core/presets/chords/electronic-stabs'
import { createProgressionChords, getProgressionRoman } from '../../../src/core/theory/progressions'
import { generateProgressionChords } from '../../../src/core/theory/chord-mutations'
import { fitAndMergeProgression } from '../../../src/core/theory/progression-range'
import { buildChordTrack } from '../../../src/core/midi/midi-exporter'
import { isNoteInScale } from '../../../src/core/theory/scale.engine'

describe('electronic chord stabs', () => {
  it('keeps every new chord tone in the declared major or natural-minor scale', () => {
    for (const preset of ELECTRONIC_STAB_PROGRESSIONS) {
      for (const key of ['C', 'F#', 'Bb']) {
        const chords = createProgressionChords(preset.id, key, preset.bars)
        for (const chord of chords) {
          for (const pitch of [...chord.notes, ...chord.voicing]) {
            expect(isNoteInScale(pitch, key, preset.scale), `${preset.id}: ${pitch} in ${key} ${preset.scale}`).toBe(
              true
            )
          }
        }
      }
    }
  })

  it.each([
    ['dub-techno-two-stabs', 2],
    ['deep-house-offbeat-stabs', 4],
    ['piano-house-syncopated-stabs', 5],
    ['uk-garage-skipping-stabs', 6],
    ['future-bass-eighth-stabs', 8],
    ['trance-sixteenth-stabs', 16]
  ] as const)('%s maintains %i attacks per bar and one harmony per bar', (id, attacks) => {
    const chords = createProgressionChords(id, 'C', 4)
    for (let bar = 0; bar < 4; bar++) {
      const hits = chords.filter((chord) => Math.floor(chord.startBar) === bar)
      expect(hits).toHaveLength(attacks)
      expect(new Set(hits.map((chord) => chord.name)).size).toBe(1)
    }
    expect(new Set(chords.map((chord) => chord.id)).size).toBe(chords.length)
  })

  it('repeats the phrase boundary silence instead of filling or stretching it', () => {
    const chords = createProgressionChords('dub-techno-two-stabs', 'C', 5)
    expect(chords.map((chord) => chord.startBar)).toEqual([
      0.125, 0.625, 1.125, 1.625, 2.125, 2.625, 3.125, 3.625, 4.125, 4.625
    ])
    expect(chords.every((chord) => chord.durationBars === 1 / 16)).toBe(true)
    expect(chords.slice(8).map((chord) => chord.name)).toEqual(['Cm7', 'Cm7'])
  })

  it('preserves short hits and rests through voice leading and work-range placement', () => {
    const generated = generateProgressionChords({
      progressionId: 'deep-house-offbeat-stabs',
      key: 'C',
      targetBars: 4,
      chordRegister: 3,
      voicingStyle: 'close',
      autoSmooth: true
    }).chords
    const placed = fitAndMergeProgression([], generated, { startStep: 16, endStep: 35 })
    expect(placed.map((chord) => chord.startBar)).toEqual([1.125, 1.375, 1.625, 1.875, 2.125])
    expect(placed.every((chord) => chord.durationBars === 1 / 16)).toBe(true)
    expect(generated.every((chord) => chord.voicing.length > 0)).toBe(true)
  })

  it('exports offbeat onsets and short note lengths to MIDI without filling rests', () => {
    const chords = createProgressionChords('deep-house-offbeat-stabs', 'C', 1)
    const events = buildChordTrack(chords, 120).explicitTickEvents as unknown as {
      name: string
      tick: number
      duration: string
    }[]
    const notes = events.filter((event) => event.name === 'NoteEvent')
    expect(notes.map((event) => event.tick)).toEqual([64, 192, 320, 448])
    expect(notes.map((event) => event.duration)).toEqual(['T32', 'T32', 'T32', 'T32'])
  })

  it('summarizes harmony without listing every repeated stab', () => {
    const trance = ELECTRONIC_STAB_PROGRESSIONS.find((preset) => preset.id === 'trance-sixteenth-stabs')!
    expect(getProgressionRoman(trance)).toEqual(['i', 'VIadd9', 'III', 'VIIsus4'])
  })
})
