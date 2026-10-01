<template>
  <section
    id="arp-studio-dock"
    class="border-daw-border bg-daw-panel flex min-h-0 shrink-0 flex-col overflow-hidden border-t select-none"
    :style="{ height: `${effectiveHeight}px` }"
    aria-labelledby="arp-studio-title"
    @focusin="uiStore.setActiveHistoryContext('piano')"
    @pointerdown="uiStore.setActiveHistoryContext('piano')"
  >
    <DawResizeHandle
      :model-value="effectiveHeight"
      orientation="horizontal"
      side="bottom"
      :min="ARP_STUDIO_MIN_HEIGHT"
      :max="maxDockHeight"
      :default-value="ARP_STUDIO_DEFAULT_HEIGHT"
      label="Resize Arp Studio"
      @update:model-value="uiStore.setArpStudioHeight"
    />

    <!-- Dock Header -->
    <header class="border-daw-border flex h-9 shrink-0 items-center justify-between gap-2 border-b px-3">
      <div class="flex min-w-0 items-center gap-2">
        <ArrowUpDown class="text-daw-signal h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <h2 id="arp-studio-title" class="text-daw-text text-2xs shrink-0 font-bold tracking-wider uppercase">
          Arp Studio
        </h2>
        <p
          class="text-daw-text-muted text-micro leading-normal"
          title="Arp Studio is a standalone arpeggiator guided by chords and rate. Lead melody parameters (motif form, contour, call & response) do not apply to arpeggios."
        >
          <span class="font-medium">&middot; Standalone Engine: Independent of lead melody motifs & contour.</span>
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <ArpStudioActions />
        <DawIconButton
          :icon="X"
          size="sm"
          appearance="ghost"
          aria-label="Close Arp Studio"
          title="Close Arp Studio (A)"
          @click="emit('close')"
        />
      </div>
    </header>

    <!-- Dock Body: Controls on Left, Visualizer & Chord Context on Right -->
    <div
      class="divide-daw-border grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(18rem,1fr)] divide-x overflow-hidden"
    >
      <ArpStudioControls />
      <div class="flex min-h-0 flex-col overflow-hidden p-2">
        <ArpStudioVisualizer :candidate="melodyStore.arpCandidate" :state="melodyStore.arpCandidateState" />
        <ArpStudioChords class="mt-2" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { ArrowUpDown, X } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawResizeHandle from '@/components/common/DawResizeHandle.vue'
  import { useMelodyStore } from '@/stores/melody.store'
  import {
    ARP_STUDIO_DEFAULT_HEIGHT,
    ARP_STUDIO_MAX_HEIGHT,
    ARP_STUDIO_MIN_HEIGHT,
    STUDIO_MIN_ROLL_HEIGHT,
    useUiStore
  } from '@/stores/ui.store'
  import ArpStudioActions from './arp-studio/ArpStudioActions.vue'
  import ArpStudioChords from './arp-studio/ArpStudioChords.vue'
  import ArpStudioControls from './arp-studio/ArpStudioControls.vue'
  import ArpStudioVisualizer from './arp-studio/ArpStudioVisualizer.vue'

  const emit = defineEmits<{ close: [] }>()
  const uiStore = useUiStore()
  const melodyStore = useMelodyStore()
  const maxDockHeight = ref(ARP_STUDIO_MAX_HEIGHT)
  const effectiveHeight = computed(() =>
    Math.max(ARP_STUDIO_MIN_HEIGHT, Math.min(uiStore.arpStudioHeight, maxDockHeight.value))
  )

  function updateMaxDockHeight(): void {
    const shell = document.querySelector<HTMLElement>('.daw-shell')
    const header = document.querySelector<HTMLElement>('.daw-header')
    const footer = document.querySelector<HTMLElement>('.daw-footer')
    const available =
      shell && header && footer
        ? shell.clientHeight - header.clientHeight - footer.clientHeight - STUDIO_MIN_ROLL_HEIGHT
        : ARP_STUDIO_MAX_HEIGHT
    maxDockHeight.value = Math.max(ARP_STUDIO_MIN_HEIGHT, Math.min(ARP_STUDIO_MAX_HEIGHT, available))
  }

  onMounted(() => {
    updateMaxDockHeight()
    window.addEventListener('resize', updateMaxDockHeight)
  })

  // Any input or model change replaces the candidate and ends a running audition of the old one.
  watch(
    () => melodyStore.arpInputsKey,
    () => melodyStore.syncArpCandidate(),
    { immediate: true }
  )
  watch(
    () => melodyStore.arpModelStatus,
    () => melodyStore.syncArpCandidate()
  )

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateMaxDockHeight)
    melodyStore.stopArpAudition()
    melodyStore.discardArpCandidate()
  })
</script>
