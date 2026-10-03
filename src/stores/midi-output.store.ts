import { defineStore } from 'pinia'
import { onScopeDispose, readonly, shallowRef } from 'vue'
import { DEFAULT_MIDI_OUTPUT_SETTINGS } from '../config/defaults'
import { acquireMidiAccessManager } from '../audio/midi/runtime'
import { createToneMidiClockBridge } from '../audio/midi/clock-bridge'
import { MidiTransportOutput } from '../audio/midi/transport-output'
import { useAudioStore } from './audio.store'
import type { MidiOutputSettings, MidiTrackRoute, MidiTrackKey } from '../core/midi/output.types'

export const useMidiOutputStore = defineStore('midi-output', () => {
  const { manager, release } = acquireMidiAccessManager()
  let output: MidiTransportOutput | undefined
  const settings = shallowRef<MidiOutputSettings>(structuredClone(DEFAULT_MIDI_OUTPUT_SETTINGS))
  function getRuntime(): MidiTransportOutput {
    if (output) return output
    output = new MidiTransportOutput(
      manager,
      createToneMidiClockBridge(() => useAudioStore().getPlaybackEngine()?.effectsRack.getOutputLatencySeconds() ?? 0)
    )
    output.subscribeSettings((value) => {
      if (JSON.stringify(value) !== JSON.stringify(settings.value)) settings.value = value
    })
    return output
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
    settings: readonly(settings),
    getRuntime,
    getSettings: () => getRuntime().getSettings(),
    restoreSettings: (value: MidiOutputSettings) => getRuntime().restoreSettings(value),
    reset: () => getRuntime().restoreSettings(DEFAULT_MIDI_OUTPUT_SETTINGS),
    setSendPreviews: (enabled: boolean) => getRuntime().setSendPreviews(enabled),
    testNote: (track: MidiTrackKey) => getRuntime().previews.testNote(track),
    setRoute: (track: MidiTrackKey, route: MidiTrackRoute) => getRuntime().setRoute(track, route),
    enable: () => manager.enable(),
    disable: () => {
      output?.suspend()
      return manager.disable()
    },
    panic: () => getRuntime().panic(),
    refresh: () => manager.refresh(),
    open: (track: MidiTrackKey, portId: string) => manager.open(track, portId),
    close: (track: MidiTrackKey) => manager.close(track)
  }
})
