import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router/routes'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'

import App from './App.vue'
import '@/assets/styles.css'

const app = createApp(App)
const pinia = createPinia()

app
  .use(pinia)
  .use(router)
  .use(PrimeVue, {
    ripple: true,
    theme: {
      preset: Aura
    }
  })

app.mount('#app')
