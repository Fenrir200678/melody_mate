import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import { PLUGIN_EDITOR_SIZE } from './src/config/ui-defaults.ts'
import { PLUGIN_LIMITS } from './src/config/defaults.ts'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    ...(mode === 'plugin'
      ? [
          {
            name: 'native-config',
            generateBundle(_, bundle) {
              for (const chunk of Object.values(bundle)) {
                if (chunk.type !== 'chunk') continue
                for (const id of Object.keys(chunk.modules)) {
                  if (
                    /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(?:tone|@vercel\/analytics)\//.test(id) ||
                    id.includes('/src/audio/')
                  ) {
                    this.error(`Browser-only runtime included in plugin bundle: ${id}`)
                  }
                }
              }
              this.emitFile({
                type: 'asset' as const,
                fileName: 'native-config.json',
                source: JSON.stringify({ ...PLUGIN_EDITOR_SIZE, ...PLUGIN_LIMITS })
              })
            }
          } as Plugin
        ]
      : []),
    vue(),
    ...(mode === 'plugin' ? [] : [vueDevTools()]),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '#platform-midi': fileURLToPath(
        new URL(mode === 'plugin' ? './src/platform/plugin/midi.ts' : './src/platform/browser-midi.ts', import.meta.url)
      ),
      '#sound-mix-dock': fileURLToPath(
        new URL(
          mode === 'plugin'
            ? './src/components/plugin/PluginOutputHint.vue'
            : './src/components/layout/SoundMixDock.vue',
          import.meta.url
        )
      ),
      '#platform-audio': fileURLToPath(
        new URL(
          mode === 'plugin' ? './src/platform/plugin/audio.store.ts' : './src/stores/browser-audio.store.ts',
          import.meta.url
        )
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@markov-tables': fileURLToPath(new URL('./markov-tables', import.meta.url))
    }
  },
  base: mode === 'plugin' ? './' : '/',
  build: {
    ...(mode === 'plugin' ? { outDir: 'plugin/dist', target: 'safari17' } : {}),
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      ...(mode === 'plugin' ? { input: fileURLToPath(new URL('./plugin.html', import.meta.url)) } : {}),
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
}))
