import type { Dynamic } from '@/ts/types/dynamics.types'

export const dynamics: Dynamic[] = [
  { label: 'Pianississimo (very, very soft)', name: 'ppp', range: [1, 20] },
  { label: 'Pianissimo (very soft)', name: 'pp', range: [21, 35] },
  { label: 'Piano (soft)', name: 'p', range: [36, 50] },
  { label: 'Mezzo-piano (moderately soft)', name: 'mp', range: [51, 65] },
  { label: 'Mezzo-forte (moderately loud)', name: 'mf', range: [66, 80] },
  { label: 'Forte (loud)', name: 'f', range: [81, 95] },
  { label: 'Fortissimo (very loud)', name: 'ff', range: [96, 110] },
  { label: 'Fortississimo (extremely loud)', name: 'fff', range: [111, 127] }
]
