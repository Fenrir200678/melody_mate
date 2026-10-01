import type { RhythmPreset } from '../../rhythm/types'
import { MELODY_RHYTHMS } from './melody'
import { BASS_RHYTHMS } from './bass'
import { WORLD_RHYTHMS } from './world'
import { BASIC_RHYTHMS } from './basic'
import { PHRASE_RHYTHMS } from './phrases'

export * from './melody'
export * from './bass'
export * from './world'
export * from './basic'
export * from './phrases'

export const ALL_RHYTHM_PRESETS: readonly RhythmPreset[] = [
  ...BASIC_RHYTHMS,
  ...MELODY_RHYTHMS,
  ...BASS_RHYTHMS,
  ...WORLD_RHYTHMS,
  ...PHRASE_RHYTHMS
]
