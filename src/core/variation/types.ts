export interface MutationAxes {
  rhythm: boolean
  pitch: boolean
  ornament: boolean
  simplify: boolean
}

export type TransformOp =
  | 'invert'
  | 'reverse'
  | 'one-up'
  | 'one-down'
  | 'double'
  | 'halve'
  | 'octave-up'
  | 'octave-down'
  | 'displace-forward'
  | 'displace-back'

export interface VariationContext {
  key: string
  scale: string
  minOctave: number
  maxOctave: number
  snapStep: number
  regionStartStep: number
  regionEndStep: number
}
