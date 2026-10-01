import type { MotifPattern } from '@/core/schemas/generator.schema'
import type { SegmentOption } from '@/utils/segmented.utils'

export const motifHint: Record<MotifPattern, string> = {
  FREE: 'No pattern — every bar keeps its own generated material.',
  ABAB: 'Hook and counterpart alternate across the bars.',
  ABAC: 'Like ABAB, but a fresh idea closes the phrase.',
  AABA: 'Standard song form — the hook frames a contrasting release.',
  AAAB: 'The hook builds up and lands its punchline on the last bar.',
  AABC: 'The hook is confirmed first, then two new ideas open the ending.',
  ABCB: 'Hook returns on the last bar — loops seamlessly.'
}

export const motifOptions: SegmentOption<MotifPattern>[] = [
  { label: 'Free', value: 'FREE', title: motifHint.FREE },
  { label: 'ABAB', value: 'ABAB', title: motifHint.ABAB },
  { label: 'ABAC', value: 'ABAC', title: motifHint.ABAC },
  { label: 'AABA', value: 'AABA', title: motifHint.AABA },
  { label: 'AAAB', value: 'AAAB', title: motifHint.AAAB },
  { label: 'AABC', value: 'AABC', title: motifHint.AABC },
  { label: 'ABCB', value: 'ABCB', title: motifHint.ABCB }
]

export const motifVariationHint = 'How far repeated and contrasting sections drift from the opening phrase.'
