import { ChordEventSchema, type ChordEvent } from '@/core/schemas/chord.schema'
import {
  buildChordVoicing,
  chordNameFor,
  chordNotesFor,
  chordRomanFor,
  type ChordMode
} from '@/core/theory/chord.engine'
import type { DiatonicChord } from '@/core/theory/chord.engine'
import { findProgressionGaps } from '@/core/theory/progression-gaps'
import { useAudioStore } from '@/stores/audio.store'
import { useHarmonyStore } from '@/stores/harmony.store'
import { useProgressionLayout } from './useProgressionLayout'

/**
 * Single source of truth for turning a palette entry into a timeline chord.
 * Palette clicks, the empty-state tonic button and the ghost slot all append through here,
 * so voicing, register and project-length growth can no longer drift apart between them.
 */
export function useChordInsertion() {
  const harmonyStore = useHarmonyStore()
  const audioStore = useAudioStore()
  const { endBar, syncProjectBars } = useProgressionLayout()

  function createChordEvent(
    chord: DiatonicChord,
    mode: ChordMode,
    startBar: number,
    durationBars = harmonyStore.defaultChordDuration
  ): ChordEvent {
    const name = chordNameFor(chord, mode)
    return ChordEventSchema.parse({
      id: crypto.randomUUID(),
      name,
      roman: chordRomanFor(chord, mode),
      notes: [...chordNotesFor(chord, mode)],
      voicing: buildChordVoicing(name, harmonyStore.chordRegister, 0, harmonyStore.voicingStyle),
      startBar,
      durationBars,
      inversion: 0
    })
  }

  function insertChordAt(
    chord: DiatonicChord,
    mode: ChordMode,
    startBar: number,
    durationBars?: number,
    options: { preserveExisting?: boolean } = {}
  ): ChordEvent {
    const added = harmonyStore.addChord(createChordEvent(chord, mode, startBar, durationBars), options)
    audioStore.auditionChord(added.voicing)
    syncProjectBars()
    return added
  }

  /** Appends after the last chord, honouring any overlap resolution the store applied. */
  function appendChord(chord: DiatonicChord, mode: ChordMode): ChordEvent {
    return insertChordAt(chord, mode, endBar.value)
  }

  /** Inserts into the first available progression gap, or appends at the end if no gap exists. */
  function insertInNextFreeSlot(chord: DiatonicChord, mode: ChordMode): ChordEvent {
    const gaps = findProgressionGaps(harmonyStore.chords)
    if (gaps.length > 0) {
      const firstGap = gaps[0]
      const durationBars = Math.min(harmonyStore.defaultChordDuration, firstGap.durationBars)
      return insertChordAt(chord, mode, firstGap.startBar, durationBars, { preserveExisting: true })
    }
    return appendChord(chord, mode)
  }

  return { createChordEvent, insertChordAt, appendChord, insertInNextFreeSlot }
}
