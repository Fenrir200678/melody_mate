<template>
  <DawModule v-model="isOpen" data-module-key="pitch" title="Pitch" role-dot="signal" badge-color="signal">
    <template #badge>
      <span class="text-daw-signal text-micro font-mono">
        C{{ melodyStore.generatorParams.minOctave }} – B{{ melodyStore.generatorParams.maxOctave }}
        <span class="text-daw-text-muted ml-0.5 font-sans">({{ octaveSpanLabel }})</span>
      </span>
    </template>

    <!-- Octave Range Steppers -->
    <div class="grid grid-cols-2 gap-2">
      <!-- Lower Bound (Min Octave) -->
      <div class="flex flex-col gap-1">
        <span class="text-daw-text-muted text-micro font-medium">Lower bound</span>
        <div
          class="bg-daw-panel border-daw-border rounded-control flex w-full items-center justify-between border px-0.5"
        >
          <button
            type="button"
            class="hover:bg-daw-surface text-daw-text-muted hover:text-daw-text rounded-chip flex h-5 w-5 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            :disabled="melodyStore.generatorParams.minOctave <= 1"
            aria-label="Decrease minimum octave"
            title="Decrease minimum octave (lower pitch bound)"
            @click="decrementMinOctave"
          >
            <Minus class="h-3 w-3" />
          </button>
          <span class="text-daw-text text-2xs font-mono font-bold"> C{{ melodyStore.generatorParams.minOctave }} </span>
          <button
            type="button"
            class="hover:bg-daw-surface text-daw-text-muted hover:text-daw-text rounded-chip flex h-5 w-5 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            :disabled="melodyStore.generatorParams.minOctave >= melodyStore.generatorParams.maxOctave"
            aria-label="Increase minimum octave"
            title="Increase minimum octave (lower pitch bound)"
            @click="incrementMinOctave"
          >
            <Plus class="h-3 w-3" />
          </button>
        </div>
      </div>

      <!-- Upper Bound (Max Octave) -->
      <div class="flex flex-col gap-1">
        <span class="text-daw-text-muted text-micro font-medium">Upper bound</span>
        <div
          class="bg-daw-panel border-daw-border rounded-control flex w-full items-center justify-between border px-0.5"
        >
          <button
            type="button"
            class="hover:bg-daw-surface text-daw-text-muted hover:text-daw-text rounded-chip flex h-5 w-5 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            :disabled="melodyStore.generatorParams.maxOctave <= melodyStore.generatorParams.minOctave"
            aria-label="Decrease maximum octave"
            title="Decrease maximum octave (upper pitch bound)"
            @click="decrementMaxOctave"
          >
            <Minus class="h-3 w-3" />
          </button>
          <span class="text-daw-text text-2xs font-mono font-bold"> B{{ melodyStore.generatorParams.maxOctave }} </span>
          <button
            type="button"
            class="hover:bg-daw-surface text-daw-text-muted hover:text-daw-text rounded-chip flex h-5 w-5 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            :disabled="melodyStore.generatorParams.maxOctave >= 7"
            aria-label="Increase maximum octave"
            title="Increase maximum octave (upper pitch bound)"
            @click="incrementMaxOctave"
          >
            <Plus class="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  </DawModule>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Minus, Plus } from '@lucide/vue'
  import DawModule from '@/components/common/DawModule.vue'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import { useMelodyStore } from '@/stores/melody.store'

  const melodyStore = useMelodyStore()
  const isOpen = useModuleOpenState('pitch')

  const octaveSpan = computed(() => {
    return melodyStore.generatorParams.maxOctave - melodyStore.generatorParams.minOctave + 1
  })

  const octaveSpanLabel = computed(() => {
    return `${octaveSpan.value} ${octaveSpan.value === 1 ? 'Octave' : 'Octaves'}`
  })

  function decrementMinOctave(): void {
    if (melodyStore.generatorParams.minOctave > 1) {
      melodyStore.setGeneratorParams({
        minOctave: melodyStore.generatorParams.minOctave - 1
      })
    }
  }

  function incrementMinOctave(): void {
    if (melodyStore.generatorParams.minOctave < melodyStore.generatorParams.maxOctave) {
      melodyStore.setGeneratorParams({
        minOctave: melodyStore.generatorParams.minOctave + 1
      })
    }
  }

  function decrementMaxOctave(): void {
    if (melodyStore.generatorParams.maxOctave > melodyStore.generatorParams.minOctave) {
      melodyStore.setGeneratorParams({
        maxOctave: melodyStore.generatorParams.maxOctave - 1
      })
    }
  }

  function incrementMaxOctave(): void {
    if (melodyStore.generatorParams.maxOctave < 7) {
      melodyStore.setGeneratorParams({
        maxOctave: melodyStore.generatorParams.maxOctave + 1
      })
    }
  }
</script>
