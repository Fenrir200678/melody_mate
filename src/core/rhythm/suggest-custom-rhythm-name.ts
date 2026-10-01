import type { CustomRhythmPattern } from '../schemas/custom-rhythm.schema'

/** Suggests a compact name from a custom pattern's density and rhythmic placement. */
export function suggestCustomRhythmName(pattern: CustomRhythmPattern, existingNames: readonly string[] = []): string {
  const hitCount = pattern.events.length
  const barLabel = pattern.bars === 1 ? '1 bar' : `${pattern.bars} bars`
  if (hitCount === 0) return availableName(`Open Space (${barLabel})`, existingNames)

  const sixteenthHits = pattern.events.filter((event) => event.step % 2 === 1).length
  const offbeatHits = pattern.events.filter((event) => event.step % 4 === 2).length
  const beatHits = hitCount - sixteenthHits - offbeatHits
  const beatShare = beatHits / hitCount
  const offbeatShare = offbeatHits / hitCount
  const sixteenthShare = sixteenthHits / hitCount
  const density = hitCount / (pattern.bars * 16)

  let feel: string
  if (sixteenthShare >= 0.3) feel = 'Sixteenth Drive'
  else if (offbeatShare >= 0.4) feel = 'Offbeat Groove'
  else if (beatShare >= 0.75 && density >= 0.25) feel = 'Driving Pulse'
  else if (beatShare >= 0.6) feel = 'Steady Pulse'
  else if (density < 0.2) feel = 'Sparse Syncopation'
  else feel = 'Syncopated Groove'

  return availableName(`${hitCount}-hit ${feel} (${barLabel})`, existingNames)
}

function availableName(baseName: string, existingNames: readonly string[]): string {
  const used = new Set(existingNames.map((name) => name.toLowerCase()))
  if (!used.has(baseName.toLowerCase())) return baseName
  let number = 2
  while (used.has(`${baseName} ${number}`.toLowerCase())) number++
  return `${baseName} ${number}`
}
