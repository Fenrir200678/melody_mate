<script setup lang="ts">
import { ref } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import RhythmPresets from './RhythmPresets.vue'
import EuclideanRhythm from './EuclideanRhythm.vue'

const activeTab = ref(0)
</script>

<template>
  <Tabs v-model:value="activeTab">
    <TabList>
      <Tab :value="0">Rhythm Presets</Tab>
      <Tab :value="1">Euclidean Rhythm <span class="text-xs text-zinc-600 pl-1">beta</span></Tab>
    </TabList>
    <TabPanels>
      <TabPanel :value="0">
        <RhythmPresets />
      </TabPanel>
      <TabPanel :value="1">
        <EuclideanRhythm />
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>
