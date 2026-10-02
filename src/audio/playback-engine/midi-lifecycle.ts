import * as Tone from 'tone'
import type { MidiNoteSource, MidiTrackKey } from '../../core/midi/output.types'
import type { AppNote } from '../../core/schemas/note.schema'
import type { TrackOutputRouter, TrackOutputRuntime } from '../output-router'

export class TransportMidiLifecycle {
  private previousNotes = new Map<string, AppNote>()
  private disposed = false
  private readonly transport = Tone.getTransport()
  private readonly context = Tone.getContext()
  private readonly page = typeof window !== 'undefined' ? window : undefined

  private readonly router: TrackOutputRouter
  private readonly runtime?: TrackOutputRuntime
  private readonly invalidateStart: () => void

  constructor(router: TrackOutputRouter, runtime: TrackOutputRuntime | undefined, invalidateStart: () => void) {
    this.router = router
    this.runtime = runtime
    this.invalidateStart = invalidateStart
    if (!runtime) return
    this.transport.on?.('loopEnd', this.loopEnd)
    this.context.on?.('statechange', this.contextState)
    this.page?.addEventListener?.('pagehide', this.pagehide)
  }

  get isExternal(): boolean {
    const settings = this.runtime?.getSettings()
    return !!settings && (settings.lead.mode !== 'internal' || settings.chord.mode !== 'internal')
  }

  private readonly loopEnd = (time: number): void => {
    if (this.disposed) return
    const boundary = this.router.prepareLoopBoundary(time)
    const settings = this.runtime?.getSettings()
    if (settings)
      this.runtime?.midi.endIteration?.(boundary.loopIteration, time, {
        lead: settings.lead.offsetMs,
        chord: settings.chord.offsetMs
      })
  }

  private readonly contextState = (): void => {
    if (!this.disposed && this.context.state !== 'running') this.suspend()
  }

  private readonly pagehide = (): void => {
    this.suspend()
  }

  refreshLead(notes: readonly AppNote[], replace: boolean): void {
    if (replace) this.cancel('lead')
    else {
      const retained: MidiNoteSource[] = notes
        .filter((note) => {
          const old = this.previousNotes.get(note.id)
          return (
            old &&
            !old.isMuted &&
            !note.isMuted &&
            old.midi === note.midi &&
            old.step === note.step &&
            old.durationSteps === note.durationSteps &&
            old.velocity === note.velocity
          )
        })
        .map((note) => ({ kind: 'melody', noteId: note.id }))
      this.runtime?.midi.reconcile?.({ track: 'lead' }, retained)
    }
    this.previousNotes = new Map(notes.map((note) => [note.id, { ...note }]))
  }

  cancel(track?: MidiTrackKey): void {
    this.runtime?.midi.cancel?.(track ? { track } : {})
  }

  syncAudibility(): void {
    for (const track of ['lead', 'chord'] as const) if (!this.router.isAudible(track)) this.cancel(track)
  }

  async resume(): Promise<void> {
    await this.runtime?.resume?.()
  }
  suspend(): void {
    this.invalidateStart()
    this.runtime?.suspend?.()
    this.cancel()
  }
  panic(): void {
    this.runtime?.panic?.()
    if (!this.runtime?.panic) this.runtime?.midi.panic?.()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.runtime) {
      this.transport.off?.('loopEnd', this.loopEnd)
      this.context.off?.('statechange', this.contextState)
      this.page?.removeEventListener?.('pagehide', this.pagehide)
      this.runtime.dispose?.()
      if (!this.runtime.dispose) this.cancel()
    }
  }
}
