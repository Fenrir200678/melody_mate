export interface MidiQueueTiming {
  horizonMs: number
  pumpIntervalMs: number
  lateOnThresholdMs: number
  cancelGuardMs: number
}

export interface MidiQueueClock {
  nowMs: number
  running: boolean
  epoch: number
}

export interface MidiQueueEnvironment {
  clockOwner: object
  readClock(): MidiQueueClock
  wakeup(callback: () => void, intervalMs: number): () => void
}
