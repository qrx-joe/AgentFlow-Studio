import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '', // Default to Dashboard
          name: 'Dashboard',
          component: () => import('@/views/Dashboard/DashboardView.vue'),
          meta: { title: '工作室' }
        },
        // Old workflow path reserved or redirected
        // { path: 'workflow', redirect: '/' }, 
        {
          path: 'knowledge',
          name: 'Knowledge',
          component: () => import('@/views/Knowledge/KnowledgeView.vue'),
          meta: { title: '知识库管理' }
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
      meta: { title: 'Workflow Studio' }
    },
    {
      path: '/workflow/:id',
      name: 'Workflow',
      component: () => import('@/views/Workflow/WorkflowView.vue'),
      meta: { title: 'Workflow Studio' }
    }
  ]
})

export default router
