<template>
  <div class="flex items-center gap-1" aria-label="Progression presets">
    <!-- Prev Button -->
    <DawIconButton
      :icon="ChevronLeft"
      size="sm"
      appearance="surface"
      :disabled="filteredProgressions.length <= 1"
      title="Previous progression preset"
      aria-label="Previous progression preset"
      @click="selectPrev"
    />

    <!-- Center Popover Trigger -->
    <DawPopover v-model:open="isPopoverOpen" :side-offset="4">
      <template #default="{ isOpen, toggle }">
        <button
          type="button"
          class="border-daw-border bg-daw-surface hover:bg-daw-panel/80 rounded-control group text-2xs flex h-6 max-w-64 min-w-44 cursor-pointer items-center justify-between gap-1.5 border px-2 transition-colors focus:outline-none"
          :class="[
            isOpen ? 'border-daw-chord bg-daw-panel ring-daw-chord/30 ring-1' : '',
            'focus-visible:border-daw-chord'
          ]"
          :aria-expanded="isOpen"
          aria-haspopup="listbox"
          title="Browse chord progression presets"
          @click="toggle"
        >
          <div class="flex min-w-0 items-center gap-1.5">
            <span class="bg-daw-chord h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true" />
            <span class="text-daw-text truncate font-medium">
              {{ currentProgression?.name ?? 'Progression Presets' }}
            </span>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <span v-if="currentProgression" class="bg-daw-bg text-daw-chord text-micro rounded px-1 py-0.5 font-mono">
              {{ formatRoman(getProgressionRoman(currentProgression)) }}
            </span>
            <ChevronDown
              class="text-daw-text-muted h-3 w-3 transition-transform duration-150"
              :class="{ 'text-daw-text rotate-180': isOpen }"
              aria-hidden="true"
            />
          </div>
        </button>
      </template>

      <template #content="{ close }">
        <div class="border-daw-border bg-daw-panel rounded-control flex w-80 flex-col overflow-hidden shadow-2xl">
          <!-- Category Chips Filter Header -->
          <div class="border-daw-border bg-daw-surface/50 flex flex-wrap items-center gap-1 border-b p-1.5">
            <button
              v-for="cat in PROGRESSION_CATEGORIES"
              :key="cat.value"
              type="button"
              class="rounded-chip text-micro cursor-pointer px-2 py-0.5 font-medium transition-colors"
              :class="[
                categoryFilter === cat.value
                  ? 'border-daw-chord bg-daw-chord/20 text-daw-chord border font-semibold shadow-xs'
                  : 'text-daw-text-muted hover:text-daw-text hover:bg-daw-surface'
              ]"
              @click="categoryFilter = cat.value"
            >
              {{ cat.label }}
            </button>
          </div>

          <!-- Presets List -->
          <div role="listbox" class="text-2xs max-h-64 w-full overflow-y-auto p-1" tabindex="-1">
            <button
              v-for="prog in filteredProgressions"
              :key="prog.id"
              type="button"
              role="option"
              :aria-selected="prog.id === harmonyStore.selectedProgressionId"
              class="rounded-control group flex w-full cursor-pointer flex-col gap-0.5 px-2 py-1.5 text-left transition-colors"
              :class="[
                prog.id === harmonyStore.selectedProgressionId
                  ? 'bg-daw-chord/15 text-daw-chord font-medium'
                  : 'text-daw-text hover:bg-daw-surface hover:text-daw-text'
              ]"
              :title="describeProgression(prog)"
              @click="onSelect(prog.id, close)"
            >
              <div class="flex items-center justify-between gap-1">
                <div class="flex min-w-0 items-center gap-1.5">
                  <Check
                    v-if="prog.id === harmonyStore.selectedProgressionId"
                    class="text-daw-chord h-3 w-3 shrink-0"
                    aria-hidden="true"
                  />
                  <span v-else class="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span class="truncate font-semibold">{{ prog.name }}</span>
                </div>
                <span class="bg-daw-bg/80 text-daw-chord text-micro shrink-0 rounded px-1.5 py-0.5 font-mono">
                  {{ formatRoman(getProgressionRoman(prog)) }}
                </span>
              </div>
              <div class="text-daw-text-muted text-micro flex items-center justify-between pl-4.5">
                <span class="truncate">{{ prog.subgenre ?? prog.category }} · {{ prog.scale }}</span>
                <span class="font-mono">{{ prog.chords.length }} chords · {{ prog.bars }} bars</span>
              </div>
            </button>
          </div>
        </div>
      </template>
    </DawPopover>

    <!-- Next Button -->
    <DawIconButton
      :icon="ChevronRight"
      size="sm"
      appearance="surface"
      :disabled="filteredProgressions.length <= 1"
      title="Next progression preset"
      aria-label="Next progression preset"
      @click="selectNext"
    />

    <!-- Dice Randomize Button -->
    <DawIconButton
      :icon="Dices"
      size="sm"
      appearance="surface"
      variant="chord"
      title="Random progression preset (Dice)"
      aria-label="Random progression preset"
      @click="pickRandom"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { Check, ChevronDown, ChevronLeft, ChevronRight, Dices } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawPopover from '@/components/common/DawPopover.vue'
  import {
    describeProgression,
    formatRoman,
    getProgressionRoman,
    PROGRESSION_CATEGORIES,
    useProgressionPresets
  } from '@/composables/harmony/useProgressionPresets'
  import { useHarmonyStore } from '@/stores/harmony.store'

  const harmonyStore = useHarmonyStore()
  const isPopoverOpen = ref(false)

  const {
    categoryFilter,
    filteredProgressions,
    currentProgression,
    selectProgression,
    selectPrev,
    selectNext,
    pickRandom
  } = useProgressionPresets()

  /** Closing the popover belongs to this trigger, not to the shared preset composable. */
  function onSelect(id: string, close: () => void): void {
    selectProgression(id)
    close()
  }
</script>
