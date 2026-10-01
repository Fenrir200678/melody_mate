import { describe, expect, it } from 'vitest'
import {
  buildMarkovTable,
  generateScaleTrainingSequences,
  getMarkovProbability,
  type MarkovTable
} from '../../../src/core/generator/markov.engine'

describe('markov.engine', () => {
  describe('buildMarkovTable', () => {
    it('creates table with unigrams and higher order n-grams', () => {
      const sequences = [['C', 'D', 'E', 'F']]
      const table = buildMarkovTable(sequences, 2)

      // Unigram check (key '')
      const unigrams = table.get('')
      expect(unigrams).toBeDefined()
      expect(unigrams?.get('C')).toBe(1)
      expect(unigrams?.get('D')).toBe(1)
      expect(unigrams?.get('E')).toBe(1)
      expect(unigrams?.get('F')).toBe(1)

      // Order 1 check: 'C' -> 'D'
      const order1 = table.get('C')
      expect(order1).toBeDefined()
      expect(order1?.get('D')).toBe(1)

      // Order 2 check: 'C|D' -> 'E'
      const order2 = table.get('C|D')
      expect(order2).toBeDefined()
      expect(order2?.get('E')).toBe(1)
    })

    it('handles empty sequences gracefully', () => {
      const table = buildMarkovTable([], 2)
      expect(table.size).toBe(0)
    })
  })

  describe('getMarkovProbability and backoff', () => {
    it('interpolates observed high-order transitions with lower-order evidence', () => {
      const sequences = [
        ['C', 'D', 'E'],
        ['C', 'D', 'F']
      ]
      const table = buildMarkovTable(sequences, 2)

      // Both transitions remain equally likely, while other seen notes retain mass.
      const pE = getMarkovProbability(['C', 'D'], 'E', table, 2)
      const pF = getMarkovProbability(['C', 'D'], 'F', table, 2)
      expect(pE).toBeCloseTo(19 / 54)
      expect(pF).toBeCloseTo(19 / 54)
      expect(pE).toBeLessThan(0.5)
    })

    it('backs off from Order 2 to Order 1 when Order 2 context is unseen', () => {
      const sequences = [
        ['A', 'B', 'C'],
        ['X', 'B', 'D']
      ]
      // Notice: context 'Z|B' has never been seen.
      // But Order 1 context 'B' has been seen: 'B' -> 'C' (1), 'B' -> 'D' (1)
      const table = buildMarkovTable(sequences, 2)

      const pC = getMarkovProbability(['Z', 'B'], 'C', table, 2)
      expect(pC).toBeCloseTo(5 / 18)
    })

    it('returns a normalized distribution even when a context omits possible notes', () => {
      const table = buildMarkovTable(
        [
          ['C', 'D', 'E'],
          ['A', 'D', 'F']
        ],
        2
      )
      const pitches = ['C', 'D', 'E', 'A', 'F']
      const total = pitches.reduce((sum, pitch) => sum + getMarkovProbability(['C', 'D'], pitch, table, 2), 0)

      expect(total).toBeCloseTo(1)
      expect(getMarkovProbability(['C', 'D'], 'E', table, 2)).toBeGreaterThan(
        getMarkovProbability(['C', 'D'], 'F', table, 2)
      )
      expect(getMarkovProbability(['C', 'D'], 'E', table, 2)).toBeLessThan(1)
    })

    it('backs off to unigram when both Order 2 and Order 1 contexts are unseen', () => {
      const sequences = [['C', 'D', 'E', 'C']]
      const table = buildMarkovTable(sequences, 2)

      // 'X', 'Y' context is completely unseen. Total notes in unigram: C: 2, D: 1, E: 1 (sum = 4)
      const pC = getMarkovProbability(['X', 'Y'], 'C', table, 2)
      expect(pC).toBeCloseTo(2 / 4)
    })

    it('returns 0 for completely unobserved note', () => {
      const sequences = [['C', 'D', 'E']]
      const table = buildMarkovTable(sequences, 2)

      const pG = getMarkovProbability(['C', 'D'], 'G#', table, 2)
      expect(pG).toBe(0)
    })

    it('handles empty history and empty table', () => {
      const emptyTable: MarkovTable = new Map()
      expect(getMarkovProbability(['C'], 'D', emptyTable, 2)).toBe(0)

      const table = buildMarkovTable([['C', 'D']], 2)
      // Empty history falls back to unigram
      expect(getMarkovProbability([], 'C', table, 2)).toBeCloseTo(0.5)
    })
  })

  describe('generateScaleTrainingSequences', () => {
    it('generates rich sequences for C major', () => {
      const seqs = generateScaleTrainingSequences('C', 'major')
      expect(seqs.length).toBeGreaterThan(10)

      // First sequence should be ascending scale resolving to tonic
      expect(seqs[0]).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'])

      // Second sequence should be descending scale resolving to tonic
      expect(seqs[1]).toEqual(['B', 'A', 'G', 'F', 'E', 'D', 'C', 'C'])

      // Should build a functional MarkovTable from the sequences
      const table = buildMarkovTable(seqs, 2)
      expect(table.size).toBeGreaterThan(0)

      // Stepwise scale step from C to D should have high probability
      const pD = getMarkovProbability(['C'], 'D', table, 2)
      expect(pD).toBeGreaterThan(0)
    })

    it('generates sequences for A minor', () => {
      const seqs = generateScaleTrainingSequences('A', 'minor')
      expect(seqs.length).toBeGreaterThan(10)
      expect(seqs[0][0]).toBe('A')
    })
  })
})
