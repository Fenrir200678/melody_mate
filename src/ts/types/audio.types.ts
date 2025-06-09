import { instrumentOptions } from '@/ts/const/audio.const'

export type LoopEvent = {
  time: number
  pitch: string
  duration: number | string
  velocity: number
  noteIndex: number
  loop: number
}

export type InstrumentKey = keyof typeof instrumentOptions
