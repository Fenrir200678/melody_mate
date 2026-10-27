<template>
  <div class="text-daw-text-muted text-2xs flex items-center gap-3">
    <div class="flex shrink-0 items-center gap-2" title="Playback follows the DAW transport and tempo">
      <Link2 class="h-3 w-3" :class="hostBpm === null ? 'text-daw-text-muted' : 'text-daw-pulse'" aria-hidden="true" />
      <span v-if="hostBpm !== null" class="text-daw-text font-mono tabular-nums"
        >{{ hostBpm.toFixed(1) }} <span class="text-daw-text-muted">BPM</span></span
      >
      <span v-else>Waiting for host</span>
    </div>
    <span class="bg-daw-border h-3 w-px shrink-0" aria-hidden="true" />
    <div class="flex min-w-0 items-center gap-1" :title="status" role="status" aria-live="polite">
      <Check v-if="status === 'Stored in plugin instance'" class="text-daw-pulse h-3 w-3 shrink-0" aria-hidden="true" />
      <CircleDot
        v-else
        class="h-3 w-3 shrink-0"
        :class="ready ? 'text-daw-signal' : 'text-daw-text-muted'"
        aria-hidden="true"
      />
      <span class="truncate">{{ status }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Check, CircleDot, Link2 } from '@lucide/vue'

  defineProps<{ status: string; hostBpm: number | null; ready: boolean }>()
</script>
