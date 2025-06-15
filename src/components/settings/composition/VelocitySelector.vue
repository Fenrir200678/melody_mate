<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import { usePlayerStore } from '@/stores/player.store'
import { dynamics } from '@/data/dynamics-data'
import type { Dynamic } from '@/ts/types/dynamics.types'

const playerStore = usePlayerStore()

function handleFixedVelocityChange(value: string) {
  playerStore.setFixedVelocity(parseInt(value))
}

function handleDynamicChange(value: string) {
  playerStore.setSelectedDynamic(dynamics.find((dynamic) => dynamic.name === value) as Dynamic)
}
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="fixed-velocity-switch" class="font-medium"> Velocity </label>
      <span class="text-xs break-words"> The velocity of the notes (1-127) if fixed velocity is enabled. </span>
    </div>
    <div class="w-20">
      <InputNumber
        :modelValue="playerStore.fixedVelocity"
        :min="1"
        :max="127"
        :step="1"
        fluid
        showButtons
        buttonLayout="stacked"
        @blur="handleFixedVelocityChange($event.value)"
        @keydown.enter="handleFixedVelocityChange($event.target.value)"
        inputId="velocity-input"
        :disabled="!playerStore.useFixedVelocity"
      />
    </div>
  </div>

  <div class="flex items-center justify-between gap-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="fixed-velocity-switch" class="font-medium"> Use Fixed Velocity </label>
      <span class="text-xs break-words"> All notes with same velocity. </span>
    </div>
    <div class="flex items-center gap-4">
      <ToggleSwitch
        :modelValue="playerStore.useFixedVelocity"
        class="w-20"
        inputId="fixed-velocity-switch"
        @update:modelValue="playerStore.setUseFixedVelocity"
      />
    </div>
  </div>

  <div class="flex items-center justify-between gap-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="dynamics-switch" class="font-medium"> Use Dynamic Progressions </label>
      <span class="text-xs break-words"> Use dynamic progressions to determine the velocity of the notes. </span>
    </div>

    <ToggleSwitch
      :modelValue="playerStore.useDynamics"
      class="w-20"
      inputId="dynamics-switch"
      @update:modelValue="playerStore.setUseDynamics"
    />
  </div>

  <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
    <div class="flex flex-col items-start justify-start">
      <label for="dynamics-switch" class="font-medium"> Dynamic progression</label>
      <span class="text-xs break-words"> The dynamic progression to use. </span>
    </div>

    <div class="flex items-center gap-4 w-full md:w-1/2">
      <Select
        :modelValue="playerStore.selectedDynamic.name"
        :options="dynamics"
        class="w-full"
        fluid
        placeholder="Select a Dynamic"
        :disabled="!playerStore.useDynamics"
        optionLabel="label"
        optionValue="name"
        @update:modelValue="handleDynamicChange"
      />
    </div>
  </div>
</template>
