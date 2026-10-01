<template>
  <aside
    class="bg-daw-panel font-ui text-daw-text flex h-full min-h-0 flex-col select-none"
    aria-label="Melody expression and pitch"
  >
    <!-- Header (Strictly 48px / h-12 to align with Piano Roll Toolbar & Generator Panel) -->
    <div
      class="border-daw-border bg-daw-panel sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b px-3"
    >
      <div class="flex min-w-0 items-center gap-2">
        <SlidersHorizontal class="text-daw-signal h-3.5 w-3.5 shrink-0" />
        <h2 tabindex="-1" class="text-daw-text text-2xs truncate font-bold tracking-wider uppercase">
          Pitch &amp; Feel
        </h2>
      </div>

      <DawIconButton
        :icon="hasOpenModules ? ChevronsDownUp : ChevronsUpDown"
        size="sm"
        :title="hasOpenModules ? 'Collapse all modules' : 'Expand all modules'"
        @click="toggleAllModules"
      />
    </div>

    <!-- Panel Content: Pitch, Harmony, Feel, Analysis -->
    <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
      <PitchModule class="shrink-0" />
      <HarmonyModule class="shrink-0" />
      <FeelModule class="shrink-0" />
      <AnalysisModule class="shrink-0" />
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ChevronsDownUp, ChevronsUpDown, SlidersHorizontal } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import AnalysisModule from '@/components/generator/analysis/AnalysisModule.vue'
  import FeelModule from '@/components/generator/melody/FeelModule.vue'
  import HarmonyModule from '@/components/generator/melody/HarmonyModule.vue'
  import PitchModule from '@/components/generator/melody/PitchModule.vue'
  import { EXPRESSION_PANEL_MODULE_KEYS, useModuleLayoutStore } from '@/stores/module-layout.store'

  const moduleLayout = useModuleLayoutStore()
  const hasOpenModules = computed(() => EXPRESSION_PANEL_MODULE_KEYS.some((key) => moduleLayout.isModuleOpen(key)))

  function toggleAllModules(): void {
    moduleLayout.setModulesOpen(EXPRESSION_PANEL_MODULE_KEYS, !hasOpenModules.value)
  }
</script>
