<template>
  <div class="bg-daw-bg rounded-control border-daw-border flex min-h-0 flex-1 flex-col overflow-hidden border p-2">
    <!-- Monitor Header -->
    <div class="mb-1.5 flex shrink-0 items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full" :class="state === 'ready' ? 'bg-daw-signal' : 'bg-daw-text-muted'" />
        <span class="text-daw-text-muted text-micro font-mono tracking-wider uppercase">Pattern Monitor</span>
        <span class="text-2xs font-mono" :class="state === 'ready' ? 'text-daw-signal' : 'text-daw-text-muted'">
          {{ STATE_LABELS[state] }}
        </span>
      </div>
      <div v-if="candidate" class="text-daw-text-muted text-micro flex items-center gap-2 font-mono tabular-nums">
        <span>{{ candidate.notes.length }} notes · {{ barsLabel }}</span>
        <span>seed {{ candidate.inputs.seed }}</span>
        <span v-if="candidate.variations.length" class="text-daw-pulse">
          {{ candidate.variations.at(-1)?.mode }} {{ candidate.variations.at(-1)?.seed }}
        </span>
        <span class="text-daw-signal font-semibold uppercase">{{ candidate.inputs.pattern }}</span>
      </div>
    </div>

    <div
      v-if="layout && grid && candidate"
      class="min-h-0 flex-1 overflow-x-auto overflow-y-hidden select-none"
      :class="{ 'opacity-50': state !== 'ready' }"
    >
      <div class="flex h-full w-full flex-col" :style="{ minWidth: `${grid.contentWidthPx}px` }">
        <!-- Bar & chord ruler -->
        <div class="relative h-4 shrink-0">
          <span
            v-for="bar in grid.bars"
            :key="`bar-${bar.bar}`"
            class="text-daw-text-muted text-micro absolute top-0 pl-1 font-mono leading-none"
            :style="{ left: `${bar.xPercent}%` }"
          >
            {{ bar.bar }}
          </span>
          <span
            v-for="chord in grid.chords"
            :key="`chord-${chord.id}`"
            class="text-daw-chord text-micro absolute bottom-0 truncate pl-1 font-mono font-bold"
            :style="{ left: `${chord.xPercent}%`, width: `${chord.widthPercent}%` }"
          >
            {{ chord.name }}
          </span>
        </div>

        <div class="relative min-h-0 flex-1">
          <svg class="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line
              v-for="lane in layout.lanes"
              :key="lane.octave"
              x1="0"
              :y1="lane.yPercent"
              x2="100"
              :y2="lane.yPercent"
              class="stroke-daw-border"
              stroke-dasharray="2 2"
              stroke-width="0.75"
              vector-effect="non-scaling-stroke"
            />
            <line
              v-for="beat in grid.beats"
              :key="`beat-${beat}`"
              :x1="beat"
              y1="0"
              :x2="beat"
              y2="100"
              class="stroke-daw-border"
              opacity="0.6"
              stroke-width="0.75"
              vector-effect="non-scaling-stroke"
            />
            <line
              v-for="bar in grid.bars.filter((b) => b.isBoundary)"
              :key="`bar-line-${bar.bar}`"
              :x1="bar.xPercent"
              y1="0"
              :x2="bar.xPercent"
              y2="100"
              class="stroke-daw-text-muted"
              stroke-width="1"
              vector-effect="non-scaling-stroke"
            />
            <rect
              v-for="note in layout.notes"
              :key="note.id"
              :x="`${note.xPercent}%`"
              :y="`${note.yPercent}%`"
              :width="`${note.widthPercent}%`"
              :height="`${note.heightPercent}%`"
              rx="1.5"
              ry="1.5"
              :class="note.isChordTone ? 'fill-daw-signal/25 stroke-daw-signal' : 'fill-daw-pulse/20 stroke-daw-pulse'"
              :style="{ opacity: 0.45 + (note.velocity / 127) * 0.55 }"
              :stroke-dasharray="note.isChordTone ? undefined : '2 1'"
              stroke-width="0.75"
              vector-effect="non-scaling-stroke"
            />
          </svg>

          <div
            v-for="lane in layout.lanes"
            :key="`label-${lane.octave}`"
            class="text-daw-text-muted text-micro pointer-events-none absolute left-1 font-mono leading-none opacity-60"
            :style="{ top: `${lane.yPercent + 2}%` }"
          >
            {{ lane.label }}
          </div>

          <template v-for="note in layout.notes" :key="`text-${note.id}`">
            <div
              v-if="(note.widthPercent / 100) * grid.contentWidthPx >= PITCH_LABEL_MIN_WIDTH_PX"
              class="text-daw-text text-micro pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 font-mono font-semibold tabular-nums"
              :style="{
                left: `${note.xPercent + note.widthPercent / 2}%`,
                top: `${note.yPercent + note.heightPercent / 2}%`
              }"
            >
              {{ note.pitch }}
            </div>
          </template>
        </div>
      </div>
    </div>
    <div v-else class="text-daw-text-muted text-micro flex flex-1 items-center justify-center font-mono">
      {{ STATE_LABELS[state] }}
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { DEFAULT_GENERATOR_PARAMS } from '@/config/defaults'
  import type { ArpCandidateState } from '@/composables/useArpGeneration'
  import { isArpChordTone } from '@/core/generator/arpeggio.generator'
  import type { ArpCandidate } from '@/core/generator/arp-candidate'
  import { getArpVoicingSpan } from '@/core/generator/arp-voicing'
  import { calculateArpPreviewLayout, calculateArpTimeGrid } from '@/utils/arp/arp-preview.utils'

  const props = defineProps<{
    candidate: ArpCandidate | null
    state: ArpCandidateState
  }>()

  const STATE_LABELS: Record<ArpCandidateState, string> = {
    ready: 'Candidate',
    loading: 'Loading model…',
    stale: 'Outdated',
    empty: 'No candidate'
  }
  const PITCH_LABEL_MIN_WIDTH_PX = 20

  const grid = computed(() =>
    props.candidate ? calculateArpTimeGrid(props.candidate.inputs.range, props.candidate.inputs.chords) : null
  )

  const layout = computed(() => {
    const inputs = props.candidate?.inputs
    if (!props.candidate || !inputs) return null
    const { range } = inputs
    const span = inputs.pitchSource === 'chord-voicing' ? getArpVoicingSpan(inputs.chords, range) : null
    return calculateArpPreviewLayout(
      props.candidate.notes,
      inputs.baseOctave ?? DEFAULT_GENERATOR_PARAMS.arpBaseOctave,
      inputs.octaveRange,
      range.endStep - range.startStep,
      range.startStep,
      (note) => isArpChordTone(note.step, note.midi, inputs),
      span
        ? {
            lowestMidi: Math.floor(span.lowMidi / 12) * 12,
            lowestOctave: Math.floor(span.lowMidi / 12) - 1,
            octaveCount: Math.max(1, Math.floor(span.highMidi / 12) - Math.floor(span.lowMidi / 12) + 1)
          }
        : undefined
    )
  })

  const barsLabel = computed(() => {
    const bars = grid.value?.bars
    if (!bars?.length) return ''
    const first = bars[0].bar
    const last = bars[bars.length - 1].bar
    return first === last ? `bar ${first}` : `bars ${first}–${last}`
  })
</script>
