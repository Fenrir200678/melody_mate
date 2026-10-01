<template>
  <aside
    class="bg-daw-panel font-ui text-daw-text flex h-full min-h-0 flex-col select-none"
    aria-label="Melody generator"
  >
    <div
      class="border-daw-border bg-daw-panel sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b px-3"
    >
      <div class="flex min-w-0 items-center gap-2">
        <Sparkles class="text-daw-signal h-3.5 w-3.5 shrink-0" />
        <h2 class="text-daw-text text-2xs truncate font-bold tracking-wider uppercase">Generator</h2>
      </div>

      <DawIconButton
        :icon="hasOpenModules ? ChevronsDownUp : ChevronsUpDown"
        size="sm"
        :title="hasOpenModules ? 'Collapse all modules' : 'Expand all modules'"
        @click="toggleAllModules"
      />
    </div>

    <!-- Panel Content: Modular Collapsible Rack Stack -->
    <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
      <RhythmModule class="shrink-0" />
      <MotifModule class="shrink-0" />
      <ContourModule class="shrink-0" />
      <VariationModule class="shrink-0" />
      <TakeRackModule class="shrink-0" />
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ChevronsDownUp, ChevronsUpDown, Sparkles } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import ContourModule from '@/components/generator/melody/ContourModule.vue'
  import MotifModule from '@/components/generator/melody/MotifModule.vue'
  import RhythmModule from '@/components/generator/melody/RhythmModule.vue'
  import VariationModule from '@/components/generator/melody/VariationModule.vue'
  import TakeRackModule from '@/components/generator/takes/TakeRackModule.vue'
  import { GENERATOR_PANEL_MODULE_KEYS, useModuleLayoutStore } from '@/stores/module-layout.store'

  const moduleLayout = useModuleLayoutStore()
  const hasOpenModules = computed(() => GENERATOR_PANEL_MODULE_KEYS.some((key) => moduleLayout.isModuleOpen(key)))

  function toggleAllModules(): void {
    moduleLayout.setModulesOpen(GENERATOR_PANEL_MODULE_KEYS, !hasOpenModules.value)
  }
</script>
