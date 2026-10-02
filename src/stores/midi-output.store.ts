import { defineStore } from 'pinia'
import { onScopeDispose, shallowRef } from 'vue'
import { acquireMidiAccessManager } from '../audio/midi/runtime'
import type { MidiTrackKey } from '../core/midi/output.types'

export const useMidiOutputStore = defineStore('midi-output', () => {
  const { manager, release } = acquireMidiAccessManager()
  const snapshot = shallowRef(manager.getSnapshot())
  const unsubscribe = manager.subscribe((value) => {
    snapshot.value = value
  })
  onScopeDispose(() => {
    unsubscribe()
    release()
  })

  return {
    snapshot,
    enable: () => manager.enable(),
    disable: () => manager.disable(),
    refresh: () => manager.refresh(),
    open: (track: MidiTrackKey, portId: string) => manager.open(track, portId),
    close: (track: MidiTrackKey) => manager.close(track)
  }
})
