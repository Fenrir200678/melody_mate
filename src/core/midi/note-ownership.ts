import type { MidiNoteIntent, MidiNoteSource, MidiTrackKey } from './output.types'

export interface MidiNoteScope {
  track?: MidiTrackKey
  sessionId?: string
  generation?: number
  loopIteration?: number
  source?: MidiNoteSource
}

export function sameMidiSource(left: MidiNoteSource, right: MidiNoteSource): boolean {
  if (left.kind === 'melody' && right.kind === 'melody') return left.noteId === right.noteId
  if (left.kind === 'chord' && right.kind === 'chord') return left.chordId === right.chordId && left.midi === right.midi
  return left.kind === 'preview' && right.kind === 'preview' && left.sourceId === right.sourceId
}

export function matchesMidiScope(note: MidiNoteIntent, scope: MidiNoteScope): boolean {
  return (
    (scope.track === undefined || scope.track === note.track) &&
    (scope.sessionId === undefined || scope.sessionId === note.sessionId) &&
    (scope.generation === undefined || scope.generation === note.generation) &&
    (scope.loopIteration === undefined || scope.loopIteration === note.loopIteration) &&
    (scope.source === undefined || sameMidiSource(note.source, scope.source))
  )
}

/** A schedule refresh only invalidates future attacks; retained sources keep their release ownership. */
export function reconcileMidiNotes(
  notes: readonly MidiNoteIntent[],
  scope: MidiNoteScope,
  retainedSources: readonly MidiNoteSource[],
  possibleOnIds: ReadonlySet<string>
): string[] {
  return notes
    .filter(
      (note) =>
        matchesMidiScope(note, scope) &&
        !(possibleOnIds.has(note.eventId) && retainedSources.some((source) => sameMidiSource(note.source, source)))
    )
    .map((note) => note.eventId)
}

export interface MidiQueueEvent {
  note: MidiNoteIntent
  kind: 'on' | 'off'
  timeMs: number
}

export interface OwnedMidiNote {
  note: MidiNoteIntent
  onSubmitted: boolean
  offSubmitted: boolean
  offSubmittedTimeMs?: number
  releaseOnly?: boolean
}

export interface SubmittedMidiEvent {
  note: MidiNoteIntent
  kind: 'on' | 'off' | 'panic'
  timeMs: number
  bytes: number[]
}

export function planMidiPortClear(
  entries: readonly OwnedMidiNote[],
  ledger: readonly SubmittedMidiEvent[],
  canceled: ReadonlySet<string>,
  nowMs: number,
  guardMs: number
): { retained: OwnedMidiNote[]; releases: MidiNoteIntent[] } {
  const attacks = new Map(
    ledger.filter((event) => event.kind === 'on').map((event) => [event.note.eventId, event.timeMs])
  )
  const possible = entries.map((entry) => ({
    ...entry,
    onSubmitted: entry.onSubmitted && (attacks.get(entry.note.eventId) ?? -Infinity) <= nowMs + guardMs,
    offSubmitted: false,
    offSubmittedTimeMs: undefined
  }))
  const superseded = (entry: OwnedMidiNote) =>
    possible.some(
      (other) =>
        other.note.eventId !== entry.note.eventId &&
        other.onSubmitted &&
        other.note.portId === entry.note.portId &&
        other.note.channel === entry.note.channel &&
        other.note.midi === entry.note.midi &&
        other.note.onTimeMs >= entry.note.offTimeMs
    )
  // A completed retrigger predecessor has no voice of its own left to release.
  return {
    retained: possible.filter((entry) => !canceled.has(entry.note.eventId) && !entry.releaseOnly && !superseded(entry)),
    releases: possible
      .filter(
        (entry) => (canceled.has(entry.note.eventId) || entry.releaseOnly) && entry.onSubmitted && !superseded(entry)
      )
      .map(({ note }) => note)
  }
}

export function compareMidiQueueEvents(left: MidiQueueEvent, right: MidiQueueEvent): number {
  return left.timeMs - right.timeMs || (left.kind === right.kind ? 0 : left.kind === 'off' ? -1 : 1)
}

export function retriggerMidiNotes(notes: readonly MidiNoteIntent[], incoming: MidiNoteIntent): MidiNoteIntent[] {
  const samePitch = (note: MidiNoteIntent) =>
    note.portId === incoming.portId && note.channel === incoming.channel && note.midi === incoming.midi
  const nextOn = Math.min(
    ...notes.filter((note) => samePitch(note) && note.onTimeMs > incoming.onTimeMs).map((note) => note.onTimeMs)
  )
  return [
    ...notes
      .filter((note) => !samePitch(note) || note.onTimeMs !== incoming.onTimeMs)
      .map((note) =>
        samePitch(note) && note.onTimeMs < incoming.onTimeMs && note.offTimeMs > incoming.onTimeMs
          ? { ...note, offTimeMs: incoming.onTimeMs }
          : note
      ),
    { ...incoming, offTimeMs: Math.min(incoming.offTimeMs, nextOn) }
  ]
}
