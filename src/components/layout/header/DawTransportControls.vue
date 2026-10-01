<template>
  <div class="flex items-center gap-1.5 xl:gap-2">
    <!-- Playback Group -->
    <div class="flex items-center gap-1">
      <!-- Play / Pause Button -->
      <DawButton
        class="w-20 justify-center"
        size="sm"
        :appearance="audioStore.isPlaying ? 'primary' : 'surface'"
        :variant="audioStore.isPlaying ? 'signal' : 'default'"
        :title="audioStore.isPlaying ? 'Pause (Space)' : 'Play (Space)'"
        aria-label="Toggle playback"
        @click="togglePlayback"
      >
        <Pause v-if="audioStore.isPlaying" class="h-3.5 w-3.5 fill-current" />
        <Play v-else class="ml-0.5 h-3.5 w-3.5 fill-current" />
        <span class="text-2xs font-semibold tracking-wide">
          {{ audioStore.isPlaying ? 'PAUSE' : 'PLAY' }}
        </span>
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

      <!-- Timecode: POS Bar.Beat.Step -->
      <div
        class="bg-daw-panel border-daw-border rounded-chip text-2xs text-daw-text flex items-center gap-1 border px-2 py-1 font-mono font-bold tabular-nums select-none"
        title="Playhead Position (Bar.Beat.Step)"
      >
        <span class="text-daw-text-muted text-micro font-medium">POS</span>
        <span class="text-daw-signal">{{ timecodeDisplay }}</span>
      </div>
    </div>

    <div class="bg-daw-border mx-0.5 h-5 w-px" />

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
          class="text-2xs px-1.5 py-0.5 font-mono font-medium tracking-tight select-none"
          :class="projectStore.isLooping ? 'text-daw-signal' : 'text-daw-text-muted'"
          :title="`Active Loop Region: ${loopRangeLabel}`"
        >
          {{ loopRangeLabel }}
        </span>
      </div>

      <!-- Play from Loop Start Toggle -->
      <DawIconButton
        :icon="ArrowRightFromLine"
        size="sm"
        appearance="panel"
        variant="signal"
        :active="uiStore.playFromLoopStart"
        :title="
          uiStore.playFromLoopStart
            ? 'Play from Loop Start: On (Starts playback at loop region start)'
            : 'Play from Loop Start: Off (Starts playback from current position / beginning)'
        "
        aria-label="Toggle play from loop start"
        @click="uiStore.togglePlayFromLoopStart()"
      />

      <!-- Return to Start on Pause Toggle -->
      <DawIconButton
        :icon="SkipBack"
        size="sm"
        appearance="panel"
        variant="signal"
        :active="uiStore.returnToStartOnPause"
        :title="
          uiStore.returnToStartOnPause
            ? 'Return to Start on Pause: On (Home jumps to start)'
            : 'Return to Start on Pause: Off (Home jumps to start)'
        "
        aria-label="Toggle return to start on pause"
        @click="uiStore.toggleReturnToStartOnPause()"
      />
    </div>

    <div class="bg-daw-border mx-0.5 h-5 w-px" />

    <!-- BPM -->
    <div class="flex items-center gap-1">
      <label for="daw-bpm-input" class="text-daw-text-muted text-micro uppercase">BPM</label>
      <input
        id="daw-bpm-input"
        type="number"
        min="40"
        max="280"
        class="bg-daw-panel border-daw-border text-daw-text rounded-chip focus:border-daw-signal w-13 border px-1 py-0.5 text-center font-mono text-xs font-bold tabular-nums focus:outline-none"
        :value="projectStore.bpm"
        @change="onBpmChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ArrowRightFromLine, Pause, Play, Repeat, SkipBack, Square } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
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
