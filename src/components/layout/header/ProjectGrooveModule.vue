<template>
  <DawModule v-model="isOpen" title="Groove" role-dot="pulse" badge-color="pulse" badge="Timing">
    <div class="flex items-start justify-center gap-4">
      <DawKnob v-model="swing" :min="0" :max="100" :step="5" unit="%" label="Swing" size="sm" variant="chord" />
      <DawKnob
        v-model="timingLooseness"
        :min="0"
        :max="100"
        :step="5"
        unit="%"
        label="Timing looseness"
        size="sm"
        variant="signal"
      />
    </div>
    <div class="border-daw-border flex items-center justify-between border-t pt-2">
      <span class="text-daw-text-muted text-micro">Playback &amp; MIDI export</span>
      <span class="text-daw-pulse text-micro font-mono tabular-nums">{{ Math.round(swing) }}% swing</span>
    </div>
    <svg
      class="h-12 w-full"
      viewBox="0 0 196 48"
      role="img"
      :aria-label="`Eighth-note timing example: straight grid compared with playback at ${Math.round(swing)} percent swing and ${Math.round(timingLooseness)} percent timing looseness. Looseness uses a fixed representative pattern; actual offsets vary.`"
    >
      <text x="0" y="12" class="fill-daw-text-muted text-micro font-mono">Straight</text>
      <text x="0" y="38" class="fill-daw-text-muted text-micro font-mono">Playback</text>
      <line x1="45" y1="9" x2="193" y2="9" class="stroke-daw-border" stroke-width="1" />
      <line x1="45" y1="35" x2="193" y2="35" class="stroke-daw-border" stroke-width="1" />
      <g v-for="step in previewSteps" :key="step.index">
        <line :x1="step.x" y1="5" :x2="step.x" y2="13" class="stroke-daw-text-muted/40" stroke-width="1" />
        <line :x1="step.x" y1="31" :x2="step.x" y2="39" class="stroke-daw-text-muted/40" stroke-width="1" />
        <circle :cx="step.x" cy="9" r="2.5" class="fill-daw-text-muted" />
        <line
          v-if="Math.abs(step.playbackX - step.swingX) > 0.05"
          :x1="step.swingX"
          y1="35"
          :x2="step.playbackX"
          y2="35"
          class="stroke-daw-signal/60"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle :cx="step.playbackX" cy="35" r="3" class="fill-daw-pulse" />
      </g>
    </svg>
    <p class="text-daw-text-muted text-micro leading-relaxed">
      Groove changes playback timing and MIDI export. Generated note positions stay on the grid. Eighth-note swing makes
      a 2:1 shuffle; the looseness trace is a fixed example, while actual offsets vary.
    </p>
  </DawModule>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawKnob from '@/components/common/DawKnob.vue'
  import DawModule from '@/components/common/DawModule.vue'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import { getGroovedStartStep } from '@/core/rhythm/groove'
  import { useProjectStore } from '@/stores/project.store'

  const projectStore = useProjectStore()
  const isOpen = useModuleOpenState('groove')

  const swing = computed({
    get: () => projectStore.swing * 100,
    set: (value: number) => projectStore.setSwing(value / 100)
  })
  const timingLooseness = computed({
    get: () => projectStore.timingLooseness * 100,
    set: (value: number) => projectStore.setTimingLooseness(value / 100)
  })

  const previewSteps = computed(() => {
    const config = {
      bpm: projectStore.bpm,
      swing: projectStore.swing,
      timingLooseness: projectStore.timingLooseness
    }

    return [0, 2, 4, 6].map((index) => {
      const id = `groove-preview-${index}`
      const x = 48 + index * 20
      const swingStep = getGroovedStartStep(index, id, { ...config, timingLooseness: 0 }, false, '8n')
      const playbackStep = getGroovedStartStep(index, id, config, false, '8n')

      return {
        index,
        x,
        swingX: x + (swingStep - index) * 20,
        playbackX: x + (playbackStep - index) * 20
      }
    })
  })
</script>
