import { z } from 'zod'
import { chordNameFor, getChordNotes, type ChordMode, type DiatonicChord } from '@/core/theory/chord.engine'

export const CHORD_PALETTE_MIME = 'application/x-melodymate-chord'

const noteNames = z.array(z.string().min(1)).min(1)
const chordVariant = z.object({ name: z.string().min(1), notes: noteNames, roman: z.string().min(1) })
const payloadSchema = z.object({
  mode: z.enum(['triad', 'seventh']),
  chord: z.object({
    degree: z.number().int().positive(),
    roman: z.string().min(1),
    romanSeventh: z.string().min(1),
    triadName: z.string().min(1),
    triadNotes: noteNames,
    seventhName: z.string().min(1),
    seventhNotes: noteNames,
    triad: chordVariant,
    seventh: chordVariant
  })
})

export function isChordPaletteDrag(transfer: Pick<DataTransfer, 'types'> | null): boolean {
  return transfer?.types.includes(CHORD_PALETTE_MIME) ?? false
}

export function startChordPaletteDrag(event: DragEvent, chord: DiatonicChord, mode: ChordMode): void {
  if (!event.dataTransfer) return
  event.dataTransfer.setData(CHORD_PALETTE_MIME, JSON.stringify({ chord, mode }))
  event.dataTransfer.effectAllowed = 'copy'
}

export function readChordPaletteDrag(transfer: Pick<DataTransfer, 'types' | 'getData'> | null) {
  if (!isChordPaletteDrag(transfer) || !transfer) return null
  try {
    const result = payloadSchema.safeParse(JSON.parse(transfer.getData(CHORD_PALETTE_MIME)))
    if (!result.success || getChordNotes(chordNameFor(result.data.chord, result.data.mode)).length === 0) return null
    const { chord, mode } = result.data
    const triadNotes = getChordNotes(chord.triadName)
    const seventhNotes = getChordNotes(chord.seventhName)
    return {
      mode,
      chord: {
        ...chord,
        triadNotes,
        seventhNotes,
        triad: { name: chord.triadName, notes: triadNotes, roman: chord.roman },
        seventh: { name: chord.seventhName, notes: seventhNotes, roman: chord.romanSeventh }
      }
    }
  } catch {
    return null
  }
}
