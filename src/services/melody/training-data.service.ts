import type { AppScale } from '@/ts/models'
import { motifs } from '@/data/motifs'
import { Chord, Note, Scale } from 'tonal'

/**
 * Service for creating training data for Markov chain melody generation.
 */

/**
 * Creates training data for the Markov chain.
 * @param scale - The scale object to create training data from.
 * @param useMotifs - Flag to indicate whether to use motifs for training.
 * @returns Array of sequences for training.
 */
export function createTrainingData(scale: AppScale, useMotifs = false): string[][] {
  const sequences: string[][] = []
  const { name } = scale
  const nameParts = name.split(' ')
  const key = nameParts[0]
  const type = nameParts.slice(1).join(' ')

  // Skalen- und Akkordnoten mit tonal.js holen
  const scaleNotes = Scale.get(name).notes.map((n) => Note.pitchClass(n))
  const tonic = scaleNotes[0]
  const dominant = scaleNotes[4] // 5. Stufe
  const leadingTone = scaleNotes[scaleNotes.length - 1]

  // 1. Ascending und Descending Scale (mit Auflösung auf Tonic)
  if (scaleNotes.length >= 5) {
    sequences.push([...scaleNotes, tonic])
    sequences.push([[...scaleNotes].reverse(), tonic].flat())

    // 2. Arpeggios (1-3-5) auf- und absteigend
    const chordType = type.toLowerCase().includes('minor') ? 'm' : 'M'
    const triadNotes = Chord.get(key + chordType).notes.map((n) => Note.pitchClass(n))
    if (triadNotes.length > 0) {
      sequences.push([...triadNotes, tonic])
      sequences.push([[...triadNotes].reverse(), tonic].flat())
    }

    // 3. Turn patterns (z.B. upper turn auf der zweiten Stufe)
    if (scaleNotes.length > 2) {
      const upperTurnOnSecond = [scaleNotes[1], scaleNotes[2], scaleNotes[1], scaleNotes[0], scaleNotes[1]]
      sequences.push(upperTurnOnSecond)
    }

    // 4. V-I Kadenz (5-1 und 7-1)
    sequences.push([dominant, tonic])
    sequences.push([leadingTone, tonic])

    // 5. Stepwise fragments
    for (let i = 0; i < scaleNotes.length - 2; i++) {
      sequences.push([scaleNotes[i], scaleNotes[i + 1], scaleNotes[i + 2]])
      sequences.push([scaleNotes[i + 2], scaleNotes[i + 1], scaleNotes[i]])
    }

    // 6. Betonung der Dominante
    sequences.push([tonic, dominant, tonic])
  }

  // 2. Motive aus motifs, falls gewünscht
  if (useMotifs) {
    const stripOctave = (pitch: string): string => Note.pitchClass(pitch)
    motifs.forEach((motif) => {
      sequences.push(motif.notes.map(stripOctave))
    })
  }

  return sequences
}
