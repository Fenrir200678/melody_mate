import { defineStore } from 'pinia'

export type SettingsTab = 'key-scale' | 'harmony' | 'rhythm' | 'composition' | 'motif' | 'start-end' | 'advanced'

const SELECTED_TAB_KEY = 'ui.selectedTab'

export const useUiStore = defineStore('ui', {
  state: () => ({
    selectedTab: (localStorage.getItem(SELECTED_TAB_KEY) as SettingsTab) || ('key-scale' as SettingsTab),
    scrollToAnchor: null as string | null
  }),
  actions: {
    setSelectedTab(tab: SettingsTab) {
      this.selectedTab = tab
      localStorage.setItem(SELECTED_TAB_KEY, tab)
    },
    navigateTo(tab: SettingsTab, anchor?: string) {
      this.setSelectedTab(tab)
      this.scrollToAnchor = anchor ?? null
    },
    clearScrollTarget() {
      this.scrollToAnchor = null
    }
  }
})
