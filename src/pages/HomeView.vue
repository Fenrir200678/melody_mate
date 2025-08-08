<script setup lang="ts">
import { defineAsyncComponent, ref, watch, computed } from 'vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { useUiStore } from '@/stores/ui.store'
import { useMelodyStore } from '@/stores/melody.store'

// Lazy load heavy components to improve initial bundle size
const MelodyVisualizer = defineAsyncComponent({
  loader: () => import('@/components/MelodyVisualizer.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})

const MelodyGenerator = defineAsyncComponent({
  loader: () => import('@/components/MelodyGenerator.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})

const MelodyPlayer = defineAsyncComponent({
  loader: () => import('@/components/MelodyPlayer.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})

const SettingsContent = defineAsyncComponent({
  loader: () => import('../components/SettingsContent.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})

const ui = useUiStore()
const melodyStore = useMelodyStore()

// Mobile UX: collapse only the visualizer on tab change and scroll to settings
const isVisualizerCollapsed = ref(false)
const settingsSectionEl = ref<HTMLElement | null>(null)
const advancedHeadingEl = ref<HTMLElement | null>(null)
const keyScaleHeadingEl = ref<HTMLElement | null>(null)
const compositionHeadingEl = ref<HTMLElement | null>(null)
const rhythmHeadingEl = ref<HTMLElement | null>(null)

watch(
  () => ui.selectedTab,
  () => {
    if (window.innerWidth < 768) {
      isVisualizerCollapsed.value = true
      requestAnimationFrame(() => {
        let target: HTMLElement | null = settingsSectionEl.value
        if (ui.selectedTab === 'advanced') target = advancedHeadingEl.value
        if (ui.selectedTab === 'key-scale') target = keyScaleHeadingEl.value
        if (ui.selectedTab === 'composition') target = compositionHeadingEl.value
        if (ui.selectedTab === 'rhythm') target = rhythmHeadingEl.value
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }
)

// If a scroll target is requested from elsewhere (e.g., header badges), honor it
watch(
  () => ui.scrollToAnchor,
  (anchor) => {
    if (!anchor) return
    const map: Record<string, HTMLElement | null> = {
      advanced: advancedHeadingEl.value,
      'key-scale': keyScaleHeadingEl.value,
      composition: compositionHeadingEl.value,
      rhythm: rhythmHeadingEl.value
    }
    const el = map[anchor]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    ui.clearScrollTarget()
  }
)

const noteCount = computed(() => melodyStore.melody?.notes?.filter((n) => n.pitch).length ?? 0)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Middle content area: Visualizer (collapsible on mobile), Generate button, Player -->
    <section class="rounded-xl p-4 md:p-6 flex flex-col gap-4 spotlight md:my-4">
      <!-- Mobile toggle for visualizer preview -->
      <div class="md:hidden -mt-1 mb-1 flex items-center justify-between text-zinc-300">
        <span class="text-sm"
          >Generated Melody
          <span v-if="noteCount" class="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 border border-zinc-700"
            >{{ noteCount }} notes</span
          ></span
        >
        <button
          class="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 flex items-center gap-1"
          @click="isVisualizerCollapsed = !isVisualizerCollapsed"
        >
          <i class="pi" :class="isVisualizerCollapsed ? 'pi-angle-down' : 'pi-angle-up'"></i>
          <span>{{ isVisualizerCollapsed ? 'Show' : 'Hide' }}</span>
        </button>
      </div>

      <div v-show="!isVisualizerCollapsed">
        <MelodyVisualizer />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="md:col-span-1">
          <MelodyGenerator />
        </div>
        <div class="md:col-span-2">
          <MelodyPlayer />
        </div>
      </div>
    </section>

    <!-- Settings content below the player, driven by top menu tab selection -->
    <section ref="settingsSectionEl" class="bg-zinc-900 rounded-lg p-4 md:p-6">
      <SettingsContent
        :active="ui.selectedTab"
        v-model:advancedHeadingEl="advancedHeadingEl"
        v-model:keyScaleHeadingEl="keyScaleHeadingEl"
        v-model:compositionHeadingEl="compositionHeadingEl"
        v-model:rhythmHeadingEl="rhythmHeadingEl"
      />
    </section>
  </div>
</template>
