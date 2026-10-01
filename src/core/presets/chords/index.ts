import type { PredefinedProgression } from '../../theory/progressions.types'
import { POP_PROGRESSIONS } from './pop'
import { ELECTRONIC_PROGRESSIONS } from './electronic'
import { ELECTRONIC_STAB_PROGRESSIONS } from './electronic-stabs'
import { DARK_PROGRESSIONS } from './dark'
import { JAZZ_SOUL_PROGRESSIONS } from './jazz-soul'
import { ROCK_PROGRESSIONS } from './rock'

export * from './pop'
export * from './electronic'
export * from './electronic-stabs'
export * from './dark'
export * from './jazz-soul'
export * from './rock'

export const ALL_CHORD_PROGRESSIONS: readonly PredefinedProgression[] = [
  ...POP_PROGRESSIONS,
  ...ELECTRONIC_PROGRESSIONS,
  ...ELECTRONIC_STAB_PROGRESSIONS,
  ...DARK_PROGRESSIONS,
  ...JAZZ_SOUL_PROGRESSIONS,
  ...ROCK_PROGRESSIONS
]
