import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@markov-tables': fileURLToPath(new URL('./markov-tables', import.meta.url))
    }
  },
  build: {
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-tone',
              test: /node_modules[\\/]tone[\\/]/
            },
            {
              name: 'vendor-tonal',
              test: /node_modules[\\/](tonal|@tonaljs)[\\/]/
            },
            {
              name: 'vendor-framework',
              test: /node_modules[\\/](vue|pinia|@vueuse)[\\/]/
            },
            {
              name: 'vendor-lucide',
              test: /node_modules[\\/]@lucide[\\/]vue[\\/]/
            },
            {
              name: 'vendor-midi',
              test: /node_modules[\\/]midi-writer-js[\\/]/
            },
            {
              name: 'vendor-zod',
              test: /node_modules[\\/]zod[\\/]/
            },
            {
              name: 'vendor-misc',
              test: /node_modules[\\/]/
            }
          ]
        }
      }
    }
  }
})
