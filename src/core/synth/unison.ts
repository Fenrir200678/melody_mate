export interface UnisonPosition {
  detuneCents: number
  pan: number
  gain: number
}

export function unisonPositions(count: number, spreadCents: number, panSpread: number): UnisonPosition[] {
  if (!Number.isInteger(count) || count < 1 || count > 4) throw new RangeError('Unison count must be 1–4')
  return Array.from({ length: count }, (_, index) => {
    const position = count === 1 ? 0 : (2 * index) / (count - 1) - 1
    return { detuneCents: position * spreadCents, pan: position * panSpread, gain: 1 / count }
  })
}
