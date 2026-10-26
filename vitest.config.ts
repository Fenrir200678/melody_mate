import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '#platform-midi': fileURLToPath(new URL('./src/platform/browser-midi.ts', import.meta.url)),
      '#platform-audio': fileURLToPath(new URL('./src/stores/browser-audio.store.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@markov-tables': fileURLToPath(new URL('./markov-tables', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
