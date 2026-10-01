import { ref } from 'vue'
import { chordNoteKey, parseChordNoteKey, type ChordEvent } from '@/core/schemas/chord.schema'
import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
import { resolveChordOverlaps, type DiatonicChord } from '@/core/theory/chord.engine'
import {
  cloneChords,
  moveChordsByBars,
  removeChordVoicingNoteAt,
  resizeChordByBars,
  transposeChordVoicings
} from '@/composables/pianoroll/chordOps'

interface HarmonyChordNoteSelectionOptions {
  getChords: () => ChordEvent[]
  setChords: (chords: ChordEvent[], recordHistory?: boolean) => void
  totalBars: () => number
  palette: () => DiatonicChord[]
  key: () => string
  scale: () => string
  selectedChordId: () => string | null
  removeChord: (id: string) => void
  auditionPitch?: (pitch: string) => void
  toggleMute?: () => void
  isScaleLocked?: () => boolean
}

export function useHarmonyChordNoteSelection(options: HarmonyChordNoteSelectionOptions) {
  const selectedChordNoteIds = ref<string[]>([])

  function validChordNoteKeys(): Set<string> {
    const valid = new Set<string>()
    for (const chord of options.getChords()) {
      for (let index = 0; index < chord.voicing.length; index++) valid.add(chordNoteKey(chord.id, index))
    }
    return valid
  }

  function pruneSelectedChordNoteIds(): void {
    const valid = validChordNoteKeys()
    selectedChordNoteIds.value = selectedChordNoteIds.value.filter((id) => valid.has(id))
  }

  function setSelectedChordNoteIds(ids: string[]): void {
    const valid = validChordNoteKeys()
    selectedChordNoteIds.value = ids.filter((id) => valid.has(id))
  }

  function clearSelection(): void {
    selectedChordNoteIds.value = []
  }

  function duplicateSelected(): void {
    const chords = options.getChords()
    const { clonedChords, newKeys } = cloneChords(chords, selectedChordNoteIds.value, options.totalBars())
    if (!clonedChords.length) return
    options.setChords(resolveChordOverlaps([...chords, ...clonedChords]))
    setSelectedChordNoteIds(newKeys)
  }

  function transposeSelected(semitones: number): void {
    const result = transposeChordVoicings(
      options.getChords(),
      selectedChordNoteIds.value,
      semitones,
      options.palette(),
      options.key(),
      options.scale(),
      { isScaleLocked: options.isScaleLocked?.() }
    )
    if (!result.hasChanged) return
    options.setChords(result.nextChords)
    setSelectedChordNoteIds(result.newSelectedKeys)
    if (result.singleTransposedPitch) {
      options.auditionPitch?.(result.singleTransposedPitch)
    }
  }

  function deleteSelected(): void {
    const keys = selectedChordNoteIds.value
    if (keys.length) {
      let next = options.getChords()
      const byId = new Map<string, number[]>()
      for (const key of keys) {
        const parsed = parseChordNoteKey(key)
        if (parsed) byId.set(parsed.chordId, [...(byId.get(parsed.chordId) ?? []), parsed.noteIndex])
      }
      for (const [chordId, indices] of byId) {
        for (const index of indices.sort((a, b) => b - a)) next = removeChordVoicingNoteAt(next, chordId, index)
      }
      options.setChords(next)
      clearSelection()
      return
    }
    const selectedChordId = options.selectedChordId()
    if (selectedChordId) options.removeChord(selectedChordId)
  }

  function getSortedVoicingNotes(): Array<{ key: string; chordId: string; noteIndex: number; pitch: string }> {
    const list: Array<{ key: string; chordId: string; noteIndex: number; pitch: string }> = []
    const sortedChords = [...options.getChords()].sort((a, b) => a.startBar - b.startBar)
    for (const chord of sortedChords) {
      for (let i = 0; i < chord.voicing.length; i++) {
        list.push({
          key: chordNoteKey(chord.id, i),
          chordId: chord.id,
          noteIndex: i,
          pitch: chord.voicing[i]
        })
      }
    }
    return list
  }

  function selectNextNote(): void {
    const allNotes = getSortedVoicingNotes()
    if (allNotes.length === 0) return

    const currentKey = selectedChordNoteIds.value[selectedChordNoteIds.value.length - 1]
    let nextIndex = 0
    if (currentKey) {
      const idx = allNotes.findIndex((n) => n.key === currentKey)
      if (idx !== -1) {
        nextIndex = Math.min(allNotes.length - 1, idx + 1)
      }
    }
    const target = allNotes[nextIndex]
    selectedChordNoteIds.value = [target.key]
    options.auditionPitch?.(target.pitch)
  }

  function selectPreviousNote(): void {
    const allNotes = getSortedVoicingNotes()
    if (allNotes.length === 0) return

    const currentKey = selectedChordNoteIds.value[0]
    let prevIndex = allNotes.length - 1
    if (currentKey) {
      const idx = allNotes.findIndex((n) => n.key === currentKey)
      if (idx !== -1) {
        prevIndex = Math.max(0, idx - 1)
      }
    }
    const target = allNotes[prevIndex]
    selectedChordNoteIds.value = [target.key]
    options.auditionPitch?.(target.pitch)
  }

  function getTargetChordIds(): string[] {
    const keys = selectedChordNoteIds.value
    if (keys.length > 0) {
      const set = new Set<string>()
      for (const key of keys) {
        const parsed = parseChordNoteKey(key)
        if (parsed) set.add(parsed.chordId)
      }
      return Array.from(set)
    }
    const sel = options.selectedChordId()
    return sel ? [sel] : []
  }

  function nudgeSelected(deltaSteps: number): void {
    if (deltaSteps === 0) return
    const chords = options.getChords()
    const targetChordIds = getTargetChordIds()
    if (targetChordIds.length === 0) return

    const deltaBars = deltaSteps / STEPS_PER_BAR
    const moved = moveChordsByBars(chords, targetChordIds, deltaBars, { totalBars: options.totalBars() })
    const resolved = resolveChordOverlaps(moved)
    options.setChords(resolved, true)
  }

  function adjustSelectedDuration(deltaSteps: number): void {
    if (deltaSteps === 0) return
    const chords = options.getChords()
    const targetChordIds = getTargetChordIds()
    if (targetChordIds.length === 0) return

    const deltaBars = deltaSteps / STEPS_PER_BAR
    let updated = chords
    for (const id of targetChordIds) {
      updated = resizeChordByBars(updated, id, deltaBars, { totalBars: options.totalBars() })
    }
    const resolved = resolveChordOverlaps(updated)
    options.setChords(resolved, true)
  }

  function adjustSelectedVelocity(_deltaVelocity: number): void {
    // Chord voicings do not store per-note velocity
  }

  function toggleSelectedMute(): void {
    options.toggleMute?.()
  }

  return {
    selectedChordNoteIds,
    pruneSelectedChordNoteIds,
    setSelectedChordNoteIds,
    clearSelection,
    duplicateSelected,
    transposeSelected,
    deleteSelected,
    selectNextNote,
    selectPreviousNote,
    nudgeSelected,
    adjustSelectedDuration,
    adjustSelectedVelocity,
    toggleSelectedMute
  }
}
