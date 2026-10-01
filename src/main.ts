import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { inject } from '@vercel/analytics'
import './styles/main.css'
import App from './App.vue'

inject()
const app = createApp(App)
app.use(createPinia())
app.mount('#app')
