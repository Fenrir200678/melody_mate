import { toValue } from 'vue'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import { chordNoteKey, parseChordNoteKey, remapChordNoteSelection } from '@/core/schemas/chord.schema'
import { deriveChordIdentity } from '@/core/theory/chord.engine'
import { midiToPitch, pitchToMidi } from '@/core/theory/scale.engine'
import { addChordVoicingNote, finalizeChords, removeChordVoicingNoteAt } from './chordOps'
import type { PianoRollInteractionContext } from './interactionContext'

/**
 * Store-facing chord editing commands: identity re-derivation, commits, voicing-note
 * add/remove and chord-note selection. Pointer gesture plumbing lives in
 * ./useChordGestures; these helpers keep it free of mutation bookkeeping.
 */
export function useChordEditing(ctx: PianoRollInteractionContext) {
  const { options } = ctx

  /**
   * Re-derives name/roman/pitch-class identity for every chord whose voicing changed
   * relative to `originals`, keeping `notes` (generator contract) in sync with `voicing`.
   */
  function renameModifiedChords(chords: ChordEvent[], originals: ChordEvent[]): ChordEvent[] {
    const originalMap = new Map(originals.map((c) => [c.id, c.voicing.join('|')]))
    return chords.map((c) => {
      const key = c.voicing.join('|')
      if (originalMap.get(c.id) === key) return c
      const identity = deriveChordIdentity(
        c.voicing,
        ctx.currentPalette(),
        toValue(options.rootKey),
        toValue(options.scale)
      )
      return { ...c, ...identity }
    })
  }

  function commitChords(nextChords: ChordEvent[], originals: ChordEvent[]): void {
    options.onUpdateChords?.(finalizeChords(renameModifiedChords(nextChords, originals)))
  }

  function removeChordAndCommit(chords: ChordEvent[], chordId: string): void {
    commitChords(
      chords.filter((c) => c.id !== chordId),
      chords
    )
  }

  /**
   * Removes one voicing note and commits while keeping index-based selection keys intact:
   * the removed key is dropped and higher indices of that chord shift down one.
   */
  function removeChordNoteAndCommit(chords: ChordEvent[], chordId: string, noteIndex: number): void {
    commitChords(removeChordVoicingNoteAt(chords, chordId, noteIndex), chords)
    const selected = toValue(options.selectedChordNoteIds) ?? []
    options.onUpdateSelectedChordNoteIds?.(remapChordNoteSelection(chordId, noteIndex, selected))
  }

  /**
   * Appends a voicing note and selects it, resolving its index in the re-sorted voicing
   * so the index-based selection key stays valid.
   */
  function addChordNoteAndCommit(chords: ChordEvent[], chordId: string, midi: number): void {
    const pitch = midiToPitch(midi)
    const next = addChordVoicingNote(chords, chordId, pitch)
    commitChords(next, chords)

    const updated = next.find((c) => c.id === chordId)
    if (!updated) return

    const newIdx = updated.voicing.findIndex((p) => pitchToMidi(p) === midi)
    options.onUpdateSelectedChordNoteIds?.([
      chordNoteKey(updated.id, newIdx >= 0 ? newIdx : updated.voicing.length - 1)
    ])
  }

  /**
   * Toggles a voicing note at a pitch position on an existing chord: present -> removed,
   * absent -> appended. Shared by the pencil tool and double-click.
   */
  function toggleChordNoteAtMidi(chords: ChordEvent[], chord: ChordEvent, midi: number): void {
    const existingNoteIndex = chord.voicing.findIndex((p) => pitchToMidi(p) === midi)
    if (existingNoteIndex !== -1) {
      removeChordNoteAndCommit(chords, chord.id, existingNoteIndex)
      return
    }
    addChordNoteAndCommit(chords, chord.id, midi)
  }

  function selectedChordIds(): Set<string> {
    const ids = new Set<string>()
    for (const key of toValue(options.selectedChordNoteIds) ?? []) {
      const parsed = parseChordNoteKey(key)
      if (parsed) ids.add(parsed.chordId)
    }
    return ids
  }

  function selectChordNoteKey(key: string, isShift: boolean): void {
    const selected = toValue(options.selectedChordNoteIds) ?? []
    options.onUpdateSelectedChordNoteIds?.(
      isShift ? (selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]) : [key]
    )
  }

  function selectAllChordNotes(chord: ChordEvent): void {
    options.onUpdateSelectedChordNoteIds?.(chord.voicing.map((_, i) => chordNoteKey(chord.id, i)))
  }

  return {
    addChordNoteAndCommit,
    commitChords,
    removeChordAndCommit,
    removeChordNoteAndCommit,
    selectedChordIds,
    selectAllChordNotes,
    selectChordNoteKey,
    toggleChordNoteAtMidi
  }
}
