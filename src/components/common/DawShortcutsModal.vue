<template>
  <DawModal v-model="isOpen" title="Keyboard Shortcuts" max-width="max-w-4xl">
    <div class="flex flex-col gap-4">
      <!-- Search & Status Bar -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <!-- Search Input -->
        <div class="relative flex-1">
          <Search
            class="text-daw-text-muted pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2"
          />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            placeholder="Search shortcuts (e.g. zoom, transport, duplicate, loop, tab)..."
            class="bg-daw-panel border-daw-border text-daw-text placeholder:text-daw-text-muted/60 focus:border-daw-signal focus:ring-daw-signal rounded-control font-ui w-full border py-1.5 pr-8 pl-8 text-xs transition-colors focus:ring-1 focus:outline-none"
            aria-label="Search keyboard shortcuts"
          />
          <DawIconButton
            v-if="searchQuery"
            :icon="X"
            size="xs"
            appearance="ghost"
            class="absolute top-1/2 right-1.5 -translate-y-1/2"
            aria-label="Clear search"
            title="Clear search"
            @click="searchQuery = ''"
          />
        </div>

        <!-- Counter Chip -->
        <div
          class="bg-daw-panel border-daw-border text-daw-text-muted rounded-chip text-2xs flex shrink-0 items-center gap-1.5 border px-2.5 py-1 font-mono select-none"
        >
          <Keyboard class="text-daw-signal h-3 w-3" />
          <span>{{ matchedCount }} / {{ totalCount }} shortcuts</span>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="filteredCategories.length === 0"
        class="bg-daw-panel/40 border-daw-border rounded-panel flex flex-col items-center justify-center border py-12 text-center"
      >
        <SearchX class="text-daw-text-muted mb-2 h-8 w-8 opacity-60" />
        <p class="text-daw-text text-sm font-medium">No matching shortcuts found</p>
        <p class="text-daw-text-muted text-xs">Try searching for a different action, tool, or key.</p>
        <DawButton size="md" appearance="surface" variant="signal" class="mt-3" @click="searchQuery = ''">
          Clear search
        </DawButton>
      </div>

      <!-- Categories Grid -->
      <div v-else class="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <section
          v-for="group in filteredCategories"
          :key="group.category"
          class="bg-daw-panel/50 border-daw-border rounded-panel flex flex-col border p-3"
          :aria-label="group.category"
        >
          <!-- Category Header -->
          <div class="border-daw-border/70 mb-2 flex items-center justify-between border-b pb-1.5">
            <h4 class="text-daw-signal text-2xs font-mono font-bold tracking-wider uppercase">
              {{ group.category }}
            </h4>
            <span class="text-daw-text-muted text-micro font-mono">
              {{ group.items.length }}
            </span>
          </div>

          <!-- Shortcuts List -->
          <ul class="flex flex-col gap-1.5">
            <li
              v-for="item in group.items"
              :key="item.id"
              class="border-daw-border/30 flex items-center justify-between gap-3 border-b py-1.5 last:border-0"
            >
              <!-- Label & Description -->
              <div class="flex min-w-0 flex-1 flex-col pr-1">
                <span class="text-daw-text text-xs font-medium">
                  {{ item.label }}
                </span>
                <span class="text-daw-text-muted font-ui text-2xs leading-snug wrap-break-word">
                  {{ item.description }}
                </span>
              </div>

              <!-- Key Badges -->
              <div class="flex shrink-0 flex-wrap items-center justify-end gap-1">
                <span
                  v-for="(keyCombo, idx) in resolveDisplayKeys(item.keys, isMac)"
                  :key="idx"
                  class="flex items-center gap-1"
                >
                  <kbd
                    class="bg-daw-surface border-daw-border text-daw-signal rounded-chip text-micro border px-1.5 py-0.5 font-mono font-semibold whitespace-nowrap shadow-xs"
                  >
                    {{ formatKeyCombo(keyCombo, isMac) }}
                  </kbd>
                  <span
                    v-if="idx < resolveDisplayKeys(item.keys, isMac).length - 1"
                    class="text-daw-text-muted/60 text-micro"
                  >
                    /
                  </span>
                </span>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <!-- Modal Footer -->
    <template #footer>
      <div class="flex w-full items-center justify-between text-xs">
        <div class="text-daw-text-muted text-2xs flex items-center gap-1.5">
          <span>Tip: Press</span>
          <kbd
            class="bg-daw-surface border-daw-border text-daw-signal rounded-chip py-0.2 text-micro border px-1.5 font-mono font-semibold shadow-xs"
          >
            ?
          </kbd>
          <span>anywhere to toggle this help</span>
        </div>

        <DawButton size="md" appearance="surface" variant="signal" @click="isOpen = false"> Close </DawButton>
      </div>
    </template>
  </DawModal>
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, watch } from 'vue'
  import { Keyboard, Search, SearchX, X } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawModal from '@/components/common/DawModal.vue'
  import {
    filterShortcuts,
    formatKeyCombo,
    groupShortcutsByCategory,
    resolveDisplayKeys,
    SHORTCUT_DEFINITIONS
  } from '@/composables/shortcutDefinitions'

  const isOpen = defineModel<boolean>({ default: false })

  const searchQuery = ref('')
  const searchInputRef = ref<HTMLInputElement | null>(null)

  const isMac = computed<boolean>(() => {
    if (typeof navigator === 'undefined') return false
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
    const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || ''
    return /mac|iphone|ipad|ipod/i.test(platform)
  })

  // Focus search input automatically when opened
  watch(isOpen, (opened) => {
    if (opened) {
      void nextTick(() => {
        searchInputRef.value?.focus()
      })
    } else {
      searchQuery.value = ''
    }
  })

  const totalCount = SHORTCUT_DEFINITIONS.length

  const filteredCategories = computed(() => {
    const matches = filterShortcuts(SHORTCUT_DEFINITIONS, searchQuery.value)
    return groupShortcutsByCategory(matches)
  })

  const matchedCount = computed(() => filteredCategories.value.reduce((acc, group) => acc + group.items.length, 0))
</script>
