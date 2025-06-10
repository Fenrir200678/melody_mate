import type { Motif, Snippet } from '@/ts/models'

export const motifs: Motif[] = [
  {
    name: 'Beethoven 5. Sinfonie Schicksalsmotiv',
    notes: ['G4', 'G4', 'G4', 'Eb4']
  },
  {
    name: 'Für Elise Hauptmotiv',
    notes: ['E5', 'D#5', 'E5', 'D#5', 'E5', 'B4', 'D5', 'C5']
  },
  {
    name: 'BACH-Kryptogramm',
    notes: ['A#4', 'A4', 'C5', 'B4'] // German notation: B, A, C, H
  },
  {
    name: 'AC/DC Whole Lotta Rosie Riff',
    notes: ['A4', 'C5', 'A4', 'D5', 'A4', 'C5', 'A4']
  },
  {
    name: 'Schumann Abegg Motiv',
    notes: ['A4', 'B4', 'E4', 'G4', 'G4'] // A-B-E-G-G
  },
  {
    name: 'Twinkle Twinkle Little Star',
    notes: ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4']
  },
  {
    name: 'Ode to Joy (Beethoven)',
    notes: ['E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4']
  },
  {
    name: 'Happy Birthday Phrase',
    notes: ['G4', 'G4', 'A4', 'G4', 'C5', 'B4']
  }
]

export const snippets: Snippet[] = [
  {
    title: 'Beethoven 5. Sinfonie, 1. Satz (0:00–0:02)',
    notes: ['G4', 'G4', 'G4', 'Eb4']
  },
  {
    title: 'Für Elise, A-Teil Takt 1–2',
    notes: ['E5', 'D#5', 'E5', 'D#5', 'E5', 'B4', 'D5', 'C5']
  },
  {
    title: 'Twinkle Twinkle Little Star, Takt 1',
    notes: ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4']
  },
  {
    title: 'Happy Birthday, Takt 1–2',
    notes: [
      ['G4', 'G4', 'A4', 'G4', 'C5', 'B4'],
      ['G4', 'G4', 'A4', 'G4', 'D5', 'C5']
    ]
  },
  {
    title: 'Ode to Joy, Takt 1',
    notes: ['E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4']
  }
]
