/**
 * Types and keyboard navigation helpers for segmented buttons/radiogroups.
 */

export interface SegmentOptionObject<V> {
  label: string
  value: V
  title?: string
}

export type SegmentOption<V> = SegmentOptionObject<V> | string

export type SegmentedSize = 'xs' | 'sm' | 'md'

/** Pure keyboard model for the segmented control: a roving focus index over the option list. */
export type SegmentedKeyAction = 'next' | 'previous' | 'first' | 'last' | null

export function resolveSegmentedKey(key: string): SegmentedKeyAction {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return 'next'
    case 'ArrowLeft':
    case 'ArrowUp':
      return 'previous'
    case 'Home':
      return 'first'
    case 'End':
      return 'last'
    default:
      return null
  }
}

/** Resolves the next focus/selection index, wrapping around the ends of the list. */
export function resolveSegmentedIndex(action: SegmentedKeyAction, currentIndex: number, count: number): number | null {
  if (action === null || count === 0) return null
  if (action === 'first') return 0
  if (action === 'last') return count - 1

  const origin = currentIndex < 0 ? 0 : currentIndex
  return action === 'next' ? (origin + 1) % count : (origin - 1 + count) % count
}
