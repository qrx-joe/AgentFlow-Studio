<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { Files, ChatLineRound, Monitor } from '@element-plus/icons-vue'

// 主布局：现代化侧边栏与内容区
const route = useRoute()
const router = useRouter()

const menus = [
  { name: '工作室', path: '/', icon: Monitor }, // Changed to Dashboard
  { name: '知识库管理', path: '/knowledge', icon: Files },
  { name: '智能对话', path: '/chat', icon: ChatLineRound },
  // { name: '系统监控', path: '/monitor', icon: Monitor }, // 暂未实现路由
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
        <div class="logo-box">
          <span class="logo-text">AF</span>
        </div>
        <div class="brand-info">
          <div class="title">AgentFlow</div>
          <div class="subtitle">Steve Studio</div>
        </div>
      </div>
      
      <nav class="menu">
        <div class="menu-label">MENU</div>
        <button
          v-for="item in menus"
          :key="item.path"
          class="menu-item"
          :class="{ active: route.path.startsWith(item.path) }"
          @click="handleSelect(item.path)"
        >
          <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
          <span class="menu-text">{{ item.name }}</span>
          <div v-if="route.path.startsWith(item.path)" class="active-indicator"></div>
        </button>
      </nav>

      <div class="user-profile">
        <div class="avatar">U</div>
        <div class="user-info">
          <div class="user-name">User</div>
          <div class="user-role">Developer</div>
        </div>
      </div>
    </aside>

    <main class="content-wrapper">
      <header class="top-bar">
        <!-- 面包屑或标题，暂时留空 -->
        <span class="page-title">{{ route.meta.title || 'AgentFlow Studio' }}</span>
      </header>
      <div class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
             <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: var(--color-neutral-50);
  font-family: var(--font-family-base);
  color: var(--color-neutral-800);
}

/* Sidebar Styling */
.sidebar {
  width: 260px;
  background: #ffffff; /* Light sidebar for cleaner look, or var(--color-primary-900) for dark */
  border-right: 1px solid var(--color-neutral-200);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  transition: all 0.3s ease;
  z-index: 10;
}

/* Dark mode sidebar option */
/* .sidebar {
  background: var(--color-neutral-900);
  color: var(--color-neutral-100);
  border-right: 1px solid rgba(255,255,255,0.05);
} */

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px 32px 12px;
}

.logo-box {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 800;
  font-size: 18px;
  box-shadow: var(--shadow-md);
}

.brand-info {
  display: flex;
  flex-direction: column;
}

.title {
  font-weight: 700;
  font-size: 16px;
  color: var(--color-neutral-900);
  line-height: 1.2;
}

.subtitle {
  font-size: 12px;
  color: var(--color-neutral-500);
}

.menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.menu-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-neutral-400);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 12px 8px 12px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-neutral-600);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  text-align: left;
}

.menu-item:hover {
  background: var(--color-neutral-100);
  color: var(--color-neutral-900);
}

.menu-item.active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}

.menu-icon {
  font-size: 18px;
}

.active-indicator {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  background: var(--color-primary-500);
  border-radius: 2px 0 0 2px;
}

/* User Profile */
.user-profile {
  margin-top: auto;
  padding: 16px 12px 0;
  border-top: 1px solid var(--color-neutral-100);
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-neutral-200);
  color: var(--color-neutral-600);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-900);
}

.user-role {
  font-size: 12px;
  color: var(--color-neutral-500);
}

/* Main Content */
.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-neutral-50);
}

.top-bar {
  height: var(--header-height);
  padding: 0 32px;
  display: flex;
  align-items: center;
  background: var(--color-neutral-50); /* Transparent/match bg */
  /* border-bottom: 1px solid var(--color-neutral-200); */ /* Optional: cleaner without border if canvas has card style */
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-neutral-900);
}

.page-content {
  flex: 1;
  padding: 0 24px 24px; /* Give some breathing room */
  overflow: hidden;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
