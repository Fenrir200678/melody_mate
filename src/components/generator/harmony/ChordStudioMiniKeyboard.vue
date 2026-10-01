<template>
  <div class="flex flex-col gap-1 select-none">
    <div
      class="hover:text-daw-text flex cursor-pointer items-center justify-between px-0.5 transition-colors"
      role="button"
      :aria-expanded="!isCollapsed"
      title="Click to collapse/expand keyboard preview"
      @click="isCollapsed = !isCollapsed"
    >
      <div class="flex items-center gap-1">
        <ChevronDown class="text-daw-text-muted h-3 w-3 transition-transform" :class="{ '-rotate-90': isCollapsed }" />
        <span class="text-daw-text-muted text-micro font-medium">Voicing Preview</span>
      </div>
      <span v-if="activeVoicing.length > 0" class="text-daw-chord text-micro font-mono">
        {{ activeVoicing.join(' · ') }}
      </span>
      <span v-else class="text-daw-text-muted text-micro font-mono">Hover a chord</span>
    </div>

    <!-- Two-octave mini piano (collapsible) -->
    <div
      v-show="!isCollapsed"
      class="border-daw-border bg-daw-bg rounded-control overflow-hidden border p-0.5 shadow-inner"
    >
      <svg
        :viewBox="`0 0 ${viewBoxWidth} 46`"
        class="h-7 w-full"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Chord voicing piano preview"
      >
        <g class="white-keys">
          <rect
            v-for="(key, index) in whiteKeys"
            :key="key.pitch"
            :x="index * WHITE_KEY_WIDTH"
            y="0"
            :width="WHITE_KEY_WIDTH - 0.5"
            height="46"
            rx="2"
            :style="keyStyle(key.pitch, false)"
            class="cursor-pointer transition-colors"
            @pointerdown.prevent="onKeyClick(key.pitch)"
          />
        </g>

        <g class="black-keys">
          <rect
            v-for="key in blackKeys"
            :key="key.pitch"
            :x="key.x"
            y="0"
            width="11"
            height="28"
            rx="1.5"
            :style="keyStyle(key.pitch, true)"
            class="cursor-pointer transition-colors"
            @pointerdown.prevent="onKeyClick(key.pitch)"
          />
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { ChevronDown } from '@lucide/vue'
  import {
    OCTAVE_COUNT,
    useMiniKeyboardLayout,
    WHITE_KEY_NAMES,
    WHITE_KEY_WIDTH
  } from '@/composables/harmony/useMiniKeyboardLayout'
  import { useAudioStore } from '@/stores/audio.store'

  const props = withDefaults(
    defineProps<{
      activeVoicing?: readonly string[]
      rootPitch?: string
      baseOctave?: number
    }>(),
    {
      activeVoicing: () => [],
      rootPitch: '',
      baseOctave: 3
    }
  )

  const isCollapsed = ref(false)
  const audioStore = useAudioStore()

  const { whiteKeys, blackKeys, isPitchActive, isRootPitch, isInScale } = useMiniKeyboardLayout({
    activeVoicing: () => props.activeVoicing,
    rootPitch: () => props.rootPitch,
    baseOctave: () => props.baseOctave
  })

  const viewBoxWidth = WHITE_KEY_NAMES.length * OCTAVE_COUNT * WHITE_KEY_WIDTH

  /**
   * Key greys are intentionally not DAW surface tokens: they must read as ivory and ebony against
   * the dark shell. The accents do use the theme variables so they cannot drift from the design system.
   */
  const KEY_COLORS = {
    whiteInScale: '#d9dce3',
    whiteOutOfScale: '#b7bbc4',
    blackInScale: '#16171b',
    blackOutOfScale: '#0f1013',
    strokeWhite: '#22252c',
    strokeBlack: '#0d0e12',
    strokeActive: '#ffffff'
  }

  /** Bound as inline style because var() in SVG presentation attributes is not reliable across browsers. */
  function keyStyle(pitch: string, isBlack: boolean): Record<string, string> {
    if (isPitchActive(pitch)) {
      return {
        fill: isRootPitch(pitch) ? 'var(--color-daw-signal)' : 'var(--color-daw-chord)',
        stroke: KEY_COLORS.strokeActive
      }
    }

    const inScale = isInScale(pitch)
    if (isBlack) {
      return {
        fill: inScale ? KEY_COLORS.blackInScale : KEY_COLORS.blackOutOfScale,
        stroke: KEY_COLORS.strokeBlack
      }
    }

    return {
      fill: inScale ? KEY_COLORS.whiteInScale : KEY_COLORS.whiteOutOfScale,
      stroke: KEY_COLORS.strokeWhite
    }
  }

  function onKeyClick(pitch: string): void {
    audioStore.auditionPitch(pitch)
  }
</script>
