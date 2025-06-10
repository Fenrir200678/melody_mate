import { instrumentOptions } from '@/ts/consts'

export type LoopEvent = {
  time: number
  pitch: string | null
  duration: number | string
  velocity: number
  noteIndex: number
  loop: number
}

export type InstrumentKey = keyof typeof instrumentOptions
