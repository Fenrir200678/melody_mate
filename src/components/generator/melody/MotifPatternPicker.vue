<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <label class="text-daw-text-muted text-2xs font-medium">Motif Pattern</label>
      <span v-if="disabled && disabledReason" class="text-daw-signal text-micro font-mono tracking-tight">
        {{ disabledReason }}
      </span>
      <span v-else class="text-daw-signal text-micro font-mono" :title="motifHint[model]">{{ model }}</span>
    </div>
    <DawSegmented
      v-model="model"
      :options="motifOptions"
      :disabled="disabled"
      :disabled-reason="disabledReason"
      size="sm"
      grow
      wrap
      aria-label="Motif pattern"
    />
  </div>
</template>

<script setup lang="ts">
  import DawSegmented from '@/components/common/DawSegmented.vue'
  import type { MotifPattern } from '@/core/schemas/generator.schema'
  import { motifHint, motifOptions } from '@/utils/motif-options'

  interface MotifPatternPickerProps {
    disabled?: boolean
    /** Tooltip explaining why the picker is unavailable, e.g. "Overridden by Call & Response". */
    disabledReason?: string
  }

  withDefaults(defineProps<MotifPatternPickerProps>(), {
    disabled: false,
    disabledReason: undefined
  })

  const model = defineModel<MotifPattern>({ required: true })
</script>
