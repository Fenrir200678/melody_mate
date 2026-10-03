import { defineStore } from 'pinia'
import { onScopeDispose, readonly, shallowRef } from 'vue'
import { DEFAULT_MIDI_OUTPUT_SETTINGS, DEFAULT_MIDI_ENABLED_ROUTE_MODE } from '../config/defaults'
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

  async function applyDefaultRouting(): Promise<void> {
    const snap = manager.getSnapshot()
    if (!snap.enabled || snap.outputs.length === 0) return
    const first = snap.outputs[0]
    if (!first) return
    const defaultPort = { id: first.id, name: first.name, manufacturer: first.manufacturer }
    const rt = getRuntime()
    const current = rt.getSettings()

    if (current.lead.mode === 'internal') {
      await rt.setRoute('lead', {
        ...current.lead,
        mode: DEFAULT_MIDI_ENABLED_ROUTE_MODE,
        port: current.lead.port ?? defaultPort
      })
    }
    if (current.chord.mode === 'internal') {
      const nextChannel =
        current.chord.channel === current.lead.channel
          ? current.lead.channel === 1
            ? 2
            : 1
          : current.chord.channel
      await rt.setRoute('chord', {
        ...current.chord,
        mode: DEFAULT_MIDI_ENABLED_ROUTE_MODE,
        port: current.chord.port ?? defaultPort,
        channel: nextChannel
      })
    }
  }

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
    applyDefaultRouting,
    enable: async (options?: { autoRoute?: boolean }) => {
      await manager.enable()
      if (options?.autoRoute) {
        await applyDefaultRouting()
      }
    },
    disable: async () => {
      output?.suspend()
      await manager.disable()
      if (output) {
        const current = output.getSettings()
        if (current.lead.mode !== 'internal') {
          await output.setRoute('lead', { ...current.lead, mode: 'internal' })
        }
        if (current.chord.mode !== 'internal') {
          await output.setRoute('chord', { ...current.chord, mode: 'internal' })
        }
      }
    },
    panic: () => getRuntime().panic(),
    refresh: () => manager.refresh(),
    open: (track: MidiTrackKey, portId: string) => manager.open(track, portId),
    close: (track: MidiTrackKey) => manager.close(track)
  }
})

