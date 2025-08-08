<script setup lang="ts">
import { computed } from 'vue'

type SettingsTab = 'key-scale' | 'harmony' | 'rhythm' | 'composition' | 'motif' | 'start-end' | 'advanced'

const modelValue = defineModel<SettingsTab>({ required: true })

type MenuItem = {
  id: SettingsTab
  label: string
  icon: string
}

const items: MenuItem[] = [
  { id: 'key-scale', label: 'Key & Scale', icon: 'pi pi-headphones' },
  { id: 'harmony', label: 'Harmony', icon: 'pi pi-sitemap' },
  { id: 'rhythm', label: 'Rhythm', icon: 'pi pi-sliders-h' },
  { id: 'composition', label: 'Composition', icon: 'pi pi-file-edit' },
  { id: 'motif', label: 'Motif', icon: 'pi pi-share-alt' },
  { id: 'start-end', label: 'Start/End', icon: 'pi pi-step-forward' },
  { id: 'advanced', label: 'Advanced', icon: 'pi pi-cog' }
]

function selectTab(id: SettingsTab) {
  modelValue.value = id
}

const isActive = (id: SettingsTab) => computed(() => modelValue.value === id)
</script>

<template>
  <nav class="bg-transparent border-none" style="height: var(--bottom-menu-h)">
    <ul class="flex items-center justify-between gap-1 px-2 md:px-4 overflow-x-auto">
      <li v-for="item in items" :key="item.id" class="flex-1 min-w-20">
        <button
          class="relative w-full flex flex-col items-center gap-1 py-2 md:py-3 px-3 text-xs md:text-sm cursor-pointer rounded-md transition-colors duration-150 ease-out"
          :class="[
            isActive(item.id).value
              ? 'text-emerald-300 bg-zinc-800/60 ring-1 ring-inset ring-zinc-700'
              : 'text-zinc-300 hover:text-white'
          ]"
          @click="selectTab(item.id)"
        >
          <i :class="[item.icon, 'text-base md:text-lg']"></i>
          <span class="whitespace-nowrap">{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
  <!-- separator handled by PageHeader -->
  <!-- space for iOS safe area if needed -->
</template>
