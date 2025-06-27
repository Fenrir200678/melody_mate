<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRhythmStore } from '@/stores/rhythm.store'
import { isEuclideanRhythm } from '@/ts/types/rhythm.types'

const rhythmStore = useRhythmStore()
const rhythm = computed(() => rhythmStore.rhythm)

const pulses = computed(() => {
  return isEuclideanRhythm(rhythm.value) ? rhythm.value.pulses : 0
})
const steps = computed(() => {
  return isEuclideanRhythm(rhythm.value) ? (rhythm.value.pattern.length ?? 0) : 0
})
const euclideanPattern = computed(() => {
  return isEuclideanRhythm(rhythm.value) ? (rhythm.value.pattern ?? []) : []
})

// Canvas reference
const canvasRef = ref<HTMLCanvasElement | null>(null)

const drawPattern = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Set canvas size
  const size = 200
  canvas.width = size
  canvas.height = size

  // Clear canvas
  ctx.clearRect(0, 0, size, size)

  const centerX = size / 2
  const centerY = size / 2
  const radius = size * 0.4

  const pattern = euclideanPattern.value
  const totalSteps = pattern.length
  const currentStepIndex = -1
  const activeNoteStepIndex = -1

  // Map absolute step indices to pattern indices (for multiple bars)
  const currentPatternStep = currentStepIndex >= 0 ? currentStepIndex % totalSteps : -1
  const activeNotePatternStep = activeNoteStepIndex >= 0 ? activeNoteStepIndex % totalSteps : -1

  // Draw each step
  for (let i = 0; i < totalSteps; i++) {
    const angle = (i / totalSteps) * 2 * Math.PI - Math.PI / 2 // Start from top
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius

    const isPulse = pattern[i] === 1
    const isCurrentStep = currentPatternStep === i && currentPatternStep >= 0
    const isActiveNote = activeNotePatternStep === i && activeNotePatternStep >= 0

    // Draw step circle
    ctx.beginPath()
    ctx.arc(x, y, isPulse ? 8 : 4, 0, 2 * Math.PI)

    if (isPulse) {
      // Filled circle for pulses
      if (isActiveNote) {
        // Active note: Bright red/orange highlight with strong glow
        ctx.fillStyle = '#ef4444' // Bright red for active note
        ctx.fill()
        ctx.strokeStyle = '#dc2626'
        ctx.lineWidth = 4
        ctx.stroke()

        // Strong glow effect for active note
        ctx.beginPath()
        ctx.arc(x, y, 16, 0, 2 * Math.PI)
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 3
        ctx.globalAlpha = 0.5
        ctx.stroke()
        ctx.globalAlpha = 1
      } else if (isCurrentStep) {
        // Current step: Yellow highlight for continuous animation
        ctx.fillStyle = '#fbbf24' // Yellow for current step
        ctx.fill()
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 3
        ctx.stroke()

        // Subtle glow for current step
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, 2 * Math.PI)
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.3
        ctx.stroke()
        ctx.globalAlpha = 1
      } else {
        // Normal pulse
        ctx.fillStyle = '#4ade80' // Green for normal pulse
        ctx.fill()
        ctx.strokeStyle = '#16a34a'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    } else {
      // Empty circle for rests
      if (isCurrentStep) {
        // Highlight current rest step
        ctx.strokeStyle = '#fbbf24' // Yellow for current rest
        ctx.lineWidth = 2
      } else {
        ctx.strokeStyle = '#6b7280' // Gray for normal rest
        ctx.lineWidth = 1.5
      }
      ctx.stroke()
    }
  }

  // Draw connecting circle
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1
  ctx.stroke()

  // Draw center info
  ctx.fillStyle = '#d1d5db'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${pulses.value}/${steps.value}`, centerX, centerY - 20)
  ctx.font = '11px sans-serif'
  ctx.fillStyle = '#9ca3af'
  ctx.fillText('pulses / steps', centerX, centerY + 5)

  if (isEuclideanRhythm(rhythm.value)) {
    ctx.fillText('rotation: ' + rhythmStore.euclideanRotation, centerX, centerY + 30)
  }
}

watch(euclideanPattern, drawPattern)

onMounted(() => {
  drawPattern()
})
</script>

<template>
  <div class="flex justify-center items-center">
    <canvas ref="canvasRef" class="bg-zinc-900"></canvas>
  </div>
</template>
