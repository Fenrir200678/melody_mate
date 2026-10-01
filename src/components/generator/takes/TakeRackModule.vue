<template>
  <DawModule v-model="isOpen" data-module-key="takes" title="Takes" role-dot="signal" :badge="badgeText">
    <TakeSeedControls @status="status = $event" />
    <div class="flex items-center justify-between gap-2">
      <p class="text-daw-text-muted text-micro min-w-0 flex-1 truncate" role="status" aria-live="polite">
        {{ takesStore.seedLocked ? 'Same seed for every generate.' : 'Generate chooses a new seed.' }}
      </p>
      <DawButton
        size="xs"
        appearance="surface"
        variant="default"
        :icon="Save"
        :disabled="!melodyStore.notes.length || takesStore.isFull"
        :title="saveTakeHint"
        @click="saveCurrentTake"
      >
        Save take
      </DawButton>
    </div>
    <p v-if="!takesStore.takes.length" class="text-daw-text-muted text-micro py-2">
      Generate a melody to capture your first take.
    </p>
    <div v-else class="take-list overflow-y-auto">
      <TakeRow
        v-for="take in orderedTakes"
        :key="take.id"
        :take="take"
        :selected="take.id === takesStore.selectedTakeId"
        :audition-busy="audioStore.isInitializingAudio"
        :auditioning="audioStore.auditioningId === take.id"
        @select="takesStore.selectTake(take.id)"
        @lock="takesStore.toggleLock(take.id)"
        @audition="audition(take)"
        @load="load(take)"
        @reuse-seed="takesStore.reuseSeed(take.seed)"
        @delete="remove(take.id)"
      />
    </div>
    <p v-if="takesStore.isFull" class="text-daw-text-muted text-micro">
      All takes are locked. Unlock or delete a take to capture more.
    </p>
    <div class="border-daw-border flex items-center justify-between gap-2 border-t pt-2">
      <DawToggle
        v-model="compareEnabled"
        label="A/B compare"
        appearance="switch"
        size="xs"
        variant="signal"
        title="Toggle A/B comparison between current melody and selected take"
        aria-describedby="take-compare-help"
      />
      <DawButton
        size="md"
        appearance="surface"
        variant="default"
        :disabled="!takesStore.compareEnabled || !selectedTake"
        :title="swapHint"
        aria-describedby="take-compare-help"
        @click="swap"
      >
        Swap
      </DawButton>
      <TakeClearAllModal :disabled="!takesStore.takes.length" @confirm="clearAll" />
    </div>
    <p id="take-compare-help" class="text-daw-text-muted text-micro" role="status" aria-live="polite">
      {{ compareHelp }}
    </p>
    <p v-if="status" class="text-daw-text-muted text-micro" role="status" aria-live="polite">
      {{ status }}
    </p>
  </DawModule>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { Save } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawModule from '@/components/common/DawModule.vue'
  import DawToggle from '@/components/common/DawToggle.vue'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import { randomSeed } from '@/core/generator/rng'
  import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
  import type { TakeSnapshot } from '@/core/schemas/take.schema'
  import { takeScope } from '@/core/takes/scope'
  import { useAudioStore } from '@/stores/audio.store'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useProjectStore } from '@/stores/project.store'
  import { TAKE_CAPACITY, useTakesStore } from '@/stores/takes.store'
  import TakeRow from './TakeRow.vue'
  import TakeSeedControls from './TakeSeedControls.vue'
  import TakeClearAllModal from './TakeClearAllModal.vue'

  const takesStore = useTakesStore()
  const melodyStore = useMelodyStore()
  const projectStore = useProjectStore()
  const audioStore = useAudioStore()
  const isOpen = useModuleOpenState('takes')
  const status = ref('')
  const orderedTakes = computed(() => [...takesStore.takes].reverse())
  const selectedTake = computed(() => takesStore.takes.find((take) => take.id === takesStore.selectedTakeId))
  const badgeText = computed(() => (takesStore.isFull ? 'full' : `${takesStore.takes.length} / ${TAKE_CAPACITY}`))
  const compareHelp = computed(() => {
    if (!takesStore.compareEnabled) return 'Enable A/B compare to compare your melody with a take.'
    if (!selectedTake.value) return "Click a take's seed to choose B. Your current melody is A."
    return `B: ${selectedTake.value.seed}. Swap switches between your melody (A) and this take (B).`
  })
  const swapHint = computed(() => {
    if (!takesStore.compareEnabled) return 'Enable A/B compare first'
    return selectedTake.value ? 'Switch between current melody and selected take' : 'Select a take by clicking its seed'
  })

  const saveTakeHint = computed(() => {
    if (takesStore.isFull) return 'Takes rack is full'
    if (!melodyStore.notes.length) return 'Generate or add notes to save a take'
    return 'Save current melody as a new take'
  })

  const compareEnabled = computed({
    get: () => takesStore.compareEnabled,
    set: (val: boolean) => takesStore.setCompareEnabled(val)
  })

  function saveCurrentTake(): void {
    if (!melodyStore.notes.length) return
    if (takesStore.isFull) {
      status.value = 'Cannot save take: all takes are locked.'
      return
    }
    let seed = takesStore.currentSeed
    if (!takesStore.seedLocked && takesStore.takes.some((t) => t.seed === seed)) {
      seed = randomSeed()
      takesStore.markSeedUsed(seed)
    }
    const take = takesStore.captureTake(
      melodyStore.notes,
      melodyStore.generatorParams,
      {
        key: projectStore.key,
        scale: projectStore.scale,
        bpm: projectStore.bpm,
        bars: projectStore.bars,
        rangeStartStep: 0,
        rangeEndStep: projectStore.bars * STEPS_PER_BAR
      },
      seed,
      { deduplicateBySeed: false }
    )
    if (take) {
      takesStore.selectTake(take.id)
      status.value = `Take saved (seed ${take.seed}).`
    }
  }

  async function audition(take: TakeSnapshot): Promise<void> {
    if (audioStore.auditioningId === take.id) {
      audioStore.stopNotesAudition()
      status.value = 'Audition stopped.'
      return
    }
    try {
      await audioStore.auditionNotes(take.notes, take.context.bpm, take.id)
      if (audioStore.initializationError) status.value = audioStore.initializationError
      else if (audioStore.auditioningId === take.id) status.value = 'Audition started.'
    } catch {
      status.value = 'Could not audition take. Try again.'
    }
  }

  function remove(id: string): void {
    if (audioStore.auditioningId === id) audioStore.stopNotesAudition()
    takesStore.removeTake(id)
  }

  function clearAll(): void {
    if (takesStore.takes.some((take) => take.id === audioStore.auditioningId)) audioStore.stopNotesAudition()
    takesStore.clearAllTakes()
    status.value = 'All takes cleared. The current melody is unchanged.'
  }

  function load(take: TakeSnapshot): void {
    takesStore.selectTake(take.id)
    melodyStore.replaceNotesInScope(take.notes, takeScope(take.context))
    status.value = 'Take loaded. Undo restores the previous melody.'
  }

  function swap(): void {
    if (!takesStore.compareEnabled || !selectedTake.value) return
    melodyStore.swapTake(selectedTake.value)
    status.value = 'Swapped. Swap again to return; undo is available.'
  }
</script>
