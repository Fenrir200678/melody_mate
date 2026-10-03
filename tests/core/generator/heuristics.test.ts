import { describe, expect, it } from 'vitest'
import { scoreContour, scoreContourMotion } from '../../../src/core/generator/contour-plan'
import {
  buildCandidatePool,
  evaluateAndPickCandidate,
  scoreChordAdherence,
  scoreLeapRecovery,
  scoreMarkovPrior,
  scoreRangeAwareness,
  scoreRepetition,
  scoreStepwiseMotion,
  type CandidateNote,
  type HeuristicContext
} from '../../../src/core/generator/heuristics'
import { buildMarkovTable } from '../../../src/core/generator/markov.engine'

describe('heuristics', () => {
  const c4: CandidateNote = { pitch: 'C4', midi: 60, pitchClass: 'C', degree: 1, isChordTone: true }
  const d4: CandidateNote = { pitch: 'D4', midi: 62, pitchClass: 'D', degree: 2, isChordTone: false }
  const eb4: CandidateNote = { pitch: 'Eb4', midi: 63, pitchClass: 'Eb', degree: 3, isChordTone: true }
  const e4: CandidateNote = { pitch: 'E4', midi: 64, pitchClass: 'E', degree: 3, isChordTone: true }
  const g4: CandidateNote = { pitch: 'G4', midi: 67, pitchClass: 'G', degree: 5, isChordTone: true }
  const c5: CandidateNote = { pitch: 'C5', midi: 72, pitchClass: 'C', degree: 1, isChordTone: true }

  describe('buildCandidatePool', () => {
    it('creates diatonic candidates with proper properties', () => {
      const pool = buildCandidatePool('C', 'major', 4, 5, ['C', 'E', 'G'])
      expect(pool.length).toBe(14) // 7 notes * 2 octaves

      // Check first and last note
      expect(pool[0].pitch).toBe('C4')
      expect(pool[0].isChordTone).toBe(true)
      expect(pool[0].degree).toBe(1)

      expect(pool[pool.length - 1].pitch).toBe('B5')
      expect(pool[pool.length - 1].isChordTone).toBe(false)
    })

    it('includes an altered dominant tone outside the project scale', () => {
      const pool = buildCandidatePool('A', 'minor', 4, 4, ['E', 'G#', 'B', 'D'])
      const leadingTone = pool.find((candidate) => candidate.pitch === 'G#4')
      expect(leadingTone).toMatchObject({ degree: null, isChordTone: true })
    })
  })

  describe('scoreStepwiseMotion', () => {
    it('returns neutral 0 when no previous note exists', () => {
      expect(scoreStepwiseMotion(c4)).toBe(0)
    })

    it('rewards semitone and whole tone steps with +1.0', () => {
      expect(scoreStepwiseMotion(d4, c4)).toBe(1.0) // 2 semitones
      expect(scoreStepwiseMotion(eb4, d4)).toBe(1.0) // 1 semitone
    })

    it('returns positive/neutral for thirds', () => {
      expect(scoreStepwiseMotion(eb4, c4)).toBe(0.2) // minor 3rd (3 semitones)
      expect(scoreStepwiseMotion(e4, c4)).toBe(0.0) // major 3rd (4 semitones)
    })

    it('penalizes large leaps', () => {
      expect(scoreStepwiseMotion(c5, c4)).toBe(-1.0) // octave leap (12 semitones)
    })
  })

  describe('scoreLeapRecovery', () => {
    it('returns 0 when history has fewer than 2 notes', () => {
      expect(scoreLeapRecovery(d4, [c4])).toBe(0)
    })

    it('returns 0 when previous interval was not a leap', () => {
      // C4 -> D4 is a 2-semitone step
      expect(scoreLeapRecovery(e4, [c4, d4])).toBe(0)
    })

    it('rewards stepwise contrary motion after an ascending leap', () => {
      // C4 -> G4 is a 7-semitone ascending leap
      // G4 -> F4 (midi 65) or E4 (midi 64) is contrary motion (downward)
      const f4: CandidateNote = { pitch: 'F4', midi: 65, pitchClass: 'F', degree: 4, isChordTone: false }
      expect(scoreLeapRecovery(f4, [c4, g4])).toBe(1.0) // 2-semitone contrary step
    })

    it('penalizes compounding leaps in the same direction', () => {
      // C4 -> G4 (leap up +7), then G4 -> C5 (leap up +5)
      expect(scoreLeapRecovery(c5, [c4, g4])).toBe(-1.0)
    })

    it('allows chord arpeggio in same direction as neutral', () => {
      const historyWithLeap = [
        c4,
        { pitch: 'F4', midi: 65, pitchClass: 'F', degree: 4, isChordTone: true } // +5 leap
      ]
      const nextChordTone: CandidateNote = { pitch: 'A4', midi: 69, pitchClass: 'A', degree: 6, isChordTone: true } // +4 move
      expect(scoreLeapRecovery(nextChordTone, historyWithLeap)).toBe(0.0)
    })
  })

  describe('scoreRepetition', () => {
    it('returns 0 for no repetition', () => {
      expect(scoreRepetition(d4, [c4])).toBe(0)
    })

    it('returns +0.1 for 1st repetition', () => {
      expect(scoreRepetition(c4, [c4])).toBe(0.1)
    })

    it('penalizes 2nd repetition with -0.8', () => {
      expect(scoreRepetition(c4, [c4, c4])).toBe(-0.8)
    })

    it('heavily penalizes 3+ repetitions with -2.0', () => {
      expect(scoreRepetition(c4, [c4, c4, c4])).toBe(-2.0)
    })
  })

  describe('scoreContour', () => {
    it('returns 0 for free contour', () => {
      expect(scoreContour(c4, 0.5, 'free', 48, 72)).toBe(0)
    })

    it('scores ascending contour highest when pitch matches progress ratio', () => {
      // At r = 0, low note 48 should score +1.0
      const lowNote: CandidateNote = { pitch: 'C3', midi: 48, pitchClass: 'C', degree: 1, isChordTone: true }
      expect(scoreContour(lowNote, 0.0, 'ascending', 48, 72)).toBeCloseTo(1.0)

      // At r = 1, high note 72 should score +1.0
      const highNote: CandidateNote = { pitch: 'C5', midi: 72, pitchClass: 'C', degree: 1, isChordTone: true }
      expect(scoreContour(highNote, 1.0, 'ascending', 48, 72)).toBeCloseTo(1.0)
    })

    it('scores arch contour peaking at center', () => {
      const midNote: CandidateNote = { pitch: 'C5', midi: 72, pitchClass: 'C', degree: 1, isChordTone: true }
      // At r = 0.5, arch peaks at maxMidi
      expect(scoreContour(midNote, 0.5, 'arch', 48, 72)).toBeCloseTo(1.0)
    })

    it('keeps a narrow contour window within its supplied pitch range', () => {
      expect(scoreContour(c4, 0, 'ascending', 60, 66)).toBe(1)
      expect(scoreContour(g4, 1, 'ascending', 60, 66)).toBeLessThan(1)
    })

    it('rewards movement toward a phrase peak while allowing contrary notes', () => {
      expect(scoreContourMotion(e4, c4, 0.4, 'arch')).toBeGreaterThan(0)
      expect(scoreContourMotion(c4, e4, 0.4, 'arch')).toBeLessThan(0)
      expect(scoreContourMotion(c4, e4, 0.8, 'arch')).toBeGreaterThan(0)
      expect(scoreContourMotion(c4, e4, 0, 'arch')).toBe(0)
    })
  })

  describe('scoreRangeAwareness', () => {
    it('returns -Infinity outside [minMidi, maxMidi]', () => {
      const outOfRange: CandidateNote = { pitch: 'C2', midi: 36, pitchClass: 'C', degree: 1, isChordTone: true }
      expect(scoreRangeAwareness(outOfRange, 48, 72)).toBe(-Infinity)
    })

    it('scores the register midpoint with high value', () => {
      const nearCenter: CandidateNote = { pitch: 'F#4', midi: 66, pitchClass: 'F#', degree: null, isChordTone: false }
      expect(scoreRangeAwareness(nearCenter, 60, 72)).toBeCloseTo(1.0)
    })

    it('weights mirrored pitches equally across a two-octave register', () => {
      const lower: CandidateNote = { pitch: 'F4', midi: 65, pitchClass: 'F', degree: 4, isChordTone: false }
      const upper: CandidateNote = { pitch: 'F#5', midi: 78, pitchClass: 'F#', degree: null, isChordTone: false }
      expect(scoreRangeAwareness(lower, 60, 83)).toBeCloseTo(scoreRangeAwareness(upper, 60, 83))
    })
  })

  describe('scoreChordAdherence', () => {
    it('heavily favors chord tones on strong beats', () => {
      expect(scoreChordAdherence(c4, true, 1.0)).toBe(1.0)
      expect(scoreChordAdherence(d4, true, 1.0)).toBe(-0.9)
    })

    it('allows passing tones on offbeats', () => {
      expect(scoreChordAdherence(d4, false, 1.0)).toBe(0.2)
    })
  })

  describe('scoreMarkovPrior', () => {
    it('returns 0 if no table is supplied', () => {
      expect(scoreMarkovPrior(d4, ['C'])).toBe(0)
    })

    it('rewards high-probability transitions', () => {
      const table = buildMarkovTable([['C', 'D', 'E']], 1)
      const scoreD = scoreMarkovPrior(d4, ['C'], table, 1)
      const scoreG = scoreMarkovPrior(g4, ['C'], table, 1)
      expect(scoreD).toBeGreaterThan(scoreG)
    })

    it('distinguishes contextual probabilities above one third', () => {
      const table = new Map([
        [
          '',
          new Map([
            ['C', 5],
            ['D', 5]
          ])
        ],
        [
          'A',
          new Map([
            ['C', 3],
            ['D', 2]
          ])
        ]
      ])

      expect(scoreMarkovPrior(c4, ['A'], table, 1)).toBeGreaterThan(scoreMarkovPrior(d4, ['A'], table, 1))
      expect(scoreMarkovPrior(c4, [], table, 1)).toBe(0)
    })

    it('does not penalize an altered chord tone missing from scale training', () => {
      const alteredChordTone: CandidateNote = {
        pitch: 'G#4',
        midi: 68,
        pitchClass: 'G#',
        degree: null,
        isChordTone: true
      }
      const table = buildMarkovTable([['A', 'B', 'C']], 1)

      expect(scoreMarkovPrior(alteredChordTone, ['A'], table, 1)).toBe(0)
    })
  })

  describe('evaluateAndPickCandidate', () => {
    it('picks candidates based on softmax and temperature', () => {
      const pool = buildCandidatePool('C', 'major', 4, 4, ['C', 'E', 'G'])
      const context: HeuristicContext = {
        history: [c4],
        stepInBar: 1,
        stepsPerBar: 16,
        contourProgress: 0.1,
        contourMinMidi: 60,
        contourMaxMidi: 71,
        contour: 'free',
        contourStrength: 0.65,
        minOctave: 4,
        maxOctave: 4,
        pentatonicMode: false,
        chordAdherence: 1.0,
        temperature: 1.0
      }

      // Using deterministic rng = 0.5
      const picked = evaluateAndPickCandidate(pool, context, {}, () => 0.5)
      expect(picked).toBeDefined()
      expect(picked.midi).toBeGreaterThanOrEqual(60)
      expect(picked.midi).toBeLessThanOrEqual(71)
    })

    it('strictly favors highest score under low temperature (T -> 0.05)', () => {
      const pool = buildCandidatePool('C', 'major', 4, 4, ['C', 'E', 'G'])
      const context: HeuristicContext = {
        history: [c4],
        stepInBar: 0, // Strong beat 1 -> strong chord tone preference
        stepsPerBar: 16,
        contourProgress: 0,
        contourMinMidi: 60,
        contourMaxMidi: 71,
        contour: 'free',
        contourStrength: 0.65,
        minOctave: 4,
        maxOctave: 4,
        pentatonicMode: false,
        chordAdherence: 1.0,
        temperature: 0.05
      }

      const picked = evaluateAndPickCandidate(pool, context, {}, () => 0.5)
      expect(picked.isChordTone).toBe(true)
    })
  })
})
