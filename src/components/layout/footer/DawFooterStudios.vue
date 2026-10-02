<template>
  <div class="flex items-center gap-1.5 sm:gap-2">
    <!-- Rhythm Studio Dock Trigger -->
    <DawButton
      id="rhythm-studio-toggle"
      appearance="surface"
      variant="pulse"
      size="md"
      :active="uiStore.isRhythmStudioOpen"
      :aria-expanded="uiStore.isRhythmStudioOpen"
      aria-controls="rhythm-studio-dock"
      aria-label="Toggle Rhythm Studio"
      title="Toggle Rhythm Studio (R)"
      @click="toggleRhythmStudio"
    >
      <AudioLines class="text-daw-pulse h-3.5 w-3.5" />
      <span class="hidden xl:inline">Rhythm Studio</span>
      <ChevronUp
        class="text-daw-text-muted h-3 w-3 transition-transform"
        :class="{ 'rotate-180': uiStore.isRhythmStudioOpen }"
      />
    </DawButton>

    <!-- Arp Studio Dock Trigger -->
    <DawButton
      id="arp-studio-toggle"
      appearance="surface"
      variant="signal"
      size="md"
      :active="uiStore.isArpStudioOpen"
      :aria-expanded="uiStore.isArpStudioOpen"
      aria-controls="arp-studio-dock"
      aria-label="Toggle Arp Studio"
      title="Toggle Arp Studio (A)"
      @click="uiStore.toggleArpStudio()"
    >
      <ListMusic class="text-daw-signal h-3.5 w-3.5" aria-hidden="true" />
      <span class="hidden xl:inline">Arp Studio</span>
      <ChevronUp
        class="text-daw-text-muted h-3 w-3 transition-transform"
        :class="{ 'rotate-180': uiStore.isArpStudioOpen }"
        aria-hidden="true"
      />
    </DawButton>

    <!-- Chord Studio Dock Trigger -->
    <DawButton
      id="chord-studio-toggle"
      appearance="surface"
      variant="chord"
      size="md"
      :active="uiStore.isChordStudioOpen"
      :aria-expanded="uiStore.isChordStudioOpen"
      aria-controls="chord-studio-dock"
      aria-label="Toggle Chord Studio"
      title="Toggle Chord Studio (C)"
      @click="uiStore.toggleChordStudio()"
    >
      <Music2 class="text-daw-chord h-3.5 w-3.5" />
      <span class="hidden xl:inline">Chord Studio</span>
      <span
        v-if="harmonyStore.chords.length > 0"
        class="rounded-chip bg-daw-panel border-daw-border/60 text-micro py-0.2 px-1 font-mono leading-none"
        :class="uiStore.isChordStudioOpen ? 'text-daw-chord' : 'text-daw-text-muted'"
      >
        {{ harmonyStore.chords.length }}
      </span>
      <ChevronUp
        class="text-daw-text-muted h-3 w-3 transition-transform"
        :class="{ 'rotate-180': uiStore.isChordStudioOpen }"
      />
    </DawButton>

    <DawButton
      id="sound-mix-toggle"
      appearance="surface"
      variant="signal"
      size="md"
      :active="uiStore.isSoundDockOpen"
      :aria-expanded="uiStore.isSoundDockOpen"
      aria-controls="sound-mix-dock"
      aria-label="Toggle Sound and Mix"
      title="Toggle Sound & Mix (S)"
      @click="uiStore.toggleSoundDock()"
    >
      <AudioLines class="text-daw-signal h-3.5 w-3.5" aria-hidden="true" />
      <span class="hidden xl:inline">Sound &amp; Mix</span>
      <ChevronUp
        class="text-daw-text-muted h-3 w-3 transition-transform"
        :class="{ 'rotate-180': uiStore.isSoundDockOpen }"
        aria-hidden="true"
      />
    </DawButton>
  </div>
</template>

<script setup lang="ts">
  import { AudioLines, ChevronUp, ListMusic, Music2 } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useUiStore } from '@/stores/ui.store'

  const harmonyStore = useHarmonyStore()
  const melodyStore = useMelodyStore()
  const uiStore = useUiStore()

  function toggleRhythmStudio(): void {
    if (!uiStore.isRhythmStudioOpen) {
      melodyStore.setRhythmMode('custom')
    } else {
      uiStore.setRhythmStudioOpen(false)
    }
  }
</script>
