import { convertTicksToNotation } from '@/utils/duration'

// Helper function to extract octave from pitch
export function getOctave(pitch: string | null): number {
  if (!pitch) return 0
  const match = pitch.match(/(\d+)$/)
  return match ? parseInt(match[1]) : 4
}

// Helper function to get color class based on octave
export function getOctaveColor(octave: number): string {
  const colors = {
    0: 'bg-gray-500',
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-yellow-500',
    4: 'bg-green-500',
    5: 'bg-blue-500',
    6: 'bg-indigo-500',
    7: 'bg-purple-500',
    8: 'bg-pink-500'
  }
  return colors[octave as keyof typeof colors] || 'bg-gray-500'
}

// Helper function to get note name without octave
export function getNoteName(pitch: string | null): string {
  if (!pitch) return 'rest'
  return pitch.replace(/\d+$/, '')
}

// Helper function to convert velocity to opacity
export function getVelocityOpacity(velocity: number): number {
  return Math.max(0.5, velocity / 127) // Min opacity 0.5, max 1.0
}

// Helper function to get music symbol based on duration
export function getMusicSymbol(duration: string): { symbol: string; isDotted: boolean } {
  const notation = convertTicksToNotation(duration)

  const symbolMap: Record<string, { symbol: string; isDotted: boolean }> = {
    '1n': { symbol: '𝅝', isDotted: false }, // Whole note
    '2n.': { symbol: '𝅗𝅥', isDotted: true }, // Dotted half note
    '2n': { symbol: '𝅗𝅥', isDotted: false }, // Half note
    '4n.': { symbol: '♩', isDotted: true }, // Dotted quarter note
    '4n': { symbol: '♩', isDotted: false }, // Quarter note
    '8n.': { symbol: '♪', isDotted: true }, // Dotted eighth note
    '8n': { symbol: '♪', isDotted: false }, // Eighth note
    '16n.': { symbol: '♬', isDotted: true }, // Dotted sixteenth note
    '16n': { symbol: '♬', isDotted: false }, // Sixteenth note
    '32n': { symbol: '♬', isDotted: false }, // Thirty-second note
    '64n': { symbol: '♬', isDotted: false } // Sixty-fourth note
  }

  return symbolMap[notation] || { symbol: '♩', isDotted: false }
}
