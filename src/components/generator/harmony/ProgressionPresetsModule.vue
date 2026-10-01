<template>
  <DawModule
    v-model="isOpen"
    title="Progression Presets"
    role-dot="chord"
    badge-color="chord"
    :badge="`${filteredProgressions.length} styles`"
  >
    <DawPresetList
      v-model:selected-category="categoryFilter"
      label="Progressions"
      variant="chord"
      :rows="presetRows"
      :selected-id="harmonyStore.selectedProgressionId"
      :categories="PROGRESSION_CATEGORIES"
      :on-dice="pickRandom"
      @select="selectProgression"
    />
  </DawModule>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawModule from '@/components/common/DawModule.vue'
  import DawPresetList, { type PresetRow } from '@/components/common/DawPresetList.vue'
  import {
    describeProgression,
    formatRoman,
    getProgressionRoman,
    PROGRESSION_CATEGORIES,
    useProgressionPresets
  } from '@/composables/harmony/useProgressionPresets'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import { useHarmonyStore } from '@/stores/harmony.store'

  const harmonyStore = useHarmonyStore()
  const isOpen = useModuleOpenState('progression-presets')

  const { categoryFilter, filteredProgressions, selectProgression, pickRandom } = useProgressionPresets()

  const presetRows = computed<PresetRow[]>(() =>
    filteredProgressions.value.map((prog) => ({
      id: prog.id,
      name: prog.name,
      detail: formatRoman(getProgressionRoman(prog)),
      suggestion: describeProgression(prog)
    }))
  )
</script>
