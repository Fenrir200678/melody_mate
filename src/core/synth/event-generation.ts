/**
 * Pure, runtime-free bookkeeping for scheduled audio events.
 *
 * Cancelling a JavaScript timer or clearing a transport callback does not cancel note events
 * that were already handed to a synth, and a generation check alone cannot stop them. The
 * tracker therefore owns two independent things: a monotonically increasing generation that
 * invalidates future callbacks, and a set of unique voice IDs that identifies which voices are
 * still owned by the current session. Callers use the ownership set to decide which graph may
 * be released safely (instead of releasing or disposing everything).
 *
 * Voice IDs are unique per session, generation and sequence, so two overlapping notes of the
 * same pitch never share an identity and one release cannot steal the other note's voice.
 */

export type PlaybackSession =
  | 'transport'
  | 'transport-lead'
  | 'transport-chord'
  | 'lead-preview'
  | 'chord-preview'
  | 'progression-preview'
  | 'note-audition'
  | 'chord-audition'
  | 'take-audition'

export interface VoiceHandle {
  session: PlaybackSession
  sessionId: number
  generation: number
  sequence: number
  pitch: string
  /** Unique ownership token; the only supported key for note-off bookkeeping. */
  id: string
}

const SESSION_ORDER: readonly PlaybackSession[] = [
  'transport',
  'transport-lead',
  'transport-chord',
  'lead-preview',
  'chord-preview',
  'progression-preview',
  'note-audition',
  'chord-audition',
  'take-audition'
]

function createSessions(): Record<PlaybackSession, number> {
  return SESSION_ORDER.reduce(
    (sessions, session) => {
      sessions[session] = 0
      return sessions
    },
    {} as Record<PlaybackSession, number>
  )
}

export class EventGenerationTracker {
  private readonly sessionIds: Record<PlaybackSession, number> = createSessions()
  private generations: Record<PlaybackSession, number> = createSessions()
  private sequences: Record<PlaybackSession, number> = createSessions()
  private readonly activeVoices = new Map<string, VoiceHandle>()

  getGeneration(session: PlaybackSession): number {
    return this.generations[session]
  }

  /**
   * Increments the session generation so callbacks captured earlier become stale. The session
   * ID is bumped as well, which keeps voice IDs unique across stops, seeks and panic calls.
   */
  invalidate(session: PlaybackSession): number {
    this.generations[session] += 1
    this.sessionIds[session] += 1
    return this.generations[session]
  }

  /** Invalidates one session and drops every voice owned by it. */
  cancel(session: PlaybackSession): VoiceHandle[] {
    this.invalidate(session)
    return this.releaseSession(session)
  }

  /**
   * Captures the current generation. Callers must keep the snapshot and re-check it with
   * `isCurrent` before touching any audio node.
   */
  openGeneration(session: PlaybackSession): number {
    return this.generations[session]
  }

  isCurrent(session: PlaybackSession, generation: number): boolean {
    return this.generations[session] === generation
  }

  beginVoice(session: PlaybackSession, generation: number, pitch: string, count = 1): VoiceHandle[] {
    if (!this.isCurrent(session, generation)) return []
    const handles: VoiceHandle[] = []
    for (let index = 0; index < Math.max(1, count); index += 1) {
      this.sequences[session] += 1
      const sequence = this.sequences[session]
      const sessionId = this.sessionIds[session]
      handles.push({
        session,
        sessionId,
        generation,
        sequence,
        pitch,
        id: `${session}-${sessionId}-${generation}-${sequence}-${pitch}`
      })
    }
    for (const handle of handles) this.activeVoices.set(handle.id, handle)
    return handles
  }

  /** True while the handle is still owned by an un-invalidated generation. */
  ownsVoice(handle: VoiceHandle | null | undefined): boolean {
    if (!handle) return false
    if (!this.activeVoices.has(handle.id)) return false
    return this.isCurrent(handle.session, handle.generation)
  }

  isVoiceActive(id: string): boolean {
    return this.ownsVoice(this.activeVoices.get(id) ?? null)
  }

  endVoice(id: string): boolean {
    return this.activeVoices.delete(id)
  }

  getActiveVoiceIds(): string[] {
    return [...this.activeVoices.keys()]
  }

  getActiveVoiceCount(session?: PlaybackSession): number {
    if (!session) return this.activeVoices.size
    let count = 0
    for (const voice of this.activeVoices.values()) {
      if (voice.session === session) count += 1
    }
    return count
  }

  /** Removes and returns the still-relevant voices of one session. */
  releaseSession(session: PlaybackSession): VoiceHandle[] {
    const released: VoiceHandle[] = []
    for (const [id, voice] of [...this.activeVoices]) {
      if (voice.session !== session) continue
      this.activeVoices.delete(id)
      if (this.isCurrent(session, voice.generation)) released.push(voice)
    }
    return released
  }

  /** Removes every voice of every session and bumps all generations. */
  releaseAll(): VoiceHandle[] {
    const released = [...this.activeVoices.values()]
    this.activeVoices.clear()
    for (const session of SESSION_ORDER) this.generations[session] += 1
    return released
  }

  reset(): void {
    this.activeVoices.clear()
    for (const session of SESSION_ORDER) {
      this.generations[session] = 0
      this.sequences[session] = 0
      this.sessionIds[session] += 1
    }
  }
}

export function createEventGenerationTracker(): EventGenerationTracker {
  return new EventGenerationTracker()
}
