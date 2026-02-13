import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Auth/LoginView.vue'),
      meta: { title: '登录', guest: true }
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '', // Default to Dashboard
          name: 'Dashboard',
          component: () => import('@/views/Dashboard/DashboardView.vue'),
          meta: { title: '工作室' }
        },
        {
          path: 'knowledge',
          name: 'Knowledge',
          component: () => import('@/views/Knowledge/KnowledgeListView.vue'),
          meta: { title: '知识库' }
        },
        {
          path: 'knowledge/:id',
          name: 'KnowledgeDetail',
          component: () => import('@/views/Knowledge/KnowledgeDetailView.vue'),
          meta: { title: '知识库详情' }
        },
        {
          path: 'chat',
          name: 'Chat',
          component: () => import('@/views/Chat/ChatView.vue'),
          meta: { title: '智能对话' }
        },
        {
          path: 'monitoring',
          name: 'Monitoring',
          component: () => import('@/views/Monitoring/MonitoringView.vue'),
          meta: { title: '系统监控' }
        }
      ]
    },
    // Independent route for Studio (No MainLayout sidebar)
    {
      path: '/studio/:id',
      name: 'Studio',
      component: () => import('@/views/Workflow/WorkflowView.vue'),
      meta: { title: 'Workflow Studio', requiresAuth: true }
    },
    {
      path: '/workflow/:id',
      name: 'Workflow',
      component: () => import('@/views/Workflow/WorkflowView.vue'),
      meta: { title: 'Workflow Studio', requiresAuth: true }
    }
  ]
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'

  // 需要登录的页面
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isLoggedIn) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
  }

  // 已登录用户访问登录页，重定向到首页
  if (to.meta.guest && isLoggedIn) {
    next({ path: '/' })
    return
  }

  next()
})

export default router
