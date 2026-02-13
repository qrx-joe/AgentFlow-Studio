<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { Files, ChatLineRound, Monitor } from '@element-plus/icons-vue'

// 主布局：现代化侧边栏与内容区
const route = useRoute()
const router = useRouter()

const menus = [
  { name: '工作室', path: '/', icon: Monitor },
  { name: '知识库', path: '/knowledge', icon: Files },
  { name: '智能对话', path: '/chat', icon: ChatLineRound },
]

const handleSelect = (path: string) => {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <div class="layout">
    <!-- Top Navigation Bar -->
    <header class="navbar">
      <div class="navbar-left">
        <div class="brand">
          <div class="logo-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span class="brand-text">AgentFlow</span>
        </div>
      </div>

      <nav class="nav-menu">
        <button
          v-for="item in menus"
          :key="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path || (item.path !== '/' && route.path.startsWith(item.path)) }"
          @click="handleSelect(item.path)"
        >
          <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
          <span class="nav-text">{{ item.name }}</span>
        </button>
      </nav>

      <div class="navbar-right">
        <!-- User Profile Dropdown could go here, simplified user profile for now -->
        <div class="user-profile">
          <div class="avatar">U</div>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="content-wrapper">
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
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: #f8fafc; /* Lighter background */
  font-family: var(--font-family-base);
  color: #0f172a;
}

/* Navbar */
.navbar {
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  z-index: 50;
  position: relative; /* For absolute centering of nav-menu */
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 40px;
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.logo-box {
  width: 32px;
  height: 32px;
  background: #0f172a; /* Solid dark brand color */
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand-text {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.5px;
}

/* Navigation - Centered */
.nav-menu {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.nav-item.active {
  background: #f1f5f9;
  color: #0f172a;
  font-weight: 600;
}

.nav-icon {
  font-size: 16px;
}

/* Navbar Right */
.navbar-right {
  display: flex;
  align-items: center;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

/* Content */
.content-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  overflow: hidden; /* Child views handle scrolling */
  position: relative;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
