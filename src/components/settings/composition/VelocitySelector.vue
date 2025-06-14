<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'
import InputNumber from 'primevue/inputnumber'
import { usePlayerStore } from '@/stores/player.store'

const playerStore = usePlayerStore()
</script>

<template>
  <div class="flex flex-col justify-around gap-4 mt-8">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="fixed-velocity-switch" class="font-medium"> Use Fixed Velocity </label>
      <span class="text-xs break-words"> All notes with same velocity (1-127) </span>
    </div>
    <div class="flex items-center gap-4">
      <ToggleSwitch
        class="flex-shrink-0"
        v-model="playerStore.useFixedVelocity"
        inputId="fixed-velocity-switch"
        @update:modelValue="playerStore.setUseFixedVelocity"
      />
      <InputNumber
        v-model="playerStore.fixedVelocity"
        :min="1"
        :max="127"
        :step="1"
        fluid
        showButtons
        buttonLayout="stacked"
        @update:modelValue="playerStore.setFixedVelocity"
        inputId="velocity-input"
        :disabled="!playerStore.useFixedVelocity"
      />
    </div>
  </div>
</template>
