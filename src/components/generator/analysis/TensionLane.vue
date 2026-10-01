<template>
  <div class="flex flex-col gap-1">
    <span class="text-micro text-daw-text-muted">{{
      registerOnly ? 'Register tension per bar' : 'Tension per bar'
    }}</span>
    <div class="flex h-8 items-end gap-1" role="img" :aria-label="description">
      <div
        v-for="(value, index) in values"
        :key="index"
        class="bg-daw-chord rounded-chip flex-1"
        :style="{ height: `${Math.max(0, Math.min(1, value / 1.3)) * 100}%` }"
        :title="`Bar ${index + 1}: ${value.toFixed(2)}`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  const props = defineProps<{ values: number[]; registerOnly: boolean }>()
  // Core tension combines unit dissonance with up to 0.3 register height.
  const description = computed(
    () =>
      `${props.registerOnly ? 'Register tension' : 'Tension'}: ${props.values.map((value, index) => `bar ${index + 1} ${value.toFixed(2)}`).join(', ')}`
  )
</script>
