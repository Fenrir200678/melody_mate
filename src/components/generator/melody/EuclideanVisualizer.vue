<template>
  <div class="flex flex-col items-center justify-center select-none">
    <!-- SVG Circular Sequencer Visualizer -->
    <div class="relative flex items-center justify-center">
      <svg
        viewBox="0 0 240 240"
        class="h-48 w-48 transition-all duration-300 sm:h-52 sm:w-52"
        role="img"
        aria-label="Euclidean rhythm visualizer"
      >
        <defs>
          <!-- Subtle Glow Filter for Active Pulses -->
          <filter id="pulse-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <!-- Outer Polygon Ambient Glow -->
          <filter id="polygon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Background Circular Track -->
        <circle
          cx="120"
          cy="120"
          :r="RADIUS"
          fill="none"
          stroke="rgba(42, 44, 51, 0.6)"
          stroke-width="1.5"
          stroke-dasharray="3 4"
        />

        <!-- Step 0 Indicator (12 o'clock marker) -->
        <polygon points="120,27 116,21 124,21" fill="rgba(141, 143, 153, 0.6)" />

        <!-- Inner Euclidean Geometric Polygon (when 3+ pulses) -->
        <polygon
          v-if="polygonPoints.length >= 3"
          :points="polygonPointsString"
          fill="rgba(47, 217, 185, 0.08)"
          stroke="rgba(47, 217, 185, 0.45)"
          stroke-width="1.5"
          stroke-linejoin="round"
          filter="url(#polygon-glow)"
          class="transition-all duration-300"
        />

        <!-- Inner Euclidean Connection Line (when exactly 2 pulses) -->
        <line
          v-else-if="polygonPoints.length === 2"
          :x1="polygonPoints[0].x"
          :y1="polygonPoints[0].y"
          :x2="polygonPoints[1].x"
          :y2="polygonPoints[1].y"
          stroke="rgba(47, 217, 185, 0.45)"
          stroke-width="1.5"
          stroke-linecap="round"
          filter="url(#polygon-glow)"
          class="transition-all duration-300"
        />

        <!-- Step Nodes (Pulses & Rests) -->
        <g v-for="(node, i) in stepNodes" :key="`step-${i}`">
          <!-- Active Playhead Radially Outward Wave (moves away from circle center) -->
          <g v-if="node.isCurrentStep">
            <!-- Immediate Crisp White/Teal Halo on the node -->
            <circle
              :cx="node.x"
              :cy="node.y"
              :r="node.isPulse ? 8.5 : 5.5"
              fill="rgba(47, 217, 185, 0.3)"
              stroke="#ffffff"
              stroke-width="2"
              class="pointer-events-none"
            />

            <!-- Primary Expanding & Outward-Drifting Ring -->
            <circle
              :cx="node.x"
              :cy="node.y"
              r="6"
              fill="none"
              stroke="var(--color-daw-pulse)"
              stroke-width="1.8"
              class="pointer-events-none"
            >
              <animate attributeName="r" from="6" to="19" dur="0.38s" fill="freeze" />
              <animate attributeName="cx" :from="node.x" :to="node.x + node.dirX * 11" dur="0.38s" fill="freeze" />
              <animate attributeName="cy" :from="node.y" :to="node.y + node.dirY * 11" dur="0.38s" fill="freeze" />
              <animate attributeName="opacity" from="0.9" to="0" dur="0.38s" fill="freeze" />
            </circle>

            <!-- Secondary Outward Echo Wave for Pulse Hits -->
            <circle
              v-if="node.isPulse"
              :cx="node.x"
              :cy="node.y"
              r="4"
              fill="none"
              stroke="#ffffff"
              stroke-width="1.2"
              class="pointer-events-none"
            >
              <animate attributeName="r" from="4" to="24" dur="0.42s" fill="freeze" />
              <animate attributeName="cx" :from="node.x" :to="node.x + node.dirX * 15" dur="0.42s" fill="freeze" />
              <animate attributeName="cy" :from="node.y" :to="node.y + node.dirY * 15" dur="0.42s" fill="freeze" />
              <animate attributeName="opacity" from="0.75" to="0" dur="0.42s" fill="freeze" />
            </circle>
          </g>

          <!-- Pulse Hit Node (Filled Glowing LED Bead) -->
          <template v-if="node.isPulse">
            <circle
              :cx="node.x"
              :cy="node.y"
              r="6.5"
              fill="var(--color-daw-pulse)"
              stroke="#0b0c0f"
              stroke-width="1"
              filter="url(#pulse-glow)"
              class="cursor-pointer transition-transform duration-150 hover:scale-125"
              :aria-label="`Step ${i + 1}: Pulse (Click to rotate)`"
              role="button"
              tabindex="0"
              @click="onStepClick(i)"
              @keydown.enter.prevent="onStepClick(i)"
              @keydown.space.prevent="onStepClick(i)"
            />
            <!-- Gloss Specular Highlight -->
            <circle
              :cx="node.x - 1.5"
              :cy="node.y - 1.5"
              r="2"
              fill="#ffffff"
              opacity="0.85"
              class="pointer-events-none"
            />
          </template>

          <!-- Rest Node (Muted Hollow Circle) -->
          <template v-else>
            <circle
              :cx="node.x"
              :cy="node.y"
              r="3.5"
              fill="var(--color-daw-surface)"
              stroke="var(--color-daw-border)"
              stroke-width="1.5"
              class="cursor-pointer transition-transform duration-150 hover:scale-125"
              :aria-label="`Step ${i + 1}: Rest (Click to rotate)`"
              role="button"
              tabindex="0"
              @click="onStepClick(i)"
              @keydown.enter.prevent="onStepClick(i)"
              @keydown.space.prevent="onStepClick(i)"
            />
          </template>
        </g>

        <!-- Center HUD Readout -->
        <g class="pointer-events-none">
          <!-- Ratio Text: e.g. "5 / 16" -->
          <text
            x="120"
            y="110"
            text-anchor="middle"
            class="font-mono text-base font-bold tracking-tight"
            fill="#e9eaee"
          >
            {{ currentPulses }} / {{ currentSteps }}
          </text>

          <!-- Subtitle: "PULSES / STEPS" -->
          <text
            x="120"
            y="124"
            text-anchor="middle"
            class="text-micro font-mono tracking-widest uppercase"
            fill="#8d8f99"
          >
            pulses / steps
          </text>

          <!-- Rotation Pill Badge -->
          <rect
            x="88"
            y="133"
            width="64"
            height="18"
            rx="4"
            fill="rgba(47, 217, 185, 0.1)"
            stroke="rgba(47, 217, 185, 0.25)"
            stroke-width="1"
          />
          <text
            x="120"
            y="145"
            text-anchor="middle"
            class="text-micro font-mono font-semibold"
            fill="var(--color-daw-pulse)"
          >
            ROT {{ currentRotation }}
          </text>
        </g>
      </svg>
    </div>

    <!-- Quick Rotation Nudge Bar -->
    <div class="flex items-center justify-center gap-2 pt-1">
      <DawIconButton
        :icon="ChevronLeft"
        size="sm"
        appearance="surface"
        variant="pulse"
        aria-label="Shift Rotation Left (-1 step)"
        title="Shift Rotation Left (-1 step)"
        @click="nudgeRotation(-1)"
      />

      <span class="text-daw-text-muted text-2xs font-mono">
        Rotation: <strong class="text-daw-pulse font-semibold">{{ currentRotation }}</strong>
      </span>

      <DawIconButton
        :icon="ChevronRight"
        size="sm"
        appearance="surface"
        variant="pulse"
        aria-label="Shift Rotation Right (+1 step)"
        title="Shift Rotation Right (+1 step)"
        @click="nudgeRotation(1)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ChevronLeft, ChevronRight } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import { generateEuclideanPattern } from '@/core/rhythm/euclidean'
  import { STEPS_PER_BAR, subdivisionToStepsPerBar, type Subdivision } from '@/core/schemas/project.schema'
  import { useAudioStore } from '@/stores/audio.store'
  import { useMelodyStore } from '@/stores/melody.store'

  export interface EuclideanVisualizerProps {
    pulses?: number
    steps?: number
    rotation?: number
    subdivision?: Subdivision
  }

  const props = withDefaults(defineProps<EuclideanVisualizerProps>(), {
    pulses: undefined,
    steps: undefined,
    rotation: undefined,
    subdivision: undefined
  })

  const emit = defineEmits<{
    'update:rotation': [rotation: number]
  }>()

  const melodyStore = useMelodyStore()
  const audioStore = useAudioStore()

  const CENTER_X = 120
  const CENTER_Y = 120
  const RADIUS = 84

  const currentPulses = computed(() => {
    return props.pulses !== undefined ? props.pulses : melodyStore.generatorParams.euclideanPulses
  })

  const currentSteps = computed(() => {
    return props.steps !== undefined ? props.steps : melodyStore.generatorParams.euclideanSteps
  })

  const currentRotation = computed(() => {
    return props.rotation !== undefined ? props.rotation : melodyStore.generatorParams.euclideanRotation
  })

  const currentSubdivision = computed<Subdivision>(() => {
    return props.subdivision !== undefined
      ? props.subdivision
      : melodyStore.generatorParams.euclideanSubdivision || '16n'
  })

  const pattern = computed<boolean[]>(() => {
    return generateEuclideanPattern(currentPulses.value, currentSteps.value, currentRotation.value)
  })

  const stepMultiplier = computed(() => {
    const projectSpb = STEPS_PER_BAR
    const euclideanSpb = subdivisionToStepsPerBar(currentSubdivision.value)
    return Math.max(1, Math.round(projectSpb / euclideanSpb))
  })

  // Calculate active step in pattern during real-time playback
  const activePlaybackStep = computed<number>(() => {
    if (!audioStore.isPlaying) return -1
    const rawStep = audioStore.currentStep
    const mult = stepMultiplier.value
    const patternStep = Math.floor(rawStep / mult) % currentSteps.value
    return patternStep
  })

  interface StepNode {
    x: number
    y: number
    dirX: number
    dirY: number
    isPulse: boolean
    isCurrentStep: boolean
  }

  const stepNodes = computed<StepNode[]>(() => {
    const total = currentSteps.value
    const pat = pattern.value
    const active = activePlaybackStep.value

    return pat.map((isPulse, i) => {
      // Start from top (12 o'clock = -PI/2) and distribute clockwise
      const angle = (i / total) * 2 * Math.PI - Math.PI / 2
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      const x = CENTER_X + RADIUS * cosA
      const y = CENTER_Y + RADIUS * sinA
      const isCurrentStep = active >= 0 && active === i

      return { x, y, dirX: cosA, dirY: sinA, isPulse, isCurrentStep }
    })
  })

  const polygonPoints = computed<{ x: number; y: number }[]>(() => {
    return stepNodes.value.filter((node) => node.isPulse)
  })

  const polygonPointsString = computed<string>(() => {
    return polygonPoints.value.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  })

  function setRotation(nextRot: number): void {
    const total = currentSteps.value
    const clamped = ((nextRot % total) + total) % total
    melodyStore.setGeneratorParams({ euclideanRotation: clamped })
    emit('update:rotation', clamped)
  }

  function nudgeRotation(delta: number): void {
    setRotation(currentRotation.value + delta)
  }

  function onStepClick(index: number): void {
    setRotation(index)
  }
</script>
