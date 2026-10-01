<template>
  <div class="master-meter" role="region" aria-label="Master output stereo metering">
    <!-- Top Readouts: L, R, GR -->
    <div class="master-meter-readout">
      <div class="flex items-center gap-2">
        <span :class="isLeftOverCeiling ? 'text-red-400' : 'text-daw-text'">L {{ currentLeftPeakReadout }}</span>
        <span :class="isRightOverCeiling ? 'text-red-400' : 'text-daw-text'">R {{ currentRightPeakReadout }}</span>
      </div>
      <span :class="liveGainReductionDb > 0.05 ? 'font-semibold text-orange-400' : 'text-daw-text-muted'">
        GR {{ currentGrReadout }}
      </span>
    </div>

    <!-- Dual Vertical Meter Canvas Container -->
    <div ref="containerRef" class="relative min-h-22.5 w-full flex-1">
      <canvas
        ref="canvasRef"
        class="rounded-control block h-full w-full"
        aria-label="Stereo output peak, RMS and gain reduction meter"
        role="img"
      />
    </div>

    <!-- Bottom Status: Subtle Non-Button Safety Limiter Note -->
    <div class="master-meter-footer">
      <div class="flex items-center gap-1.5" :title="`Output protection status: ${protectionStatusLabel}`">
        <ShieldCheck class="h-3 w-3 transition-colors" :class="protectionIconClass" aria-hidden="true" />
        <span class="text-daw-text-muted font-sans font-medium">Limiter</span>
        <span class="text-micro font-mono" :class="protectionStatusColor">
          {{ protectionStatusText }}
        </span>
      </div>
      <span class="text-daw-text-muted font-mono" title="Safety brickwall peak ceiling"> C {{ ceilingLabel }} </span>
    </div>

    <!-- Diagnostic Notice if metering worklet is unavailable -->
    <p v-if="mixerStore.meteringError" class="text-micro leading-snug text-orange-400">
      Fallback meter active: {{ mixerStore.meteringError }}
    </p>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { ShieldCheck } from '@lucide/vue'
  import { useRafFn } from '@vueuse/core'
  import { useMixerStore } from '@/stores/mixer.store'
  import { METER_MIN_DB, renderStereoMeter, type StereoMeterState } from '@/utils/canvas/stereo-meter-render'

  const gainReductionDb = defineModel<number>('gainReductionDb', { default: 0 })
  const sanitizedSamples = defineModel<number>('sanitizedSamples', { default: 0 })

  const mixerStore = useMixerStore()

  const containerRef = ref<HTMLDivElement | null>(null)
  const canvasRef = ref<HTMLCanvasElement | null>(null)

  let smoothedLeftPeak = METER_MIN_DB
  let smoothedRightPeak = METER_MIN_DB
  let smoothedLeftRms = METER_MIN_DB
  let smoothedRightRms = METER_MIN_DB
  let smoothedGr = 0

  let leftPeakHoldDb = METER_MIN_DB
  let rightPeakHoldDb = METER_MIN_DB
  let leftPeakHoldFrames = 0
  let rightPeakHoldFrames = 0

  let resizeObserver: ResizeObserver | null = null

  const liveLeftPeakDb = ref<number>(-Infinity)
  const liveRightPeakDb = ref<number>(-Infinity)
  const liveGainReductionDb = ref<number>(0)
  const ceilingDb = ref<number>(-1)

  const isLeftOverCeiling = computed(
    () => Number.isFinite(liveLeftPeakDb.value) && liveLeftPeakDb.value > ceilingDb.value
  )
  const isRightOverCeiling = computed(
    () => Number.isFinite(liveRightPeakDb.value) && liveRightPeakDb.value > ceilingDb.value
  )

  const ceilingLabel = computed(() => `${ceilingDb.value.toFixed(1)} dB`)

  function formatDb(value: number): string {
    if (!Number.isFinite(value) || value <= METER_MIN_DB) return '-∞ dB'
    const prefix = value > 0 ? '+' : ''
    return `${prefix}${value.toFixed(1)} dB`
  }

  function formatGr(value: number): string {
    if (!Number.isFinite(value) || value <= 0.05) return '0.0 dB'
    return `-${value.toFixed(1)} dB`
  }

  const currentLeftPeakReadout = computed(() => formatDb(liveLeftPeakDb.value))
  const currentRightPeakReadout = computed(() => formatDb(liveRightPeakDb.value))
  const currentGrReadout = computed(() => formatGr(liveGainReductionDb.value))

  const currentStatus = computed(() => mixerStore.protectionStatus)

  const protectionStatusLabel = computed(() => {
    switch (currentStatus.value) {
      case 'active':
        return 'Active'
      case 'loading':
        return 'Loading'
      case 'fallback':
        return 'Fallback'
      case 'failed':
        return 'Unavailable'
      default:
        return 'Idle'
    }
  })

  const protectionStatusText = computed(() => {
    if (liveGainReductionDb.value > 0.05) {
      return `-${liveGainReductionDb.value.toFixed(1)} dB`
    }
    if (currentStatus.value === 'active') return 'ON'
    if (currentStatus.value === 'fallback') return 'FALLBACK'
    if (currentStatus.value === 'failed') return 'OFF'
    return 'ON'
  })

  const protectionStatusColor = computed(() => {
    if (liveGainReductionDb.value > 0.05) return 'text-orange-400 font-semibold'
    if (currentStatus.value === 'active') return 'text-daw-pulse'
    if (currentStatus.value === 'fallback') return 'text-orange-400'
    return 'text-daw-text-muted'
  })

  const protectionIconClass = computed(() => {
    if (liveGainReductionDb.value > 0.05) return 'text-orange-400'
    if (currentStatus.value === 'active') return 'text-daw-pulse'
    if (currentStatus.value === 'fallback') return 'text-orange-400'
    return 'text-daw-text-muted'
  })

  function updateBallistics(target: number, current: number, falloff = 0.7): number {
    const validTarget = Number.isFinite(target) ? Math.max(METER_MIN_DB, target) : METER_MIN_DB
    return validTarget > current ? validTarget : Math.max(METER_MIN_DB, current - falloff)
  }

  function renderMeter(): void {
    const canvas = canvasRef.value
    if (!canvas) return

    const protection = mixerStore.getOutputProtection()
    if (protection) {
      gainReductionDb.value = protection.gainReductionDb
      sanitizedSamples.value = protection.sanitizedSamples
      ceilingDb.value = protection.ceilingDb
      liveGainReductionDb.value = protection.gainReductionDb
    }

    const readings = mixerStore.getMasterMeterReadings()
    const output = readings?.postProtection ?? readings?.postMaster

    const rawLeftPeak = output?.leftPeakDb ?? -Infinity
    const rawRightPeak = output?.rightPeakDb ?? -Infinity
    const rawLeftRms = output?.leftRmsDb ?? -Infinity
    const rawRightRms = output?.rightRmsDb ?? -Infinity

    liveLeftPeakDb.value = rawLeftPeak
    liveRightPeakDb.value = rawRightPeak

    // Peak smoothing
    smoothedLeftPeak = updateBallistics(rawLeftPeak, smoothedLeftPeak, 0.75)
    smoothedRightPeak = updateBallistics(rawRightPeak, smoothedRightPeak, 0.75)

    // RMS smoothing
    smoothedLeftRms = updateBallistics(rawLeftRms, smoothedLeftRms, 0.45)
    smoothedRightRms = updateBallistics(rawRightRms, smoothedRightRms, 0.45)

    // GR smoothing (instant attack, gentle release)
    const grTarget = liveGainReductionDb.value
    if (grTarget > smoothedGr) {
      smoothedGr = grTarget
    } else {
      smoothedGr = Math.max(0, smoothedGr - 0.2)
    }

    // Left Peak Hold
    if (smoothedLeftPeak > leftPeakHoldDb) {
      leftPeakHoldDb = smoothedLeftPeak
      leftPeakHoldFrames = 40
    } else if (leftPeakHoldFrames > 0) {
      leftPeakHoldFrames--
    } else {
      leftPeakHoldDb = Math.max(METER_MIN_DB, leftPeakHoldDb - 0.35)
    }

    // Right Peak Hold
    if (smoothedRightPeak > rightPeakHoldDb) {
      rightPeakHoldDb = smoothedRightPeak
      rightPeakHoldFrames = 40
    } else if (rightPeakHoldFrames > 0) {
      rightPeakHoldFrames--
    } else {
      rightPeakHoldDb = Math.max(METER_MIN_DB, rightPeakHoldDb - 0.35)
    }

    const meterState: StereoMeterState = {
      leftPeakDb: smoothedLeftPeak,
      rightPeakDb: smoothedRightPeak,
      leftRmsDb: smoothedLeftRms,
      rightRmsDb: smoothedRightRms,
      leftPeakHoldDb,
      rightPeakHoldDb,
      gainReductionDb: smoothedGr,
      ceilingDb: ceilingDb.value
    }

    renderStereoMeter(canvas, meterState)
  }

  const { pause, resume } = useRafFn(() => {
    renderMeter()
  })

  onMounted(() => {
    if (containerRef.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        renderMeter()
      })
      resizeObserver.observe(containerRef.value)
    }
    resume()
  })

  onUnmounted(() => {
    pause()
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  })
</script>
