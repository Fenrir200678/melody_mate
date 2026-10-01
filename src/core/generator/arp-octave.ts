import type { ArpOctaveMode } from '../schemas/generator.schema'
import type { ArpeggioPattern } from './arp-pattern'

export function arpPatternCycleLength(pattern: ArpeggioPattern, pitchCount: number): number {
  if (pattern === 'chord-rhythm') return 1
  if (['up-down', 'down-up', 'pedal-bass', 'pinky-top'].includes(pattern)) {
    return Math.max(1, 2 * (pitchCount - 1))
  }
  // Random and Brown have no closed contour; one pass lasts as many notes as the chord has tones.
  return Math.max(1, pitchCount)
}

export function arpOctaveIndex(mode: ArpOctaveMode, octaveCount: number, position: number): number {
  if (octaveCount <= 1) return 0
  if (mode === 'up') return position % octaveCount
  if (mode === 'down') return octaveCount - 1 - (position % octaveCount)
  // Pendulum travel omits repeated endpoints so each octave receives exactly one cycle at the turn.
  const period = 2 * (octaveCount - 1)
  const offset = position % period
  return offset < octaveCount ? offset : period - offset
}

export function arpOctavePool(
  registerPool: number[],
  mode: ArpOctaveMode,
  pattern: ArpeggioPattern,
  position: number
): { pool: number[]; cycleLength: number } {
  const firstOctave = Math.floor(registerPool[0] / 12)
  const lastOctave = Math.floor(registerPool[registerPool.length - 1] / 12)
  const pitchCount = registerPool.filter((midi) => Math.floor(midi / 12) === firstOctave).length
  const cycleLength = arpPatternCycleLength(pattern, pitchCount)
  const octavePosition = mode === 'zigzag' ? position : Math.floor(position / cycleLength)
  const octave = firstOctave + arpOctaveIndex(mode, lastOctave - firstOctave + 1, octavePosition)
  return { pool: registerPool.filter((midi) => Math.floor(midi / 12) === octave), cycleLength }
}
