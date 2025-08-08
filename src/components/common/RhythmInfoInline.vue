<script setup lang="ts">
import { computed } from 'vue'
import { useRhythmStore } from '@/stores/rhythm.store'
import { useMelodyStore } from '@/stores/melody.store'

const rhythmStore = useRhythmStore()
const melodyStore = useMelodyStore()

function isCustomRhythm(rhythm: any): boolean {
  return rhythm && (rhythm.isCustom === true || rhythm.name === 'Custom')
}

const sourceRhythm = computed(() => {
  return melodyStore.lastUsedRhythm ?? rhythmStore.rhythm ?? (rhythmStore.useCustomRhythm ? { name: 'Custom' } : null)
})

const title = computed(() => {
  const r = sourceRhythm.value as any
  if (!r) return '—'
  if (isCustomRhythm(r)) return 'Custom'
  return r.name
})

const icon = computed(() => {
  const r = sourceRhythm.value as any
  if (!r) return 'pi-music-note'
  if (isCustomRhythm(r)) return 'pi-cog'
  if (r.category === 'euclidean') return 'pi-chart-pie'
  return 'pi-asterisk'
})

const showEuclideanRotation = computed(() => {
  const r = sourceRhythm.value as any
  return r && r.category === 'euclidean' && rhythmStore.euclideanRotation > 0
})
</script>

<template>
  <div class="flex items-center gap-2 text-sm text-zinc-300">
    <i :class="['pi', icon]" class="text-blue-400"></i>
    <span class="font-semibold">Rhythm:</span>
    <button class="font-medium text-blue-300 hover:underline" @click="$emit('navigateRhythm')">{{ title }}</button>
    <span v-if="showEuclideanRotation" class="text-xs text-gray-400"
      >(rotated {{ rhythmStore.euclideanRotation }})</span
    >
  </div>
</template>
