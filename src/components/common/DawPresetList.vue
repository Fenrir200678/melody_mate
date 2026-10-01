<template>
  <div class="daw-preset-list">
    <!-- Category filter row: segmented category bar left, random dice + count right -->
    <div class="preset-list-head">
      <DawSegmented
        :model-value="selectedCategory"
        :options="categories"
        size="xs"
        :variant="variant"
        grow
        :aria-label="`${label} category filter`"
        class="min-w-0 flex-1"
        @update:model-value="emit('update:selectedCategory', $event)"
      />

      <div class="flex shrink-0 items-center gap-1.5">
        <span class="preset-list-count">{{ rows.length }}</span>

        <DawIconButton
          v-if="onDice"
          :icon="Dices"
          size="xs"
          appearance="panel"
          :variant="variant"
          :title="`Pick a random ${label.toLowerCase()} from the current category`"
          :aria-label="`Pick a random ${label.toLowerCase()} from the current category`"
          @click="pickRandom"
        />
      </div>
    </div>

    <p v-if="rows.length === 0" class="text-daw-text-muted text-micro px-1.5 py-2">
      No {{ label.toLowerCase() }} in this category.
    </p>

    <ul v-else class="preset-list-rows" role="listbox" :aria-label="`${label} presets`">
      <li v-for="row in rows" :key="row.id" role="presentation">
        <button
          type="button"
          class="preset-row"
          :class="[`btn-${variant}`, { 'is-selected': row.id === selectedId }]"
          :title="row.suggestion"
          role="option"
          :aria-selected="row.id === selectedId"
          @click="emit('select', row.id)"
        >
          <span class="preset-name">{{ row.name }}</span>
          <span v-if="row.detail" class="preset-detail">{{ row.detail }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  import { Dices } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawSegmented from '@/components/common/DawSegmented.vue'

  /** One pickable preset. `detail` is the compact right-hand readout, `suggestion` the hover tooltip. */
  export interface PresetRow {
    id: string
    name: string
    detail?: string
    suggestion?: string
  }

  interface Props {
    label: string
    variant?: 'signal' | 'pulse' | 'chord'
    rows: readonly PresetRow[]
    selectedId: string | null
    /** Category value paired with its display label, in filter order. */
    categories: readonly { label: string; value: string }[]
    selectedCategory: string
    /** Handler for the dice button; omitted hides it. */
    onDice?: () => void
  }

  const props = withDefaults(defineProps<Props>(), {
    variant: 'signal',
    onDice: undefined
  })

  const emit = defineEmits<{
    select: [id: string]
    'update:selectedCategory': [category: string]
  }>()

  function pickRandom(): void {
    props.onDice?.()
  }
</script>
