<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'
import InputNumber from 'primevue/inputnumber'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()
</script>

<template>
  <div class="flex items-center gap-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="fixed-velocity-switch" class="font-medium"> Use Fixed Velocity </label>
      <span class="text-xs break-words"> All notes with same velocity (1-127) </span>
    </div>
    <div class="flex items-center gap-4">
      <ToggleSwitch
        class="flex-shrink-0"
        v-model="store.useFixedVelocity"
        inputId="fixed-velocity-switch"
        @update:modelValue="store.setUseFixedVelocity"
      />
      <InputNumber
        v-model="store.fixedVelocity"
        :min="1"
        :max="127"
        :step="1"
        fluid
        showButtons
        buttonLayout="stacked"
        @update:modelValue="store.setFixedVelocity"
        inputId="velocity-input"
        :disabled="!store.useFixedVelocity"
      />
    </div>
  </div>
</template>
