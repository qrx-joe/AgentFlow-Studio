<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

// 主布局只负责导航与页面容器
const route = useRoute()
const router = useRouter()

const menus = [
  { name: '工作流编排', path: '/workflow' },
  { name: '知识库管理', path: '/knowledge' },
  { name: '智能对话', path: '/chat' },
]

const handleSelect = (path: string) => {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">AF</div>
        <div class="title">AgentFlow Studio</div>
      </div>
      <nav class="menu">
        <button
          v-for="item in menus"
          :key="item.path"
          class="menu-item"
          :class="{ active: route.path === item.path }"
          @click="handleSelect(item.path)"
        >
          {{ item.name }}
        </button>
      </nav>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #f6f8fb 0%, #edf2f7 100%);
}

.sidebar {
  width: 220px;
  padding: 20px 16px;
  background: #0f172a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #38bdf8;
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.title {
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menu-item {
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #cbd5f5;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.menu-item.active,
.menu-item:hover {
  background: rgba(56, 189, 248, 0.18);
  color: #e2e8f0;
}

.content {
  flex: 1;
  padding: 20px;
  overflow: hidden;
}
</style>
