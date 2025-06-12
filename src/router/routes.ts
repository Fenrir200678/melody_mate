import { createMemoryHistory, createRouter } from 'vue-router'

const routes = [{ path: '/', component: () => import('@/pages/HomeView.vue') }]

export const router = createRouter({
  history: createMemoryHistory(),
  routes
})
