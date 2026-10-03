import type { RhythmPreset } from '../../rhythm/types'
import { MELODY_RHYTHMS } from './melody'
import { BASS_RHYTHMS } from './bass'
import { WORLD_RHYTHMS } from './world'
import { BASIC_RHYTHMS } from './basic'
import { PHRASE_RHYTHMS } from './phrases'
import { DARK_BASS_RHYTHMS } from './dark-bass'
import { DARK_MELODY_RHYTHMS } from './dark-melody'
import { GROOVE_BASS_RHYTHMS } from './groove-bass'
import { GROOVE_MELODY_RHYTHMS } from './groove-melody'
import { WORLD_GROOVE_RHYTHMS } from './world-grooves'

export * from './melody'
export * from './bass'
export * from './world'
export * from './basic'
export * from './phrases'
export * from './dark-bass'
export * from './dark-melody'
export * from './groove-bass'
export * from './groove-melody'
export * from './world-grooves'

export const ALL_RHYTHM_PRESETS: readonly RhythmPreset[] = [
  ...BASIC_RHYTHMS,
  ...MELODY_RHYTHMS,
  ...BASS_RHYTHMS,
  ...WORLD_RHYTHMS,
  ...PHRASE_RHYTHMS,
  ...DARK_MELODY_RHYTHMS,
  ...GROOVE_MELODY_RHYTHMS,
  ...DARK_BASS_RHYTHMS,
  ...GROOVE_BASS_RHYTHMS,
  ...WORLD_GROOVE_RHYTHMS
]
