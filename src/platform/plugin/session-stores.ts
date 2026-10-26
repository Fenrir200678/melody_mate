import { useProjectStore } from '../../stores/project.store'
import { useMelodyStore } from '../../stores/melody.store'
import { useHarmonyStore } from '../../stores/harmony.store'
import { useRhythmStore } from '../../stores/rhythm.store'
import { useTakesStore } from '../../stores/takes.store'
import { PluginSessionSchema, type PluginSession } from '../../core/plugin/session'

export function pluginStores() {
  return {
    project: useProjectStore(),
    melody: useMelodyStore(),
    harmony: useHarmonyStore(),
    rhythm: useRhythmStore(),
    takes: useTakesStore()
  }
}

export function captureSession(output: PluginSession['output']): PluginSession {
  const { project, melody, harmony, rhythm, takes } = pluginStores()
  return PluginSessionSchema.parse({ project: project.toConfig(), melody, harmony, rhythm, takes, output })
}

export function restoreSession(session: PluginSession): void {
  const stores = pluginStores()
  stores.project.$patch(session.project)
  stores.melody.$patch(session.melody)
  stores.harmony.$patch(session.harmony)
  stores.rhythm.$patch(session.rhythm)
  stores.takes.$patch(session.takes)
  stores.melody.clearSelection()
  stores.harmony.clearSelection()
}
