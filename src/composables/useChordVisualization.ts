import { Chord, Progression, Key } from 'tonal'
import type { Chord as ChordType } from '@/ts/models/Chord'

/**
 * Composable for chord visualization utilities using tonal.js
 */
export function useChordVisualization() {
  /**
   * Creates a compact chord name (e.g., "Fm" instead of "F minor")
   */
  function getCompactChordName(chordName: string): string {
    // First try to get info from tonal.js
    const chordInfo = Chord.get(chordName)

    if (!chordInfo.empty && chordInfo.tonic && chordInfo.type) {
      const tonic = chordInfo.tonic
      const type = chordInfo.type.toLowerCase()

      // Handle major chords - they should have no suffix
      if (type === 'major') {
        return tonic
      }

      // Map other chord types to compact notation
      const typeMap: { [key: string]: string } = {
        minor: 'm',
        diminished: 'dim',
        augmented: 'aug',
        'major seventh': 'maj7',
        'minor seventh': 'm7',
        'dominant seventh': '7',
        'minor seventh flat five': 'm7b5',
        'diminished seventh': 'dim7',
        'major sixth': '6',
        'minor sixth': 'm6',
        'suspended second': 'sus2',
        'suspended fourth': 'sus4',
        'add nine': 'add9',
        'major ninth': 'maj9',
        'minor ninth': 'm9',
        ninth: '9'
      }

      const compactType = typeMap[type] || ''
      return `${tonic}${compactType}`
    }

    // Fallback: Try to convert manually from the original name
    // Handle common patterns from tonal.js output
    let result = chordName

    // Remove common long forms and replace with short forms
    result = result
      .replace(/\s+major$/, '') // "C major" → "C"
      .replace(/\s+minor$/, 'm') // "F minor" → "Fm"
      .replace(/\s+diminished$/, 'dim') // "G diminished" → "Gdim"
      .replace(/\s+augmented$/, 'aug') // "C augmented" → "Caug"
      .replace(/\s+major\s+seventh$/, 'maj7') // "C major seventh" → "Cmaj7"
      .replace(/\s+minor\s+seventh$/, 'm7') // "F minor seventh" → "Fm7"
      .replace(/\s+dominant\s+seventh$/, '7') // "G dominant seventh" → "G7"

    return result
  }

  /**
   * Determines the chord quality using tonal.js
   */
  function getChordQuality(chordName: string): string {
    const chordInfo = Chord.get(chordName)
    if (chordInfo.empty) {
      // Fallback for unrecognized chords
      if (chordName.includes('dim')) return 'dim'
      if (chordName.includes('aug')) return 'aug'
      if (chordName.includes('m') && !chordName.includes('maj')) return 'm'
      return 'M'
    }

    // Map tonal.js quality to our simplified system
    const quality = chordInfo.quality?.toLowerCase() || ''
    if (quality.includes('minor')) return 'm'
    if (quality.includes('diminished')) return 'dim'
    if (quality.includes('augmented')) return 'aug'
    return 'M' // Major is default
  }

  /**
   * Gets the root note from chord name using tonal.js
   */
  function getChordRoot(chordName: string): string {
    const chordInfo = Chord.get(chordName)
    return chordInfo.tonic || chordName.charAt(0)
  }

  /**
   * Gets the color class based on chord quality
   */
  function getChordQualityColor(quality: string): string {
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
   * Gets the harmonic function color using tonal.js Key analysis
   */
  function getHarmonicFunctionColor(chordName: string, key: string): string {
    try {
      // Get the major key analysis
      const keyInfo = Key.majorKey(key)

      // Find the chord in the key's chord progression
      const chordIndex = keyInfo.chords.findIndex(
        (chord) =>
          chord.replace(/maj7|7|m7|m7b5/g, '').toLowerCase() === chordName.replace(/maj7|7|m7|m7b5/g, '').toLowerCase()
      )

      if (chordIndex !== -1) {
        const harmonicFunction = keyInfo.chordsHarmonicFunction[chordIndex]
        switch (harmonicFunction) {
          case 'T':
            return 'bg-green-600 border-green-400' // Tonic
          case 'SD':
            return 'bg-yellow-600 border-yellow-400' // Subdominant
          case 'D':
            return 'bg-orange-600 border-orange-400' // Dominant
          default:
            break
        }
      }
    } catch (error) {
      console.warn('Error analyzing harmonic function:', error)
    }

    // Fallback to quality color
    const quality = getChordQuality(chordName)
    return getChordQualityColor(quality)
  }

  /**
   * Gets a musical symbol for the chord quality
   */
  function getChordSymbol(quality: string): string {
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
   * Gets Roman numeral representation using tonal.js
   */
  function getRomanNumeral(chordName: string, key: string = 'C'): string {
    try {
      // Use tonal.js to convert chord to Roman numeral
      const romanNumerals = Progression.toRomanNumerals(key, [chordName])
      return romanNumerals[0] || '?'
    } catch (error) {
      console.warn('Error converting to Roman numeral:', error)

      // Fallback to simplified analysis
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
  }

  /**
   * Gets detailed chord information using tonal.js
   */
  function getChordInfo(chordName: string) {
    const chordInfo = Chord.get(chordName)
    return {
      name: chordInfo.name || chordName,
      tonic: chordInfo.tonic || getChordRoot(chordName),
      quality: chordInfo.quality || 'Unknown',
      notes: chordInfo.notes || [],
      intervals: chordInfo.intervals || [],
      type: chordInfo.type || 'unknown',
      aliases: chordInfo.aliases || []
    }
  }

  /**
   * Gets tooltip information for a chord using enhanced tonal.js data
   */
  function getChordTooltipInfo(chord: ChordType): string {
    const chordInfo = getChordInfo(chord.name)
    const quality = getChordQuality(chord.name)
    const qualityName =
      {
        M: 'Major',
        m: 'Minor',
        dim: 'Diminished',
        aug: 'Augmented'
      }[quality] || 'Unknown'

    const intervals = chordInfo.intervals.length > 0 ? `\nIntervals: ${chordInfo.intervals.join(', ')}` : ''

    return `${chord.name} (${qualityName})${intervals}\nNotes: ${chord.notes.join(', ')}`
  }

  /**
   * Detects alternative chord names for the same notes
   */
  function getAlternativeChordNames(notes: string[]): string[] {
    try {
      return Chord.detect(notes)
    } catch (error) {
      console.warn('Error detecting alternative chord names:', error)
      return []
    }
  }

  /**
   * Gets chord scales that work with the given chord
   */
  function getChordScales(chordName: string): string[] {
    try {
      return Chord.chordScales(chordName)
    } catch (error) {
      console.warn('Error getting chord scales:', error)
      return []
    }
  }

  return {
    getCompactChordName,
    getChordQuality,
    getChordRoot,
    getChordQualityColor,
    getHarmonicFunctionColor,
    getChordSymbol,
    getRomanNumeral,
    getChordTooltipInfo,
    getChordInfo,
    getAlternativeChordNames,
    getChordScales
  }
}
