<script setup lang="ts">
import { ref, useTemplateRef, onMounted } from 'vue'
import { FULL_TWINKLE } from '@/services/MagentaService'
import * as mm from '@magenta/music/es6'
import * as Tone from 'tone'

const svg = useTemplateRef('svg') as Ref<SVGSVGElement>
const isPlaying = ref(false)
const player = ref<mm.SoundFontPlayer | undefined>(undefined)

async function setUpVisualizer() {}

async function play() {
  if (!svg.value) return
  await Tone.start()
  const viz = new mm.PianoRollSVGVisualizer(FULL_TWINKLE, svg.value)

  player.value = new mm.SoundFontPlayer(
    'https://storage.googleapis.com/magentadata/js/soundfonts/salamander',
    undefined,
    undefined,
    undefined,
    {
      run: (note) => {
        viz.redraw(note, true)
      },
      stop: () => {
        isPlaying.value = false
      }
    }
  )
  await player.value?.loadSamples(FULL_TWINKLE)

  if (player.value?.isPlaying()) {
    player.value?.stop()
    isPlaying.value = false
  } else {
    player.value?.start(FULL_TWINKLE)
    isPlaying.value = true
  }
}

onMounted(() => {
  setUpVisualizer()
})
</script>

<template>
  <div class="flex flex-col items-center justify-center">
    <button id="btn" :disabled="isPlaying" @click="play" class="bg-blue-500 text-white px-4 py-2 rounded-md">
      {{ isPlaying ? 'Stop' : 'Play' }}
    </button>
    <svg ref="svg" class="w-full h-full"></svg>
  </div>
</template>
