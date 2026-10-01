<template>
  <div class="flex items-center gap-3">
    <DawButton
      appearance="surface"
      variant="chord"
      size="md"
      :icon="Volume2"
      title="Audition selected chord voicing"
      @click="emit('audition')"
    >
      <div class="flex items-baseline gap-1.5">
        <span class="text-daw-chord font-mono text-sm font-bold">{{ chord.roman }}</span>
        <span class="text-daw-text text-sm font-semibold">{{ chord.name }}</span>
      </div>
    </DawButton>

    <div class="flex flex-col gap-0.5">
      <div class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full" :class="theme.dot" />
        <span class="text-micro font-medium tracking-wider uppercase" :class="theme.text">
          {{ FUNCTION_LABELS[chordFunction] }}
        </span>
      </div>
      <span class="text-daw-text-muted text-micro font-mono">{{ timingLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Volume2 } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import type { ChordEvent } from '@/core/schemas/chord.schema'
  import type { ChordFunction } from '@/core/theory/chord-function'
  import { FUNCTION_LABELS, FUNCTION_THEME } from '@/utils/harmony/chordFunctionTheme'

  const props = defineProps<{
    chord: ChordEvent
    chordFunction: ChordFunction
    timingLabel: string
  }>()

  const emit = defineEmits<{
    audition: []
  }>()

  const theme = computed(() => FUNCTION_THEME[props.chordFunction])
</script>
