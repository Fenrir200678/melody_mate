import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { installMockLocalStorage } from '../helpers/storage-mock'
import {
  DEFAULT_MODULE_LAYOUT,
  EXPRESSION_PANEL_MODULE_KEYS,
  GENERATOR_PANEL_MODULE_KEYS
} from '../../src/config/ui-defaults'
import { useModuleLayoutStore } from '../../src/stores/module-layout.store'

const STORAGE_KEY = 'melodymate-module-layout'

describe('useModuleLayoutStore', () => {
  beforeEach(() => {
    installMockLocalStorage()
    setActivePinia(createPinia())
  })

  it('treats unconfigured modules according to DEFAULT_MODULE_LAYOUT', () => {
    const store = useModuleLayoutStore()

    expect(store.isModuleOpen('rhythm')).toBe(DEFAULT_MODULE_LAYOUT['rhythm'])
  })

  it('tracks individual module open state', () => {
    const store = useModuleLayoutStore()

    store.setModuleOpen('motif', false)
    expect(store.isModuleOpen('motif')).toBe(false)
    expect(store.isModuleOpen('rhythm')).toBe(DEFAULT_MODULE_LAYOUT['rhythm'])

    store.setModuleOpen('motif', true)
    expect(store.isModuleOpen('motif')).toBe(true)
  })

  it('collapses and expands a whole module group', () => {
    const store = useModuleLayoutStore()

    store.setModulesOpen(GENERATOR_PANEL_MODULE_KEYS, false)
    for (const key of GENERATOR_PANEL_MODULE_KEYS) {
      expect(store.isModuleOpen(key)).toBe(false)
    }
    for (const key of EXPRESSION_PANEL_MODULE_KEYS) {
      expect(store.isModuleOpen(key)).toBe(DEFAULT_MODULE_LAYOUT[key])
    }

    store.setModulesOpen(GENERATOR_PANEL_MODULE_KEYS, true)
    for (const key of GENERATOR_PANEL_MODULE_KEYS) {
      expect(store.isModuleOpen(key)).toBe(true)
    }
  })

  it('persists state to localStorage and restores it in a fresh store', async () => {
    const { storage } = installMockLocalStorage()
    setActivePinia(createPinia())
    const store = useModuleLayoutStore()

    store.setModuleOpen('takes', false)
    await nextTick()

    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ ...DEFAULT_MODULE_LAYOUT, takes: false }))

    setActivePinia(createPinia())
    const restored = useModuleLayoutStore()
    expect(restored.isModuleOpen('takes')).toBe(false)
    expect(restored.isModuleOpen('variation')).toBe(DEFAULT_MODULE_LAYOUT['variation'])
  })

  it('restores all modules to defaults after a reset', async () => {
    const store = useModuleLayoutStore()

    store.setModulesOpen(EXPRESSION_PANEL_MODULE_KEYS, false)
    store.reset()
    await nextTick()

    for (const key of EXPRESSION_PANEL_MODULE_KEYS) {
      expect(store.isModuleOpen(key)).toBe(DEFAULT_MODULE_LAYOUT[key])
    }
  })

  it('ignores corrupted localStorage payloads and falls back to defaults', () => {
    const { storage } = installMockLocalStorage()
    storage.setItem(STORAGE_KEY, '{not-json')

    setActivePinia(createPinia())
    const store = useModuleLayoutStore()

    expect(store.isModuleOpen('groove')).toBe(true)
    expect(store.isModuleOpen('rhythm')).toBe(DEFAULT_MODULE_LAYOUT['rhythm'])
  })
})
