<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { generateEuclideanBinaryPattern } from '@/services/RhythmService'

// Props to receive data from parent component
const props = defineProps<{
  pulses?: number
  steps?: number
}>()

// Default values
const pulses = computed(() => props.pulses ?? 5)
const steps = computed(() => props.steps ?? 16)

// Canvas reference
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Generate the binary pattern for visualization
const euclideanPattern = computed(() => {
  return generateEuclideanBinaryPattern(pulses.value, steps.value)
})

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
  const radius = size * 0.35

  const pattern = euclideanPattern.value
  const totalSteps = pattern.length

  // Draw each step
  for (let i = 0; i < totalSteps; i++) {
    const angle = (i / totalSteps) * 2 * Math.PI - Math.PI / 2 // Start from top
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius

    const isPulse = pattern[i] === 1

    // Draw step circle
    ctx.beginPath()
    ctx.arc(x, y, isPulse ? 8 : 4, 0, 2 * Math.PI)

    if (isPulse) {
      // Filled circle for pulses
      ctx.fillStyle = '#4ade80' // Blue
      ctx.fill()
      ctx.strokeStyle = '#16a34a'
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      // Empty circle for rests
      ctx.strokeStyle = '#6b7280' // Gray
      ctx.lineWidth = 1.5
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
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${pulses.value}/${steps.value}`, centerX, centerY - 5)
  ctx.font = '10px sans-serif'
  ctx.fillStyle = '#9ca3af'
  ctx.fillText('pulses / steps', centerX, centerY + 10)
}

// Watch for changes and redraw
watch([pulses, steps], drawPattern)

onMounted(() => {
  drawPattern()
})
</script>

<template>
  <div class="flex justify-center items-center">
    <canvas ref="canvasRef" class="bg-zinc-900"></canvas>
  </div>
</template>
