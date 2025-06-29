<script setup lang="ts">
import { useGenerationStore } from "@/stores/generation.store";
import Checkbox from "primevue/checkbox";

const generationStore = useGenerationStore();
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="use-call-and-response" class="font-medium leading-tight">
        Use Call and Response<br />
        <span class="text-xs break-words">
          Tries to create musical dialogue between phrases with intelligent variations:
          echoes, inversions, sequences, and resolutions. Doesn't always make sense and doesn't work well with any rhythm, but can provide happy accidents.
        </span>
      </label>
    </div>
    <div class="flex-shrink-0 mt-1">
      <Checkbox
        v-model="generationStore.useCallAndResponse"
        :binary="true"
        inputId="use-call-and-response"
        @update:modelValue="generationStore.setUseCallAndResponse"
      />
    </div>
  </div>
</template>
