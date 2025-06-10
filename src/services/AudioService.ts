import type { Melody } from '@/ts/models'
import type { InstrumentKey, LoopEvent } from '@/ts/types/audio.types'
import * as Tone from 'tone'

let synth: Tone.PolySynth | null = null
let part: Tone.Part | null = null
let currentInstrumentKey: InstrumentKey | null = null
let stepUpdateCallback: ((stepIndex: number) => void) | null = null
let notePlayCallback: ((stepIndex: number) => void) | null = null

/**
 * Converts a duration from a custom tick format (e.g., 'T160') to a format Tone.js understands.
 * For 'T<ticks>', it calculates the duration in seconds based on the BPM.
 * Standard notations like '4n' are passed through.
 * @param duration The duration string from the melody object.
 * @param bpm The current tempo.
 * @returns The duration as seconds (number) or a standard time notation (string).
 */
function convertDurationToToneJsTime(duration: string, bpm: number): number | string {
  if (duration.startsWith('T')) {
    const ticks = parseInt(duration.substring(1), 10)
    if (isNaN(ticks)) {
      return '8n' // Fallback for invalid format
    }
    // Standard is 128 ticks per quarter note (TPQN).
    const secondsPerQuarter = 60 / bpm
    const secondsPerTick = secondsPerQuarter / 128
    return ticks * secondsPerTick
  }
  // Return standard notation like '4n', '8n.' for Tone.js to handle
  return duration
}

/**
 * Sets a callback function that will be called for each rhythm step during playback
 * @param callback - Function to call with the current step index
 */
export function setStepUpdateCallback(callback: ((stepIndex: number) => void) | null): void {
  stepUpdateCallback = callback
}

/**
 * Sets a callback function that will be called when a note is actually played
 * @param callback - Function to call with the step index of the played note
 */
export function setNotePlayCallback(callback: ((stepIndex: number) => void) | null): void {
  notePlayCallback = callback
}

/**
 * Clears the step update callback
 */
export function clearStepUpdateCallback(): void {
  stepUpdateCallback = null
}

/**
 * Clears the note play callback
 */
export function clearNotePlayCallback(): void {
  notePlayCallback = null
}

/**
 * Creates and returns a Tone.js synthesizer instance based on the selected instrument.
 * It caches the synth instance and recreates it only when the instrument changes.
 * @param instrument - The key of the instrument to create.
 */
function getSynth(instrument: InstrumentKey = 'default'): Tone.PolySynth {
  if (synth && currentInstrumentKey === instrument) {
    return synth
  }

  // Dispose previous synth if it exists
  if (synth) {
    synth.dispose()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let voice: any = Tone.Synth
  let voiceOptions = {}

  switch (instrument) {
    case 'fm':
      voice = Tone.FMSynth
      voiceOptions = {
        harmonicity: 3.01,
        modulationIndex: 14,
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1 },
        modulation: { type: 'triangle' },
        modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.1 }
      }
      break
    case 'am':
      voice = Tone.AMSynth
      voiceOptions = {
        harmonicity: 2.5,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 },
        modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
      }
      break
    case 'default':
    default:
      voice = Tone.Synth
      voiceOptions = {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
        envelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.4 },
        volume: -8
      }
      break
  }

  synth = new Tone.PolySynth(voice).toDestination()
  synth.set({ ...voiceOptions, volume: -8 })

  currentInstrumentKey = instrument
  return synth
}

/**
 * Plays a melody using Tone.js.
 * @param melody - The melody to play.
 * @param bpm - The tempo in beats per minute.
 * @param instrument - The instrument to use for playback.
 * @param rhythmPattern - The rhythm pattern used to generate the melody for animation sync.
 * @param loops - Number of loops to play the melody.
 * @param onEnded - Callback function to execute when playback has finished.
 */
export async function playMelody(
  melody: Melody,
  bpm: number,
  instrument: InstrumentKey = 'default',
  rhythmPattern?: (0 | 1)[],
  loops = 1,
  onEnded?: () => void
): Promise<void> {
  if (!melody.notes.length) {
    console.warn('Cannot play an empty melody.')
    return
  }

  // Ensure Tone.js context is started by user interaction
  await Tone.start()

  // Stop any previous playback
  if (part) {
    part.stop()
    part.dispose()
  }
  const transport = Tone.getTransport()
  if (transport.state === 'started') {
    transport.stop()
    transport.cancel()
  }

  const synthesizer = getSynth(instrument)
  transport.bpm.value = bpm

  // --- Manually create looped events for robust playback ---
  const singleLoopDuration = melody.notes.reduce(
    (time, note) => time + Tone.Time(convertDurationToToneJsTime(note.duration, bpm)).toSeconds(),
    0
  )

  const allEvents: LoopEvent[] = []
  for (let i = 0; i < loops; i++) {
    const loopStartTime = i * singleLoopDuration
    // To calculate the start time within the current loop, we need a separate reduce.
    let timeInLoop = 0
    melody.notes.forEach((note, index) => {
      const toneDuration = convertDurationToToneJsTime(note.duration, bpm)
      const event: LoopEvent = {
        time: loopStartTime + timeInLoop,
        pitch: note.pitch,
        duration: toneDuration,
        velocity: note.velocity,
        noteIndex: index, // Index within a single loop
        loop: i // Store which loop this event belongs to
      }
      allEvents.push(event)
      timeInLoop += Tone.Time(toneDuration).toSeconds()
    })
  }
  const totalDuration = singleLoopDuration * loops

  if (import.meta.env.DEBUG_MODE) {
    console.log('Total Events:', allEvents)
    console.log('Total Duration:', totalDuration)
  }

  // Create and start the Part
  part = new Tone.Part((time, value) => {
    // value.pitch can be null for rests
    if (value.pitch) {
      // Note: value.duration is now a format Tone.js understands (seconds or notation)
      synthesizer.triggerAttackRelease(value.pitch, value.duration, time, value.velocity)

      // Trigger note play callback when note actually plays
      if (notePlayCallback && rhythmPattern) {
        // Find the corresponding step in the rhythm pattern for this note
        const stepIndex = findStepIndexForNote(value.noteIndex, rhythmPattern)
        if (stepIndex !== -1) {
          // Calculate the absolute step for the animation across loops
          const absoluteStep = value.loop * rhythmPattern.length + stepIndex
          notePlayCallback(absoluteStep)
        }
      }
    }
  }, allEvents).start(0)

  part.loop = false

  // Schedule continuous step updates for base animation
  if (stepUpdateCallback && rhythmPattern) {
    const stepDuration = 60 / bpm / 4 // Duration of one 16th note at current BPM

    const scheduleStepUpdate = (time: number, step: number) => {
      transport.scheduleOnce(() => {
        // Send absolute step index (can be > patternLength for multiple bars)
        stepUpdateCallback?.(step)
      }, time)
    }

    // Schedule step updates for the entire playback duration
    const totalSteps = Math.ceil(totalDuration / stepDuration)
    for (let step = 0; step < totalSteps; step++) {
      scheduleStepUpdate(step * stepDuration, step)
    }
  }

  transport.start()

  // Schedule the transport to stop after the part is finished
  transport.scheduleOnce((time) => {
    stopPlayback(time)
    onEnded?.()
  }, totalDuration)
}

/**
 * Maps a note index to the corresponding step index in the rhythm pattern
 * @param noteIndex - The index of the note in the melody
 * @param rhythmPattern - The binary rhythm pattern
 * @param bars - Number of bars in the melody
 * @returns The step index in the rhythm pattern (accounting for multiple bars)
 */
function findStepIndexForNote(noteIndex: number, rhythmPattern: (0 | 1)[]): number {
  const patternLength = rhythmPattern.length
  const notesPerBar = rhythmPattern.filter((step) => step === 1).length

  // Calculate which bar this note belongs to
  const barIndex = Math.floor(noteIndex / notesPerBar)
  const noteIndexInBar = noteIndex % notesPerBar

  // Find the step index within the bar
  let noteCount = 0
  for (let stepIndex = 0; stepIndex < patternLength; stepIndex++) {
    if (rhythmPattern[stepIndex] === 1) {
      if (noteCount === noteIndexInBar) {
        // Return the absolute step index across all bars
        return barIndex * patternLength + stepIndex
      }
      noteCount++
    }
  }
  return -1 // Fallback
}

/**
 * Stops any currently playing audio and clears the transport.
 * @param time - (optional) The time at which to stop the transport (for accurate scheduling).
 */
export function stopPlayback(time?: number): void {
  const transport = Tone.getTransport()
  if (transport.state === 'started') {
    if (typeof time === 'number') {
      const epsilon = 1e-6
      const safeTime = time < epsilon ? 0 : time
      transport.stop(safeTime)
      part?.stop(safeTime)
    } else {
      transport.stop()
      part?.stop()
    }
    transport.cancel()
    part = null
  }

  // Reset visualizer animation
  stepUpdateCallback?.(-1) // -1 indicates playback stopped
  notePlayCallback?.(-1) // Reset note highlights
}
