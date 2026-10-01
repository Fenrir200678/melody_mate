export interface PhraseRestOnset {
  step: number
  durationSteps: number
}

/** Thins generated onsets while keeping phrase entries, strong beats, and a cadence. */
export function applyPhraseRests<T extends PhraseRestOnset>(
  onsets: T[],
  restProbability: number,
  stepsPerBar: number,
  rng: () => number
): T[] {
  if (onsets.length === 0 || restProbability <= 0 || stepsPerBar <= 0) {
    return [...onsets]
  }

  const sorted = [...onsets].sort((a, b) => a.step - b.step)
  const minimumPerBar = 2
  const beatSteps = stepsPerBar / 4
  const kept = new Set<T>()
  const byBar = new Map<number, T[]>()

  for (const onset of sorted) {
    const bar = Math.floor(onset.step / stepsPerBar)
    const barOnsets = byBar.get(bar) ?? []
    barOnsets.push(onset)
    byBar.set(bar, barOnsets)
  }

  const finalOnset = sorted[sorted.length - 1]
  kept.add(finalOnset)

  for (const [bar, barOnsets] of byBar) {
    const required = new Set<T>()
    required.add(barOnsets[0])
    if (barOnsets.includes(finalOnset)) required.add(finalOnset)

    // The bar downbeat and midpoint anchor the rhythm when those onsets exist.
    for (const onset of barOnsets) {
      const positionInBar = onset.step - bar * stepsPerBar
      if (positionInBar === 0 || (beatSteps > 0 && positionInBar % (2 * beatSteps) === 0)) {
        required.add(onset)
      }
    }

    const minimum = Math.min(minimumPerBar, barOnsets.length)
    for (const onset of required) kept.add(onset)

    let keptCount = required.size
    for (const onset of barOnsets) {
      if (required.has(onset)) {
        kept.add(onset)
        continue
      }

      if (keptCount < minimum || rng() >= restProbability) {
        kept.add(onset)
        keptCount += 1
      }
    }
  }

  return onsets.filter((onset) => kept.has(onset))
}
