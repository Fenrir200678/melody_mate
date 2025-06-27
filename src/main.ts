import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router/routes'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'

import { MelodyOrchestrator } from './services/melody/core/MelodyOrchestrator.service'
import { WeightedRhythmSelector } from './services/rhythm/generators/WeightedRhythmSelector.service'
import { EuclideanRhythmGenerator } from './services/rhythm/generators/EuclideanRhythmGenerator.service'
import { RhythmPatternProcessor } from './services/rhythm/processors/RhythmPatternProcessor.service'
import { SafeMidiService } from './services/midi/SafeMidiService'
import { CustomRhythmMidiConverter } from './services/midi/CustomRhythmMidiConverter'

import App from './App.vue'
import '@/assets/styles.css'

// Create Service Instances (Singleton Pattern)
const melodyOrchestrator = new MelodyOrchestrator()
const weightedRhythmSelector = new WeightedRhythmSelector()
const euclideanRhythmGenerator = new EuclideanRhythmGenerator()
const rhythmPatternProcessor = new RhythmPatternProcessor()
const safeMidiService = new SafeMidiService()
const customRhythmMidiConverter = new CustomRhythmMidiConverter()

const app = createApp(App)
const pinia = createPinia()

app.provide('melodyOrchestrator', melodyOrchestrator)
app.provide('weightedRhythmSelector', weightedRhythmSelector)
app.provide('euclideanRhythmGenerator', euclideanRhythmGenerator)
app.provide('rhythmPatternProcessor', rhythmPatternProcessor)
app.provide('safeMidiService', safeMidiService)
app.provide('customRhythmMidiConverter', customRhythmMidiConverter)

app
  .use(pinia)
  .use(router)
  .use(PrimeVue, {
    ripple: true,
    theme: {
      preset: Aura
    }
  })
  .use(ToastService)

app.mount('#app')
