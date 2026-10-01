<template>
  <div class="channel-strip master-channel" role="group" aria-label="Master channel strip">
    <!-- Master track name + creative bus compressor button -->
    <div class="strip-header">
      <span class="role-dot dot-pulse" aria-hidden="true" />
      <span class="strip-name">Master</span>
      <div class="strip-buttons">
        <DawButton
          size="xs"
          appearance="surface"
          variant="pulse"
          :active="mixerStore.isBusCompressorActive"
          :icon="Activity"
          aria-label="Toggle creative bus compressor"
          title="Creative bus compressor"
          @click="mixerStore.toggleBusCompressor"
        >
          Comp
        </DawButton>
      </div>
    </div>

    <!-- Conditional audio diagnostics / warnings -->
    <p v-if="protectionWarning || liveSanitizedSamples > 0" class="text-micro leading-snug text-orange-400">
      <template v-if="protectionWarning">{{ protectionWarning }}</template>
      <template v-else> Sanitized {{ liveSanitizedSamples }} non-finite sample(s) from the audio graph. </template>
    </p>

    <!-- Dual vertical stereo peak/RMS meter with Gain Reduction and safety status -->
    <MasterPeakRmsMeter
      v-model:gain-reduction-db="liveGainReductionDb"
      v-model:sanitized-samples="liveSanitizedSamples"
    />

    <!-- Master volume -->
    <div class="strip-volume">
      <DawFader
        v-model="masterVolumeModel"
        orientation="horizontal"
        label="Vol"
        :min="0"
        :max="1"
        :step="0.01"
        aria-label="Master volume"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { Activity } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawFader from '@/components/common/DawFader.vue'
  import { useMixerStore } from '@/stores/mixer.store'
  import MasterPeakRmsMeter from './MasterPeakRmsMeter.vue'

  const mixerStore = useMixerStore()

  const liveGainReductionDb = ref<number>(0)
  const liveSanitizedSamples = ref<number>(0)

  const masterVolumeModel = computed({
    get: () => mixerStore.masterVolume,
    set: (val: number) => mixerStore.setVolume('master', val)
  })

  const currentStatus = computed(() => mixerStore.protectionStatus)

  const protectionWarning = computed(() => {
    if (currentStatus.value === 'active') return null
    if (currentStatus.value === 'fallback') {
      return `Limiter worklet unavailable — degraded bounded fallback is active. ${mixerStore.protectionError ?? ''}`.trim()
    }
    if (currentStatus.value === 'failed') {
      return `Output protection could not be installed. ${mixerStore.protectionError ?? ''}`.trim()
    }
    return null
  })
</script>
