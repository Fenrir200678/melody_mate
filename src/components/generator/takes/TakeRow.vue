<template>
  <div class="take-row group border-daw-border border-t py-2" :class="{ 'bg-daw-surface': selected }">
    <div class="flex min-w-0 items-center gap-2">
      <button
        type="button"
        class="take-select rounded-chip flex min-w-0 flex-1 items-center gap-2 text-left"
        :aria-pressed="selected"
        :aria-label="`Select take with seed ${take.seed}`"
        :title="`Seed ${take.seed}${take.arpVariations?.length ? ` · ${take.arpVariations.length} arp variation(s)` : ''} · ${take.context.key} ${take.context.scale} · ${take.context.bpm} bpm`"
        @click="emit('select')"
      >
        <TakeSparkline :notes="take.notes" :musical-key="take.context.key" />
        <span class="text-micro flex min-w-0 flex-col font-mono">
          <span class="text-daw-text truncate">{{ take.seed }}</span>
          <span v-if="take.arpVariations?.length" class="text-daw-pulse truncate">
            Arp {{ take.arpVariations.at(-1)?.mode }} · {{ take.arpVariations.at(-1)?.seed }}
          </span>
          <span class="text-daw-text-muted truncate"
            >{{ take.context.key }} · {{ take.context.bpm }} bpm<span v-if="take.score !== null">
              · {{ take.score }} score</span
            ></span
          >
        </span>
      </button>
      <DawIconButton
        :icon="take.locked ? Lock : Unlock"
        size="xs"
        appearance="panel"
        variant="signal"
        :active="take.locked"
        :aria-label="take.locked ? 'Unlock take' : 'Lock take'"
        :title="take.locked ? 'Unlock take' : 'Lock take'"
        @click="emit('lock')"
      />
    </div>
    <div class="take-actions mt-2 flex items-center gap-1.5">
      <DawIconButton
        :icon="auditioning ? Square : Play"
        size="xs"
        appearance="surface"
        variant="signal"
        :active="auditioning"
        :disabled="!auditioning && (!take.notes.length || auditionBusy)"
        :aria-label="auditioning ? 'Stop audition' : 'Audition take'"
        :title="auditioning ? 'Stop audition' : 'Audition'"
        @click="emit('audition')"
      />
      <DawIconButton
        :icon="SquareArrowOutUpRight"
        size="xs"
        appearance="surface"
        variant="signal"
        aria-label="Load take"
        title="Load"
        @click="emit('load')"
      />
      <div class="take-secondary ml-auto flex gap-1">
        <DawIconButton
          :icon="Dices"
          size="xs"
          appearance="panel"
          variant="signal"
          aria-label="Reuse seed"
          title="Reuse seed"
          @click="emit('reuseSeed')"
        />
        <DawIconButton
          :icon="Trash2"
          size="xs"
          appearance="panel"
          variant="danger"
          aria-label="Delete take"
          title="Delete"
          @click="emit('delete')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Dices, SquareArrowOutUpRight, Lock, Play, Square, Trash2, Unlock } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import type { TakeSnapshot } from '@/core/schemas/take.schema'
  import TakeSparkline from './TakeSparkline.vue'

  defineProps<{ take: TakeSnapshot; selected: boolean; auditionBusy: boolean; auditioning: boolean }>()
  const emit = defineEmits<{
    select: []
    lock: []
    audition: []
    load: []
    reuseSeed: []
    delete: []
  }>()
</script>
