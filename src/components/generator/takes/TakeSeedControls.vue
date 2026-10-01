<template>
  <div class="flex items-center gap-1">
    <label for="take-seed" class="text-daw-text-muted text-micro">Seed</label>
    <input
      id="take-seed"
      :value="takesStore.currentSeed"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      spellcheck="false"
      class="text-micro text-daw-text border-daw-border focus:border-daw-signal rounded-control h-6 min-w-0 flex-1 border bg-transparent px-1 font-mono tabular-nums outline-none"
      :aria-invalid="invalid"
      title="Enter or paste a seed (0–4294967295); applying it locks the seed"
      @input="invalid = false"
      @change="applySeed"
      @keydown.enter.prevent="blurInput"
    />
    <DawIconButton
      :icon="takesStore.seedLocked ? Lock : Unlock"
      size="xs"
      appearance="panel"
      variant="signal"
      :active="takesStore.seedLocked"
      :aria-label="takesStore.seedLocked ? 'Unlock seed' : 'Lock seed'"
      :title="takesStore.seedLocked ? 'Unlock seed' : 'Lock seed'"
      @click="takesStore.setSeedLocked(!takesStore.seedLocked)"
    />
    <DawIconButton
      :icon="copied ? Check : Copy"
      size="xs"
      appearance="panel"
      variant="signal"
      :active="copied"
      aria-label="Copy seed"
      :title="copied ? 'Copied' : 'Copy seed'"
      @click="copySeed"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useClipboard } from '@vueuse/core'
  import { Check, Copy, Lock, Unlock } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import { SeedSchema } from '@/core/schemas/take.schema'
  import { useTakesStore } from '@/stores/takes.store'

  const emit = defineEmits<{ status: [message: string] }>()
  const takesStore = useTakesStore()
  const invalid = ref(false)
  const { copy, copied, isSupported } = useClipboard({ copiedDuring: 1500 })

  function applySeed(event: Event): void {
    const input = event.target as HTMLInputElement
    const text = input.value.trim()
    const result = SeedSchema.safeParse(/^\d+$/.test(text) ? Number(text) : NaN)
    invalid.value = !result.success
    if (!result.success) {
      emit('status', 'Enter a whole number from 0 to 4294967295.')
      return
    }
    takesStore.reuseSeed(result.data)
    input.value = String(result.data)
    emit('status', 'Seed applied and locked. Generate uses this seed.')
  }

  function blurInput(event: KeyboardEvent): void {
    ;(event.target as HTMLInputElement).blur()
  }

  async function copySeed(): Promise<void> {
    if (!isSupported.value) {
      emit('status', 'Clipboard unavailable. Select and copy the seed value.')
      return
    }
    try {
      await copy(String(takesStore.currentSeed))
      emit('status', 'Seed copied.')
    } catch {
      emit('status', 'Could not copy seed. Try again.')
    }
  }
</script>
