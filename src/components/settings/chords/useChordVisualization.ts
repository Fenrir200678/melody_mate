import type { Chord } from '@/ts/models/Chord'

/**
 * Determines the chord quality from chord name
 */
export function getChordQuality(chordName: string): string {
  if (chordName.includes('dim')) return 'dim'
  if (chordName.includes('aug')) return 'aug'
  if (chordName.includes('m') && !chordName.includes('maj')) return 'm'
  return 'M' // default to major
}

/**
 * Gets the root note from chord name
 */
export function getChordRoot(chordName: string): string {
  // Extract the root note (first part before any modifiers)
  const match = chordName.match(/^([A-G][#b]?)/)
  return match ? match[1] : chordName.charAt(0)
}

/**
 * Gets the color class based on chord quality
 */
export function getChordQualityColor(quality: string): string {
  switch (quality) {
    case 'M':
      return 'bg-emerald-600 border-emerald-400' // Major - bright green
    case 'm':
      return 'bg-blue-600 border-blue-400' // Minor - blue
    case 'dim':
      return 'bg-red-600 border-red-400' // Diminished - red
    case 'aug':
      return 'bg-purple-600 border-purple-400' // Augmented - purple
    default:
      return 'bg-gray-600 border-gray-400' // Default
  }
}

/**
 * Gets the harmonic function color based on Roman numeral analysis
 */
export function getHarmonicFunctionColor(chordName: string, key: string): string {
  const root = getChordRoot(chordName)
  const quality = getChordQuality(chordName)

  // Simple tonic/subdominant/dominant classification
  // This is a simplified version - could be enhanced with more theory
  if (root === key) {
    return 'bg-green-600 border-green-400' // Tonic
  }

  // In C major: IV (F) or ii (Dm) = Subdominant function
  if (chordName.includes('F') || (chordName.includes('D') && quality === 'm')) {
    return 'bg-yellow-600 border-yellow-400' // Subdominant
  }

  // V (G) or vii° = Dominant function
  if (chordName.includes('G') || quality === 'dim') {
    return 'bg-orange-600 border-orange-400' // Dominant
  }

  return getChordQualityColor(quality) // Fallback to quality color
}

/**
 * Gets a musical symbol for the chord quality
 */
export function getChordSymbol(quality: string): string {
  switch (quality) {
    case 'M':
      return '△' // Triangle for major
    case 'm':
      return '◯' // Circle for minor
    case 'dim':
      return '◐' // Half circle for diminished
    case 'aug':
      return '◆' // Diamond for augmented
    default:
      return '♪' // Generic music note
  }
}

/**
 * Gets Roman numeral representation (simplified)
 */
export function getRomanNumeral(chordName: string): string {
  // This is a simplified version - in a real app you'd want more sophisticated analysis
  const root = getChordRoot(chordName)
  const quality = getChordQuality(chordName)

  // Scale degrees mapping (simplified for major scale)
  const scaleMapping: { [key: string]: string } = {
    C: 'I',
    D: 'II',
    E: 'III',
    F: 'IV',
    G: 'V',
    A: 'VI',
    B: 'VII'
  }

  let roman = scaleMapping[root] || '?'

  // Convert to lowercase for minor chords
  if (quality === 'm' || quality === 'dim') {
    roman = roman.toLowerCase()
  }

  // Add symbol for diminished
  if (quality === 'dim') {
    roman += '°'
  }

  return roman
}

/**
 * Gets tooltip information for a chord
 */
export function getChordTooltipInfo(chord: Chord): string {
  const quality = getChordQuality(chord.name)
  const qualityName =
    {
      M: 'Major',
      m: 'Minor',
      dim: 'Diminished',
      aug: 'Augmented'
    }[quality] || 'Unknown'

  return `${chord.name} (${qualityName})\nNotes: ${chord.notes.join(', ')}`
}
