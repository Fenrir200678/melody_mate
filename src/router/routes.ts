import { createMemoryHistory, createRouter } from 'vue-router'

const routes = [{ path: '/', component: () => import('@/App.vue') }]

export const router = createRouter({
  history: createMemoryHistory(),
  routes
})
