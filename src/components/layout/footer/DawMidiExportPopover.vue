<template>
  <div ref="exportPopoverRef" class="relative">
    <DawButton
      appearance="surface"
      variant="signal"
      size="md"
      :active="isExportOpen"
      :aria-expanded="isExportOpen"
      aria-haspopup="true"
      title="Export Project as MIDI File"
      @click="isExportOpen = !isExportOpen"
    >
      <Download class="text-daw-signal h-3.5 w-3.5" />
      <span>Export MIDI</span>
      <ChevronUp class="text-daw-text-muted h-3 w-3 transition-transform" :class="{ 'rotate-180': isExportOpen }" />
    </DawButton>

    <!-- Export Popover Card -->
    <div
      v-if="isExportOpen"
      class="bg-daw-panel border-daw-border rounded-panel animate-in fade-in zoom-in-95 absolute right-0 bottom-full z-50 mb-2 flex w-72 flex-col gap-1 border p-2 shadow-2xl duration-100"
    >
      <div class="border-daw-border flex items-center justify-between border-b px-2 py-1">
        <span class="text-daw-text text-2xs font-bold tracking-wider uppercase">Export MIDI</span>
        <span class="text-daw-signal text-micro font-mono font-medium"
          >{{ projectStore.key }} {{ projectStore.scale }} &bull; {{ projectStore.bpm }} BPM</span
        >
      </div>

      <DawButton
        block
        align="between"
        auto-height
        appearance="ghost"
        variant="signal"
        :title="leadFilename"
        class="px-2.5 py-2 text-left"
        @click="handleExport('melody-only')"
      >
        <div class="flex min-w-0 flex-col pr-2">
          <span class="font-medium">Lead Melody (.mid)</span>
          <span class="text-daw-text-muted text-micro truncate font-mono">{{ leadFilename }}</span>
        </div>
        <FileDown class="h-4 w-4 shrink-0 opacity-70" />
      </DawButton>

      <DawButton
        block
        align="between"
        auto-height
        appearance="ghost"
        variant="chord"
        :title="chordsFilename"
        class="px-2.5 py-2 text-left"
        @click="handleExport('chords-only')"
      >
        <div class="flex min-w-0 flex-col pr-2">
          <span class="font-medium">Chords (.mid)</span>
          <span class="text-daw-text-muted text-micro truncate font-mono">{{ chordsFilename }}</span>
        </div>
        <FileDown class="h-4 w-4 shrink-0 opacity-70" />
      </DawButton>

      <div class="bg-daw-border my-0.5 h-px w-full" />

      <DawButton
        block
        align="between"
        auto-height
        appearance="surface"
        variant="signal"
        :title="fullFilename"
        class="px-2.5 py-2 text-left"
        @click="handleExport('full')"
      >
        <div class="flex min-w-0 flex-col pr-2">
          <span class="font-semibold">Multi-Track MIDI (.mid)</span>
          <span class="text-daw-text-muted text-micro truncate font-mono">{{ fullFilename }}</span>
        </div>
        <Check v-if="justExported" class="text-daw-pulse h-4 w-4 shrink-0" />
        <FileDown v-else class="h-4 w-4 shrink-0" />
      </DawButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { onClickOutside } from '@vueuse/core'
  import { Check, ChevronUp, Download, FileDown } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { buildMidiBlob, generateMidiFilename, type ExportMode } from '@/core/midi/midi-exporter'
  import { downloadMidiFile } from '@/services/midi-download'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useProjectStore } from '@/stores/project.store'

  const harmonyStore = useHarmonyStore()
  const melodyStore = useMelodyStore()
  const projectStore = useProjectStore()

  const isExportOpen = ref(false)
  const justExported = ref(false)
  const exportPopoverRef = ref<HTMLElement | null>(null)

  onClickOutside(exportPopoverRef, () => {
    isExportOpen.value = false
  })

  const leadFilename = computed(() =>
    generateMidiFilename({
      key: projectStore.key,
      scale: projectStore.scale,
      bpm: projectStore.bpm,
      bars: projectStore.bars,
      mode: 'melody-only'
    })
  )

  const chordsFilename = computed(() =>
    generateMidiFilename({
      key: projectStore.key,
      scale: projectStore.scale,
      bpm: projectStore.bpm,
      bars: projectStore.bars,
      mode: 'chords-only'
    })
  )

  const fullFilename = computed(() =>
    generateMidiFilename({
      key: projectStore.key,
      scale: projectStore.scale,
      bpm: projectStore.bpm,
      bars: projectStore.bars,
      mode: 'full'
    })
  )

  function handleExport(mode: ExportMode): void {
    const filename =
      mode === 'melody-only' ? leadFilename.value : mode === 'chords-only' ? chordsFilename.value : fullFilename.value

    const blob = buildMidiBlob(melodyStore.notes, harmonyStore.chords, projectStore.bpm, {
      mode,
      key: projectStore.key,
      scale: projectStore.scale,
      swing: projectStore.swing,
      timingLooseness: projectStore.timingLooseness
    })

    downloadMidiFile(blob, filename)

    justExported.value = true
    setTimeout(() => {
      justExported.value = false
      isExportOpen.value = false
    }, 600)
  }
</script>
