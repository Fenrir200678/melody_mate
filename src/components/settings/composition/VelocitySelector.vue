<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'
import InputNumber from 'primevue/inputnumber'
import { usePlayerStore } from '@/stores/player.store'

const playerStore = usePlayerStore()

function handleFixedVelocityChange(value: string) {
  playerStore.setFixedVelocity(parseInt(value))
}
</script>

<template>
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
</template>
