import MidiWriter from 'midi-writer-js'
import { getGroovedLeadStarts, getGroovedStartStep, type GrooveConfig } from '../rhythm/groove'
import type { ChordEvent } from '../schemas/chord.schema'
import type { AppNote } from '../schemas/note.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'

export type ExportMode = 'melody-only' | 'chords-only' | 'full'

export const TICKS_PER_BEAT = 128
export const TICKS_PER_SIXTEENTH = 32
export const TICKS_PER_BAR = 512

export interface MidiExportOptions {
  mode?: ExportMode
  key?: string
  scale?: string
  swing?: number
  timingLooseness?: number
}

export interface MidiFilenameOptions {
  key: string
  scale: string
  bpm: number
  bars: number
  mode: ExportMode
  prefix?: string
}

/**
 * Maps standard and modal scale names to concise producer-friendly slugs.
 */
export function formatScaleSlug(scale: string): string {
  const normalized = scale.toLowerCase().trim()
  const map: Record<string, string> = {
    major: 'maj',
    minor: 'min',
    dorian: 'dorian',
    phrygian: 'phrygian',
    lydian: 'lydian',
    mixolydian: 'mixo',
    locrian: 'locrian',
    harmonic_minor: 'harm-min',
    melodic_minor: 'mel-min',
    pentatonic_minor: 'p-min',
    pentatonic_major: 'p-maj',
    blues: 'blues'
  }
  return map[normalized] || normalized.replace(/[^a-z0-9]+/g, '-')
}

/**
 * Generates a producer-standard MIDI filename (e.g. MelodyMate_Cmin_124BPM_4bar_Lead.mid).
 */
export function generateMidiFilename(options: MidiFilenameOptions): string {
  const prefix = options.prefix?.trim() || 'MelodyMate'
  const cleanKey = options.key.replace(/[^a-zA-Z0-9#b]/g, '')
  const scaleSlug = formatScaleSlug(options.scale)
  const bpm = Math.max(1, Math.round(options.bpm))
  const bars = Math.max(1, Math.round(options.bars))

  let trackType: string
  switch (options.mode) {
    case 'melody-only':
      trackType = 'Lead'
      break
    case 'chords-only':
      trackType = 'Chords'
      break
    case 'full':
    default:
      trackType = 'MultiTrack'
      break
  }

  return `${prefix}_${cleanKey}${scaleSlug}_${bpm}BPM_${bars}bar_${trackType}.mid`
}

/**
 * Attaches standard MIDI key signature meta event if key/scale is recognized.
 */
function applyKeySignature(track: MidiWriter.Track, key: string, scale?: string): void {
  try {
    const isMinor = scale
      ? scale.toLowerCase().includes('minor') ||
        ['dorian', 'phrygian', 'aeolian', 'locrian'].includes(scale.toLowerCase())
      : false
    const keyNotation = isMinor ? `${key}m` : key
    track.setKeySignature(keyNotation)
  } catch {
    // Safely skip if key string cannot be parsed by midi-writer-js
  }
}

/**
 * Builds a track for lead melody notes (Channel 1).
 */
export function buildLeadTrack(
  notes: AppNote[],
  bpm: number,
  key?: string,
  scale?: string,
  groove?: GrooveConfig
): MidiWriter.Track {
  const track = new MidiWriter.Track()
  track.addTrackName('Lead Melody')
  track.addInstrumentName('Lead Synth')
  track.setTempo(bpm)
  track.setTimeSignature(4, 4)

  if (key) {
    applyKeySignature(track, key, scale)
  }

  const activeNotes = notes.filter((n) => !n.isMuted).sort((a, b) => a.step - b.step || a.midi - b.midi)
  const starts = groove ? getGroovedLeadStarts(activeNotes, groove) : undefined
  const ticksPerStep = TICKS_PER_SIXTEENTH

  for (const note of activeNotes) {
    const startTick = Math.round((starts?.get(note.id) ?? note.step) * ticksPerStep)
    const durationTicks = Math.max(1, Math.round(note.durationSteps * ticksPerStep))
    const velocityScale = Math.max(1, Math.min(100, Math.round((note.velocity / 127) * 100)))

    track.addEvent(
      new MidiWriter.NoteEvent({
        pitch: [note.pitch],
        duration: `T${durationTicks}`,
        tick: startTick,
        velocity: velocityScale,
        channel: 1
      })
    )
  }

  return track
}

/**
 * Builds a track for polyphonic accompaniment chords (Channel 2).
 */
export function buildChordTrack(
  chords: ChordEvent[],
  bpm: number,
  key?: string,
  scale?: string,
  groove?: GrooveConfig
): MidiWriter.Track {
  const track = new MidiWriter.Track()
  track.addTrackName('Chords')
  track.addInstrumentName('Chord Voicing')
  track.setTempo(bpm)
  track.setTimeSignature(4, 4)

  if (key) {
    applyKeySignature(track, key, scale)
  }

  const activeChords = chords.filter((c) => c.voicing && c.voicing.length > 0).sort((a, b) => a.startBar - b.startBar)

  for (const chord of activeChords) {
    const stepsPerBar = STEPS_PER_BAR
    const startStep = chord.startBar * stepsPerBar
    const startTick = Math.round(
      (groove ? getGroovedStartStep(startStep, chord.id, groove) : startStep) * (TICKS_PER_BAR / stepsPerBar)
    )
    const durationTicks = Math.max(1, Math.round(chord.durationBars * TICKS_PER_BAR))
    const voicedNotes = chord.voicing

    track.addEvent(
      new MidiWriter.NoteEvent({
        pitch: voicedNotes,
        duration: `T${durationTicks}`,
        tick: startTick,
        velocity: 75,
        channel: 2,
        sequential: false
      })
    )
  }

  return track
}

/**
 * Compiles notes and chords into standard MIDI file bytes (Uint8Array).
 */
export function buildMidiBytes(
  notes: AppNote[],
  chords: ChordEvent[],
  bpm: number,
  optionsOrMode: ExportMode | MidiExportOptions = 'full'
): Uint8Array {
  const options: MidiExportOptions = typeof optionsOrMode === 'string' ? { mode: optionsOrMode } : optionsOrMode
  const mode = options.mode ?? 'full'
  const key = options.key
  const scale = options.scale
  const groove: GrooveConfig = {
    bpm,
    swing: options.swing ?? 0,
    timingLooseness: options.timingLooseness ?? 0
  }

  const tracks: MidiWriter.Track[] = []

  if (mode === 'melody-only') {
    tracks.push(buildLeadTrack(notes, bpm, key, scale, groove))
  } else if (mode === 'chords-only') {
    tracks.push(buildChordTrack(chords, bpm, key, scale, groove))
  } else {
    tracks.push(buildLeadTrack(notes, bpm, key, scale, groove))
    tracks.push(buildChordTrack(chords, bpm, key, scale, groove))
  }

  const writer = new MidiWriter.Writer(tracks)
  return writer.buildFile()
}

/**
 * Generates an audio/midi Blob suitable for browser file download.
 */
export function buildMidiBlob(
  notes: AppNote[],
  chords: ChordEvent[],
  bpm: number,
  optionsOrMode: ExportMode | MidiExportOptions = 'full'
): Blob {
  const bytes = buildMidiBytes(notes, chords, bpm, optionsOrMode)
  return new Blob([bytes as unknown as BlobPart], { type: 'audio/midi' })
}
