<template>
  <div
    ref="containerRef"
    class="adsr-canvas-container border-daw-border/60 bg-daw-panel/90 rounded-control relative h-11 w-full overflow-hidden border select-none"
  >
    <canvas ref="canvasRef" class="block h-full w-full" role="img" :aria-label="ariaLabel" />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { renderAdsrCanvas } from '@/utils/canvas/adsr-render'

  const props = withDefaults(
    defineProps<{
      attack: number
      decay: number
      sustain: number
      release: number
      variant?: 'signal' | 'chord'
    }>(),
    {
      variant: 'signal'
    }
  )

  const containerRef = ref<HTMLDivElement | null>(null)
  const canvasRef = ref<HTMLCanvasElement | null>(null)

  const ariaLabel = computed(() => {
    const trackName = props.variant === 'chord' ? 'Chords' : 'Melody'
    return `${trackName} ADSR envelope: Attack ${props.attack}%, Decay ${props.decay}%, Sustain ${props.sustain}%, Release ${props.release}%`
  })

  let rafId: number | null = null
  let resizeObserver: ResizeObserver | null = null

  function requestDraw(): void {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (canvasRef.value) {
        renderAdsrCanvas(canvasRef.value, {
          attack: props.attack,
          decay: props.decay,
          sustain: props.sustain,
          release: props.release,
          variant: props.variant
        })
      }
    })
  }

  watch(
    () => [props.attack, props.decay, props.sustain, props.release, props.variant],
    () => {
      requestDraw()
    }
  )

  onMounted(() => {
    if (containerRef.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        requestDraw()
      })
      resizeObserver.observe(containerRef.value)
    }
    requestDraw()
  })

  onUnmounted(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  })
</script>
