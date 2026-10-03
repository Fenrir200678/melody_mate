import { defineStore } from 'pinia'
import { onScopeDispose, shallowRef } from 'vue'
import { acquireMidiAccessManager } from '../audio/midi/runtime'
import { createToneMidiClockBridge } from '../audio/midi/clock-bridge'
import { MidiTransportOutput } from '../audio/midi/transport-output'
import { useAudioStore } from './audio.store'
import type { MidiTrackRoute, MidiTrackKey } from '../core/midi/output.types'

export const useMidiOutputStore = defineStore('midi-output', () => {
  const { manager, release } = acquireMidiAccessManager()
  let output: MidiTransportOutput | undefined
  function getRuntime(): MidiTransportOutput {
    return (output ??= new MidiTransportOutput(
      manager,
      createToneMidiClockBridge(() => useAudioStore().getPlaybackEngine()?.effectsRack.getOutputLatencySeconds() ?? 0)
    ))
  }
  const snapshot = shallowRef(manager.getSnapshot())
  const unsubscribe = manager.subscribe((value) => {
    snapshot.value = value
  })
  onScopeDispose(() => {
    output?.dispose()
    unsubscribe()
    release()
  })

  return {
    snapshot,
    getRuntime,
    getSettings: () => getRuntime().getSettings(),
    setSendPreviews: (enabled: boolean) => getRuntime().setSendPreviews(enabled),
    testNote: (track: MidiTrackKey) => getRuntime().previews.testNote(track),
    setRoute: (track: MidiTrackKey, route: MidiTrackRoute) => getRuntime().setRoute(track, route),
    enable: () => manager.enable(),
    disable: () => {
      output?.suspend()
      return manager.disable()
    },
    refresh: () => manager.refresh(),
    open: (track: MidiTrackKey, portId: string) => manager.open(track, portId),
    close: (track: MidiTrackKey) => manager.close(track)
  }
})
