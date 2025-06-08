import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevtools from 'vite-plugin-vue-devtools'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevtools(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
