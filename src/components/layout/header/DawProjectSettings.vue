<template>
  <div class="flex items-center gap-1.5">
    <!-- Root Key -->
    <select
      class="bg-daw-panel border-daw-border text-daw-text rounded-chip focus:border-daw-signal text-2xs cursor-pointer border px-2 py-1 font-mono font-semibold focus:outline-none"
      :value="projectStore.key"
      aria-label="Root Key"
      @change="onKeyChange"
    >
      <option v-for="k in ROOT_KEYS" :key="k" :value="k">
        {{ k }}
      </option>
    </select>

    <!-- Scale Selection with Groups -->
    <select
      class="bg-daw-panel border-daw-border text-daw-text rounded-chip focus:border-daw-signal text-2xs max-w-28 cursor-pointer truncate border px-2 py-1 font-mono focus:outline-none xl:max-w-36"
      :value="projectStore.scale"
      aria-label="Scale / Mode"
      @change="onScaleChange"
    >
      <optgroup v-for="group in scaleGroups" :key="group.category" :label="group.title">
        <option v-for="sc in group.scales" :key="sc.id" :value="sc.id">
          {{ sc.name }}
        </option>
      </optgroup>
    </select>

    <!-- Scale Lock Toggle (snap editing to the current scale) -->
    <DawIconButton
      :icon="uiStore.isScaleLocked ? Lock : LockOpen"
      size="sm"
      appearance="panel"
      variant="signal"
      :active="uiStore.isScaleLocked"
      title="Scale Lock (snap note creation & drags to the current scale) [K]"
      aria-label="Toggle Scale Lock"
      @click="uiStore.toggleScaleLocked()"
    />

    <div class="bg-daw-border mx-0.5 h-5 w-px" />

    <!-- Bar Length -->
    <select
      class="bg-daw-panel border-daw-border text-daw-text rounded-chip focus:border-daw-signal text-2xs cursor-pointer border px-1.5 py-1 font-mono focus:outline-none"
      :value="projectStore.bars"
      aria-label="Project Length in Bars"
      @change="onBarsChange"
    >
      <option v-for="barCount in barOptions" :key="barCount" :value="barCount">
        {{ barCount }} {{ barCount === 1 ? 'Bar' : 'Bars' }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Lock, LockOpen } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import { SUPPORTED_SCALES, type ScaleDefinition } from '@/core/theory/scale.engine'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { useProjectStore } from '@/stores/project.store'
  import { useUiStore } from '@/stores/ui.store'

  const projectStore = useProjectStore()
  const harmonyStore = useHarmonyStore()
  const uiStore = useUiStore()

  const ROOT_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
  const barOptions = computed(() => [...new Set([1, 2, 4, 6, 8, 12, 16, 32, projectStore.bars])].sort((a, b) => a - b))

  interface ScaleGroup {
    category: string
    title: string
    scales: ScaleDefinition[]
  }

  const scaleGroups = computed<ScaleGroup[]>(() => {
    return [
      {
        category: 'standard',
        title: 'Standard',
        scales: SUPPORTED_SCALES.filter((s) => s.category === 'standard')
      },
      {
        category: 'mode',
        title: 'Modes of Major',
        scales: SUPPORTED_SCALES.filter((s) => s.category === 'mode')
      },
      {
        category: 'jazz_blues',
        title: 'Jazz & Blues',
        scales: SUPPORTED_SCALES.filter((s) => s.category === 'jazz_blues')
      },
      {
        category: 'pentatonic',
        title: 'Pentatonic',
        scales: SUPPORTED_SCALES.filter((s) => s.category === 'pentatonic')
      },
      {
        category: 'symmetric_exotic',
        title: 'Exotic & World',
        scales: SUPPORTED_SCALES.filter((s) => s.category === 'symmetric_exotic')
      }
    ]
  })

  function onKeyChange(e: Event): void {
    const target = e.target as HTMLSelectElement
    const nextKey = target.value
    if (nextKey === projectStore.key) return
    harmonyStore.transposeToScale(nextKey, projectStore.scale)
    projectStore.setKey(nextKey)
  }

  function onScaleChange(e: Event): void {
    const target = e.target as HTMLSelectElement
    const nextScale = target.value
    if (nextScale === projectStore.scale) return
    harmonyStore.transposeToScale(projectStore.key, nextScale)
    projectStore.setScale(nextScale)
  }

  function onBarsChange(e: Event): void {
    const target = e.target as HTMLSelectElement
    const val = Number(target.value)
    if (!isNaN(val)) {
      projectStore.setBars(val)
    }
  }
</script>
