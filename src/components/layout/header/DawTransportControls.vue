<template>
  <div class="flex items-center gap-1 xl:gap-1.5">
    <!-- Playback Group -->
    <div class="flex items-center gap-1">
      <!-- Play / Pause Button -->
      <DawButton
        class="w-8 justify-center px-0 xl:w-9"
        size="sm"
        :appearance="audioStore.isPlaying ? 'primary' : 'surface'"
        :variant="audioStore.isPlaying ? 'signal' : 'default'"
        :title="audioStore.isPlaying ? 'Pause (Space)' : 'Play (Space)'"
        aria-label="Toggle playback"
        @click="togglePlayback"
      >
        <Pause v-if="audioStore.isPlaying" class="h-3.5 w-3.5 fill-current" />
        <Play v-else class="ml-0.5 h-3.5 w-3.5 fill-current" />
      </DawButton>

      <!-- Stop Button -->
      <DawIconButton
        size="sm"
        appearance="panel"
        :title="
          uiStore.playFromLoopStart && projectStore.isLooping
            ? 'Stop & Return to Loop Start (2x: Bar 1)'
            : 'Stop & Return to Bar 1'
        "
        aria-label="Stop playback"
        @click="handleStop"
      >
        <Square class="h-3.5 w-3.5 fill-current" />
      </DawIconButton>

      <!-- Timecode: Bar.Beat.Step -->
      <div
        class="bg-daw-panel border-daw-border rounded-chip text-2xs text-daw-signal border px-1.5 py-0.5 font-mono font-bold tabular-nums select-none xl:px-2 xl:py-1"
        title="Playhead Position (Bar.Beat.Step)"
      >
        {{ timecodeDisplay }}
      </div>
    </div>

    <div class="bg-daw-border mx-0.5 h-4 w-px" />

    <!-- Loop Cluster -->
    <div class="flex items-center gap-1">
      <!-- Loop Toggle & Range Badge Container -->
      <div
        class="bg-daw-panel border-daw-border rounded-chip flex items-center border p-0.5"
        role="group"
        aria-label="Loop Region"
      >
        <!-- Loop Toggle Button -->
        <DawIconButton
          :icon="Repeat"
          size="xs"
          appearance="ghost"
          variant="signal"
          :active="projectStore.isLooping"
          :title="projectStore.isLooping ? 'Disable Loop (L)' : 'Enable Loop (L)'"
          aria-label="Toggle loop"
          @click="toggleLoop"
        />

        <!-- Loop Range Label -->
        <span
          class="text-2xs px-1 py-0.5 font-mono font-medium tracking-tight select-none xl:px-1.5"
          :class="projectStore.isLooping ? 'text-daw-signal' : 'text-daw-text-muted'"
          :title="`Active Loop Region: ${loopRangeLabel}`"
        >
          <span class="hidden xl:inline">{{ loopRangeLabel }}</span>
          <span class="xl:hidden">{{ loopRangeLabelCompact }}</span>
        </span>
      </div>

      <!-- Accessible Transport Options Popover -->
      <div class="flex items-center">
        <DawPopover side="bottom" align="center" content-class="p-2 w-56 flex flex-col gap-1.5">
          <template #default="{ isOpen, toggle }">
            <DawIconButton
              :icon="MoreHorizontal"
              size="sm"
              appearance="panel"
              variant="signal"
              :active="isOpen || uiStore.playFromLoopStart || uiStore.returnToStartOnPause"
              title="Transport playback options"
              aria-label="Transport playback options"
              @click="toggle"
            />
          </template>
          <template #content>
            <div
              class="border-daw-border text-daw-text-muted text-2xs border-b px-1 pb-1 font-bold tracking-wider uppercase"
            >
              Playback options
            </div>
            <button
              type="button"
              class="hover:bg-daw-panel rounded-control flex cursor-pointer items-center justify-between gap-2 p-1.5 text-xs transition-colors"
              @click="uiStore.togglePlayFromLoopStart()"
            >
              <span class="flex items-center gap-2">
                <ArrowRightFromLine
                  class="h-3.5 w-3.5"
                  :class="uiStore.playFromLoopStart ? 'text-daw-signal' : 'text-daw-text-muted'"
                />
                <span :class="uiStore.playFromLoopStart ? 'text-daw-signal font-medium' : 'text-daw-text'">
                  Play from loop start
                </span>
              </span>
              <span
                class="text-micro font-mono font-bold"
                :class="uiStore.playFromLoopStart ? 'text-daw-signal' : 'text-daw-text-muted'"
              >
                {{ uiStore.playFromLoopStart ? 'ON' : 'OFF' }}
              </span>
            </button>
            <button
              type="button"
              class="hover:bg-daw-panel rounded-control flex cursor-pointer items-center justify-between gap-2 p-1.5 text-xs transition-colors"
              @click="uiStore.toggleReturnToStartOnPause()"
            >
              <span class="flex items-center gap-2">
                <SkipBack
                  class="h-3.5 w-3.5"
                  :class="uiStore.returnToStartOnPause ? 'text-daw-signal' : 'text-daw-text-muted'"
                />
                <span :class="uiStore.returnToStartOnPause ? 'text-daw-signal font-medium' : 'text-daw-text'">
                  Return on pause
                </span>
              </span>
              <span
                class="text-micro font-mono font-bold"
                :class="uiStore.returnToStartOnPause ? 'text-daw-signal' : 'text-daw-text-muted'"
              >
                {{ uiStore.returnToStartOnPause ? 'ON' : 'OFF' }}
              </span>
            </button>
          </template>
        </DawPopover>
      </div>
    </div>

    <div class="bg-daw-border mx-0.5 h-4 w-px" />

    <!-- BPM -->
    <div class="flex items-center gap-1">
      <input
        id="daw-bpm-input"
        type="number"
        min="40"
        max="280"
        class="bg-daw-panel border-daw-border text-daw-text rounded-chip focus:border-daw-signal w-9.5 border px-0.5 py-0.5 text-center font-mono text-xs font-bold tabular-nums focus:outline-none sm:w-10.5 xl:w-12 xl:px-1"
        :value="projectStore.bpm"
        title="Tempo (BPM)"
        aria-label="Tempo (BPM)"
        @change="onBpmChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ArrowRightFromLine, MoreHorizontal, Pause, Play, Repeat, SkipBack, Square } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawPopover from '@/components/common/DawPopover.vue'
  import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
  import { useAudioStore } from '@/stores/audio.store'
  import { useProjectStore } from '@/stores/project.store'
  import { useUiStore } from '@/stores/ui.store'

  const audioStore = useAudioStore()
  const projectStore = useProjectStore()
  const uiStore = useUiStore()

  const stepsPerBar = computed(() => STEPS_PER_BAR)
  const startBar = computed(() => Math.floor(projectStore.loopStartStep / stepsPerBar.value) + 1)
  const endBar = computed(() => Math.max(startBar.value, Math.ceil(projectStore.loopEndStep / stepsPerBar.value)))

  const timecodeDisplay = computed(() => {
    const step = audioStore.currentStep
    const bar = Math.floor(step / 16) + 1
    const beat = Math.floor((step % 16) / 4) + 1
    const sixteenth = (step % 4) + 1

    return `${String(bar).padStart(2, '0')}.${String(beat).padStart(2, '0')}.${String(sixteenth).padStart(2, '0')}`
  })

  const loopRangeLabel = computed(() => {
    return startBar.value === endBar.value ? `Bar ${startBar.value}` : `Bars ${startBar.value}–${endBar.value}`
  })

  const loopRangeLabelCompact = computed(() => {
    return startBar.value === endBar.value ? `${startBar.value}` : `${startBar.value}–${endBar.value}`
  })

  function togglePlayback(): void {
    if (audioStore.isPlaying) {
      audioStore.pause()
    } else {
      void audioStore.play()
    }
  }

  function handleStop(): void {
    audioStore.stop()
  }

  function toggleLoop(): void {
    const next = !projectStore.isLooping
    projectStore.setLooping(next)
    audioStore.setLooping(next)
  }

  function onBpmChange(e: Event): void {
    const target = e.target as HTMLInputElement
    const val = Number(target.value)
    if (!isNaN(val)) {
      projectStore.setBpm(val)
      audioStore.setBpm(projectStore.bpm)
    }
  }
</script>
