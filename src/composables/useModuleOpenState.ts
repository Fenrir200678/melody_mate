import { computed, type WritableComputedRef } from 'vue'
import { useModuleLayoutStore } from '@/stores/module-layout.store'

/**
 * Store-backed open state for a DawModule, persisted across sessions.
 * The returned ref plugs directly into `DawModule` via `v-model`.
 */
export function useModuleOpenState(key: string): WritableComputedRef<boolean> {
  const moduleLayout = useModuleLayoutStore()

  return computed({
    get: () => moduleLayout.isModuleOpen(key),
    set: (open: boolean) => moduleLayout.setModuleOpen(key, open)
  })
}
