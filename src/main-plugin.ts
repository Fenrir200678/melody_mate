import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/main.css'
import './styles/plugin-header.css'
import PluginApp from './components/plugin/PluginApp.vue'

createApp(PluginApp).use(createPinia()).mount('#app')
