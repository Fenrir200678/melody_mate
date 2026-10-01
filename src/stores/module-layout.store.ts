import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  DEFAULT_MODULE_LAYOUT,
  EXPRESSION_PANEL_MODULE_KEYS,
  GENERATOR_PANEL_MODULE_KEYS,
  type ModuleOpenStates
} from '../config/ui-defaults'

const MODULE_LAYOUT_STORAGE_KEY = 'melodymate-module-layout'

export { EXPRESSION_PANEL_MODULE_KEYS, GENERATOR_PANEL_MODULE_KEYS }

function readPersistedStates(): ModuleOpenStates {
  if (typeof window === 'undefined') return { ...DEFAULT_MODULE_LAYOUT }
  try {
    const raw = window.localStorage.getItem(MODULE_LAYOUT_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_MODULE_LAYOUT }
    }
    const result: ModuleOpenStates = { ...DEFAULT_MODULE_LAYOUT }
    const record = parsed as Record<string, unknown>
    for (const key of Object.keys(DEFAULT_MODULE_LAYOUT) as (keyof typeof DEFAULT_MODULE_LAYOUT)[]) {
      if (typeof record[key] === 'boolean') {
        result[key] = record[key] as boolean
      }
    }
    return result
  } catch {
    return { ...DEFAULT_MODULE_LAYOUT }
  }
}

export const useModuleLayoutStore = defineStore('moduleLayout', () => {
  const moduleOpenStates = ref<ModuleOpenStates>(readPersistedStates())

  function isModuleOpen(key: string): boolean {
    return moduleOpenStates.value[key] ?? DEFAULT_MODULE_LAYOUT[key as keyof typeof DEFAULT_MODULE_LAYOUT] ?? true
  }

  function setModuleOpen(key: string, open: boolean): void {
    moduleOpenStates.value = { ...moduleOpenStates.value, [key]: open }
  }

  function setModulesOpen(keys: readonly string[], open: boolean): void {
    const next: ModuleOpenStates = { ...moduleOpenStates.value }
    for (const key of keys) {
      next[key] = open
    }
    moduleOpenStates.value = next
  }

  function reset(): void {
    moduleOpenStates.value = { ...DEFAULT_MODULE_LAYOUT }
  }

  watch(moduleOpenStates, (states) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(MODULE_LAYOUT_STORAGE_KEY, JSON.stringify(states))
    } catch {
      // Module layout stays usable when browser storage is unavailable.
    }
  })

  return { moduleOpenStates, isModuleOpen, setModuleOpen, setModulesOpen, reset }
})
