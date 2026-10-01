<template>
  <DawPresetList
    v-model:selected-category="categoryFilter"
    label="Rhythm presets"
    variant="pulse"
    :rows="presetRows"
    :selected-id="melodyStore.generatorParams.rhythmPresetId"
    :categories="categories"
    :on-dice="pickRandom"
    @select="melodyStore.setRhythmPreset"
  />
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import DawPresetList, { type PresetRow } from '@/components/common/DawPresetList.vue'
  import { getRhythmPresets, type RhythmCategory, type RhythmPreset } from '@/core/rhythm/presets'
  import { useMelodyStore } from '@/stores/melody.store'

  const melodyStore = useMelodyStore()

  type PresetCategoryFilter = 'all' | RhythmCategory

  const categoryFilter = ref<PresetCategoryFilter>('all')

  const categories: readonly { label: string; value: PresetCategoryFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Melody', value: 'melody' },
    { label: 'Bass', value: 'bass' },
    { label: 'World', value: 'world' }
  ]

  const filteredPresets = computed<readonly RhythmPreset[]>(() => {
    const all = getRhythmPresets()
    return categoryFilter.value === 'all' ? all : all.filter((preset) => preset.category === categoryFilter.value)
  })

  const presetRows = computed<PresetRow[]>(() =>
    filteredPresets.value.map((preset) => ({
      id: preset.id,
      name: preset.name,
      detail: `${preset.subdivision} · ${countHits(preset)} hits`,
      suggestion: describePreset(preset)
    }))
  )

  function countHits(preset: RhythmPreset): number {
    return preset.steps.filter((step) => step.isNote).length
  }

  function describePreset(preset: RhythmPreset): string {
    const headline = `${preset.name} — ${preset.subdivision}, ${countHits(preset)} hits`
    return preset.description ? `${headline}\n${preset.description}` : headline
  }

  function pickRandom(): void {
    melodyStore.pickRandomRhythmPreset(filteredPresets.value)
  }
</script>
