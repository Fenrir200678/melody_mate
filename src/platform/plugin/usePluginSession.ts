import { onScopeDispose, ref, watch } from 'vue'
import { z } from 'zod'
import { DEFAULT_PLUGIN_OUTPUT } from '../../config/defaults'
import { buildPluginMidiDragExport } from '../../core/plugin/midi-drag-export'
import { buildPlaybackSnapshot } from '../../core/plugin/playback-snapshot'
import {
  PluginDocumentSchema,
  PLUGIN_PROTOCOL_VERSION,
  type PluginDocument,
  type PluginSession
} from '../../core/plugin/session'
import { useAudioStore } from '../../stores/audio.store'
import { useUiStore } from '../../stores/ui.store'
import { nativeCall, onNativeEvent } from './bridge'
import { captureSession, restoreSession, pluginStores } from './session-stores'

const NativeStateSchema = z.object({ epoch: z.number().int().min(0), document: z.unknown() })
const TransportSchema = z.object({
  playing: z.boolean(),
  valid: z.boolean(),
  ppq: z.number().finite(),
  bpm: z.number().finite()
})

function encodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function usePluginSession() {
  const ready = ref(false)
  const needsReset = ref(false)
  const status = ref('Connecting to native processor…')
  const output = ref<PluginSession['output']>({ ...DEFAULT_PLUGIN_OUTPUT })
  const hostBpm = ref<number | null>(null)
  const audio = useAudioStore()
  const ui = useUiStore()
  const stores = pluginStores()
  const initialSession = captureSession({ ...DEFAULT_PLUGIN_OUTPUT })
  let epoch = 0
  let restoring = false
  let disposed = false
  let inFlight = false
  let pending: { epoch: number; document: PluginDocument } | undefined

  function document(): PluginDocument {
    const session = captureSession(output.value)
    const midi = buildPluginMidiDragExport(session, ui.activeTrack === 'chords' ? 'chords' : 'melody')
    return PluginDocumentSchema.parse({
      version: PLUGIN_PROTOCOL_VERSION,
      session,
      playback: buildPlaybackSnapshot(session),
      midiBase64: encodeBytes(midi.bytes),
      filename: midi.filename
    })
  }
  function hydrate(payload: unknown): void {
    const state = NativeStateSchema.parse(payload)
    if (state.epoch < epoch) return
    pending = undefined
    restoring = true
    epoch = state.epoch
    if (state.document !== null && state.document !== undefined) {
      const parsed = PluginDocumentSchema.safeParse(state.document)
      if (!parsed.success) {
        needsReset.value = true
        ready.value = false
        restoring = false
        status.value = 'Stored session is incompatible. Reset explicitly to start a new session.'
        return
      }
      restoreSession(parsed.data.session)
      output.value = { ...parsed.data.session.output }
    } else {
      restoreSession(initialSession)
      output.value = { ...DEFAULT_PLUGIN_OUTPUT }
    }
    needsReset.value = false
    restoring = false
    ready.value = true
    status.value = 'Native state ready'
  }
  function commit(): void {
    if (!ready.value || restoring || disposed) return
    try {
      pending = { epoch, document: document() }
      status.value = 'Updating native state…'
      void drain()
    } catch (failure) {
      status.value = failure instanceof Error ? failure.message : 'Invalid session'
    }
  }
  async function drain(): Promise<void> {
    if (inFlight) return
    inFlight = true
    try {
      while (pending && !disposed) {
        const next = pending
        pending = undefined
        if (next.epoch !== epoch) continue
        await nativeCall('commit', next)
        if (!disposed && next.epoch === epoch)
          status.value = pending ? 'Updating native state…' : 'Stored in plugin instance'
      }
    } catch (failure) {
      status.value = failure instanceof Error ? failure.message : 'Native state update failed'
    } finally {
      inFlight = false
    }
  }
  const stopWatch = watch(
    () => [
      ...Object.values(stores.project.$state),
      stores.melody.notes,
      stores.melody.generatorParams,
      stores.melody.variationMode,
      stores.melody.mutationAxes,
      stores.melody.mutationStrength,
      stores.melody.keepOriginalAsTake,
      stores.harmony.chords,
      stores.harmony.useChords,
      stores.harmony.isMuted,
      stores.harmony.backingVolume,
      stores.harmony.adherence,
      stores.harmony.chordRegister,
      stores.harmony.defaultChordDuration,
      stores.harmony.voicingStyle,
      stores.harmony.autoSmooth,
      stores.harmony.paletteClickMode,
      ui.activeTrack,
      ui.activeTool, ui.isScaleLocked, audio.followPlayhead, ui.snapStep, ui.stepWidth, ui.rowHeight,
      ui.wideLeftSidebarOpen, ui.wideRightSidebarOpen, ui.leftSidebarWidth, ui.rightSidebarWidth,
      ui.activeStudioDock, ui.chordStudioHeight, ui.rhythmStudioHeight, ui.arpStudioHeight,
      ui.isVelocityLaneOpen, ui.velocityLaneHeight, stores.modules.moduleOpenStates,
      stores.rhythm.pattern,
      stores.rhythm.savedPresets,
      stores.rhythm.activeSavedPresetId,
      ...Object.values(stores.takes.$state),
      output.value.enabled,
      output.value.repeat,
      output.value.melodyChannel,
      output.value.chordsChannel
    ],
    commit,
    { flush: 'sync' }
  )
  const removeRestore = onNativeEvent('restore', (payload) => {
    try {
      hydrate(payload)
    } catch (failure) {
      status.value = String(failure)
    }
  })
  const removeTransport = onNativeEvent('transport', (payload) => {
    const result = TransportSchema.safeParse(payload)
    if (!result.success) return
    const host = result.data
    hostBpm.value = host.valid ? host.bpm : null
    audio.isPlaying = host.valid && host.playing
    const length = stores.project.bars * 4
    const ppq = host.ppq < 0 ? 0 : output.value.repeat ? host.ppq % length : host.ppq
    audio.currentStep = Math.floor(ppq * 4)
    audio.playhead.step = ppq * 4
    if (!host.valid) status.value = 'Host PPQ/tempo unavailable; MIDI output suspended'
  })
  void nativeCall('read')
    .then((payload) => {
      if (!disposed) {
        hydrate(payload)
        commit()
      }
    })
    .catch((error: Error) => {
      status.value = error.message
    })
  onScopeDispose(() => {
    disposed = true
    stopWatch()
    removeRestore()
    removeTransport()
  })
  return {
    ready,
    status,
    output,
    hostBpm,
    needsReset,
    resetInvalidState: () => {
      restoring = true
      restoreSession(initialSession)
      output.value = { ...DEFAULT_PLUGIN_OUTPUT }
      restoring = false
      needsReset.value = false
      ready.value = true
      commit()
    }
  }
}
