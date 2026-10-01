import type { SegmentOption } from '@/utils/segmented.utils'
import type { ChordMode, VoicingStyle } from '@/core/theory/chord.engine'

export const CHORD_MODE_OPTIONS: SegmentOption<ChordMode>[] = [
  { label: 'Triads', value: 'triad' },
  { label: '7ths', value: 'seventh' }
]

export const VOICING_STYLE_OPTIONS: SegmentOption<VoicingStyle>[] = [
  { label: 'Close', value: 'close' },
  { label: 'Drop-2', value: 'drop-2' },
  { label: 'Bass+', value: 'bass-triad' }
]

/** Length for chords created from the palette; quarter bars are deliberately not offered here. */
export const DEFAULT_DURATION_OPTIONS: SegmentOption<number>[] = [
  { label: '½b', value: 0.5 },
  { label: '1b', value: 1 },
  { label: '2b', value: 2 },
  { label: '4b', value: 4 }
]

/** Length of an existing chord; the inspector additionally allows tightening to a quarter bar. */
export const CHORD_DURATION_OPTIONS: SegmentOption<number>[] = [
  { label: '¼b', value: 0.25 },
  ...DEFAULT_DURATION_OPTIONS
]

export const INVERSION_OPTIONS: SegmentOption<0 | 1 | 2 | 3>[] = [
  { label: 'Root', value: 0 },
  { label: '1st', value: 1 },
  { label: '2nd', value: 2 },
  { label: '3rd', value: 3 }
]

/** Inversions beyond the note count of a voicing are unreachable, so the list is trimmed. */
export function availableInversions(voicingLength: number): SegmentOption<0 | 1 | 2 | 3>[] {
  return INVERSION_OPTIONS.slice(0, Math.min(4, Math.max(1, voicingLength)))
}
