import { describe, expect, it, vi } from 'vitest'
import { applyCallAndResponse } from '../../../src/core/generator/call-response'
import { applyMotifStructure, type MotifStructureOptions } from '../../../src/core/generator/motifs'
import { createRng } from '../../../src/core/generator/rng'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import type { AppNote } from '../../../src/core/schemas/note.schema'
import { isNoteInScale, pitchToMidi, snapPitchToScale } from '../../../src/core/theory/scale.engine'

describe('motifs', () => {
  const sampleNotes: AppNote[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      pitch: 'C4',
      midi: 60,
      step: 0,
      durationSteps: 2,
      velocity: 100,
      isMuted: false
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      pitch: 'E4',
      midi: 64,
      step: 4,
      durationSteps: 2,
      velocity: 95,
      isMuted: false
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      pitch: 'G4',
      midi: 67,
      step: 8,
      durationSteps: 2,
      velocity: 90,
      isMuted: false
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      pitch: 'D4',
      midi: 62,
      step: 16,
      durationSteps: 2,
      velocity: 100,
      isMuted: false
    }
  ]

  describe('applyMotifStructure', () => {
    const structureOptions = (overrides: Partial<MotifStructureOptions> = {}): MotifStructureOptions => ({
      pattern: 'ABAB',
      bars: 4,
      stepsPerBar: 16,
      root: 'C',
      scaleName: 'major',
      minOctave: 3,
      maxOctave: 5,
      motifVariation: 0,
      chordAdherence: 1,
      rng: () => 0.9,
      startStep: 0,
      ...overrides
    })

    it('returns unmodified notes when pattern is FREE', () => {
      const result = applyMotifStructure(sampleNotes, structureOptions({ pattern: 'FREE' }))
      expect(result).toEqual(sampleNotes)
    })

    it('keeps an AAAB repeat identical at zero intensity without consuming randomness', () => {
      const twoBarNotes = sampleNotes.filter((note) => note.step < 16)
      const rng = vi.fn(() => 0.25)
      const result = applyMotifStructure(
        twoBarNotes,
        structureOptions({ pattern: 'AAAB', bars: 2, motifVariation: 0, rng })
      )

      const source = result.filter((note) => note.step < 16)
      const repeat = result.filter((note) => note.step >= 16)
      expect(
        repeat.map(({ pitch, midi, step, durationSteps, velocity, isMuted }) => ({
          pitch,
          midi,
          step: step - 16,
          durationSteps,
          velocity,
          isMuted
        }))
      ).toEqual(
        source.map(({ pitch, midi, step, durationSteps, velocity, isMuted }) => ({
          pitch,
          midi,
          step,
          durationSteps,
          velocity,
          isMuted
        }))
      )
      expect(rng).not.toHaveBeenCalled()
    })

    it('reproduces repeated motif content and derived IDs for the same seeded input', () => {
      const run = () =>
        applyMotifStructure(
          sampleNotes,
          structureOptions({
            motifVariation: 0.75,
            rng: createRng(4821)
          })
        )

      expect(run()).toEqual(run())
    })

    it('keeps varied sections in scale, bounded, and non-overlapping in Hungarian minor', () => {
      const notes: AppNote[] = [
        { id: 'hm1', pitch: 'F#4', midi: 66, step: 0, durationSteps: 3, velocity: 92, isMuted: false },
        { id: 'hm2', pitch: 'G#4', midi: 68, step: 5, durationSteps: 2, velocity: 88, isMuted: false },
        { id: 'hm3', pitch: 'A4', midi: 69, step: 9, durationSteps: 3, velocity: 84, isMuted: false },
        { id: 'hm4', pitch: 'C#5', midi: 73, step: 13, durationSteps: 2, velocity: 80, isMuted: false }
      ]
      const result = applyMotifStructure(
        notes,
        structureOptions({
          pattern: 'AAAB',
          bars: 2,
          root: 'F#',
          scaleName: 'hungarian minor',
          motifVariation: 1,
          minOctave: 4,
          maxOctave: 4,
          rng: createRng(29)
        })
      )

      const derived = result.filter((note) => note.step >= 16 && note.step < 32)
      expect(derived.length).toBeGreaterThanOrEqual(1)
      for (const note of derived) {
        expect(note.step).toBeGreaterThanOrEqual(16)
        expect(note.step + note.durationSteps).toBeLessThanOrEqual(32)
        expect(note.midi).toBeGreaterThanOrEqual(60)
        expect(note.midi).toBeLessThan(72)
        expect(isNoteInScale(note.pitch, 'F#', 'hungarian minor')).toBe(true)
      }
      for (let index = 1; index < derived.length; index++) {
        expect(derived[index].step).toBeGreaterThanOrEqual(derived[index - 1].step + derived[index - 1].durationSteps)
      }
    })

    it('changes derived pitch material at full intensity while preserving section limits', () => {
      const run = (motifVariation: number) =>
        applyMotifStructure(
          sampleNotes,
          structureOptions({
            motifVariation,
            rng: createRng(8675309)
          })
        ).filter((note) => note.step >= 16 && note.step < 32)
      const plain = run(0)
      const varied = run(1)

      expect(varied.map((note) => note.midi)).not.toEqual(plain.map((note) => note.midi))
      expect(varied.length).toBeGreaterThanOrEqual(1)
      expect(varied.every((note) => note.step + note.durationSteps <= 32)).toBe(true)
    })

    it.each(['major', 'hungarian minor'])('keeps all roles bounded and in %s across fixed seeds', (scaleName) => {
      const template = sampleNotes
        .filter((note) => note.step < 16)
        .map((note, index) => {
          const pitch = snapPitchToScale(note.pitch, 'C', scaleName)
          return { ...note, pitch, midi: pitchToMidi(pitch), step: 32 + index * 5, durationSteps: 4 }
        })
      for (const seed of [1, 7, 19, 43]) {
        const result = applyMotifStructure(
          template,
          structureOptions({
            pattern: 'AABC',
            startStep: 32,
            bars: 4,
            scaleName,
            motifVariation: 1,
            rng: createRng(seed)
          })
        )
        for (let bar = 2; bar < 6; bar++) {
          const sectionNotes = result.filter((note) => Math.floor(note.step / 16) === bar)
          expect(sectionNotes.length).toBeGreaterThanOrEqual(1)
          for (let index = 0; index < sectionNotes.length; index++) {
            const note = sectionNotes[index]
            expect(isNoteInScale(note.pitch, 'C', scaleName)).toBe(true)
            expect(note.step + note.durationSteps).toBeLessThanOrEqual((bar + 1) * 16)
            if (index > 0)
              expect(note.step).toBeGreaterThanOrEqual(
                sectionNotes[index - 1].step + sectionNotes[index - 1].durationSteps
              )
          }
        }
        expect(new Set(result.map((note) => note.id)).size).toBe(result.length)
      }
    })

    it('uses the template pitch for chord-tone status and leaves off-beat passing tones free', () => {
      const template: AppNote[] = [
        { ...sampleNotes[0], pitch: 'D4', midi: 62, step: 1 },
        { ...sampleNotes[1], step: 5 }
      ]
      const chords: ChordEvent[] = [
        { id: 'source', name: 'C', roman: 'I', notes: ['C', 'E', 'G'], voicing: [], startBar: 0, durationBars: 1 },
        { id: 'target', name: 'G', roman: 'V', notes: ['G', 'B', 'D'], voicing: [], startBar: 1, durationBars: 1 }
      ]
      const result = applyMotifStructure(
        template,
        structureOptions({
          bars: 2,
          motifVariation: 1,
          chords,
          rng: () => 0.1
        })
      ).filter((note) => note.step >= 16)
      // D was a passing tone before mutation: its mutated pitch (bounced to C because
      // stepping towards the neighbour E would repeat it) must not be chord-adapted
      // just because E belonged to the source chord. The off-beat anchor leaves it free.
      expect(result[0].step).toBe(17)
      expect(result[0].pitch).toBe('C4')
      expect(result[1].pitch).toBe('D4')
    })

    it('re-anchors mutated strong beats to destination chords', () => {
      const chords: ChordEvent[] = [
        {
          id: 'target',
          name: 'G',
          roman: 'V',
          notes: ['G', 'B', 'D'],
          voicing: [],
          startBar: 1,
          durationBars: 3
        }
      ]
      const result = applyMotifStructure(
        sampleNotes,
        structureOptions({ motifVariation: 1, chords, rng: createRng(7) })
      )
      for (const note of result.filter((note) => note.step >= 16 && note.step % 4 === 0)) {
        expect(['G', 'B', 'D']).toContain(note.pitch.replace(/-?\d+$/, ''))
      }
    })

    it('duplicates section A with new unique UUIDs in ABAB pattern', () => {
      // 4 bars, 16 steps per bar -> steps 0..15 is Bar 0 (A), 16..31 is Bar 1 (B), 32..47 is Bar 2 (A), 48..63 is Bar 3 (B)
      const result = applyMotifStructure(sampleNotes, structureOptions())

      // Task 45 derives B from A instead of capturing unrelated generated B material.
      // At this RNG and short gate length no ornaments are added: all bars share A's groove.
      expect(result.length).toBe(12)

      // Check unique UUIDs across all notes
      const ids = new Set(result.map((n) => n.id))
      expect(ids.size).toBe(result.length)

      // Notes in Bar 2 should be at steps 32, 36, 40 (shifted by 32 steps)
      const bar2Notes = result.filter((n) => n.step >= 32 && n.step < 48)
      expect(bar2Notes.length).toBe(3)
      expect(bar2Notes[0].step).toBe(32)
      expect(bar2Notes[1].step).toBe(36)
      expect(bar2Notes[2].step).toBe(40)
    })

    it('adapts chord tones when underlying chords differ', () => {
      const chords: ChordEvent[] = [
        {
          id: 'c1111111-1111-4111-8111-111111111111',
          name: 'C',
          roman: 'I',
          notes: ['C', 'E', 'G'],
          voicing: ['C3', 'E3', 'G3'],
          startBar: 0,
          durationBars: 2
        },
        {
          id: 'c2222222-2222-4222-8222-222222222222',
          name: 'G',
          roman: 'V',
          notes: ['G', 'B', 'D'],
          voicing: ['G3', 'B3', 'D4'],
          startBar: 2,
          durationBars: 2
        }
      ]

      const result = applyMotifStructure(sampleNotes, structureOptions({ chords }))
      const bar2Notes = result.filter((n) => n.step >= 32 && n.step < 48)

      // Notes duplicated into Bar 2 (where G chord is active) should align with G chord notes
      expect(bar2Notes.length).toBe(3)
      // Chord tones from C (C4, E4, G4) should be harmonically mapped
      bar2Notes.forEach((n) => {
        expect(['G', 'B', 'D', 'C', 'E']).toContain(n.pitch.replace(/\d/, ''))
      })
    })

    it('handles startStep offset correctly across absolute timeline', () => {
      // Offset startStep = 32 (Bar 2), 2 bars long (bars 2 and 3)
      const offsetNotes: AppNote[] = [
        {
          id: '1',
          pitch: 'C4',
          midi: 60,
          step: 32,
          durationSteps: 2,
          velocity: 90,
          isMuted: false
        },
        {
          id: '2',
          pitch: 'E4',
          midi: 64,
          step: 36,
          durationSteps: 2,
          velocity: 90,
          isMuted: false
        }
      ]

      const result = applyMotifStructure(offsetNotes, structureOptions({ pattern: 'AABA', bars: 2, startStep: 32 }))
      // In 2 bars with AABA, section 0 is Bar 2 (step 32..47) and section 1 is Bar 3 (step 48..63)
      // Section 1 repeats A, duplicating notes into Bar 3!
      expect(result.length).toBe(4)
      const bar3Notes = result.filter((n) => n.step >= 48 && n.step < 64)
      expect(bar3Notes.length).toBe(2)
      expect(bar3Notes[0].step).toBe(48)
      expect(bar3Notes[1].step).toBe(52)
    })

    it('repeats bar-aligned sections for 6 bars ABAB', () => {
      const result = applyMotifStructure(sampleNotes, structureOptions({ bars: 6 }))

      // One bar per letter (A B A B A B): A repeats in bars 2 and 4, B in bars 3 and 5.
      // The old stretched layout produced 1.5-bar sections starting mid-bar at steps 24 and 72.
      expect(result.map((n) => n.step)).toEqual([0, 4, 8, 16, 20, 24, 32, 36, 40, 48, 52, 56, 64, 68, 72, 80, 84, 88])

      // Every repeated section starts on a multiple of stepsPerBar
      for (const sectionStart of [32, 48, 64, 80]) {
        expect(sectionStart % 16).toBe(0)
        const firstRepeatedNote = result.find((n) => n.step >= sectionStart)
        expect(firstRepeatedNote?.step).toBe(sectionStart)
      }
    })

    it('tiles the pattern twice for 8 bars so bar 4 mirrors bar 0', () => {
      const result = applyMotifStructure(sampleNotes, structureOptions({ bars: 8 }))

      const bar0Steps = result.filter((n) => n.step < 16).map((n) => n.step)
      const bar4Steps = result.filter((n) => n.step >= 64 && n.step < 80).map((n) => n.step - 64)

      expect(bar0Steps).toEqual([0, 4, 8])
      expect(bar4Steps).toEqual(bar0Steps)
      // Stretched two-bar sections would instead copy the 4-note template (relative steps 0, 4, 8, 16)
      expect(result.map((n) => n.step)).toEqual([
        0, 4, 8, 16, 20, 24, 32, 36, 40, 48, 52, 56, 64, 68, 72, 80, 84, 88, 96, 100, 104, 112, 116, 120
      ])
    })

    it('derives every later AABC section from the opening hook', () => {
      const aabcNotes: AppNote[] = [
        ...sampleNotes.filter((note) => note.step < 16),
        { id: 'b1', pitch: 'F4', midi: 65, step: 32, durationSteps: 2, velocity: 88, isMuted: false },
        { id: 'c1', pitch: 'A4', midi: 69, step: 48, durationSteps: 2, velocity: 84, isMuted: false }
      ]

      const result = applyMotifStructure(aabcNotes, structureOptions({ pattern: 'AABC' }))

      const bar1 = result.filter((note) => note.step < 16)
      const bar2 = result.filter((note) => note.step >= 16 && note.step < 32)
      expect(bar2.map((note) => note.step - 16)).toEqual(bar1.map((note) => note.step))
      expect(bar2.map((note) => note.pitch)).toEqual(bar1.map((note) => note.pitch))
      expect(new Set(result.map((note) => note.id)).size).toBe(result.length)
      // Task 45 replaces free B/C material with parallel derivatives of the opening hook.
      for (const bar of [2, 3]) {
        const derived = result.filter((note) => Math.floor(note.step / 16) === bar)
        expect(derived.map((note) => note.step - bar * 16)).toEqual([0, 4, 8])
        expect(derived.every((note) => !['b1', 'c1'].includes(note.id))).toBe(true)
      }
    })

    describe('ABCB loop seam', () => {
      const abcbNotes: AppNote[] = [
        ...sampleNotes.filter((note) => note.step < 16),
        { id: 'b1', pitch: 'E4', midi: 64, step: 16, durationSteps: 2, velocity: 92, isMuted: false },
        { id: 'b2', pitch: 'G4', midi: 67, step: 20, durationSteps: 2, velocity: 88, isMuted: false },
        { id: 'b3', pitch: 'B4', midi: 71, step: 24, durationSteps: 2, velocity: 84, isMuted: false },
        { id: 'c1', pitch: 'A4', midi: 69, step: 32, durationSteps: 2, velocity: 80, isMuted: false }
      ]

      it('derives the final contrast bar independently from the opening hook', () => {
        const result = applyMotifStructure(abcbNotes, structureOptions({ pattern: 'ABCB' }))

        const bar2 = result.filter((note) => note.step >= 16 && note.step < 32)
        const bar4 = result.filter((note) => note.step >= 48)
        expect(bar4.map((note) => note.step - 48)).toEqual(bar2.map((note) => note.step - 16))
        expect(bar4.map((note) => note.pitch)).toEqual(['C4', 'E4', 'G4'])
        // Task 45 gives all contrast bars fresh derivatives of A, including the loop seam.
        expect(bar4.every((note) => note.id !== 'b1' && note.id !== 'b2' && note.id !== 'b3')).toBe(true)
        expect(result.filter((note) => note.step >= 32 && note.step < 48).every((note) => note.id !== 'c1')).toBe(true)
      })

      it('adapts the returning bar to the chord under the loop seam', () => {
        const chords: ChordEvent[] = [
          {
            id: 'c1111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            name: 'C',
            roman: 'I',
            notes: ['C', 'E', 'G'],
            voicing: ['C3', 'E3', 'G3'],
            startBar: 0,
            durationBars: 2
          },
          {
            id: 'c2222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            name: 'G',
            roman: 'V',
            notes: ['G', 'B', 'D'],
            voicing: ['G3', 'B3', 'D4'],
            startBar: 2,
            durationBars: 2
          }
        ]

        const result = applyMotifStructure(abcbNotes, structureOptions({ pattern: 'ABCB', chords }))
        const bar4 = result.filter((note) => note.step >= 48)

        // Adjacent octaves keep C4 close to B3 rather than collapsing it with E4 onto D4.
        expect(bar4.map((note) => note.pitch)).toEqual(['B3', 'D4', 'G4'])
      })
    })
  })

  describe('applyCallAndResponse', () => {
    it('creates musical dialogue with delayed response onset and tonic resolution', () => {
      // Call phrase in Bar 0 (steps 0, 4, 8)
      const result = applyCallAndResponse(sampleNotes, 2, 16, 'C', 'major')

      // Bar 0 notes should be preserved with resting room at the end of the bar
      const callNotes = result.filter((n) => n.step < 16)
      expect(callNotes.length).toBe(3)
      // All call notes must end before beat 4 (step 12)
      callNotes.forEach((n) => {
        expect(n.step + n.durationSteps).toBeLessThanOrEqual(12)
      })

      // Bar 1 should have complementary response notes generated from Call
      const respNotes = result.filter((n) => n.step >= 16 && n.step < 32)
      expect(respNotes.length).toBe(3)

      // Response sets in delayed on Beat 2 (step 20) instead of cloning step 16
      expect(respNotes[0].step).toBe(20)
      expect(respNotes[1].step).toBe(24)
      expect(respNotes[2].step).toBe(28)

      // The final note of response (step 28) should resolve to tonic (C)
      expect(respNotes[2].pitch.startsWith('C')).toBe(true)

      // Response notes have warmer/differentiated velocities
      expect(respNotes[0].velocity).toBeLessThan(callNotes[0].velocity)

      // Response IDs must be distinct from Call IDs
      const allIds = new Set(result.map((n) => n.id))
      expect(allIds.size).toBe(result.length)
    })

    it('guarantees breathing room (rest space) at the end of Call bars', () => {
      const notesWithEndNote: AppNote[] = [
        {
          id: 'c1',
          pitch: 'C4',
          midi: 60,
          step: 0,
          durationSteps: 4,
          velocity: 90,
          isMuted: false
        },
        {
          id: 'c2',
          pitch: 'E4',
          midi: 64,
          step: 8,
          durationSteps: 4,
          velocity: 90,
          isMuted: false
        },
        {
          id: 'c3',
          pitch: 'G4',
          midi: 67,
          step: 14, // in the rest zone (beat 4: steps 12-15)
          durationSteps: 2,
          velocity: 90,
          isMuted: false
        }
      ]

      const result = applyCallAndResponse(notesWithEndNote, 2, 16, 'C', 'major')
      const callNotes = result.filter((n) => n.step < 16)

      // Note at step 14 should have been pruned to guarantee breathing room
      expect(callNotes.some((n) => n.step >= 12)).toBe(false)
      callNotes.forEach((n) => {
        expect(n.step + n.durationSteps).toBeLessThanOrEqual(12)
      })
    })

    it('ensures the Call phrase ends on an open question (non-tonic)', () => {
      const tonicEndingNotes: AppNote[] = [
        {
          id: 'c1',
          pitch: 'E4',
          midi: 64,
          step: 0,
          durationSteps: 2,
          velocity: 90,
          isMuted: false
        },
        {
          id: 'c2',
          pitch: 'C4', // ends on tonic C4
          midi: 60,
          step: 4,
          durationSteps: 2,
          velocity: 90,
          isMuted: false
        }
      ]

      const result = applyCallAndResponse(tonicEndingNotes, 2, 16, 'C', 'major')
      const callNotes = result.filter((n) => n.step < 16)
      const lastCallNote = callNotes[callNotes.length - 1]

      // Must be lifted to open scale degree (not C)
      expect(lastCallNote.pitch.startsWith('C')).toBe(false)
      expect(['D4', 'G4']).toContain(lastCallNote.pitch)
    })

    it('keeps notes strictly within bar and grid boundaries', () => {
      const denseNotes: AppNote[] = [
        { id: '1', pitch: 'C4', midi: 60, step: 0, durationSteps: 2, velocity: 100, isMuted: false },
        { id: '2', pitch: 'D4', midi: 62, step: 2, durationSteps: 2, velocity: 100, isMuted: false },
        { id: '3', pitch: 'E4', midi: 64, step: 4, durationSteps: 2, velocity: 100, isMuted: false },
        { id: '4', pitch: 'F4', midi: 65, step: 6, durationSteps: 2, velocity: 100, isMuted: false },
        { id: '5', pitch: 'G4', midi: 67, step: 8, durationSteps: 4, velocity: 100, isMuted: false }
      ]

      const result = applyCallAndResponse(denseNotes, 4, 16, 'C', 'major')
      const totalSteps = 4 * 16

      result.forEach((n) => {
        expect(n.step).toBeGreaterThanOrEqual(0)
        expect(n.step).toBeLessThan(totalSteps)
        expect(n.step + n.durationSteps).toBeLessThanOrEqual(totalSteps)
        expect(n.durationSteps).toBeGreaterThanOrEqual(1)
        expect(n.velocity).toBeGreaterThanOrEqual(1)
        expect(n.velocity).toBeLessThanOrEqual(127)
      })
    })

    it('preserves a trailing Call bar when no Response follows', () => {
      const trailingCallNotes: AppNote[] = [
        { id: 't1', pitch: 'C4', midi: 60, step: 32, durationSteps: 2, velocity: 90, isMuted: false },
        { id: 't2', pitch: 'D4', midi: 62, step: 44, durationSteps: 4, velocity: 90, isMuted: false }
      ]

      const result = applyCallAndResponse(trailingCallNotes, 3, 16, 'C', 'major')

      // Bar 2 is a Call with no answer after it: its notes must survive unclipped
      const preserved = result.find((n) => n.id === 't2')
      expect(preserved).toBeDefined()
      expect(preserved!.step).toBe(44)
      expect(preserved!.durationSteps).toBe(4)
    })

    it('keeps generated answers inside their bar for 32-step subdivisions', () => {
      const denseCallNotes: AppNote[] = []
      for (let i = 0; i < 25; i++) {
        denseCallNotes.push({
          id: `d${i}`,
          pitch: 'C4',
          midi: 60,
          step: i,
          durationSteps: 1,
          velocity: 90,
          isMuted: false
        })
      }

      const totalSteps = 2 * 32
      const result = applyCallAndResponse(denseCallNotes, 2, 32, 'C', 'major')
      const respNotes = result.filter((n) => n.step >= 32)

      expect(respNotes.length).toBeGreaterThan(0)
      result.forEach((n) => {
        expect(n.step).toBeGreaterThanOrEqual(0)
        expect(n.step).toBeLessThan(totalSteps)
        expect(n.step + n.durationSteps).toBeLessThanOrEqual(totalSteps)
      })
    })

    it('snaps response phrases to the chord active in the answer bar', () => {
      const chords: ChordEvent[] = [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          name: 'G',
          roman: 'V',
          notes: ['G', 'B', 'D'],
          voicing: ['G3', 'B3', 'D4'],
          startBar: 1,
          durationBars: 1
        }
      ]

      const result = applyCallAndResponse(sampleNotes, 2, 16, 'C', 'major', chords)
      const respNotes = result.filter((n) => n.step >= 16 && n.step < 32)

      expect(respNotes.length).toBeGreaterThanOrEqual(3)
      // Every answer but the cadence lands on a chord tone of the answer bar
      const nonFinal = respNotes.slice(0, -1)
      nonFinal.forEach((n) => expect(['G', 'B', 'D']).toContain(n.pitch.replace(/\d/g, '')))
      // A cadence over V belongs to that chord instead of forcing the tonic.
      expect(['G', 'B', 'D']).toContain(respNotes[respNotes.length - 1].pitch.replace(/\d/g, ''))
    })

    it('uses the original answer bar as rhythmic material for continue and contrast', () => {
      const answerMaterial: AppNote[] = [
        { id: 'r1', pitch: 'A4', midi: 69, step: 16, durationSteps: 1, velocity: 86, isMuted: false },
        { id: 'r2', pitch: 'B4', midi: 71, step: 19, durationSteps: 1, velocity: 82, isMuted: false },
        { id: 'r3', pitch: 'F4', midi: 65, step: 25, durationSteps: 2, velocity: 78, isMuted: false }
      ]
      const source = [...sampleNotes.filter((note) => note.step < 16), ...answerMaterial]
      const echo = applyCallAndResponse(source, 2, 16, 'C', 'major', undefined, 0, () => 0.5, 0, {
        style: 'echo',
        variation: 0
      }).filter((note) => note.step >= 16)
      const continued = applyCallAndResponse(source, 2, 16, 'C', 'major', undefined, 0, () => 0.5, 0, {
        style: 'continue',
        variation: 0
      }).filter((note) => note.step >= 16)
      const contrasted = applyCallAndResponse(source, 2, 16, 'C', 'major', undefined, 0, () => 0.5, 0, {
        style: 'contrast',
        variation: 0
      }).filter((note) => note.step >= 16)

      expect(echo.map((note) => note.step)).toEqual([20, 24, 28])
      expect(continued.map((note) => note.step)).toEqual([16, 19, 25])
      expect(contrasted.map((note) => note.step)).toEqual([16, 19, 25])
      expect(continued.slice(0, -1).map((note) => note.pitch)).not.toEqual(
        contrasted.slice(0, -1).map((note) => note.pitch)
      )
    })

    it('changes phrase rhythm when variation increases while preserving bar bounds', () => {
      const fixed = applyCallAndResponse(sampleNotes, 2, 16, 'C', 'major', undefined, 0, () => 0.1, 0, {
        style: 'echo',
        variation: 0
      })
      const varied = applyCallAndResponse(sampleNotes, 2, 16, 'C', 'major', undefined, 0, () => 0.1, 0, {
        style: 'echo',
        variation: 1
      })
      const fixedSteps = fixed.filter((note) => note.step >= 16).map((note) => note.step)
      const variedAnswer = varied.filter((note) => note.step >= 16)

      expect(variedAnswer.map((note) => note.step)).not.toEqual(fixedSteps)
      expect(variedAnswer.every((note) => note.step + note.durationSteps <= 32)).toBe(true)
    })

    it('leaves an intermediate answer open before the final phrase pair', () => {
      const result = applyCallAndResponse(sampleNotes, 4, 16, 'C', 'major', undefined, 0, () => 0.5)
      const firstAnswer = result.filter((note) => note.step >= 16 && note.step < 32)

      expect(firstAnswer.length).toBeGreaterThan(0)
      expect(firstAnswer[firstAnswer.length - 1].pitch.startsWith('C')).toBe(false)
    })

    it('varies the answer entry with a syncopated onset when the rng calls for it', () => {
      // rng 0.1 < 0.35 selects the half-beat syncopated entry (delay 6 instead of 4)
      const result = applyCallAndResponse(sampleNotes, 2, 16, 'C', 'major', undefined, 0, () => 0.1)
      const respNotes = result.filter((n) => n.step >= 16 && n.step < 32)

      expect(respNotes[0].step).toBe(22)
      expect(respNotes[1].step).toBe(26)
      expect(respNotes[2].step).toBe(30)
    })

    it('varies answer velocity without leaving the bar', () => {
      const result = applyCallAndResponse(sampleNotes, 2, 16, 'C', 'major', undefined, 1, () => 0.1)
      const respNotes = result.filter((n) => n.step >= 16 && n.step < 32)

      expect(respNotes[1].step).toBe(26)

      respNotes.forEach((n) => {
        expect(n.step).toBeGreaterThanOrEqual(16)
        expect(n.step + n.durationSteps).toBeLessThanOrEqual(32)
        expect(n.velocity).toBeGreaterThanOrEqual(1)
        expect(n.velocity).toBeLessThanOrEqual(127)
      })
    })

    it('thins busy call phrases so the answer is sparser than the call', () => {
      const denseCallNotes: AppNote[] = [
        { id: 'p1', pitch: 'C4', midi: 60, step: 0, durationSteps: 1, velocity: 90, isMuted: false },
        { id: 'p2', pitch: 'D4', midi: 62, step: 1, durationSteps: 1, velocity: 90, isMuted: false },
        { id: 'p3', pitch: 'E4', midi: 64, step: 2, durationSteps: 1, velocity: 90, isMuted: false },
        { id: 'p4', pitch: 'F4', midi: 65, step: 3, durationSteps: 1, velocity: 90, isMuted: false },
        { id: 'p5', pitch: 'G4', midi: 67, step: 4, durationSteps: 1, velocity: 90, isMuted: false }
      ]

      const result = applyCallAndResponse(denseCallNotes, 2, 16, 'C', 'major', undefined, 0, () => 0.1)
      const respNotes = result.filter((n) => n.step >= 16 && n.step < 32)

      // The weak inner note is dropped: five call notes answer with four
      expect(respNotes.map((n) => n.step)).toEqual([22, 24, 25, 26])
    })

    it('varies the answer contour across generations instead of always mirroring', () => {
      const pitchSequences = new Set<string>()

      for (const seed of [0.1, 0.2, 0.3, 0.7, 0.8, 0.9]) {
        const result = applyCallAndResponse(sampleNotes, 2, 16, 'C', 'major', undefined, 0, () => seed)
        const respNotes = result.filter((n) => n.step >= 16 && n.step < 32)

        // Every generated answer stays in the requested scale
        respNotes.forEach((n) => expect(isNoteInScale(n.pitch, 'C', 'major')).toBe(true))
        pitchSequences.add(respNotes.map((n) => n.pitch).join(','))
      }

      expect(pitchSequences.size).toBeGreaterThan(1)
    })

    it('returns unchanged notes if bars < 2', () => {
      const result = applyCallAndResponse(sampleNotes, 1, 16, 'C', 'major')
      expect(result).toEqual(sampleNotes)
    })

    it('respects startStep offset in call and response phrases', () => {
      // Call in Bar 2 (step 32..47), Response in Bar 3 (step 48..63)
      const offsetNotes: AppNote[] = [
        { id: 'c1', pitch: 'C4', midi: 60, step: 32, durationSteps: 2, velocity: 90, isMuted: false },
        { id: 'c2', pitch: 'E4', midi: 64, step: 36, durationSteps: 2, velocity: 90, isMuted: false }
      ]

      const result = applyCallAndResponse(offsetNotes, 2, 16, 'C', 'major', undefined, 0, () => 0.5, 32)
      const call = result.filter((n) => n.step >= 32 && n.step < 48)
      const resp = result.filter((n) => n.step >= 48 && n.step < 64)

      expect(call.length).toBeGreaterThanOrEqual(1)
      expect(resp.length).toBeGreaterThanOrEqual(1)
      // All notes must lie within [32, 64)
      result.forEach((n) => {
        expect(n.step).toBeGreaterThanOrEqual(32)
        expect(n.step + n.durationSteps).toBeLessThanOrEqual(64)
      })
    })
  })
})
