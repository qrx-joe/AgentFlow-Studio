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
          path: '',
          redirect: '/workflow'
        },
        {
          path: 'workflow',
          name: 'Workflow',
          component: () => import('@/views/Workflow/WorkflowView.vue'),
          meta: { title: '工作流编排' }
        },
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
        }
      ]
    }
  ]
})

export default router
