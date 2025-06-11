import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevtools from 'vite-plugin-vue-devtools'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import compression from 'vite-plugin-compression'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { PrimeVueResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    base: './',
    plugins: [
      vue(),
      !isProduction ? vueDevtools() : undefined,
      tailwindcss(),
      Components({
        resolvers: [PrimeVueResolver()]
      }),
      AutoImport({
        imports: ['vue', 'pinia'],
        dts: 'src/auto-imports.d.ts',
        eslintrc: {
          enabled: true,
          filepath: './.eslintrc-auto-import.json',
          globalsPropValue: true
        }
      }),
      isProduction
        ? compression({
            algorithm: 'gzip',
            ext: '.gz'
          })
        : undefined
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    build: {
      minify: isProduction ? 'terser' : 'esbuild',
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true
            },
            format: {
              comments: false
            }
          }
        : undefined,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('primevue') || id.includes('primeicons')) {
                return 'primevue'
              }
              if (id.includes('tone')) {
                return 'tone'
              }
              if (id.includes('vue') || id.includes('@vue') || id.includes('pinia')) {
                return 'vue'
              }
              return 'vendor' // all other node_modules
            }
          }
        }
      }
    }
  }
})
