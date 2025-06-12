import { createWebHashHistory, createRouter } from 'vue-router'

const routes = [
  { path: '/', component: () => import('@/pages/HomeView.vue') },
  { path: '/magenta', component: () => import('@/pages/MagentaPlayer.vue') }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
