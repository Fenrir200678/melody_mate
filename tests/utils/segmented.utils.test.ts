import { describe, expect, it } from 'vitest'
import { resolveSegmentedIndex, resolveSegmentedKey } from '@/utils/segmented.utils'

describe('resolveSegmentedKey', () => {
  it('maps the arrow keys to linear movement', () => {
    expect(resolveSegmentedKey('ArrowRight')).toBe('next')
    expect(resolveSegmentedKey('ArrowDown')).toBe('next')
    expect(resolveSegmentedKey('ArrowLeft')).toBe('previous')
    expect(resolveSegmentedKey('ArrowUp')).toBe('previous')
  })

  it('maps Home and End to the list bounds', () => {
    expect(resolveSegmentedKey('Home')).toBe('first')
    expect(resolveSegmentedKey('End')).toBe('last')
  })

  it('ignores unrelated keys', () => {
    expect(resolveSegmentedKey('Enter')).toBeNull()
    expect(resolveSegmentedKey('Tab')).toBeNull()
    expect(resolveSegmentedKey('a')).toBeNull()
  })
})

describe('resolveSegmentedIndex', () => {
  it('wraps around at both ends', () => {
    expect(resolveSegmentedIndex('next', 0, 3)).toBe(1)
    expect(resolveSegmentedIndex('next', 2, 3)).toBe(0)
    expect(resolveSegmentedIndex('previous', 0, 3)).toBe(2)
    expect(resolveSegmentedIndex('previous', 2, 3)).toBe(1)
  })

  it('jumps to the bounds for first and last', () => {
    expect(resolveSegmentedIndex('first', 2, 5)).toBe(0)
    expect(resolveSegmentedIndex('last', 0, 5)).toBe(4)
  })

  it('treats a missing current selection as the first entry', () => {
    expect(resolveSegmentedIndex('next', -1, 3)).toBe(1)
    expect(resolveSegmentedIndex('previous', -1, 3)).toBe(2)
  })

  it('returns null when there is nothing to move through', () => {
    expect(resolveSegmentedIndex('next', 0, 0)).toBeNull()
    expect(resolveSegmentedIndex(null, 0, 3)).toBeNull()
  })
})
