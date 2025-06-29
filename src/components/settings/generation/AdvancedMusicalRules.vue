<script setup lang="ts">
import { useGenerationStore } from '@/stores/generation.store'
import ToggleSwitch from 'primevue/toggleswitch'
import Divider from 'primevue/divider'
import NGramSelector from './NGramSelector.vue'
import InfoBox from '@/components/common/InfoBox.vue'

const generationStore = useGenerationStore()

const musicalRules = [
  {
    key: 'enableIntervalWeighting',
    label: 'Interval Weighting',
    description: 'Penalizes large melodic leaps and favors stepwise motion. Larger jumps are less likely.',
    setter: 'setEnableIntervalWeighting'
  },
  {
    key: 'enableScaleDegreeWeighting',
    label: 'Scale Degree Weighting',
    description:
      'Favors stable scale degrees like tonic (1st), dominant (5th), and mediant (3rd). Makes melodies more tonal.',
    setter: 'setEnableScaleDegreeWeighting'
  },
  {
    key: 'enableChordToneWeighting',
    label: 'Chord Tone Weighting',
    description:
      'Strongly favors notes that belong to the current chord. Creates harmonic cohesion with chord progressions.',
    setter: 'setEnableChordToneWeighting'
  },
  {
    key: 'enableMelodicContourWeighting',
    label: 'Melodic Contour Weighting',
    description: 'Shapes the overall melodic direction (arc, ascending, descending) throughout the melody.',
    setter: 'setEnableMelodicContourWeighting'
  },
  {
    key: 'enableBeatStrengthWeighting',
    label: 'Beat Strength Weighting',
    description: 'Favors chord tones and stable notes on strong beats, allows more freedom on weak beats.',
    setter: 'setEnableBeatStrengthWeighting'
  },
  {
    key: 'enableVoiceLeadingWeighting',
    label: 'Voice Leading Rules',
    description:
      'Implements classical voice leading: leading tone resolution, stepwise motion for dissonances, avoids tritone leaps.',
    setter: 'setEnableVoiceLeadingWeighting'
  },
  {
    key: 'enableRangeWeighting',
    label: 'Range Awareness',
    description: 'Keeps melody within reasonable octave ranges and guides it back from extreme registers.',
    setter: 'setEnableRangeWeighting'
  }
]
// @ts-expect-error - Dynamic method calling
function handleRuleToggle(ruleKey: string, setter: string, value: boolean) {
  // @ts-expect-error - Dynamic method calling
  generationStore[setter](value)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col flex-1 min-w-0 mb-4">
      <label class="font-medium">Advanced Musical Rules</label>
      <span class="text-xs break-words">
        Fine-tune the musical intelligence by enabling or disabling individual weighting rules. Each rule influences how
        the algorithm chooses the next note in the melody.
      </span>
    </div>

    <!-- Experimental Note -->
    <InfoBox
      description="Not all rules make sense for all types of melodies, rhythms or other selected options like chord progression guidance. 
      You have to experiment with the rules to find the best settings for your use case. Usually, you will want to disable some rules, since they can overpower each other."
    />

    <div class="space-y-4">
      <template v-for="rule in musicalRules" :key="rule.key">
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col flex-1 min-w-0">
            <label :for="`${rule.key}-switch`" class="font-medium leading-tight">
              {{ rule.label }}<br />
              <span class="text-xs break-words">
                {{ rule.description }}
              </span>
            </label>
          </div>
          <div class="flex-shrink-0 mt-1">
            <ToggleSwitch
              :model-value="generationStore[rule.key as keyof typeof generationStore] as boolean"
              :input-id="`${rule.key}-switch`"
              @update:model-value="handleRuleToggle(rule.key, rule.setter, $event)"
            />
          </div>
        </div>
      </template>
    </div>

    <div class="space-y-4" v-if="generationStore.enableMelodicContourWeighting">
      <Divider />
      <MelodicContourSelector />
    </div>

    <Divider />

    <div class="space-y-4">
      <NGramSelector />
    </div>
  </div>
</template>
