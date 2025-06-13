import type { Melody } from '@/ts/models'
import type { InstrumentKey, LoopEvent } from '@/ts/types/audio.types'
import * as Tone from 'tone'
import { Note } from 'tonal'
import { getNotePlayCallback, getStepUpdateCallback } from './callbacks'
import { getSynth } from './synth'
import { convertDurationToToneJsTime, findStepIndexForNote } from './utils'

let part: Tone.Part | null = null

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
    let timeInLoop = 0
    melody.notes.forEach((note, index) => {
      // Validate note pitch with Tonal
      if (note.pitch && !Note.midi(note.pitch)) {
        console.warn(`Skipping invalid note: ${note.pitch}`)
        return // Skip this note
      }

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

  const stepUpdateCallback = getStepUpdateCallback()
  const notePlayCallback = getNotePlayCallback()

  // Create and start the Part
  part = new Tone.Part((time, value) => {
    if (value.pitch) {
      synthesizer.triggerAttackRelease(value.pitch, value.duration, time, value.velocity)
      if (notePlayCallback && rhythmPattern) {
        const stepIndex = findStepIndexForNote(value.noteIndex, rhythmPattern)
        if (stepIndex !== -1) {
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
        stepUpdateCallback?.(step)
      }, time)
    }
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
 * Stops any currently playing audio and clears the transport.
 * @param time - (optional) The time at which to stop the transport (for accurate scheduling).
 */
export function stopPlayback(time?: number): void {
  const transport = Tone.getTransport()
  const stepUpdateCallback = getStepUpdateCallback()
  const notePlayCallback = getNotePlayCallback()

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
