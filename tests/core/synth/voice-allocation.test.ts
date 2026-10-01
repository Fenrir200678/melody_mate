import { describe, expect, it } from 'vitest'
import { VoiceAllocator } from '../../../src/core/synth/voice-allocation'

const note = (id: string, pitch: number, startedAt: number, level = 0.8) => ({
  id,
  pitch,
  startedAt,
  releasedAt: null,
  level
})

describe('VoiceAllocator', () => {
  it('keeps overlapping identical pitches independent by ID', () => {
    const allocator = new VoiceAllocator(2)
    allocator.allocate(note('a', 60, 0))
    allocator.allocate(note('b', 60, 1))
    expect(allocator.release('a', 2)).toBe(true)
    expect(allocator.get('b')?.releasedAt).toBeNull()
  })

  it('steals released voices before active voices, then quietest and oldest', () => {
    const allocator = new VoiceAllocator(2)
    allocator.allocate(note('loud', 60, 0, 0.9))
    allocator.allocate(note('quiet', 62, 1, 0.2))
    allocator.release('loud', 2)
    expect(allocator.allocate(note('next', 64, 3)).stolen).toBe('loud')
    expect(allocator.allocate(note('last', 65, 4)).stolen).toBe('quiet')
    expect(allocator.active().map((entry) => entry.id)).toEqual(['next', 'last'])
  })

  it('rejects duplicate IDs and invalid budgets', () => {
    expect(() => new VoiceAllocator(17)).toThrow()
    const allocator = new VoiceAllocator(1)
    allocator.allocate(note('a', 60, 0))
    expect(() => allocator.allocate(note('a', 60, 1))).toThrow()
  })
})
