import { useProjectStore } from '../../stores/project.store'
import { useMelodyStore } from '../../stores/melody.store'
import { useHarmonyStore } from '../../stores/harmony.store'
import { useRhythmStore } from '../../stores/rhythm.store'
import { useTakesStore } from '../../stores/takes.store'
import { PluginSessionSchema, type PluginSession } from '../../core/plugin/session'
import { useUiStore } from '../../stores/ui.store'
import { useModuleLayoutStore } from '../../stores/module-layout.store'
import { isWideViewport } from '../../composables/uiStorage'
import { useAudioStore } from '../../stores/audio.store'

export function pluginStores() {
  return {
    project: useProjectStore(),
    melody: useMelodyStore(),
    harmony: useHarmonyStore(),
    rhythm: useRhythmStore(),
    takes: useTakesStore(),
    ui: useUiStore(),
    modules: useModuleLayoutStore(),
    audio: useAudioStore()
  }
}

export function captureSession(output: PluginSession['output']): PluginSession {
  const { project, melody, harmony, rhythm, takes, ui, modules, audio } = pluginStores()
  return PluginSessionSchema.parse({
    project: project.toConfig(), melody, harmony, rhythm, takes, output,
    ui: {
      activeTool: ui.activeTool, activeTrack: ui.activeTrack, isScaleLocked: ui.isScaleLocked,
      followPlayhead: audio.followPlayhead, snapStep: ui.snapStep,
      stepWidth: ui.stepWidth, rowHeight: ui.rowHeight,
      wideLeftSidebarOpen: ui.wideLeftSidebarOpen, wideRightSidebarOpen: ui.wideRightSidebarOpen,
      leftSidebarWidth: ui.leftSidebarWidth, rightSidebarWidth: ui.rightSidebarWidth,
      activeStudioDock: ui.activeStudioDock === 'sound' ? null : ui.activeStudioDock,
      chordStudioHeight: ui.chordStudioHeight, rhythmStudioHeight: ui.rhythmStudioHeight,
      arpStudioHeight: ui.arpStudioHeight, isVelocityLaneOpen: ui.isVelocityLaneOpen,
      velocityLaneHeight: ui.velocityLaneHeight, modules: modules.moduleOpenStates
    }
  })
}

export function restoreSession(session: PluginSession): void {
  const stores = pluginStores()
  stores.project.$patch(session.project)
  stores.melody.$patch(session.melody)
  stores.harmony.$patch(session.harmony)
  stores.rhythm.$patch(session.rhythm)
  stores.takes.$patch(session.takes)
  if (session.ui) {
    const { modules, followPlayhead, ...ui } = session.ui
    stores.audio.followPlayhead = followPlayhead
    stores.ui.$patch({ ...ui,
      isLeftSidebarOpen: isWideViewport() && ui.wideLeftSidebarOpen,
      isRightSidebarOpen: isWideViewport() && ui.wideRightSidebarOpen })
    stores.modules.$patch({ moduleOpenStates: { ...modules } })
  } else {
    stores.ui.reset()
    stores.modules.reset()
  }
  stores.melody.clearSelection()
  stores.harmony.clearSelection()
}
