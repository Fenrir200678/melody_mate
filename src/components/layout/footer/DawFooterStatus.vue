<template>
  <div class="flex items-center gap-3">
    <!-- Notes Count Chip -->
    <div
      class="footer-note-count bg-daw-surface rounded-chip border-daw-border text-daw-text flex items-center gap-1 border px-2 py-0.5 font-mono text-xs tabular-nums"
    >
      <Music class="text-daw-signal h-3 w-3" />
      <span>{{ notesDisplay }}</span>
    </div>

    <!-- Master Status -->
    <div
      class="footer-master-status"
      :title="`Master peak ${masterPeakLabel}; output protection ${protectionLabel}`"
      role="status"
      aria-label="Master output status"
    >
      <span class="text-daw-text-muted">MASTER</span>
      <span class="footer-master-meter" aria-hidden="true">
        <span :style="{ width: `${masterMeterPercent}%` }" />
      </span>
      <span class="text-daw-text tabular-nums">{{ masterPeakLabel }}</span>
      <span :class="mixerStore.protectionStatus === 'active' ? 'text-daw-pulse' : 'text-daw-chord'">
        {{ protectionLabel }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { Music } from '@lucide/vue'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useMixerStore } from '@/stores/mixer.store'

  const melodyStore = useMelodyStore()
  const mixerStore = useMixerStore()

  const masterPeakDb = ref(-Infinity)
  let meterTimer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    meterTimer = setInterval(() => {
      const readings = mixerStore.getMasterMeterReadings()
      const output = readings?.postProtection ?? readings?.postMaster
      masterPeakDb.value = output ? Math.max(output.leftPeakDb, output.rightPeakDb) : -Infinity
    }, 100)
  })

  onUnmounted(() => {
    if (meterTimer !== undefined) {
      clearInterval(meterTimer)
    }
  })

  const masterMeterPercent = computed(() =>
    Number.isFinite(masterPeakDb.value) ? Math.max(0, Math.min(100, ((masterPeakDb.value + 48) / 48) * 100)) : 0
  )

  const masterPeakLabel = computed(() =>
    Number.isFinite(masterPeakDb.value) ? `${masterPeakDb.value.toFixed(1)} dB` : '-∞ dB'
  )

  const protectionLabel = computed(() => {
    switch (mixerStore.protectionStatus) {
      case 'active':
        return 'Protected'
      case 'fallback':
        return 'Fallback'
      case 'failed':
        return 'Unavailable'
      case 'loading':
        return 'Loading'
      default:
        return 'Idle'
    }
  })

  const notesDisplay = computed(() => {
    const total = melodyStore.notes.length
    const selected = melodyStore.selectedNoteIds.length
    if (selected > 0) {
      return `${total} Notes (${selected} sel)`
    }
    return `${total} Notes`
  })
</script>
