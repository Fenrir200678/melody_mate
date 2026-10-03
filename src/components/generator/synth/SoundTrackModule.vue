<template>
  <div class="channel-strip" role="group" :aria-label="`${title} channel strip`">
    <!-- Track name + solo/mute -->
    <div class="strip-header">
      <span class="role-dot" :class="`dot-${variant}`" aria-hidden="true" />
      <span class="strip-name">{{ title }}</span>
      <div class="strip-buttons">
        <button
          type="button"
          class="rounded-chip text-micro flex h-5 w-5 cursor-pointer items-center justify-center border font-mono font-bold transition-colors"
          :class="solo ? soloActiveClass : toggleIdleClass"
          :aria-pressed="solo"
          :aria-label="`Solo ${title}`"
          :title="`Solo ${title}`"
          @click="mixer.setSolo(track, !solo)"
        >
          S
        </button>
        <button
          type="button"
          class="rounded-chip text-micro flex h-5 w-5 cursor-pointer items-center justify-center border font-mono font-bold transition-colors"
          :class="muted ? muteActiveClass : toggleIdleClass"
          :aria-pressed="muted"
          :aria-label="`Mute ${title}`"
          :title="`Mute ${title}`"
          @click="mixer.setMute(track, !muted)"
        >
          M
        </button>
      </div>
    </div>

    <!-- Routing summary -->
    <SoundMixRoutingSummary :track="track" :variant="variant" />

    <!-- Sound preset -->
    <DawPresetSelector v-model="soundId" :presets="presets" :variant="variant" :label="`${title} preset`" />

    <!-- Visual ADSR envelope curve -->
    <AdsrEnvelopeCanvas :attack="attack" :decay="decay" :sustain="sustain" :release="release" :variant="variant" />

    <!-- Sound shaping micro knobs: 2 rows of 4 knobs -->
    <div class="strip-knobs">
      <!-- Row 1: ADSR envelope -->
      <DawKnob
        v-model="attack"
        label="Atk"
        unit="%"
        :variant="variant"
        size="xs"
        @change="settings.setControl(track, 'attack', $event)"
      />
      <DawKnob
        v-model="decay"
        label="Dec"
        unit="%"
        :variant="variant"
        size="xs"
        @change="settings.setControl(track, 'decay', $event)"
      />
      <DawKnob
        v-model="sustain"
        label="Sus"
        unit="%"
        :variant="variant"
        size="xs"
        @change="settings.setControl(track, 'sustain', $event)"
      />
      <DawKnob
        v-model="release"
        label="Rel"
        unit="%"
        :variant="variant"
        size="xs"
        @change="settings.setControl(track, 'release', $event)"
      />

      <!-- Row 2: Filter & FX sends -->
      <DawKnob
        v-model="cutoff"
        label="Cutoff"
        unit="%"
        :variant="variant"
        size="xs"
        @change="settings.setControl(track, 'cutoff', $event)"
      />
      <DawKnob
        v-model="delay"
        label="Delay"
        unit="%"
        :variant="variant"
        size="xs"
        @change="settings.setControl(track, 'delay', $event)"
      />
      <DawKnob
        v-model="chorus"
        label="Chorus"
        unit="%"
        :variant="variant"
        size="xs"
        @change="settings.setControl(track, 'chorus', $event)"
      />
      <DawKnob
        v-model="reverb"
        label="Reverb"
        unit="%"
        :variant="variant"
        size="xs"
        @change="settings.setControl(track, 'reverb', $event)"
      />
    </div>

    <!-- Volume -->
    <div class="strip-volume">
      <DawFader
        v-model="volumeModel"
        orientation="horizontal"
        label="Vol"
        :min="0"
        :max="1"
        :step="0.01"
        :aria-label="`${title} volume`"
      />
      <DawIconButton
        :icon="RotateCcw"
        size="xs"
        appearance="ghost"
        :aria-label="`Reset ${title} sound controls`"
        title="Reset sound controls"
        @click="settings.resetControls(track)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { RotateCcw } from '@lucide/vue'
  import DawFader from '@/components/common/DawFader.vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawKnob from '@/components/common/DawKnob.vue'
  import DawPresetSelector from '@/components/common/DawPresetSelector.vue'
  import SoundMixRoutingSummary from '@/components/layout/sound-mix/SoundMixRoutingSummary.vue'
  import AdsrEnvelopeCanvas from './AdsrEnvelopeCanvas.vue'
  import { getPresetsForTrack, type PreviewTrack } from '@/core/presets/preview-sounds'
  import { useAudioSettingsStore } from '@/stores/audio-settings.store'
  import { useMixerStore } from '@/stores/mixer.store'

  const props = defineProps<{ track: PreviewTrack; title: string; variant: 'signal' | 'chord' }>()
  const settings = useAudioSettingsStore()
  const mixer = useMixerStore()

  const presets = computed(() => getPresetsForTrack(props.track))
  const soundId = computed({
    get: () => settings.soundIds[props.track],
    set: (val: string) => settings.setSound(props.track, val)
  })
  const controls = computed(() => settings.controls[props.track])

  const attack = computed({
    get: () => controls.value.attack,
    set: (val: number) => settings.setControl(props.track, 'attack', val)
  })
  const decay = computed({
    get: () => controls.value.decay,
    set: (val: number) => settings.setControl(props.track, 'decay', val)
  })
  const sustain = computed({
    get: () => controls.value.sustain,
    set: (val: number) => settings.setControl(props.track, 'sustain', val)
  })
  const release = computed({
    get: () => controls.value.release,
    set: (val: number) => settings.setControl(props.track, 'release', val)
  })

  const cutoff = computed({
    get: () => controls.value.cutoff,
    set: (val: number) => settings.setControl(props.track, 'cutoff', val)
  })
  const delay = computed({
    get: () => controls.value.delay,
    set: (val: number) => settings.setControl(props.track, 'delay', val)
  })
  const chorus = computed({
    get: () => controls.value.chorus,
    set: (val: number) => settings.setControl(props.track, 'chorus', val)
  })
  const reverb = computed({
    get: () => controls.value.reverb,
    set: (val: number) => settings.setControl(props.track, 'reverb', val)
  })

  const volumeModel = computed({
    get: () => (props.track === 'lead' ? mixer.leadVolume : mixer.chordVolume),
    set: (val: number) => mixer.setVolume(props.track, val)
  })

  const muted = computed(() => (props.track === 'lead' ? mixer.isLeadMuted : mixer.isChordMuted))
  const solo = computed(() => (props.track === 'lead' ? mixer.isLeadSolo : mixer.isChordSolo))

  const soloActiveClass = computed(() =>
    props.variant === 'chord'
      ? 'border-daw-chord bg-daw-chord/20 text-daw-chord'
      : 'border-daw-signal bg-daw-signal/20 text-daw-signal'
  )
  const muteActiveClass = 'border-daw-danger/50 bg-daw-danger/15 text-daw-danger'
  const toggleIdleClass = 'border-daw-border bg-daw-surface text-daw-text-muted hover:text-daw-text'
</script>
