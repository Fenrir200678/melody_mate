<script setup lang="ts">
import { ref } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import RhythmPresets from './RhythmPresets.vue'
import EuclideanRhythm from './EuclideanRhythm.vue'
import RhythmSequencer from './RhythmSequencer.vue'

const activeTab = ref(0)
</script>

<template>
  <Tabs v-model:value="activeTab" class="w-full mb-0">
    <TabList class="overflow-x-auto">
      <Tab :value="0" class="text-xs sm:text-sm px-2 py-2 whitespace-nowrap"> Presets </Tab>
      <Tab :value="1" class="text-xs sm:text-sm px-2 py-2 whitespace-nowrap"> Euclidean </Tab>
      <Tab :value="2" class="text-xs sm:text-sm px-2 py-2 whitespace-nowrap"> Custom </Tab>
    </TabList>
    <TabPanels class="mt-4">
      <TabPanel :value="0">
        <RhythmPresets :rhythm-tab-selected="activeTab === 0" />
      </TabPanel>
      <TabPanel :value="1">
        <EuclideanRhythm :euclidean-tab-selected="activeTab === 1" />
      </TabPanel>
      <TabPanel :value="2">
        <RhythmSequencer />
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>
