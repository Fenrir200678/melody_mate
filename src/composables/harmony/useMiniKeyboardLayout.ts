import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { isNoteInScale, normalizeEnharmonic } from '@/core/theory/scale.engine'
import { useProjectStore } from '@/stores/project.store'

export interface KeyboardKey {
  pitch: string
  noteName: string
  octave: number
}

export interface BlackKeyboardKey extends KeyboardKey {
  x: number
}

export const WHITE_KEY_WIDTH = 20
export const WHITE_KEY_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
export const OCTAVE_WIDTH = WHITE_KEY_WIDTH * WHITE_KEY_NAMES.length
export const OCTAVE_COUNT = 2

/** Black key x-offsets inside one octave, measured against the 20px white key grid. */
export const BLACK_KEY_OFFSETS = [
  { name: 'C#', offset: 14.5 },
  { name: 'D#', offset: 34.5 },
  { name: 'F#', offset: 74.5 },
  { name: 'G#', offset: 94.5 },
  { name: 'A#', offset: 114.5 }
] as const

export interface UseMiniKeyboardLayoutOptions {
  activeVoicing: MaybeRefOrGetter<readonly string[]>
  rootPitch: MaybeRefOrGetter<string>
  baseOctave: MaybeRefOrGetter<number>
}

/** Geometry and highlight state for the two-octave voicing preview. */
export function useMiniKeyboardLayout({ activeVoicing, rootPitch, baseOctave }: UseMiniKeyboardLayoutOptions) {
  const projectStore = useProjectStore()

  /** Anchors the window on the lowest octave actually present, so deep voicings stay visible. */
  const displayBaseOctave = computed(() => {
    const octaves = toValue(activeVoicing)
      .map((pitch) => Number(pitch.replace(/^[A-G][b#]?/, '')))
      .filter((octave) => !Number.isNaN(octave))
    return octaves.length > 0 ? Math.min(...octaves) : toValue(baseOctave)
  })

  const whiteKeys = computed<KeyboardKey[]>(() => {
    const keys: KeyboardKey[] = []
    for (let offset = 0; offset < OCTAVE_COUNT; offset++) {
      const octave = displayBaseOctave.value + offset
      for (const noteName of WHITE_KEY_NAMES) {
        keys.push({ pitch: `${noteName}${octave}`, noteName, octave })
      }
    }
    return keys
  })

  const blackKeys = computed<BlackKeyboardKey[]>(() => {
    const keys: BlackKeyboardKey[] = []
    for (let offset = 0; offset < OCTAVE_COUNT; offset++) {
      const octave = displayBaseOctave.value + offset
      const octaveX = offset * OCTAVE_WIDTH
      for (const spec of BLACK_KEY_OFFSETS) {
        keys.push({
          pitch: `${spec.name}${octave}`,
          noteName: spec.name,
          octave,
          x: octaveX + spec.offset
        })
      }
    }
    return keys
  })

  const normalizedActivePitches = computed(() => new Set(toValue(activeVoicing).map((p) => normalizeEnharmonic(p))))

  const normalizedRootClass = computed(() => {
    const root = toValue(rootPitch)
    if (!root) return ''
    const match = root.match(/^([A-G][b#]?)/)
    return match ? normalizeEnharmonic(match[1]) : ''
  })

  /**
   * Falls back to pitch-class matching so a voicing that sits outside the rendered two-octave
   * window still lights its note names instead of leaving the keyboard apparently silent.
   */
  function isPitchActive(pitch: string): boolean {
    const normalized = normalizeEnharmonic(pitch)
    if (normalizedActivePitches.value.has(normalized)) return true
    const pitchClass = normalized.replace(/\d+$/, '')
    return Array.from(normalizedActivePitches.value).some((p) => p.replace(/\d+$/, '') === pitchClass)
  }

  function isRootPitch(pitch: string): boolean {
    return normalizeEnharmonic(pitch).replace(/\d+$/, '') === normalizedRootClass.value
  }

  function isInScale(pitch: string): boolean {
    return isNoteInScale(pitch, projectStore.key, projectStore.scale)
  }

  return { displayBaseOctave, whiteKeys, blackKeys, isPitchActive, isRootPitch, isInScale }
}
