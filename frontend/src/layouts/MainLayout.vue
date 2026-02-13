<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { Files, ChatLineRound, Monitor, ArrowDown, User, SwitchButton } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

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

const username = localStorage.getItem('username') || 'User'

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    })
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('username')
    router.push('/login')
  } catch {
    // 用户取消
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
        <el-dropdown trigger="click" @command="handleLogout">
          <div class="user-profile">
            <div class="avatar">{{ username.charAt(0).toUpperCase() }}</div>
            <span class="username">{{ username }}</span>
            <el-icon class="dropdown-arrow"><arrow-down /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                <el-icon><user /></el-icon>
                <span>{{ username }}</span>
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><switch-button /></el-icon>
                <span>退出登录</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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
  height: 72px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
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
  gap: 12px;
  cursor: pointer;
}

.logo-box {
  width: 40px;
  height: 40px;
  background: #0f172a; /* Solid dark brand color */
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand-text {
  font-size: 20px;
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
  gap: 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 15px;
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
  font-size: 18px;
}

/* Navbar Right */
.navbar-right {
  display: flex;
  align-items: center;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 6px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-profile:hover {
  background: #f1f5f9;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  font-size: 12px;
  color: #9ca3af;
  transition: transform 0.2s;
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
  overflow-y: auto;
  overflow-x: hidden;
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
