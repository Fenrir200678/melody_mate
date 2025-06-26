<script setup lang="ts">
import { useChordStore } from '@/stores/chord.store';

const chordStore = useChordStore();
</script>

<template>
  <div class="flex items-center justify-center gap-2">
    <div v-for="(chord, index) in chordStore.chords" :key="index" class="p-2 bg-zinc-800 rounded-lg flex flex-col items-center">
      <span class="font-bold">{{ chord.name }}</span>
      <span class="text-xs text-zinc-400">{{ chord.notes.join(', ') }}</span>
    </div>
  </div>
</template>
