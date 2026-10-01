import type { MutationAxes, VariationContext } from '../variation'
import type { MotifSection, MotifSectionRole } from './motif-sections'

export function resolveSectionVariation(
  role: MotifSectionRole,
  intensity: number,
  options: { rhythmLocked: boolean }
): { axes: MutationAxes; strength: number } {
  const axes: MutationAxes = { rhythm: false, pitch: false, ornament: false, simplify: false }
  if (role === 'source') return { axes, strength: 0 }
  axes.pitch = true
  if (!options.rhythmLocked) {
    axes.rhythm = role === 'repeat'
    // Contrast is pitch-first: the opening groove carries the hook. Ornaments grow
    // continuously with strength through mutateNotes' internal half-strength rate.
    axes.ornament = role === 'contrast'
  }
  // Cap repeats to preserve recognition; the contrast floor keeps form meaningful
  // even at zero intensity rather than collapsing every pattern into literal copies.
  const strength = role === 'repeat' ? 0.6 * intensity : 0.25 + 0.75 * intensity
  return { axes, strength }
}

export function buildSectionVariationContext(
  section: MotifSection,
  root: string,
  scaleName: string,
  minOctave: number,
  maxOctave: number,
  stepsPerBar: number
): VariationContext {
  return {
    key: root,
    scale: scaleName,
    minOctave,
    maxOctave,
    // A fixed eighth-note grid keeps musical output independent of viewport zoom.
    snapStep: Math.max(1, Math.round(stepsPerBar / 8)),
    regionStartStep: section.startStep,
    regionEndStep: section.endStep
  }
}
