<template>
  <div class="border-daw-border flex flex-wrap items-end gap-2 border-t pt-2">
    <div class="flex flex-col gap-1">
      <label for="arp-variation-seed" class="text-daw-text-muted text-2xs font-medium">Variation seed</label>
      <div class="flex gap-1">
        <input
          id="arp-variation-seed"
          name="arp-variation-seed"
          type="number"
          inputmode="numeric"
          autocomplete="off"
          min="0"
          max="4294967295"
          step="1"
          :value="melodyStore.arpVariationSeed"
          class="border-daw-border bg-daw-bg text-daw-text rounded-control focus-visible:border-daw-signal h-6 w-28 border px-2 font-mono text-xs tabular-nums focus-visible:outline-none"
          title="Same displayed candidate and variation seed reproduce the same change"
          @change="updateSeed"
        />
        <DawButton
          size="sm"
          appearance="surface"
          variant="signal"
          title="Choose a new variation seed"
          @click="melodyStore.nextArpVariationSeed()"
        >
          New seed
        </DawButton>
      </div>
    </div>
    <div class="flex items-center gap-1">
      <DawButton
        size="sm"
        appearance="surface"
        variant="signal"
        :disabled="!ready"
        @click="melodyStore.rerollArpVariation('pitches')"
      >
        Reroll pitches
      </DawButton>
      <DawButton
        size="sm"
        appearance="surface"
        variant="signal"
        :disabled="!ready"
        @click="melodyStore.rerollArpVariation('feel')"
      >
        Reroll feel
      </DawButton>
      <DawButton
        size="sm"
        appearance="ghost"
        variant="signal"
        :disabled="!ready || !hasVariations"
        @click="melodyStore.resetArpVariation()"
      >
        Reset variation
      </DawButton>
    </div>
    <span role="status" aria-live="polite" class="text-daw-text-muted text-micro min-w-0 font-mono">
      {{ melodyStore.arpVariationMessage }}
    </span>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { parseArpSeedInput } from '@/composables/arpSeed'
  import { useMelodyStore } from '@/stores/melody.store'

  const melodyStore = useMelodyStore()
  const ready = computed(() => melodyStore.arpCandidateState === 'ready')
  const hasVariations = computed(() => (melodyStore.arpCandidate?.variations.length ?? 0) > 0)

  function updateSeed(event: Event): void {
    const input = event.target as HTMLInputElement
    const parsed = parseArpSeedInput(input.value)
    if (parsed !== null && input.validity.valid) melodyStore.setArpVariationSeed(parsed)
    input.value = String(melodyStore.arpVariationSeed)
  }
</script>
