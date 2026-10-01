import type { AppNote } from '../schemas/note.schema'

/**
 * Snaps note positions to the nearest grid increment (snapStep) and ensures
 * that notes do not overlap on the same pitch.
 */
export function quantizeNotes(notes: AppNote[], snapStep: number): AppNote[] {
  if (notes.length === 0) return []

  const effectiveSnap = snapStep > 0 ? snapStep : 1

  // 1. Clone notes and snap their start steps (clamped to at least step 0)
  const snapped = notes.map((note) => ({
    ...note,
    step: Math.max(0, Math.round(note.step / effectiveSnap) * effectiveSnap)
  }))

  // 2. Group notes by pitch (MIDI) to resolve overlap per voice/pitch
  const pitchMap = new Map<number, typeof snapped>()
  for (const note of snapped) {
    const group = pitchMap.get(note.midi)
    if (group) {
      group.push(note)
    } else {
      pitchMap.set(note.midi, [note])
    }
  }

  const result: AppNote[] = []

  for (const group of pitchMap.values()) {
    // Sort notes chronologically; on ties prefer longer duration
    group.sort((a, b) => a.step - b.step || b.durationSteps - a.durationSteps)

    // Deduplicate identical start steps on same pitch: keep the note with longer duration
    const deduplicated: typeof snapped = []
    for (const note of group) {
      const last = deduplicated[deduplicated.length - 1]
      if (last && last.step === note.step) {
        if (note.durationSteps > last.durationSteps) {
          deduplicated[deduplicated.length - 1] = note
        }
      } else {
        deduplicated.push(note)
      }
    }

    // Truncate durations to prevent overlaps with next note on the same pitch
    for (let i = 0; i < deduplicated.length; i++) {
      const current = deduplicated[i]
      const next = deduplicated[i + 1]

      let durationSteps = Math.max(1, current.durationSteps)
      if (next) {
        const gap = next.step - current.step
        if (gap > 0 && current.step + durationSteps > next.step) {
          durationSteps = Math.max(1, gap)
        }
      }

      result.push({
        ...current,
        durationSteps
      })
    }
  }

  // Return all notes sorted chronologically, then by ascending pitch
  return result.sort((a, b) => a.step - b.step || a.midi - b.midi)
}
