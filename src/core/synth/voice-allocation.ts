export interface AllocatedNote {
  id: string
  pitch: number
  startedAt: number
  releasedAt: number | null
  level: number
}

export class VoiceAllocator {
  private notes = new Map<string, AllocatedNote>()
  readonly capacity: number
  constructor(capacity: number) {
    this.capacity = capacity
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 16) throw new RangeError('Invalid voice capacity')
  }

  allocate(note: AllocatedNote): { stolen: string | null } {
    if (this.notes.has(note.id)) throw new Error(`Duplicate note ID: ${note.id}`)
    let stolen: string | null = null
    if (this.notes.size >= this.capacity) {
      const ordered = [...this.notes.values()].sort((a, b) => {
        const released = Number(a.releasedAt === null) - Number(b.releasedAt === null)
        return released || a.level - b.level || a.startedAt - b.startedAt
      })
      stolen = ordered[0].id
      this.notes.delete(stolen)
    }
    this.notes.set(note.id, note)
    return { stolen }
  }

  release(id: string, time: number): boolean {
    const note = this.notes.get(id)
    if (!note) return false
    note.releasedAt = time
    return true
  }

  remove(id: string): boolean {
    return this.notes.delete(id)
  }
  get(id: string): AllocatedNote | undefined {
    return this.notes.get(id)
  }
  active(): AllocatedNote[] {
    return [...this.notes.values()]
  }
  clear(): void {
    this.notes.clear()
  }
}
